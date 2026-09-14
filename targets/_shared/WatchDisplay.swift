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
}
