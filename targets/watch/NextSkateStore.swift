import Foundation

/// Holds the watch's view of "my next skate" and applies RSVP taps.
///
/// Step 2 (this file): taps update local state only, so the UI is fully
/// testable before WatchConnectivity exists.
/// Step 3 replaces the body of `setRsvp` with a message sent to the phone
/// over WCSession, which calls the app's real `submitRsvp` (src/hooks/
/// queries.ts) — the phone is the source of truth, not the watch. This
/// view model's public surface (`nextSkate`, `setRsvp`) doesn't change, so
/// the views built against it in step 2 don't either.
@MainActor
final class NextSkateStore: ObservableObject {
    @Published private(set) var nextSkate: WatchNextSkate?

    init(nextSkate: WatchNextSkate? = NextSkateStore.sample) {
        self.nextSkate = nextSkate
    }

    func setRsvp(_ status: WatchRsvpStatus) {
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

    // Sample data for previews and for running the watch app standalone
    // (no phone/WatchConnectivity yet) during steps 2. Step 3 replaces
    // this default with `nil` and populates `nextSkate` from the phone.
    static let sample = WatchNextSkate(
        eventId: 1,
        nightName: "Tuesday Night",
        date: "2026-09-15",
        startTime: "21:00:00",
        myRsvp: .noResponse,
        teamAssignment: WatchTeamAssignment(team: "Gold", jersey: "Wear your gold jersey.")
    )
}
