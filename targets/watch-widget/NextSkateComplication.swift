import SwiftUI
import WidgetKit

/// At-a-glance RSVP + jersey status for the watch face. Reads whatever the
/// watch app last wrote to the shared App Group container
/// (targets/_shared/WatchSharedStorage.swift) — this provider does no
/// networking and has no WatchConnectivity session of its own.
struct Provider: TimelineProvider {
    /// The stored skate, unless it's already happened — then it's the
    /// "no skate" state until the phone pushes the next one.
    private func currentSkate() -> WatchNextSkate? {
        guard let skate = WatchSharedStorage.load()?.nextSkate else { return nil }
        return WatchDateFormatting.isPast(date: skate.date) ? nil : skate
    }

    func placeholder(in context: Context) -> NextSkateEntry {
        NextSkateEntry(date: .now, skate: .preview)
    }

    func getSnapshot(in context: Context, completion: @escaping (NextSkateEntry) -> Void) {
        let skate: WatchNextSkate? = context.isPreview ? .preview : currentSkate()
        completion(NextSkateEntry(date: .now, skate: skate))
    }

    func getTimeline(in context: Context, completion: @escaping (Timeline<NextSkateEntry>) -> Void) {
        let skate = currentSkate()
        let entry = NextSkateEntry(date: .now, skate: skate)
        // Data changes are push-driven — the watch app calls
        // WidgetCenter.shared.reloadAllTimelines() itself whenever it
        // writes fresh data (NextSkateStore.update). The one time-based
        // change is a skate's day ending: with a skate showing, reload at
        // the next local midnight so it flips to the "no skate" look.
        // With no skate there's nothing to expire, so `.never`.
        let policy: TimelineReloadPolicy =
            skate == nil ? .never : .after(WatchDateFormatting.nextLocalMidnight())
        completion(Timeline(entries: [entry], policy: policy))
    }
}

struct NextSkateEntry: TimelineEntry {
    let date: Date
    let skate: WatchNextSkate?
}

struct NextSkateComplicationView: View {
    @Environment(\.widgetFamily) var family
    var entry: Provider.Entry

    var body: some View {
        switch family {
        case .accessoryCircular:
            circular
        case .accessoryRectangular:
            rectangular
        case .accessoryInline:
            inline
        case .accessoryCorner:
            corner
        default:
            rectangular
        }
    }

    // Ring around the circular complication: roster fullness (skaters
    // filled / capacity — the same number the phone's own single FillBar
    // and the watch app's "Skaters" bar use), toned the same green/amber/
    // red as everywhere else roster health shows up.
    private var rosterFraction: Double {
        guard let pct = entry.skate?.rosterStats?.skaterFillPct else { return 0 }
        return min(max(pct / 100, 0), 1)
    }

    private var rosterTint: Color {
        entry.skate?.rosterStats?.overallHealth.color ?? .gray
    }

    // "No skate" look, shared by every family: a hockey figure in a muted
    // tone. Deliberately not the RSVP calendar icon + an empty roster ring
    // — an empty ring reads as "0% full", not "nothing scheduled".
    private static let noSkateSymbol = "figure.hockey"

    private var noSkateCircular: some View {
        ZStack {
            AccessoryWidgetBackground()
            VStack(spacing: 1) {
                Image(systemName: Self.noSkateSymbol)
                    .font(.title3)
                Text("No skate")
                    .font(.system(size: 8, weight: .semibold))
                    .minimumScaleFactor(0.7)
                    .lineLimit(1)
            }
            .foregroundStyle(.secondary)
            .widgetAccentable()
        }
    }

    @ViewBuilder
    private var circular: some View {
        if entry.skate == nil {
            noSkateCircular
        } else {
            rosterCircular
        }
    }

    private var rosterCircular: some View {
        Gauge(value: rosterFraction) {
            EmptyView()
        } currentValueLabel: {
            VStack(spacing: 1) {
                Image(systemName: entry.skate?.myRsvp.symbolName ?? "calendar")
                    .font(.title3)
                    .foregroundStyle(entry.skate?.myRsvp.color ?? .secondary)
                if let team = entry.skate?.teamAssignment?.team {
                    Text(String(team.prefix(1)))
                        .font(.system(size: 9, weight: .bold))
                        .foregroundStyle(entry.skate?.teamAssignment?.teamColor ?? .secondary)
                }
            }
            .widgetAccentable()
        }
        .gaugeStyle(.accessoryCircularCapacity)
        .tint(rosterTint)
    }

    private var rectangular: some View {
        VStack(alignment: .leading, spacing: 2) {
            if let skate = entry.skate {
                Text(skate.nightName)
                    .font(.headline)
                    .lineLimit(1)
                HStack(spacing: 4) {
                    Image(systemName: skate.myRsvp.symbolName)
                        .foregroundStyle(skate.myRsvp.color)
                    Text(skate.myRsvp.label)
                    if let team = skate.teamAssignment?.team {
                        Text("· \(team)")
                            .foregroundStyle(skate.teamAssignment?.teamColor ?? .secondary)
                    }
                }
                .font(.caption2)
                .foregroundStyle(.secondary)
                .lineLimit(1)

                // Same roster-fullness bar as the circular ring — shown
                // once rosterStats exists (i.e. once the player's RSVP'd).
                if skate.rosterStats != nil {
                    Gauge(value: rosterFraction) { EmptyView() }
                        .gaugeStyle(.accessoryLinearCapacity)
                        .tint(rosterTint)
                }
            } else {
                HStack(spacing: 6) {
                    Image(systemName: Self.noSkateSymbol)
                        .font(.title2)
                    VStack(alignment: .leading, spacing: 1) {
                        Text("No Skate")
                            .font(.headline)
                        Text("Nothing scheduled")
                            .font(.caption2)
                    }
                }
                .foregroundStyle(.secondary)
                .lineLimit(1)
                .widgetAccentable()
            }
        }
    }

    private var inline: some View {
        Group {
            if let skate = entry.skate {
                let day = WatchDateFormatting.shortWeekday(date: skate.date) ?? skate.nightName
                if let team = skate.teamAssignment?.team {
                    Text("\(day): \(skate.myRsvp.label) · \(team)")
                } else {
                    Text("\(day): \(skate.myRsvp.label)")
                }
            } else {
                Label("No skate scheduled", systemImage: Self.noSkateSymbol)
            }
        }
    }

    private var corner: some View {
        Image(systemName: entry.skate?.myRsvp.symbolName ?? Self.noSkateSymbol)
            .foregroundStyle(entry.skate?.myRsvp.color ?? .secondary)
            .widgetLabel {
                // Same roster-fullness bar as the other families, curved
                // around the corner — once rosterStats exists (RSVP'd),
                // that's more useful there than repeating the RSVP label
                // the icon already shows.
                if entry.skate?.rosterStats != nil {
                    Gauge(value: rosterFraction) { EmptyView() }
                        .gaugeStyle(.accessoryLinearCapacity)
                        .tint(rosterTint)
                } else {
                    Text(entry.skate?.myRsvp.label ?? "No skate")
                }
            }
    }
}

struct NextSkateComplication: Widget {
    let kind = "OBHNextSkateComplication"

    var body: some WidgetConfiguration {
        StaticConfiguration(kind: kind, provider: Provider()) { entry in
            NextSkateComplicationView(entry: entry)
                .containerBackground(.fill.tertiary, for: .widget)
        }
        .configurationDisplayName("Next Skate")
        .description("Your RSVP status and jersey color for the next skate, or a hockey icon when nothing is scheduled.")
        .supportedFamilies([
            .accessoryCircular,
            .accessoryRectangular,
            .accessoryInline,
            .accessoryCorner,
        ])
    }
}

#Preview("Circular", as: .accessoryCircular) {
    NextSkateComplication()
} timeline: {
    NextSkateEntry(date: .now, skate: .preview)
    NextSkateEntry(date: .now, skate: nil)
}

#Preview("Rectangular", as: .accessoryRectangular) {
    NextSkateComplication()
} timeline: {
    NextSkateEntry(date: .now, skate: .preview)
    NextSkateEntry(date: .now, skate: nil)
}

#Preview("Inline", as: .accessoryInline) {
    NextSkateComplication()
} timeline: {
    NextSkateEntry(date: .now, skate: .preview)
    NextSkateEntry(date: .now, skate: nil)
}

#Preview("Corner", as: .accessoryCorner) {
    NextSkateComplication()
} timeline: {
    NextSkateEntry(date: .now, skate: .preview)
    NextSkateEntry(date: .now, skate: nil)
}
