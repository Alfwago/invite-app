import Foundation
import WidgetKit

/// Holds the watch's view of "my next skate" and applies RSVP taps.
///
/// A tap only proceeds if the phone is reachable right now — see
/// `setRsvp`. When it is, local state updates immediately (optimistic — a
/// wrist glance shouldn't wait on a network round trip), then goes to the
/// phone via PhoneConnector, which performs the real submitRsvp on the
/// phone side. If that fails, the tap is rolled back and `errorMessage`
/// is set. There's no queued/offline path — an unreachable phone means
/// the tap is refused up front, not silently uncertain later.
///
/// Every real change to `nextSkate` is also written to WatchSharedStorage
/// and triggers a complication reload (step 4), so the watch face stays
/// in sync with whatever this screen is showing.
@MainActor
final class NextSkateStore: ObservableObject {
    @Published private(set) var nextSkate: WatchNextSkate?
    @Published private(set) var isPhoneReachable = false
    @Published private(set) var errorMessage: String?
    /// True once a payload has arrived from the phone (cached or live) —
    /// distinguishes "hasn't synced yet" from "synced, nothing upcoming".
    @Published private(set) var hasReceivedData = false

    private let connector: PhoneConnector
    /// The status before an in-flight tap, restored if the phone reports
    /// the RSVP couldn't be saved.
    private var statusBeforeTap: WatchRsvpStatus?

    init(connector: PhoneConnector = .shared, nextSkate: WatchNextSkate? = nil) {
        self.connector = connector
        self.nextSkate = nextSkate

        connector.onPayload = { [weak self] payload in
            self?.hasReceivedData = true
            self?.update(payload.nextSkate)
        }
        connector.onReachabilityChange = { [weak self] reachable in
            self?.isPhoneReachable = reachable
        }
        connector.onRsvpFailed = { [weak self] message in
            guard let self else { return }
            self.errorMessage = message
            if let previous = self.statusBeforeTap {
                self.applyLocally(previous)
            }
        }

        connector.deliverCachedContextIfAny()
    }

    func setRsvp(_ status: WatchRsvpStatus) {
        guard let skate = nextSkate else { return }
        // Checked here, before touching anything, so an unreachable phone
        // never shows an optimistic update that's about to be reverted —
        // it just never happens. (PhoneConnector re-checks live reachability
        // itself before sending; this is a fast, ambient pre-check, not the
        // sole guard — see its doc comment for why there's no queued path.)
        guard isPhoneReachable else {
            errorMessage = "Can't reach iPhone — try again when nearby."
            return
        }
        statusBeforeTap = skate.myRsvp
        errorMessage = nil
        applyLocally(status)
        connector.sendRsvp(eventId: skate.eventId, status: status)
    }

    private func applyLocally(_ status: WatchRsvpStatus) {
        guard let skate = nextSkate else { return }
        update(WatchNextSkate(
            eventId: skate.eventId,
            nightName: skate.nightName,
            date: skate.date,
            startTime: skate.startTime,
            myRsvp: status,
            teamAssignment: skate.teamAssignment,
            rosterStats: skate.rosterStats
        ))
    }

    /// The one place `nextSkate` actually changes for a real (non-preview)
    /// update — keeps the complication in sync with whatever this causes
    /// the main screen to show.
    private func update(_ skate: WatchNextSkate?) {
        nextSkate = skate
        WatchSharedStorage.save(WatchPayload(nextSkate: skate))
        WidgetCenter.shared.reloadAllTimelines()
    }
}
