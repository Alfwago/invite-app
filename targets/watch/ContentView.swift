import SwiftUI

/// Main watch screen: OBH logo + next skate's night/date/time, current
/// RSVP status as the dominant color-coded element, a one-tap Yes/No/Maybe
/// row (a "Change RSVP" button once already answered), the jersey color
/// badge (or "Teams not set yet"), and — once the player has RSVP'd —
/// roster status bars. Fed by PhoneConnector; scrolls once content
/// overflows a single screen.
struct ContentView: View {
    @StateObject private var store = NextSkateStore()
    @State private var isEditingRsvp = false

    var body: some View {
        ScrollView {
            VStack(spacing: 8) {
                if let skate = store.nextSkate {
                    NightHeaderView(nightName: skate.nightName, date: skate.date, startTime: skate.startTime)
                    RsvpStatusBadge(status: skate.myRsvp)
                    RsvpActionArea(current: skate.myRsvp, onSelect: { store.setRsvp($0) }, isEditing: $isEditingRsvp)
                    JerseyBadge(assignment: skate.teamAssignment)

                    if skate.myRsvp != .noResponse, let roster = skate.rosterStats {
                        Divider()
                        RosterStatusView(roster: roster)
                    }

                    if let errorMessage = store.errorMessage {
                        Text(errorMessage)
                            .font(.caption2)
                            .foregroundStyle(.red)
                            .multilineTextAlignment(.center)
                    }
                } else if store.hasReceivedData {
                    NoSkateView()
                } else {
                    WaitingForPhoneView()
                }
            }
            .padding(.horizontal, 8)
            .padding(.top, 4)
            .padding(.bottom, 10)
        }
        // A new skate (or the phone re-pushing after a real edit elsewhere)
        // shouldn't inherit a stale "editing" flag from whatever was on
        // screen before.
        .onChange(of: store.nextSkate?.eventId) { _, _ in
            isEditingRsvp = false
        }
    }
}

#Preview {
    ContentView()
}
