import SwiftUI

/// Main watch screen: OBH wordmark + next skate's night/date/time, current
/// RSVP status as the dominant color-coded element, then either:
///  - not yet responded: the Yes/No/Maybe row, immediately tappable; or
///  - already responded: roster status bars, the jersey badge (only when
///    a team's been assigned — nothing shown otherwise), then a
///    "Change RSVP" button (tap to reveal the row again).
/// Fed by PhoneConnector; scrolls once content overflows a single screen.
struct ContentView: View {
    @StateObject private var store = NextSkateStore()
    @State private var isEditingRsvp = false

    var body: some View {
        ScrollView {
            VStack(spacing: 6) {
                if let skate = store.nextSkate {
                    NightHeaderView(nightName: skate.nightName, date: skate.date, startTime: skate.startTime)

                    // Ambient, before any tap — not just an error after one
                    // fails. setRsvp() already refuses to submit while this
                    // is true, so the user should know why before trying.
                    if !store.isPhoneReachable {
                        Text("iPhone not connected")
                            .font(.caption2)
                            .foregroundStyle(.secondary)
                    }

                    if skate.myRsvp == .noResponse {
                        RsvpStatusBadge(status: skate.myRsvp)
                        RsvpButtonRow(current: skate.myRsvp) { store.setRsvp($0) }
                    } else {
                        if let roster = skate.rosterStats {
                            RosterStatusView(roster: roster)
                        }
                        if let team = skate.teamAssignment {
                            JerseyBadge(assignment: team)
                        }
                        RsvpStatusBadge(status: skate.myRsvp)
                        RsvpActionArea(current: skate.myRsvp, onSelect: { store.setRsvp($0) }, isEditing: $isEditingRsvp)
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
            .padding(.top, -8)
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
