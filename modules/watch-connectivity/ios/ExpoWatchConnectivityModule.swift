import ExpoModulesCore
import WatchConnectivity
import os

// View with: xcrun simctl spawn <phone-udid> log show --last 10m --info --predicate 'subsystem == "com.falcon83.obhinvites"'
private let watchLog = Logger(subsystem: "com.falcon83.obhinvites", category: "watch")

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
  /// Latest snapshot from JS, kept so it can be (re)sent once the session is
  /// activated and the watch app is installed — a push that arrives earlier
  /// than that used to be dropped for good.
  private var latestContext: [String: Any]?
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
      guard WCSession.isSupported() else { return }
      let sanitized = Self.stripNulls(payload)
      DispatchQueue.main.async {
        self.latestContext = sanitized
        self.pushLatestContext()
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

  /// Sends the latest snapshot if the session is ready; otherwise logs why
  /// not and waits — the delegate calls this again on activation and when the
  /// watch's state changes (app installed, pairing).
  fileprivate func pushLatestContext() {
    DispatchQueue.main.async {
      guard let context = self.latestContext else { return }
      let session = WCSession.default
      guard session.activationState == .activated else {
        watchLog.info("push deferred: session not activated (state \(session.activationState.rawValue))")
        return
      }
      guard session.isPaired, session.isWatchAppInstalled else {
        watchLog.info("push deferred: isPaired=\(session.isPaired) isWatchAppInstalled=\(session.isWatchAppInstalled)")
        return
      }
      do {
        try session.updateApplicationContext(context)
        watchLog.info("pushed context, keys: \(context.keys.sorted().joined(separator: ","), privacy: .public)")
      } catch {
        watchLog.error("updateApplicationContext failed: \(error.localizedDescription, privacy: .public)")
      }
    }
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
    watchLog.info("phone session activated: state=\(activationState.rawValue) paired=\(session.isPaired) watchAppInstalled=\(session.isWatchAppInstalled) reachable=\(session.isReachable)")
    module?.notifyReachability(session.isReachable)
    module?.pushLatestContext()
  }

  func sessionWatchStateDidChange(_ session: WCSession) {
    watchLog.info("watch state changed: paired=\(session.isPaired) watchAppInstalled=\(session.isWatchAppInstalled)")
    module?.pushLatestContext()
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
