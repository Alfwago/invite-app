// Shared storage between the watch app and the watch complication (step
// 4) — both run on the watch, but as separate processes, so they can't
// share in-memory state directly. The watch app writes the latest payload
// here whenever PhoneConnector delivers one (or a tap is applied
// optimistically); the complication's TimelineProvider reads it back and
// the app calls WidgetCenter.shared.reloadAllTimelines() to refresh it.

import Foundation

enum WatchSharedStorage {
    // Must match targets/watch/expo-target.config.js and
    // targets/watch-widget/expo-target.config.js exactly.
    static let appGroup = "group.com.falcon83.obhinvites.watch"
    private static let payloadKey = "nextSkatePayload"

    static func save(_ payload: WatchPayload) {
        guard let defaults = UserDefaults(suiteName: appGroup) else { return }
        let encoder = JSONEncoder()
        encoder.dateEncodingStrategy = .iso8601
        guard let data = try? encoder.encode(payload) else { return }
        defaults.set(data, forKey: payloadKey)
    }

    static func load() -> WatchPayload? {
        guard
            let defaults = UserDefaults(suiteName: appGroup),
            let data = defaults.data(forKey: payloadKey)
        else { return nil }
        let decoder = JSONDecoder()
        decoder.dateDecodingStrategy = .iso8601
        return try? decoder.decode(WatchPayload.self, from: data)
    }
}
