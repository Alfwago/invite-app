import SwiftUI

/// Night name + date/time of the next skate — top of the main screen.
struct NightHeaderView: View {
    let nightName: String
    let date: String
    let startTime: String?

    var body: some View {
        VStack(spacing: 2) {
            Text(nightName)
                .font(.headline)
                .lineLimit(1)
                .minimumScaleFactor(0.8)
            Text(WatchDateFormatting.dateAndTime(date: date, startTime: startTime))
                .font(.caption2)
                .foregroundStyle(.secondary)
        }
        .multilineTextAlignment(.center)
    }
}

#Preview {
    NightHeaderView(nightName: "Tuesday Night", date: "2026-09-15", startTime: "21:00:00")
}
