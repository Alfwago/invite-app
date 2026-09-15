// SwiftUI display helpers (color, label, date formatting) shared by the
// watch app and, in step 4, the watch complication — both want the same
// RSVP-status and jersey presentation, so it lives here once instead of
// being duplicated across targets.
//
// Colors are lifted from src/theme.ts (which itself mirrors the website's
// theme.css) so the watch reads as the same product as the phone/website:
// green = going, red = not going, amber = maybe/caution, gray = no
// response yet. This intentionally differs from the app's roster-badge
// convention (src/theme.ts `rsvpColor`, where NO and NO_RESPONSE share the
// muted color) — that one is about roster health, this one is a decision
// indicator, same as the selected-choice colors in RsvpControls.tsx.

import SwiftUI

extension WatchRsvpStatus {
    var color: Color {
        switch self {
        case .yes: return Color(red: 0x33 / 255, green: 0xd1 / 255, blue: 0x7a / 255) // colors.green
        case .no: return Color(red: 0xff / 255, green: 0x5a / 255, blue: 0x5f / 255) // colors.red
        case .maybe, .waitlist: return Color(red: 0xf0 / 255, green: 0xa6 / 255, blue: 0x3a / 255) // colors.amber
        case .noResponse: return Color(red: 0x9a / 255, green: 0xa0 / 255, blue: 0xa6 / 255) // colors.textMuted
        }
    }

    var label: String {
        switch self {
        case .yes: return "Yes"
        case .no: return "No"
        case .maybe: return "Maybe"
        case .waitlist: return "Waitlist"
        case .noResponse: return "No Response"
        }
    }

    /// SF Symbol used by the complication (step 4) — system-tinted on
    /// accented/vibrant watch faces, full `color` above only shows through
    /// on faces that render complications in full color.
    var symbolName: String {
        switch self {
        case .yes: return "checkmark.circle.fill"
        case .no: return "xmark.circle.fill"
        case .maybe: return "questionmark.circle.fill"
        case .waitlist: return "list.number"
        case .noResponse: return "circle.dashed"
        }
    }
}

extension WatchRosterStats {
    /// Mirrors src/roster.ts's `Health` — green/amber/red read on a roster
    /// stat, reused by both bars below.
    enum Health {
        case good, caution, bad

        var color: Color {
            switch self {
            case .good: return Color(red: 0x33 / 255, green: 0xd1 / 255, blue: 0x7a / 255) // colors.green
            case .caution: return Color(red: 0xf0 / 255, green: 0xa6 / 255, blue: 0x3a / 255) // colors.amber
            case .bad: return Color(red: 0xff / 255, green: 0x5a / 255, blue: 0x5f / 255) // colors.red
            }
        }
    }

    /// Skaters bar tone — its own fill only, independent of goalie status:
    /// green once full, amber while skater spots remain, green otherwise.
    var skaterTone: Health {
        if isFull { return .good }
        if let skaterSpotsOpen, skaterSpotsOpen > 0 { return .caution }
        return .good
    }

    /// Goalies bar tone: red while 1-or-fewer goalies are in (still short).
    /// Once goalies are covered, goalie status stops being its own concern
    /// and the bar just rides along with the Skaters bar's color instead
    /// of going flat green.
    var goalieTone: Health {
        if let goalieSpotsOpen, goalieSpotsOpen > 0 { return .bad }
        return skaterTone
    }

    /// Mirrors src/roster.ts's `rosterHealth` exactly — the one combined
    /// read the complication's ring uses, matching the phone's own single
    /// FillBar. Identical to `goalieTone` (goalie shortage always wins,
    /// otherwise it's the Skaters bar's own tone) — named separately here
    /// since the two bars above and the single-color complication ring are
    /// conceptually different call sites.
    var overallHealth: Health { goalieTone }

    /// Mirrors src/roster.ts's `fillPct` — nil when capacity is unknown.
    var skaterFillPct: Double? {
        guard let capacity, capacity > 0 else { return nil }
        return Double(skaters) / Double(capacity) * 100
    }

    /// No phone equivalent (the website/app only bar the skaters fill) —
    /// added here since the watch shows a Goalies bar too.
    var goalieFillPct: Double? {
        guard let goaliesNeeded, goaliesNeeded > 0 else { return nil }
        return Double(goalies) / Double(goaliesNeeded) * 100
    }
}

extension WatchTeamAssignment {
    /// Gold ≈ league gold; Black ≈ a light neutral gray so it reads on a
    /// black watch face — same reasoning as TeamAssignmentCard.tsx.
    var teamColor: Color {
        team == "Gold"
            ? Color(red: 0xd4 / 255, green: 0xaf / 255, blue: 0x37 / 255) // colors.gold
            : Color(red: 0xc9 / 255, green: 0xce / 255, blue: 0xd3 / 255) // TEAM_TINT.Black
    }
}

enum WatchDateFormatting {
    /// "2026-09-15" + "21:00:00" -> "Tue, Sep 15 · 9:00 PM". Falls back to
    /// the raw date string if either fails to parse — the server always
    /// sends YYYY-MM-DD / HH:MM:SS, but a watch face is the wrong place to
    /// crash on a malformed payload.
    static func dateAndTime(date: String, startTime: String?) -> String {
        guard let day = isoDateFormatter.date(from: date) else { return date }
        let dateText = displayDateFormatter.string(from: day)
        guard let startTime, let time = isoTimeFormatter.date(from: startTime) else {
            return dateText
        }
        return "\(dateText) · \(displayTimeFormatter.string(from: time))"
    }

    /// "2026-09-15" -> "Tue" — the compact form the inline complication
    /// (step 4) uses; there's no room there for a full night name.
    static func shortWeekday(date: String) -> String? {
        guard let day = isoDateFormatter.date(from: date) else { return nil }
        return shortWeekdayFormatter.string(from: day)
    }

    // Date-only formatters are pinned to UTC so parsing/formatting a bare
    // YYYY-MM-DD never shifts to the previous/next day under a local
    // timezone offset. Time-of-day formatters use the device's default
    // timezone on both ends, which is a no-op — they only reformat the
    // wall-clock string, never convert it.
    private static let isoDateFormatter: DateFormatter = {
        let f = DateFormatter()
        f.dateFormat = "yyyy-MM-dd"
        f.timeZone = TimeZone(identifier: "UTC")
        return f
    }()

    private static let isoTimeFormatter: DateFormatter = {
        let f = DateFormatter()
        f.dateFormat = "HH:mm:ss"
        return f
    }()

    private static let displayDateFormatter: DateFormatter = {
        let f = DateFormatter()
        f.dateFormat = "EEE, MMM d"
        f.timeZone = TimeZone(identifier: "UTC")
        return f
    }()

    private static let displayTimeFormatter: DateFormatter = {
        let f = DateFormatter()
        f.dateFormat = "h:mm a"
        return f
    }()

    private static let shortWeekdayFormatter: DateFormatter = {
        let f = DateFormatter()
        f.dateFormat = "EEE"
        f.timeZone = TimeZone(identifier: "UTC")
        return f
    }()
}
