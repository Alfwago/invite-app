import SwiftUI

/// Top of the main screen: night name right under the system time (the
/// first real line of content — no logo row above it), then date/time.
struct NightHeaderView: View {
    let nightName: String
    let date: String
    let startTime: String?

    var body: some View {
        VStack(alignment: .leading, spacing: 2) {
            Text(nightName)
                .font(.headline)
                .lineLimit(1)
                .minimumScaleFactor(0.8)
            Text(WatchDateFormatting.dateAndTime(date: date, startTime: startTime))
                .font(.caption2)
                .foregroundStyle(.secondary)
                .lineLimit(1)
                .minimumScaleFactor(0.8)
        }
        .frame(maxWidth: .infinity, alignment: .leading)
    }
}

#Preview {
    NightHeaderView(nightName: "Tuesday Night", date: "2026-09-15", startTime: "21:00:00")
}
