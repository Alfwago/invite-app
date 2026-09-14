import SwiftUI

/// Jersey color badge ("You're on Gold — wear your gold jersey"), or a
/// muted "Teams not set yet" line when the director hasn't published teams
/// for this event.
struct JerseyBadge: View {
    let assignment: WatchTeamAssignment?

    var body: some View {
        if let assignment {
            HStack(alignment: .top, spacing: 6) {
                Image(systemName: "tshirt.fill")
                    .foregroundStyle(assignment.teamColor)
                    .padding(.top, 1)
                VStack(alignment: .leading, spacing: 0) {
                    Text(assignment.team)
                        .font(.caption.weight(.bold))
                        .foregroundStyle(assignment.teamColor)
                    // Wraps to a 2nd line rather than truncating — the
                    // jersey text is an arbitrary server string
                    // (TeamAssignment.jersey) and a full readable sentence
                    // beats a "Wear your gold…" ellipsis on small watches.
                    Text(assignment.jersey)
                        .font(.caption2)
                        .foregroundStyle(.secondary)
                        .lineLimit(2)
                }
                Spacer(minLength: 0)
            }
        } else {
            Text("Teams not set yet")
                .font(.caption2)
                .foregroundStyle(.secondary)
        }
    }
}

#Preview {
    VStack(spacing: 12) {
        JerseyBadge(assignment: WatchTeamAssignment(team: "Gold", jersey: "Wear your gold jersey."))
        JerseyBadge(assignment: WatchTeamAssignment(team: "Black", jersey: "Wear a dark shirt."))
        JerseyBadge(assignment: nil)
    }
    .padding()
}
