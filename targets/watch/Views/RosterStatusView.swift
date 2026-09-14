import SwiftUI

/// Roster status for the skate — skaters and goalies, each a fill bar
/// colored the same green/amber/red as the phone's roster tiles (see
/// src/roster.ts). Shown once the player has RSVP'd; before that it isn't
/// specific to them yet, so the main screen stays focused on the RSVP
/// itself.
struct RosterStatusView: View {
    let roster: WatchRosterStats

    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            Text("ROSTER")
                .font(.caption2.weight(.bold))
                .foregroundStyle(.secondary)
                .tracking(0.5)

            RosterFillBar(
                label: "Skaters",
                value: roster.skaters,
                total: roster.capacity,
                pct: roster.skaterFillPct,
                tone: roster.skaterTone
            )
            RosterFillBar(
                label: "Goalies",
                value: roster.goalies,
                total: roster.goaliesNeeded,
                pct: roster.goalieFillPct,
                tone: roster.goalieTone
            )

            if roster.isFull {
                Text("Roster full")
                    .font(.caption2)
                    .foregroundStyle(WatchRosterStats.Health.good.color)
            }
        }
    }
}

#Preview {
    RosterStatusView(roster: .preview)
        .padding()
}

private extension WatchRosterStats {
    static let preview = WatchNextSkate.preview.rosterStats!
}
