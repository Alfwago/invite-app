import Foundation
import WatchConnectivity
import os

// View with: xcrun simctl spawn <watch-udid> log show --last 10m --info --predicate 'subsystem == "com.falcon83.obhinvites"'
private let watchLog = Logger(subsystem: "com.falcon83.obhinvites", category: "watch")

/// Bridges the watch app to the phone over WatchConnectivity. Owns the
/// WCSession; NextSkateStore is the only consumer, wired through closures
/// rather than this type also being observable — one source of published
/// state (NextSkateStore) is simpler to reason about than two kept in sync.
///
/// Mirrors modules/watch-connectivity/ios/ExpoWatchConnectivityModule.swift
/// on the phone side.
@MainActor
final class PhoneConnector: NSObject {
    static let shared = PhoneConnector()

    var onPayload: ((WatchPayload) -> Void)?
    var onReachabilityChange: ((Bool) -> Void)?
    /// A tap's round trip failed (or the phone isn't reachable at all) —
    /// the caller should roll back its optimistic update and surface this.
    var onRsvpFailed: ((String) -> Void)?

    private var session: WCSession?

    override private init() {
        super.init()
        guard WCSession.isSupported() else { return }
        let session = WCSession.default
        session.delegate = self
        self.session = session
        session.activate()
    }

    /// Call once a view is ready to receive it — hands back whatever
    /// context the session already cached from before this launch, so a
    /// cold start isn't stuck on placeholder data until the phone happens
    /// to push something new.
    func deliverCachedContextIfAny() {
        guard let context = session?.receivedApplicationContext, !context.isEmpty else { return }
        apply(context)
    }

    /// Live-only, by design: `sendMessage` is the sole delivery path
    /// because it's the only one with a reply. An earlier version fell
    /// back to `transferUserInfo` when unreachable — queued for delivery
    /// next time the phone woke — but that path has no reply channel, so
    /// a real failure (event locked, roster full, server error) had no
    /// way back to the watch and the optimistic tap just stood, silently
    /// wrong. Refusing to queue means every tap is either confirmed or
    /// visibly failed, never uncertain.
    func sendRsvp(eventId: Int, status: WatchRsvpStatus) {
        guard let session, WCSession.isSupported(), session.isReachable else {
            onRsvpFailed?("Can't reach iPhone — try again when nearby.")
            return
        }
        let message: [String: Any] = [
            "type": "rsvp",
            "requestId": UUID().uuidString,
            "eventId": eventId,
            "status": status.rawValue,
        ]

        session.sendMessage(message, replyHandler: { [weak self] reply in
            let success = reply["success"] as? Bool ?? false
            guard !success else { return }
            let text = reply["message"] as? String ?? "Couldn't save your RSVP."
            Task { @MainActor in self?.onRsvpFailed?(text) }
        }, errorHandler: { [weak self] error in
            Task { @MainActor in self?.onRsvpFailed?(error.localizedDescription) }
        })
    }

    private func apply(_ context: [String: Any]) {
        // Server credentials ride along so the watch can fetch on its own
        // (WatchSync). No token in the context = the phone signed out.
        if let apiUrl = context["apiUrl"] as? String, let token = context["authToken"] as? String {
            WatchCredentials.save(apiUrl: apiUrl, token: token)
        } else {
            WatchCredentials.clear()
        }
        let decoder = JSONDecoder()
        // The phone's JS sends `new Date().toISOString()` — fractional seconds
        // ("...:00.123Z"), which the stock `.iso8601` strategy rejects, leaving
        // the watch on "Waiting for iPhone" with no error. Accept both forms.
        decoder.dateDecodingStrategy = .custom { dateDecoder in
            let text = try dateDecoder.singleValueContainer().decode(String.self)
            let formatter = ISO8601DateFormatter()
            formatter.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
            if let date = formatter.date(from: text) { return date }
            formatter.formatOptions = [.withInternetDateTime]
            if let date = formatter.date(from: text) { return date }
            throw DecodingError.dataCorrupted(
                .init(codingPath: dateDecoder.codingPath, debugDescription: "Bad ISO-8601 date: \(text)")
            )
        }
        do {
            let data = try JSONSerialization.data(withJSONObject: context)
            let payload = try decoder.decode(WatchPayload.self, from: data)
            watchLog.info("received phone context, nextSkate: \(payload.nextSkate == nil ? "none" : "present", privacy: .public)")
            onPayload?(payload)
        } catch {
            watchLog.error("couldn't decode phone context (keys: \(context.keys.sorted().joined(separator: ","), privacy: .public)): \(String(describing: error), privacy: .public)")
        }
    }
}

extension PhoneConnector: WCSessionDelegate {
    nonisolated func session(
        _ session: WCSession, activationDidCompleteWith activationState: WCSessionActivationState, error: Error?
    ) {
        watchLog.info("watch session activated: state=\(activationState.rawValue) reachable=\(session.isReachable) cachedContextKeys=\(session.receivedApplicationContext.keys.sorted().joined(separator: ","), privacy: .public)")
        Task { @MainActor in
            self.onReachabilityChange?(session.isReachable)
            self.deliverCachedContextIfAny()
        }
    }

    nonisolated func sessionReachabilityDidChange(_ session: WCSession) {
        Task { @MainActor in self.onReachabilityChange?(session.isReachable) }
    }

    nonisolated func session(_ session: WCSession, didReceiveApplicationContext applicationContext: [String: Any]) {
        watchLog.info("didReceiveApplicationContext, keys: \(applicationContext.keys.sorted().joined(separator: ","), privacy: .public)")
        Task { @MainActor in self.apply(applicationContext) }
    }
}
