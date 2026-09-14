import SwiftUI

/// Jersey color badge ("You're on Gold — wear your gold jersey"), or a
/// muted "Teams not set yet" line when the director hasn't published teams
/// for this event.
struct JerseyBadge: View {
    let assignment: WatchTeamAssignment?

    var body: some View {
        if let assignment {
            HStack(spacing: 6) {
                Image(systemName: "tshirt.fill")
                    .foregroundStyle(assignment.teamColor)
                VStack(alignment: .leading, spacing: 0) {
                    Text(assignment.team)
                        .font(.caption.weight(.bold))
                        .foregroundStyle(assignment.teamColor)
                    Text(assignment.jersey)
                        .font(.caption2)
                        .foregroundStyle(.secondary)
                        .lineLimit(1)
                        .minimumScaleFactor(0.8)
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
