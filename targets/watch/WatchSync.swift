import Foundation
import Security
import WatchKit
import WidgetKit
import os

private let syncLog = Logger(subsystem: "com.falcon83.obhinvites", category: "watch-sync")

/// Keeps the watch current without the phone app running: the watch fetches
/// /api/home/ from invite-server itself — when the watch app opens, and in
/// background app-refresh tasks (WatchAppDelegate) — then saves the result
/// for the complication and reloads it.
///
/// The phone still pushes instantly whenever its app is open
/// (PhoneConnector); this covers the rest of the day. Credentials come from
/// the phone in that same application context (`apiUrl` / `authToken`, see
/// src/hooks/useWatchConnectivity.ts) and are cleared when it signs out.
enum WatchSync {
    /// Posted (main thread) after a fetch saved fresh data, so an open
    /// NextSkateStore can show it without re-saving.
    static let didUpdate = Notification.Name("WatchSync.didUpdate")

    /// watchOS gives an app on the active face roughly four background
    /// refreshes an hour — spend them on skate day, go hourly otherwise.
    static let skateDayInterval: TimeInterval = 15 * 60
    static let normalInterval: TimeInterval = 60 * 60

    /// Fetch, save, reload the complication. Returns false when there's no
    /// token yet or the fetch failed (the stored data is left alone).
    @discardableResult
    static func refresh() async -> Bool {
        guard let credentials = WatchCredentials.load() else {
            syncLog.info("no credentials from the phone yet — skipping fetch")
            return false
        }
        guard let url = URL(string: credentials.apiUrl + "/api/home/") else { return false }
        var request = URLRequest(url: url, timeoutInterval: 15)
        request.setValue("Token \(credentials.token)", forHTTPHeaderField: "Authorization")
        request.setValue("application/json", forHTTPHeaderField: "Accept")

        do {
            let (data, response) = try await URLSession.shared.data(for: request)
            let status = (response as? HTTPURLResponse)?.statusCode ?? 0
            if status == 401 || status == 403 {
                // Signed out / token revoked elsewhere — stop trying with it.
                syncLog.info("server rejected the token (\(status)) — clearing it")
                WatchCredentials.clear()
                return false
            }
            guard status == 200 else {
                syncLog.error("home fetch: HTTP \(status)")
                return false
            }
            let skate = try HomeResponse.decode(data).watchNextSkate
            save(skate)
            syncLog.info("fetched home, nextSkate: \(skate == nil ? "none" : "present", privacy: .public)")
            return true
        } catch {
            syncLog.error("home fetch failed: \(error.localizedDescription, privacy: .public)")
            return false
        }
    }

    static func save(_ skate: WatchNextSkate?) {
        WatchSharedStorage.save(WatchPayload(nextSkate: skate))
        WidgetCenter.shared.reloadAllTimelines()
        DispatchQueue.main.async {
            NotificationCenter.default.post(name: didUpdate, object: skate)
        }
    }

    /// Queue the next background refresh — sooner on skate day.
    static func scheduleNextRefresh() {
        let skate = WatchSharedStorage.load()?.nextSkate
        let isSkateDay = skate.map { $0.date == WatchDateFormatting.todayString() } ?? false
        let next = Date().addingTimeInterval(isSkateDay ? skateDayInterval : normalInterval)
        WKApplication.shared().scheduleBackgroundRefresh(withPreferredDate: next, userInfo: nil) { error in
            if let error {
                syncLog.error("couldn't schedule refresh: \(error.localizedDescription, privacy: .public)")
            }
        }
    }
}

/// Handles the background app-refresh tasks WatchSync schedules.
final class WatchAppDelegate: NSObject, WKApplicationDelegate {
    func applicationDidFinishLaunching() {
        WatchSync.scheduleNextRefresh()
    }

    func handle(_ backgroundTasks: Set<WKRefreshBackgroundTask>) {
        for task in backgroundTasks {
            if let refresh = task as? WKApplicationRefreshBackgroundTask {
                Task {
                    await WatchSync.refresh()
                    WatchSync.scheduleNextRefresh()
                    refresh.setTaskCompletedWithSnapshot(false)
                }
            } else {
                task.setTaskCompletedWithSnapshot(false)
            }
        }
    }
}

/// invite-server URL + auth token handed over by the phone. The token lives
/// in the watch app's Keychain, readable after first unlock so background
/// refreshes can use it. Only the watch app reads it — the complication
/// just reads the saved payload.
enum WatchCredentials {
    struct Value {
        let apiUrl: String
        let token: String
    }

    private static let service = "com.falcon83.obhinvites.watch.server"
    private static let apiUrlKey = "watchSync.apiUrl"

    static func save(apiUrl: String, token: String) {
        if let current = load(), current.apiUrl == apiUrl, current.token == token { return }
        UserDefaults.standard.set(apiUrl, forKey: apiUrlKey)
        SecItemDelete(baseQuery as CFDictionary)
        var item = baseQuery
        item[kSecAttrAccessible as String] = kSecAttrAccessibleAfterFirstUnlockThisDeviceOnly
        item[kSecValueData as String] = Data(token.utf8)
        let status = SecItemAdd(item as CFDictionary, nil)
        if status != errSecSuccess {
            syncLog.error("couldn't store token: \(status)")
        }
    }

    static func load() -> Value? {
        guard let apiUrl = UserDefaults.standard.string(forKey: apiUrlKey) else { return nil }
        var query = baseQuery
        query[kSecReturnData as String] = true
        query[kSecMatchLimit as String] = kSecMatchLimitOne
        var result: AnyObject?
        guard SecItemCopyMatching(query as CFDictionary, &result) == errSecSuccess,
              let data = result as? Data,
              let token = String(data: data, encoding: .utf8)
        else { return nil }
        return Value(apiUrl: apiUrl, token: token)
    }

    static func clear() {
        UserDefaults.standard.removeObject(forKey: apiUrlKey)
        SecItemDelete(baseQuery as CFDictionary)
    }

    private static var baseQuery: [String: Any] {
        [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrService as String: service,
            kSecAttrAccount as String: "authToken",
        ]
    }
}

/// The slice of /api/home/ the watch needs, mapped to WatchNextSkate exactly
/// the way the phone does it (watchPayloadFromHome in
/// src/hooks/useWatchConnectivity.ts) — keep the two in step.
struct HomeResponse: Decodable {
    struct Night: Decodable { let name: String }
    struct MyRsvp: Decodable { let status: String }
    struct Roster: Decodable {
        let skaters: Int
        let goalies: Int
        let capacity: Int?
        let goaliesNeeded: Int?
        let skaterSpotsOpen: Int?
        let goalieSpotsOpen: Int?
        let isFull: Bool
    }
    struct Skate: Decodable {
        let id: Int
        let displayName: String
        let night: Night?
        let date: String
        let startTime: String?
        let myRsvp: MyRsvp?
        let roster: Roster?
    }
    struct Team: Decodable {
        let team: String
        let jersey: String
    }

    let nextSkate: Skate?
    let teamAssignment: Team?

    static func decode(_ data: Data) throws -> HomeResponse {
        let decoder = JSONDecoder()
        decoder.keyDecodingStrategy = .convertFromSnakeCase
        return try decoder.decode(HomeResponse.self, from: data)
    }

    var watchNextSkate: WatchNextSkate? {
        guard let skate = nextSkate else { return nil }
        return WatchNextSkate(
            eventId: skate.id,
            nightName: skate.night?.name ?? skate.displayName,
            date: skate.date,
            startTime: skate.startTime,
            myRsvp: skate.myRsvp.flatMap { WatchRsvpStatus(rawValue: $0.status) } ?? .noResponse,
            teamAssignment: teamAssignment.map { WatchTeamAssignment(team: $0.team, jersey: $0.jersey) },
            rosterStats: skate.roster.map {
                WatchRosterStats(
                    skaters: $0.skaters,
                    goalies: $0.goalies,
                    capacity: $0.capacity,
                    goaliesNeeded: $0.goaliesNeeded,
                    skaterSpotsOpen: $0.skaterSpotsOpen,
                    goalieSpotsOpen: $0.goalieSpotsOpen,
                    isFull: $0.isFull
                )
            }
        )
    }
}
