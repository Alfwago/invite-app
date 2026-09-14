import SwiftUI

/// Shown when the phone hasn't sent a next skate — e.g. no upcoming event,
/// or the watch app has never synced yet.
struct NoSkateView: View {
    var body: some View {
        VStack(spacing: 4) {
            Text("No Skate Scheduled")
                .font(.headline)
                .multilineTextAlignment(.center)
            Text("Check back after the next invite goes out.")
                .font(.caption2)
                .foregroundStyle(.secondary)
                .multilineTextAlignment(.center)
        }
        .padding()
    }
}

#Preview {
    NoSkateView()
}
