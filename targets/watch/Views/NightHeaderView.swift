import SwiftUI

/// Top of the main screen: the OBH wordmark in the otherwise-unused
/// top-left corner (the system time already owns the top-right), then the
/// night name + date/time below, full width.
struct NightHeaderView: View {
    let nightName: String
    let date: String
    let startTime: String?

    var body: some View {
        VStack(alignment: .leading, spacing: 2) {
            // Sized to sit level with the system time in the top-right —
            // not a full banner row — so the night name is the first real
            // line of content, right under it.
            Image("obhLogo")
                .resizable()
                .scaledToFit()
                .frame(height: 18)

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
