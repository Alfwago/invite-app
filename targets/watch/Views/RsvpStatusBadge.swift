import SwiftUI

/// The dominant, color-coded element on the main screen: current RSVP
/// status, filling most of the screen's width so it reads at a glance —
/// green Yes / red No / amber Maybe / gray No Response.
struct RsvpStatusBadge: View {
    let status: WatchRsvpStatus

    var body: some View {
        Text(status.label)
            .font(.system(.title3, design: .rounded, weight: .bold))
            .minimumScaleFactor(0.7)
            .lineLimit(1)
            .foregroundStyle(.black.opacity(0.85))
            .frame(maxWidth: .infinity)
            .padding(.vertical, 12)
            .background(status.color, in: RoundedRectangle(cornerRadius: 16, style: .continuous))
    }
}

#Preview {
    VStack(spacing: 8) {
        RsvpStatusBadge(status: .yes)
        RsvpStatusBadge(status: .no)
        RsvpStatusBadge(status: .maybe)
        RsvpStatusBadge(status: .noResponse)
    }
    .padding()
}
