// Model types shared between the main iOS app, the watchOS app, and the
// watch complication (WidgetKit) target — every target under `targets/`
// picks these up automatically via the `_shared` convention
// (@bacons/apple-targets links `targets/_shared/*` into every target).
//
// These are a deliberately small mirror of the server shapes in
// src/api/types.ts — just the fields the watch experience needs, not the
// full EventSummary/TeamAssignment. Raw values match the server's JSON
// strings exactly so payloads decode directly without translation.
// Keep in sync with src/api/types.ts when the server/app shapes change.

import Foundation

/// Mirrors `RsvpStatus` in src/api/types.ts.
public enum WatchRsvpStatus: String, Codable, Sendable {
    case yes = "YES"
    case no = "NO"
    case maybe = "MAYBE"
    case waitlist = "WAITLIST"
    case noResponse = "NO_RESPONSE"
}

/// Mirrors the two fields of `TeamAssignment` (src/api/types.ts) the watch
/// displays. `team` is "Gold" or "Black".
public struct WatchTeamAssignment: Codable, Sendable, Equatable {
    public let team: String
    public let jersey: String

    public init(team: String, jersey: String) {
        self.team = team
        self.jersey = jersey
    }
}

/// The slice of `EventSummary` (src/api/types.ts) the watch face needs for
/// the viewer's next skate.
public struct WatchNextSkate: Codable, Sendable, Equatable {
    public let eventId: Int
    public let nightName: String
    public let date: String // YYYY-MM-DD
    public let startTime: String? // HH:MM:SS, nil = no time set
    public let myRsvp: WatchRsvpStatus
    public let teamAssignment: WatchTeamAssignment?

    public init(
        eventId: Int,
        nightName: String,
        date: String,
        startTime: String?,
        myRsvp: WatchRsvpStatus,
        teamAssignment: WatchTeamAssignment?
    ) {
        self.eventId = eventId
        self.nightName = nightName
        self.date = date
        self.startTime = startTime
        self.myRsvp = myRsvp
        self.teamAssignment = teamAssignment
    }
}

/// Top-level payload the phone pushes to the watch (WatchConnectivity
/// `updateApplicationContext`, see step 3) and that the complication's
/// timeline provider reads back out of the shared App Group container
/// (see step 4). `nextSkate == nil` means nothing upcoming — the watch
/// shows a "No skate scheduled" state rather than stale data.
public struct WatchPayload: Codable, Sendable, Equatable {
    public let nextSkate: WatchNextSkate?
    public let updatedAt: Date

    public init(nextSkate: WatchNextSkate?, updatedAt: Date = Date()) {
        self.nextSkate = nextSkate
        self.updatedAt = updatedAt
    }
}
