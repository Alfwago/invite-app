import SwiftUI

/// Jersey color badge ("Gold — Wear your gold jersey"). Shown only when a
/// team assignment exists — the caller (ContentView) omits this view
/// entirely otherwise, rather than a placeholder line taking up space for
/// something that isn't available yet.
struct JerseyBadge: View {
    let assignment: WatchTeamAssignment

    var body: some View {
        HStack(alignment: .top, spacing: 6) {
            JerseyIcon(team: assignment.team)
                .padding(.top, 1)
            VStack(alignment: .leading, spacing: 0) {
                Text(assignment.team)
                    .font(.caption.weight(.bold))
                    .foregroundStyle(assignment.teamColor)
                // Wraps to a 2nd line rather than truncating — the jersey
                // text is an arbitrary server string (TeamAssignment.jersey)
                // and a full readable sentence beats a "Wear your gold…"
                // ellipsis on small watches.
                Text(assignment.jersey)
                    .font(.caption2)
                    .foregroundStyle(.secondary)
                    .lineLimit(2)
            }
            Spacer(minLength: 0)
        }
    }
}

#Preview {
    VStack(spacing: 12) {
        JerseyBadge(assignment: WatchTeamAssignment(team: "Gold", jersey: "Wear your gold jersey."))
        JerseyBadge(assignment: WatchTeamAssignment(team: "Black", jersey: "Wear a dark shirt."))
    }
    .padding()
}

/// Gold's jersey is gold. Black's is a black shirt with a gold outline so it
/// shows on the black face; a light gray shirt read as White (same as
/// JerseyIcon in TeamAssignmentCard.tsx).
private struct JerseyIcon: View {
    let team: String

    var body: some View {
        if team == "Gold" {
            Image(systemName: "tshirt.fill").foregroundStyle(WatchBrand.gold)
        } else {
            Image(systemName: "tshirt.fill")
                .foregroundStyle(.black)
                .overlay(Image(systemName: "tshirt").foregroundStyle(WatchBrand.gold))
        }
    }
}
