import Foundation

/// Holds the watch's view of "my next skate" and applies RSVP taps.
///
/// Taps update local state immediately (optimistic — a wrist glance
/// shouldn't wait on a network round trip), then go to the phone via
/// PhoneConnector, which performs the real submitRsvp on the phone side.
/// If that fails, the tap is rolled back and `errorMessage` is set.
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
            self?.nextSkate = payload.nextSkate
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
        statusBeforeTap = skate.myRsvp
        errorMessage = nil
        applyLocally(status)
        connector.sendRsvp(eventId: skate.eventId, status: status)
    }

    private func applyLocally(_ status: WatchRsvpStatus) {
        guard let skate = nextSkate else { return }
        nextSkate = WatchNextSkate(
            eventId: skate.eventId,
            nightName: skate.nightName,
            date: skate.date,
            startTime: skate.startTime,
            myRsvp: status,
            teamAssignment: skate.teamAssignment
        )
    }

    // Sample data for previews and for exercising the UI without a phone
    // connected (see #Preview blocks across targets/watch/Views/).
    static let sample = WatchNextSkate(
        eventId: 1,
        nightName: "Tuesday Night",
        date: "2026-09-15",
        startTime: "21:00:00",
        myRsvp: .noResponse,
        teamAssignment: WatchTeamAssignment(team: "Gold", jersey: "Wear your gold jersey.")
    )
}
