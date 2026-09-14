import SwiftUI

/// A compact fill bar for one roster stat — condensed for the watch from
/// src/components/ui.tsx's FillBar (paired with the raw count, same rule:
/// the bar alone isn't enough).
struct RosterFillBar: View {
    let label: String
    let value: Int
    let total: Int?
    let pct: Double?
    let tone: WatchRosterStats.Health

    var body: some View {
        VStack(alignment: .leading, spacing: 2) {
            HStack {
                Text(label)
                    .font(.caption2.weight(.semibold))
                Spacer()
                Text(total != nil ? "\(value)/\(total!)" : "\(value)")
                    .font(.caption2)
                    .foregroundStyle(.secondary)
            }
            GeometryReader { geo in
                ZStack(alignment: .leading) {
                    Capsule()
                        .fill(Color.gray.opacity(0.25))
                    let fraction = min(max((pct ?? 0) / 100, 0), 1)
                    if fraction > 0 {
                        Capsule()
                            .fill(tone.color)
                            .frame(width: geo.size.width * fraction)
                    }
                }
            }
            .frame(height: 5)
        }
    }
}

#Preview {
    VStack(spacing: 10) {
        RosterFillBar(label: "Skaters", value: 12, total: 16, pct: 75, tone: .caution)
        RosterFillBar(label: "Goalies", value: 1, total: 2, pct: 50, tone: .bad)
    }
    .padding()
}
