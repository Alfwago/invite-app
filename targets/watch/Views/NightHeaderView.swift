import SwiftUI

/// OBH logo + night name + date/time of the next skate — top of the main
/// screen.
struct NightHeaderView: View {
    let nightName: String
    let date: String
    let startTime: String?

    var body: some View {
        HStack(spacing: 6) {
            Image("obhLogo")
                .resizable()
                .scaledToFill()
                .frame(width: 22, height: 22)
                .clipShape(RoundedRectangle(cornerRadius: 5, style: .continuous))

            VStack(alignment: .leading, spacing: 1) {
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
        }
        .frame(maxWidth: .infinity, alignment: .leading)
    }
}

#Preview {
    NightHeaderView(nightName: "Tuesday Night", date: "2026-09-15", startTime: "21:00:00")
}
