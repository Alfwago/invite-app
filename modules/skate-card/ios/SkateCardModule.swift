import ActivityKit
import ExpoModulesCore
import Foundation
import Security
import os

// View with: xcrun simctl spawn <phone-udid> log show --last 10m --info --predicate 'subsystem == "com.falcon83.obhinvites" AND category == "skatecard"'
private let cardLog = Logger(subsystem: "com.falcon83.obhinvites", category: "skatecard")

/// Copy of targets/skate-card/SkateCardAttributes.swift — must stay
/// identical (name, fields, types): the widget extension draws the card,
/// this copy lets the app start it, and APNs push-to-start matches on the
/// type name. See that file for the full list of places to keep in sync.
struct SkateCardAttributes: ActivityAttributes {
  public struct ContentState: Codable, Hashable {
    /// The viewer's RSVP ("YES", "MAYBE", "WAITLIST", "NO_RESPONSE").
    var myStatus: String?
    var skaters: Int
    var goalies: Int
    var capacity: Int?
    var goaliesNeeded: Int?
    var team: String?
    var jersey: String?
    /// The night board's newest post from the last 24h (skate_card.py
    /// board_message_fields); all nil = no board line.
    var messageAuthor: String?
    var messageText: String?
    var messageAt: Double?
  }

  var eventId: Int
  var name: String
  var startsAt: Double
  /// Bundled night logo key ("Monday"); nil/"" = the default OBH logo.
  var logo: String?
}

/// What JS hands `show()` — the next skate, flattened (src/hooks/useSkateCard.ts).
struct SkateCardInput: Record {
  @Field var eventId: Int = 0
  @Field var name: String = ""
  @Field var startsAt: Double = 0
  @Field var logo: String? = nil
  @Field var myStatus: String? = nil
  @Field var skaters: Int = 0
  @Field var goalies: Int = 0
  @Field var capacity: Int? = nil
  @Field var goaliesNeeded: Int? = nil
  @Field var team: String? = nil
  @Field var jersey: String? = nil
  @Field var messageAuthor: String? = nil
  @Field var messageText: String? = nil
  @Field var messageAt: Double? = nil
}

/// The skate-day lock-screen card (Live Activity).
///
/// invite-server drives the card: it starts it over APNs push-to-start
/// (iOS 17.2+) and pushes count / jersey changes to each card's update
/// token. This module's job is reporting those tokens — **natively**, not
/// through JS, because a push-to-start wakes the app only briefly in the
/// background, where React may never mount. So JS hands over the API URL
/// and auth token at sign-in (`setServer`) and this side POSTs
/// /api/live-activity/register/ itself.
///
/// `show()` is the in-app fallback: with the app open on skate day it
/// starts the card locally (iOS 16.2–17.1, a missed push, the Simulator)
/// and keeps it current from Home data.
public class SkateCardModule: Module {
  public func definition() -> ModuleDefinition {
    Name("SkateCard")

    OnCreate {
      if #available(iOS 16.2, *) {
        Task { @MainActor in SkateCardObserver.shared.start() }
      }
    }

    Function("isSupported") { () -> Bool in
      if #available(iOS 16.2, *) {
        return ActivityAuthorizationInfo().areActivitiesEnabled
      }
      return false
    }

    Function("setServer") { (apiUrl: String, authToken: String) in
      SkateCardServer.save(apiUrl: apiUrl, authToken: authToken)
      if #available(iOS 16.2, *) {
        Task { @MainActor in SkateCardObserver.shared.reportAllTokens() }
      }
    }

    AsyncFunction("show") { (input: SkateCardInput) async in
      if #available(iOS 16.2, *) {
        await SkateCardObserver.shared.show(input)
      }
    }

    AsyncFunction("end") { (eventId: Int) async in
      if #available(iOS 16.2, *) {
        await SkateCardObserver.shared.end(eventId: eventId)
      }
    }

    // Before the server session goes away: unregister this device's tokens
    // (else the next person to sign in here would get the last one's cards),
    // take any card down, forget the credentials.
    AsyncFunction("signOut") { () async in
      if #available(iOS 16.2, *) {
        await SkateCardObserver.shared.signOut()
      }
      SkateCardServer.clear()
    }
  }
}

@available(iOS 16.2, *)
@MainActor
final class SkateCardObserver {
  static let shared = SkateCardObserver()

  private var started = false
  private var observed = Set<String>()
  private var startToken: String?
  /// activity id → (event, token)
  private var updateTokens: [String: (eventId: Int, token: String)] = [:]

  /// Cards go stale at puck drop and end an hour later (server
  /// CARD_END_AFTER), so a card the server never ends doesn't linger.
  private static let endAfter: TimeInterval = 60 * 60

  func start() {
    guard !started else { return }
    started = true

    if #available(iOS 17.2, *) {
      Task {
        for await data in Activity<SkateCardAttributes>.pushToStartTokenUpdates {
          let token = data.hexString
          startToken = token
          cardLog.info("push-to-start token updated")
          SkateCardServer.register(token: token, kind: "start", eventId: nil)
        }
      }
    }

    for activity in Activity<SkateCardAttributes>.activities {
      observe(activity)
    }
    Task {
      for await activity in Activity<SkateCardAttributes>.activityUpdates {
        observe(activity)
      }
    }
  }

  private func observe(_ activity: Activity<SkateCardAttributes>) {
    guard observed.insert(activity.id).inserted else { return }
    let eventId = activity.attributes.eventId
    cardLog.info("observing card for event \(eventId)")

    // One card per skate. A push-to-start can land while a card the app
    // started itself is up; keep the newest.
    for other in Activity<SkateCardAttributes>.activities
    where other.id != activity.id && other.attributes.eventId == eventId && other.activityState == .active {
      Task { await other.end(nil, dismissalPolicy: .immediate) }
    }

    Task {
      for await data in activity.pushTokenUpdates {
        let token = data.hexString
        updateTokens[activity.id] = (eventId, token)
        cardLog.info("update token for event \(eventId)")
        SkateCardServer.register(token: token, kind: "update", eventId: eventId)
      }
      updateTokens[activity.id] = nil
    }
  }

  func reportAllTokens() {
    if let startToken {
      SkateCardServer.register(token: startToken, kind: "start", eventId: nil)
    }
    for (_, entry) in updateTokens {
      SkateCardServer.register(token: entry.token, kind: "update", eventId: entry.eventId)
    }
  }

  func show(_ input: SkateCardInput) async {
    await endPast()
    // One skate card at a time: this is Home's next skate, so any other
    // skate's card is left over (event deleted, rescheduled, …).
    for activity in Activity<SkateCardAttributes>.activities where activity.attributes.eventId != input.eventId {
      await activity.end(nil, dismissalPolicy: .immediate)
    }
    guard ActivityAuthorizationInfo().areActivitiesEnabled else {
      cardLog.info("Live Activities turned off for this app — no card")
      return
    }

    let state = SkateCardAttributes.ContentState(
      myStatus: input.myStatus,
      skaters: input.skaters,
      goalies: input.goalies,
      capacity: input.capacity,
      goaliesNeeded: input.goaliesNeeded,
      team: input.team,
      jersey: input.jersey,
      messageAuthor: input.messageAuthor,
      messageText: input.messageText,
      messageAt: input.messageAt
    )
    let content = ActivityContent(
      state: state,
      staleDate: Date(timeIntervalSince1970: input.startsAt)
    )

    if let existing = Activity<SkateCardAttributes>.activities.first(where: {
      $0.attributes.eventId == input.eventId && $0.activityState == .active
    }) {
      if existing.content.state != state {
        await existing.update(content)
      }
      return
    }

    let attributes = SkateCardAttributes(
      eventId: input.eventId, name: input.name, startsAt: input.startsAt, logo: input.logo
    )
    do {
      observe(try Activity.request(attributes: attributes, content: content, pushType: .token))
      cardLog.info("started card for event \(input.eventId)")
    } catch {
      // No push entitlement / APNs registration (e.g. some simulators):
      // still show the card, it just won't get server updates.
      cardLog.error("card with push failed (\(error.localizedDescription, privacy: .public)); starting local-only")
      if let activity = try? Activity.request(attributes: attributes, content: content, pushType: nil) {
        observe(activity)
      }
    }
  }

  func end(eventId: Int) async {
    for activity in Activity<SkateCardAttributes>.activities where activity.attributes.eventId == eventId {
      await activity.end(nil, dismissalPolicy: .immediate)
    }
  }

  func signOut() async {
    var tokens = updateTokens.values.map(\.token)
    if let startToken { tokens.append(startToken) }
    for token in tokens {
      await SkateCardServer.unregister(token: token)
    }
    for activity in Activity<SkateCardAttributes>.activities {
      await activity.end(nil, dismissalPolicy: .immediate)
    }
  }

  private func endPast() async {
    let now = Date().timeIntervalSince1970
    for activity in Activity<SkateCardAttributes>.activities
    where activity.attributes.startsAt + Self.endAfter < now {
      await activity.end(nil, dismissalPolicy: .default)
    }
  }
}

/// invite-server credentials for background token reports. The auth token
/// lives in the Keychain (readable after first unlock, so a background
/// push-to-start wake can use it); the API URL in UserDefaults.
enum SkateCardServer {
  private static let service = "com.falcon83.obhinvites.skatecard"
  private static let account = "authToken"
  private static let apiUrlKey = "skateCard.apiUrl"

  static func save(apiUrl: String, authToken: String) {
    UserDefaults.standard.set(apiUrl, forKey: apiUrlKey)
    deleteToken()
    let item: [String: Any] = [
      kSecClass as String: kSecClassGenericPassword,
      kSecAttrService as String: service,
      kSecAttrAccount as String: account,
      kSecAttrAccessible as String: kSecAttrAccessibleAfterFirstUnlockThisDeviceOnly,
      kSecValueData as String: Data(authToken.utf8),
    ]
    let status = SecItemAdd(item as CFDictionary, nil)
    if status != errSecSuccess {
      cardLog.error("couldn't store auth token: \(status)")
    }
  }

  static func clear() {
    UserDefaults.standard.removeObject(forKey: apiUrlKey)
    deleteToken()
  }

  static func register(token: String, kind: String, eventId: Int?) {
    var body: [String: Any] = ["token": token, "kind": kind]
    if let eventId { body["event"] = eventId }
    guard let request = request(path: "/api/live-activity/register/", body: body) else {
      cardLog.info("not signed in yet — \(kind, privacy: .public) token held until setServer")
      return
    }
    URLSession.shared.dataTask(with: request) { _, response, error in
      let status = (response as? HTTPURLResponse)?.statusCode ?? 0
      if let error {
        cardLog.error("register \(kind, privacy: .public) token failed: \(error.localizedDescription, privacy: .public)")
      } else if status != 204 {
        cardLog.error("register \(kind, privacy: .public) token: HTTP \(status)")
      } else {
        cardLog.info("registered \(kind, privacy: .public) token")
      }
    }.resume()
  }

  static func unregister(token: String) async {
    guard let request = request(path: "/api/live-activity/unregister/", body: ["token": token]) else { return }
    _ = try? await URLSession.shared.data(for: request)
  }

  private static func request(path: String, body: [String: Any]) -> URLRequest? {
    guard let base = UserDefaults.standard.string(forKey: apiUrlKey),
          let auth = readToken(),
          let url = URL(string: base + path)
    else { return nil }
    var request = URLRequest(url: url)
    request.httpMethod = "POST"
    request.setValue("application/json", forHTTPHeaderField: "Content-Type")
    request.setValue("Token \(auth)", forHTTPHeaderField: "Authorization")
    request.httpBody = try? JSONSerialization.data(withJSONObject: body)
    return request
  }

  private static func readToken() -> String? {
    let query: [String: Any] = [
      kSecClass as String: kSecClassGenericPassword,
      kSecAttrService as String: service,
      kSecAttrAccount as String: account,
      kSecReturnData as String: true,
      kSecMatchLimit as String: kSecMatchLimitOne,
    ]
    var result: AnyObject?
    guard SecItemCopyMatching(query as CFDictionary, &result) == errSecSuccess,
          let data = result as? Data
    else { return nil }
    return String(data: data, encoding: .utf8)
  }

  private static func deleteToken() {
    let query: [String: Any] = [
      kSecClass as String: kSecClassGenericPassword,
      kSecAttrService as String: service,
      kSecAttrAccount as String: account,
    ]
    SecItemDelete(query as CFDictionary)
  }
}

private extension Data {
  var hexString: String { map { String(format: "%02x", $0) }.joined() }
}
