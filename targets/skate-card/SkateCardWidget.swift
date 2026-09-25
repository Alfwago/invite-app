// Lock Screen + Dynamic Island UI for the skate-day card: the night's logo,
// skate name, start time, one roster status pill, the app's fill bar, the
// counts, the player's jersey once teams are picked, and the night board's
// newest post from the last 24h.
//
// Every color / size here is the app's (src/theme.ts, src/components/ui.tsx,
// src/components/EventCard.tsx) and the status rules are src/roster.ts's, so
// the card reads the same as the Home screen's event card.

import ActivityKit
import SwiftUI
import WidgetKit

@main
struct SkateCardBundle: WidgetBundle {
    var body: some Widget {
        SkateCardLiveActivity()
    }
}

// MARK: - Palette (src/theme.ts)

private enum Palette {
    static let card = Color(hex: 0x0a0a0a)
    static let text = Color.white
    static let textMuted = Color(hex: 0x9aa0a6)
    static let gold = Color(hex: 0xd4af37)
    static let green = Color(hex: 0x33d17a)
    static let greenDim = Color(hex: 0x00140a)
    static let amber = Color(hex: 0xf0a63a)
    static let amberDim = Color(hex: 0x2a1a05)
    static let red = Color(hex: 0xff5a5f)
    static let redDim = Color(hex: 0x1a0000)
    static let fillTrack = Color(hex: 0x1f1f1f)
    /// TEAM_TINT.Black in src/components/TeamAssignmentCard.tsx.
    static let blackTeam = Color(hex: 0xc9ced3)
}

private extension Color {
    init(hex: UInt32) {
        self.init(
            red: Double((hex >> 16) & 0xff) / 255,
            green: Double((hex >> 8) & 0xff) / 255,
            blue: Double(hex & 0xff) / 255
        )
    }
}

// MARK: - Card data → display

extension SkateCardAttributes {
    var startDate: Date { Date(timeIntervalSince1970: startsAt) }

    var eventURL: URL? { URL(string: "obhinvites://event/\(eventId)") }

    /// Bundled asset for the night logo (Assets.xcassets/logo-*.imageset).
    var logoAsset: String {
        guard let logo, !logo.isEmpty, UIImage(named: "logo-\(logo)") != nil else { return "logo-default" }
        return "logo-\(logo)"
    }
}

private enum Tone {
    case good, caution, bad

    var color: Color {
        switch self {
        case .good: return Palette.green
        case .caution: return Palette.amber
        case .bad: return Palette.red
        }
    }

    var dim: Color {
        switch self {
        case .good: return Palette.greenDim
        case .caution: return Palette.amberDim
        case .bad: return Palette.redDim
        }
    }
}

extension SkateCardAttributes.ContentState {
    var isFull: Bool { capacity.map { skaters >= $0 } ?? false }
    var skaterSpotsOpen: Int? { capacity.map { max($0 - skaters, 0) } }
    var goalieSpotsOpen: Int? { goaliesNeeded.map { max($0 - goalies, 0) } }

    /// rosterHealth() in src/roster.ts — needing goalies is always red.
    fileprivate var health: Tone {
        if let open = goalieSpotsOpen, open > 0 { return .bad }
        if isFull { return .good }
        if let open = skaterSpotsOpen, open > 0 { return .caution }
        return .good
    }

    /// rosterBadges() in src/roster.ts, cut to the single most severe.
    fileprivate var rosterPill: (label: String, tone: Tone)? {
        if let open = goalieSpotsOpen, open > 0 { return ("NEED GOALIES", .bad) }
        if isFull { return ("FULL", .good) }
        if let open = skaterSpotsOpen, open > 0 { return ("NEED SKATERS", .caution) }
        return nil
    }

    /// A player who isn't a Yes sees their own status instead — a green
    /// FULL would otherwise read as if they're playing.
    fileprivate var personalPill: (label: String, tone: Tone)? {
        switch myStatus {
        case "WAITLIST": return ("WAITLIST", .caution)
        case "MAYBE": return ("MAYBE", .caution)
        case "NO_RESPONSE": return ("NOT ANSWERED", .caution)
        default: return nil
        }
    }

    /// EventCard.tsx's roster line, e.g. "13/16 skaters · 1/2 G".
    var countsLine: String {
        let skaterPart = capacity.map { "\(skaters)/\($0) skaters" } ?? "\(skaters) skaters"
        let goaliePart = goaliesNeeded.map { " · \(goalies)/\($0) G" } ?? ""
        return skaterPart + goaliePart
    }

    var hasBoardLine: Bool {
        !(messageText ?? "").isEmpty && !(messageAuthor ?? "").isEmpty
    }

    /// fillPct() in src/roster.ts, as 0...1; nil when capacity is unknown.
    var fill: Double? {
        guard let capacity, capacity > 0 else { return nil }
        return min(Double(skaters) / Double(capacity), 1)
    }
}

// MARK: - Widget

struct SkateCardLiveActivity: Widget {
    var body: some WidgetConfiguration {
        ActivityConfiguration(for: SkateCardAttributes.self) { context in
            LockScreenCard(attributes: context.attributes, state: context.state, isStale: context.isStale)
                .activityBackgroundTint(Palette.card)
                .activitySystemActionForegroundColor(Palette.text)
                .widgetURL(context.attributes.eventURL)
        } dynamicIsland: { context in
            DynamicIsland {
                DynamicIslandExpandedRegion(.leading) {
                    LogoTile(asset: context.attributes.logoAsset, size: 44)
                }
                DynamicIslandExpandedRegion(.trailing) {
                    Text(context.attributes.startDate, style: .time)
                        .font(.system(size: 16, weight: .semibold))
                        .foregroundStyle(Palette.text)
                }
                DynamicIslandExpandedRegion(.center) {
                    Text(context.attributes.name)
                        .font(.system(size: 16, weight: .bold))
                        .foregroundStyle(Palette.text)
                        .lineLimit(1)
                }
                DynamicIslandExpandedRegion(.bottom) {
                    VStack(alignment: .leading, spacing: 8) {
                        if let fill = context.state.fill {
                            FillBar(fill: fill, tone: context.state.health)
                        }
                        HStack {
                            Text(context.state.countsLine)
                                .font(.system(size: 13).monospacedDigit())
                                .foregroundStyle(Palette.text)
                            Spacer()
                            JerseyBadge(state: context.state, compact: true)
                        }
                    }
                }
            } compactLeading: {
                // The mascot art shrinks to a white blob this small, so the
                // compact slots keep the gold hockey figure.
                Image(systemName: "figure.hockey")
                    .foregroundStyle(Palette.gold)
            } compactTrailing: {
                Text(context.attributes.startDate, style: .time)
                    .font(.caption2)
                    .foregroundStyle(Palette.text)
            } minimal: {
                if let team = context.state.team {
                    JerseySwatch(team: team, size: 14)
                } else {
                    Image(systemName: "figure.hockey")
                        .foregroundStyle(Palette.gold)
                }
            }
            .widgetURL(context.attributes.eventURL)
        }
    }
}

private struct LockScreenCard: View {
    let attributes: SkateCardAttributes
    let state: SkateCardAttributes.ContentState
    let isStale: Bool

    private var pill: (label: String, tone: Tone)? {
        // After puck drop recruiting is over: no need-pills.
        state.personalPill ?? (isStale ? nil : state.rosterPill)
    }

    // Lock Screen Live Activities cap out around 160pt tall; with a board
    // line the card tightens (logo 52→44, padding 16→14, gaps 8→6) to fit.
    private var tight: Bool { state.hasBoardLine }

    var body: some View {
        VStack(alignment: .leading, spacing: tight ? 6 : 8) {
            HStack(alignment: .center, spacing: 12) {
                LogoTile(asset: attributes.logoAsset, size: tight ? 44 : 52)
                VStack(alignment: .leading, spacing: 2) {
                    Text(attributes.name.uppercased())
                        .font(.system(size: 16, weight: .bold))
                        .foregroundStyle(Palette.text)
                        .lineLimit(1)
                    timeLine
                        .font(.system(size: 18, weight: .semibold))
                        .foregroundStyle(Palette.text)
                }
                Spacer(minLength: 8)
                if let pill {
                    StatusPill(label: pill.label, tone: pill.tone)
                }
            }
            if let fill = state.fill {
                FillBar(fill: fill, tone: state.health)
            }
            HStack(alignment: .center) {
                Text(state.countsLine)
                    .font(.system(size: 13).monospacedDigit())
                    .foregroundStyle(Palette.text)
                Spacer(minLength: 8)
                JerseyBadge(state: state, compact: false)
            }
            if tight, let author = state.messageAuthor, let text = state.messageText {
                BoardLine(author: author, text: text)
            }
        }
        .padding(tight ? 14 : 16)
        .background(RinkBackground())
    }

    @ViewBuilder private var timeLine: some View {
        if isStale {
            Text("Started ") + Text(attributes.startDate, style: .time)
        } else {
            Text(attributes.startDate, style: .time)
        }
    }
}

// MARK: - Pieces

/// The night logo. The art is full color on a white square, so it sits on a
/// white rounded tile (radius.md) rather than being cropped.
private struct LogoTile: View {
    let asset: String
    let size: CGFloat

    var body: some View {
        Image(asset)
            .resizable()
            .scaledToFit()
            .padding(size >= 52 ? 4 : 3)
            .frame(width: size, height: size)
            .background(Color.white, in: RoundedRectangle(cornerRadius: 10, style: .continuous))
    }
}

/// The night board's newest post: "💬 Mike R.: Anyone have a spare stick?"
private struct BoardLine: View {
    let author: String
    let text: String

    var body: some View {
        HStack(spacing: 6) {
            Image(systemName: "bubble.left.fill")
                .font(.system(size: 11))
                .foregroundStyle(Palette.gold)
            (Text(author + ": ").font(.system(size: 13, weight: .semibold)).foregroundColor(Palette.text)
                + Text(text).font(.system(size: 13)).foregroundColor(Palette.textMuted))
                .lineLimit(1)
                .truncationMode(.tail)
        }
    }
}

/// Badge in src/components/ui.tsx.
private struct StatusPill: View {
    let label: String
    let tone: Tone

    var body: some View {
        Text(label)
            .font(.system(size: 12, weight: .bold))
            .foregroundStyle(tone.color)
            .lineLimit(1)
            .fixedSize()
            .padding(.vertical, 3)
            .padding(.horizontal, 8)
            .background(tone.dim, in: Capsule())
            .overlay(Capsule().stroke(tone.color, lineWidth: 1))
    }
}

/// FillBar in src/components/ui.tsx.
private struct FillBar: View {
    let fill: Double
    let tone: Tone

    var body: some View {
        GeometryReader { geo in
            ZStack(alignment: .leading) {
                Capsule().fill(Palette.fillTrack)
                if fill > 0 {
                    Capsule().fill(tone.color)
                        .frame(width: max(geo.size.width * fill, 8))
                }
            }
        }
        .frame(height: 8)
    }
}

/// The jersey slot: "TBA" until teams are picked, then the player's team
/// color and what to wear. Waitlisted players are told they're not on yet.
private struct JerseyBadge: View {
    let state: SkateCardAttributes.ContentState
    let compact: Bool

    var body: some View {
        HStack(spacing: 8) {
            JerseySwatch(team: state.team, size: 18)
            VStack(alignment: .leading, spacing: 0) {
                if let team = state.team {
                    Text(team)
                        .font(.system(size: 13, weight: .semibold))
                        .foregroundStyle(Palette.text)
                    if !compact, let jersey = state.jersey {
                        Text(jersey)
                            .font(.system(size: 11))
                            .foregroundStyle(Palette.textMuted)
                            .lineLimit(1)
                    }
                } else {
                    Text("Jersey: TBA")
                        .font(.system(size: 13, weight: .semibold))
                        .foregroundStyle(Palette.textMuted)
                    if !compact {
                        Text(state.myStatus == "WAITLIST" ? "You're on the waitlist" : "Teams not picked yet")
                            .font(.system(size: 11))
                            .foregroundStyle(Palette.textMuted)
                            .lineLimit(1)
                    }
                }
            }
        }
    }
}

private struct JerseySwatch: View {
    let team: String?
    let size: CGFloat

    var body: some View {
        switch team {
        case "Gold":
            Circle().fill(Palette.gold).frame(width: size, height: size)
        case "Black":
            Circle().fill(Palette.blackTeam).frame(width: size, height: size)
        default:
            Circle().stroke(Palette.textMuted, style: StrokeStyle(lineWidth: 1.5, dash: [3, 2]))
                .frame(width: size, height: size)
        }
    }
}

/// Faint rink markings: a red center line and a gold faceoff circle bleeding
/// off the right edge, under a gradient that keeps the bottom row clean.
private struct RinkBackground: View {
    var body: some View {
        GeometryReader { geo in
            ZStack {
                Palette.card
                Rectangle()
                    .fill(Palette.red.opacity(0.10))
                    .frame(width: 3)
                    .position(x: geo.size.width * 0.38, y: geo.size.height / 2)
                Circle()
                    .stroke(Palette.gold.opacity(0.12), lineWidth: 1.5)
                    .frame(width: 150, height: 150)
                    .position(x: geo.size.width, y: geo.size.height / 2)
                LinearGradient(
                    colors: [.black.opacity(0), .black.opacity(0.5)],
                    startPoint: .top,
                    endPoint: .bottom
                )
            }
        }
    }
}
