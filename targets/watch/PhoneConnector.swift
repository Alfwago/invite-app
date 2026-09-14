import Foundation
import WatchConnectivity

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
        let decoder = JSONDecoder()
        decoder.dateDecodingStrategy = .iso8601
        guard
            let data = try? JSONSerialization.data(withJSONObject: context),
            let payload = try? decoder.decode(WatchPayload.self, from: data)
        else { return }
        onPayload?(payload)
    }
}

extension PhoneConnector: WCSessionDelegate {
    nonisolated func session(
        _ session: WCSession, activationDidCompleteWith activationState: WCSessionActivationState, error: Error?
    ) {
        Task { @MainActor in
            self.onReachabilityChange?(session.isReachable)
            self.deliverCachedContextIfAny()
        }
    }

    nonisolated func sessionReachabilityDidChange(_ session: WCSession) {
        Task { @MainActor in self.onReachabilityChange?(session.isReachable) }
    }

    nonisolated func session(_ session: WCSession, didReceiveApplicationContext applicationContext: [String: Any]) {
        Task { @MainActor in self.apply(applicationContext) }
    }
}
