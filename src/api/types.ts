// Shapes returned by the invite-server mobile API (invitations/api/serializers.py).
// Keep in sync with that module when the server changes.

export type RsvpStatus = "YES" | "NO" | "MAYBE" | "WAITLIST" | "NO_RESPONSE";
export type EventStatus = "DRAFT" | "OPEN" | "CLOSED" | "COMPLETED";

export interface Night {
  id: number;
  name: string;
  weekday: number; // 1=Sun … 7=Sat
}

export interface Me {
  id: number;
  username: string;
  email: string;
  first_name: string;
  last_name: string;
  full_name: string;
  is_director: boolean;
  is_goalie: boolean;
  is_goalie_skater: boolean;
  is_non_playing: boolean;
  director_approved: boolean;
  email_verified: boolean;
  phone_number: string;
  sms_opt_in: boolean;
}

export interface RosterStats {
  yes: number;
  no: number;
  maybe: number;
  waitlist: number;
  no_response: number;
  guest_yes: number;
  day_players: number;
  skaters: number;
  goalies: number;
  capacity: number | null;
  goalies_needed: number | null;
  skater_spots_open: number | null;
  goalie_spots_open: number | null;
  is_full: boolean;
  rsvp_locked: boolean;
  goalie_rsvp_locked: boolean;
}

export interface MyRsvp {
  status: RsvpStatus;
  is_goalie: boolean;
  guest_count: number;
  is_beer_guy: boolean;
  is_whiskey_guy: boolean;
  responded_at: string | null;
}

export interface EventSummary {
  id: number;
  public_id: string;
  title: string;
  display_name: string;
  date: string; // YYYY-MM-DD
  start_time: string | null; // HH:MM:SS
  location: string;
  status: EventStatus;
  night: { id: number; name: string } | null;
  roster: RosterStats;
  my_rsvp: MyRsvp | null;
  can_manage: boolean;
}

export interface RosterEntry {
  player_id: number;
  name: string;
  status: RsvpStatus;
  is_goalie: boolean;
  guest_count: number;
  is_beer_guy: boolean;
  is_whiskey_guy: boolean;
  present: boolean;
  paid: boolean;
  added_by_director: boolean;
}

export interface DayPlayer {
  id: number;
  name: string;
  is_goalie: boolean;
}

export interface EventDetail extends EventSummary {
  director_message: string;
  director_message_updated_at: string | null;
  capacity: number | null;
  goalies_needed: number | null;
  auto_waitlist_enabled: boolean;
  beer_guy_enabled: boolean;
  whiskey_guy_enabled: boolean;
  invites_sent_at: string | null;
  players: RosterEntry[];
  day_players: DayPlayer[];
  notices?: string[]; // present on the RSVP response
}

export interface SendInvitesResult {
  created: number;
  notified: number;
  roster: RosterStats;
}

export interface RsvpGuest {
  name: string;
  skill: "A" | "B" | "C" | "D";
}

export interface RsvpBody {
  status: "YES" | "NO" | "MAYBE";
  is_goalie?: boolean;
  guest_count?: number;
  guests?: RsvpGuest[];
  beer_guy?: boolean;
  whiskey_guy?: boolean;
}

export interface CreateNextEventBody {
  night_id: number | null;
  base_date?: string;
  start_time?: string;
  capacity?: number;
}

export interface EventPatchBody {
  director_message?: string;
  start_time?: string | null;
  location?: string;
  capacity?: number | null;
  goalies_needed?: number | null;
  beer_guy_enabled?: boolean;
  whiskey_guy_enabled?: boolean;
  auto_waitlist_enabled?: boolean;
}
