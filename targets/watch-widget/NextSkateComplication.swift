import SwiftUI
import WidgetKit

/// At-a-glance RSVP + jersey status for the watch face. Reads whatever the
/// watch app last wrote to the shared App Group container
/// (targets/_shared/WatchSharedStorage.swift) — this provider does no
/// networking and has no WatchConnectivity session of its own.
struct Provider: TimelineProvider {
    func placeholder(in context: Context) -> NextSkateEntry {
        NextSkateEntry(date: .now, skate: .preview)
    }

    func getSnapshot(in context: Context, completion: @escaping (NextSkateEntry) -> Void) {
        let skate: WatchNextSkate? = context.isPreview ? .preview : WatchSharedStorage.load()?.nextSkate
        completion(NextSkateEntry(date: .now, skate: skate))
    }

    func getTimeline(in context: Context, completion: @escaping (Timeline<NextSkateEntry>) -> Void) {
        let entry = NextSkateEntry(date: .now, skate: WatchSharedStorage.load()?.nextSkate)
        // Data changes are push-driven — the watch app calls
        // WidgetCenter.shared.reloadAllTimelines() itself whenever it
        // writes fresh data (NextSkateStore.update) — not time-based, so a
        // single entry with `.never` is correct and battery-friendly.
        completion(Timeline(entries: [entry], policy: .never))
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

    private var circular: some View {
        ZStack {
            AccessoryWidgetBackground()
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
        }
        .widgetAccentable()
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
            } else {
                Text("No Skate Scheduled")
                    .font(.headline)
                    .foregroundStyle(.secondary)
                    .lineLimit(2)
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
                Text("No skate scheduled")
            }
        }
    }

    private var corner: some View {
        Image(systemName: entry.skate?.myRsvp.symbolName ?? "calendar")
            .foregroundStyle(entry.skate?.myRsvp.color ?? .secondary)
            .widgetLabel {
                Text(entry.skate?.myRsvp.label ?? "No skate")
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
        .description("Your RSVP status and jersey color for the next skate.")
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
}
