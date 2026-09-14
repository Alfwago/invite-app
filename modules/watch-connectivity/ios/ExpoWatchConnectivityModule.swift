import ExpoModulesCore
import WatchConnectivity

/// Bridges the phone side of WatchConnectivity into JS.
///
/// Watch -> phone: an RSVP tap on the watch arrives here as a `sendMessage`
/// with a `requestId`; this module holds the WCSession replyHandler open,
/// fires `onRsvpRequest` into JS, and completes the reply only once JS has
/// actually performed the RSVP through the app's real `submitRsvp` path
/// (see src/hooks/useWatchConnectivity.ts) and called back
/// `respondToRsvpRequest`. The native side never talks to the server itself.
///
/// Phone -> watch: JS calls `updateApplicationContext` whenever the next
/// skate / RSVP / jersey changes; WCSession delivers it to the watch even
/// if the watch app isn't currently running.
public class ExpoWatchConnectivityModule: Module {
  private var pendingReplies: [String: ([String: Any]) -> Void] = [:]
  private let pendingRepliesLock = NSLock()

  public func definition() -> ModuleDefinition {
    Name("ExpoWatchConnectivity")

    Events("onRsvpRequest", "onReachabilityChange")

    OnCreate { [weak self] in
      guard WCSession.isSupported(), let self else { return }
      SessionDelegateProxy.shared.module = self
      WCSession.default.delegate = SessionDelegateProxy.shared
      WCSession.default.activate()
    }

    Function("isSupported") {
      WCSession.isSupported()
    }

    Function("isReachable") {
      WCSession.isSupported() && WCSession.default.isReachable
    }

    // Delivered even if the watch app isn't running right now — WCSession
    // caches the latest context and hands it to the watch on next
    // launch/wake (unlike sendMessage, which needs both sides live).
    Function("updateApplicationContext") { (payload: [String: Any]) in
      guard WCSession.isSupported(), WCSession.default.activationState == .activated else { return }
      let sanitized = Self.stripNulls(payload)
      DispatchQueue.main.async {
        try? WCSession.default.updateApplicationContext(sanitized)
      }
    }

    // Completes the WCSession replyHandler for a pending onRsvpRequest —
    // call after JS has actually performed the RSVP (or failed to).
    Function("respondToRsvpRequest") { (requestId: String, success: Bool, message: String?) in
      self.completeReply(requestId: requestId, success: success, message: message)
    }
  }

  fileprivate func handleRsvpMessage(_ message: [String: Any], replyHandler: @escaping ([String: Any]) -> Void) {
    guard
      message["type"] as? String == "rsvp",
      let requestId = message["requestId"] as? String,
      let eventId = message["eventId"] as? Int,
      let status = message["status"] as? String
    else {
      replyHandler(["success": false, "message": "Malformed request"])
      return
    }

    pendingRepliesLock.lock()
    pendingReplies[requestId] = replyHandler
    pendingRepliesLock.unlock()

    sendEvent("onRsvpRequest", [
      "requestId": requestId,
      "eventId": eventId,
      "status": status,
    ])
  }

  fileprivate func completeReply(requestId: String, success: Bool, message: String?) {
    pendingRepliesLock.lock()
    let handler = pendingReplies.removeValue(forKey: requestId)
    pendingRepliesLock.unlock()

    var reply: [String: Any] = ["success": success]
    if let message { reply["message"] = message }
    handler?(reply)
  }

  fileprivate func notifyReachability(_ reachable: Bool) {
    sendEvent("onReachabilityChange", ["reachable": reachable])
  }

  /// WCSession's application-context dictionary must be property-list
  /// safe; NSNull (what a JS `null` becomes crossing the bridge) isn't.
  /// The JS caller already avoids sending nulls, but this is cheap
  /// insurance against a future caller that doesn't.
  private static func stripNulls(_ dict: [String: Any]) -> [String: Any] {
    var result: [String: Any] = [:]
    for (key, value) in dict {
      if value is NSNull { continue }
      if let nested = value as? [String: Any] {
        result[key] = stripNulls(nested)
      } else {
        result[key] = value
      }
    }
    return result
  }
}

/// WCSessionDelegate is an @objc protocol, so the conforming type needs
/// NSObject/Obj-C dynamism `Module` doesn't guarantee — this small proxy
/// forwards callbacks to the module instance instead.
private class SessionDelegateProxy: NSObject, WCSessionDelegate {
  static let shared = SessionDelegateProxy()
  weak var module: ExpoWatchConnectivityModule?

  func session(
    _ session: WCSession, activationDidCompleteWith activationState: WCSessionActivationState, error: Error?
  ) {
    module?.notifyReachability(session.isReachable)
  }

  func sessionDidBecomeInactive(_ session: WCSession) {}

  func sessionDidDeactivate(_ session: WCSession) {
    // A new watch was paired, or Watch app switched — reactivate for the
    // new default session per Apple's guidance.
    session.activate()
  }

  func sessionReachabilityDidChange(_ session: WCSession) {
    module?.notifyReachability(session.isReachable)
  }

  func session(_ session: WCSession, didReceiveMessage message: [String: Any], replyHandler: @escaping ([String: Any]) -> Void) {
    module?.handleRsvpMessage(message, replyHandler: replyHandler)
  }

  // No didReceiveUserInfo handler — deliberately. The watch used to fall
  // back to transferUserInfo when unreachable, queuing the tap for later
  // delivery, but that path has no reply channel: a real failure had no
  // way back to the watch, so the optimistic tap just stood, silently
  // wrong. The watch now refuses to submit at all when unreachable
  // (PhoneConnector.sendRsvp), so sendMessage — which always replies — is
  // the only RSVP delivery path.
}
