// The skate-day card's data. Three copies must stay identical — field names,
// types and the type name itself:
//   - here (the widget extension that draws the card),
//   - modules/skate-card/ios/SkateCardModule.swift (the phone app, which
//     starts cards and reports their push tokens),
//   - invite-server app/invitations/skate_card.py (card_attributes /
//     card_state, and ATTRIBUTES_TYPE = "SkateCardAttributes": APNs
//     push-to-start finds this type by name).

import ActivityKit
import Foundation

struct SkateCardAttributes: ActivityAttributes {
    public struct ContentState: Codable, Hashable {
        /// The viewer's RSVP ("YES", "MAYBE", "WAITLIST", "NO_RESPONSE").
        var myStatus: String?
        var skaters: Int
        var goalies: Int
        var capacity: Int?
        var goaliesNeeded: Int?
        /// "Gold" / "Black" once teams are pushed out, else nil.
        var team: String?
        /// "Wear your gold jersey." / "Wear a dark shirt."
        var jersey: String?
        /// The night board's newest post from the last 24h (skate_card.py
        /// board_message_fields); all nil = no board line.
        var messageAuthor: String?
        var messageText: String?
        var messageAt: Double?
    }

    var eventId: Int
    var name: String
    /// Puck drop, Unix seconds (not `Date`: ActivityKit's decoder would read
    /// a bare number as seconds since 2001).
    var startsAt: Double
    /// Bundled night logo key ("Monday"); nil/"" = the default OBH logo.
    var logo: String?
}
