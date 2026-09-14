import SwiftUI

/// Main watch screen: next skate's night/date/time, current RSVP status as
/// the dominant color-coded element, a one-tap Yes/No/Maybe row, and the
/// jersey color badge (or "Teams not set yet").
struct ContentView: View {
    @StateObject private var store = NextSkateStore()

    var body: some View {
        ScrollView {
            VStack(spacing: 10) {
                if let skate = store.nextSkate {
                    NightHeaderView(nightName: skate.nightName, date: skate.date, startTime: skate.startTime)
                    RsvpStatusBadge(status: skate.myRsvp)
                    RsvpButtonRow(current: skate.myRsvp) { store.setRsvp($0) }
                    JerseyBadge(assignment: skate.teamAssignment)
                } else {
                    NoSkateView()
                }
            }
            .padding(.horizontal, 8)
            .padding(.vertical, 4)
        }
    }
}

#Preview {
    ContentView()
}
