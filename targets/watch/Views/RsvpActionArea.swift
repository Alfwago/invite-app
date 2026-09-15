import SwiftUI

/// Below the status badge: if the player hasn't responded yet, the
/// Yes/No/Maybe row is immediately tappable. Once they have, it collapses
/// to a "Change RSVP" button — tapping it reveals the row again — mirroring
/// RsvpControls.tsx's locked/editing pattern on the phone (`editing` starts
/// false once a response exists, true otherwise).
struct RsvpActionArea: View {
    let current: WatchRsvpStatus
    let onSelect: (WatchRsvpStatus) -> Void
    @Binding var isEditing: Bool

    var body: some View {
        if current == .noResponse || isEditing {
            RsvpButtonRow(current: current) { status in
                onSelect(status)
                isEditing = false
            }
        } else {
            Button {
                isEditing = true
            } label: {
                Text("Change RSVP")
                    .font(.caption.weight(.bold))
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, 6)
            }
            .buttonStyle(.plain)
            .background(Color.gray.opacity(0.25), in: RoundedRectangle(cornerRadius: 10, style: .continuous))
        }
    }
}

#Preview {
    RsvpActionArea(current: .yes, onSelect: { _ in }, isEditing: .constant(false))
        .padding()
}
