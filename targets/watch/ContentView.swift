import SwiftUI

// Placeholder screen for step 1: proves the target builds and links the
// shared model types from targets/_shared/WatchModels.swift. The real
// night/RSVP/jersey UI (step 2) and live data via WatchConnectivity
// (step 3) replace this.
struct ContentView: View {
    // Static sample data, just to exercise the shared types at compile time.
    private let sample = WatchNextSkate(
        eventId: 1,
        nightName: "Tuesday Night",
        date: "2026-09-15",
        startTime: "21:00:00",
        myRsvp: .noResponse,
        teamAssignment: nil
    )

    var body: some View {
        VStack(spacing: 8) {
            Text(sample.nightName)
                .font(.headline)
            Text(sample.myRsvp.rawValue)
                .font(.caption)
                .foregroundStyle(.secondary)
            Text("OBH Invites")
                .font(.footnote)
                .foregroundStyle(Color.accentColor)
        }
        .padding()
    }
}

#Preview {
    ContentView()
}
