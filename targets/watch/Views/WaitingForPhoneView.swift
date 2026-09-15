import SwiftUI

/// Shown before the watch has received anything from the phone at all —
/// distinct from NoSkateView, which means "synced, nothing upcoming".
struct WaitingForPhoneView: View {
    var body: some View {
        VStack(spacing: 6) {
            ProgressView()
            Text("Waiting for iPhone…")
                .font(.caption)
                .foregroundStyle(.secondary)
                .multilineTextAlignment(.center)
        }
        .padding()
    }
}

#Preview {
    WaitingForPhoneView()
}
