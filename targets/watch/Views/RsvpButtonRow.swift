import SwiftUI

/// One-tap Yes / No / Maybe row. The current choice is filled with its
/// status color; the others sit dim until tapped.
struct RsvpButtonRow: View {
    let current: WatchRsvpStatus
    let onSelect: (WatchRsvpStatus) -> Void

    private let choices: [WatchRsvpStatus] = [.yes, .no, .maybe]

    var body: some View {
        HStack(spacing: 6) {
            ForEach(choices, id: \.self) { choice in
                Button {
                    onSelect(choice)
                } label: {
                    Text(choice.label)
                        .font(.caption.weight(.bold))
                        .minimumScaleFactor(0.8)
                        .lineLimit(1)
                        .frame(maxWidth: .infinity)
                        .padding(.vertical, 8)
                }
                .buttonStyle(.plain)
                .background(
                    current == choice ? choice.color : Color.gray.opacity(0.25),
                    in: RoundedRectangle(cornerRadius: 10, style: .continuous)
                )
                .foregroundStyle(current == choice ? .black.opacity(0.85) : .primary)
            }
        }
    }
}

#Preview {
    RsvpButtonRow(current: .maybe) { _ in }
        .padding()
}
