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
  present: boolean;
  paid: boolean;
}

export interface WaitlistEntry {
  waitlist_id: number;
  player_id: number;
  name: string;
  is_goalie: boolean;
  created_at: string;
}

export interface EventDetail extends EventSummary {
  director_message: string;
  director_message_updated_at: string | null;
  capacity: number | null;
  goalies_needed: number | null;
  allow_guests: boolean;
  auto_waitlist_enabled: boolean;
  rsvp_locked: boolean;
  goalie_rsvp_locked: boolean;
  beer_guy_enabled: boolean;
  whiskey_guy_enabled: boolean;
  invites_sent_at: string | null;
  players: RosterEntry[];
  day_players: DayPlayer[];
  waitlist: WaitlistEntry[]; // director view only; [] for players
  notices?: string[]; // present on the RSVP response
}

/** Players a director can add to an event, from GET /events/<id>/candidates/. */
export interface EventCandidates {
  addable: { id: number; name: string; is_goalie: boolean }[];
  waitlist: WaitlistEntry[];
}

/** Body for POST /events/<id>/roster/ — one director roster edit. */
export type RosterAction =
  | { action: "add"; player_ids: number[]; to?: "roster" | "waitlist" }
  | { action: "remove"; player_id: number }
  | { action: "promote"; waitlist_id?: number; player_id?: number }
  | { action: "set_present"; present: boolean; player_id?: number; day_player_id?: number }
  | { action: "set_paid"; paid: boolean; player_id?: number; day_player_id?: number }
  | { action: "add_day_player"; name: string; email?: string; is_goalie?: boolean }
  | { action: "remove_day_player"; day_player_id: number };

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

export interface LeagueNotice {
  id: number;
  message: string;
}

export interface HomeNight {
  id: number;
  name: string;
  weekday: number;
  next_event: EventSummary | null;
}

export interface HomeData {
  notices: LeagueNotice[];
  next_skate: EventSummary | null;
  nights: HomeNight[];
  custom_events: EventSummary[];
}

export interface BoardMessage {
  id: number;
  body: string;
  image_url: string | null;
  author_id: number;
  author_name: string;
  author_is_director: boolean;
  created_at: string;
  mine: boolean;
  can_delete: boolean;
}

export interface MessagesResponse {
  board: { id: number; name: string } | null;
  messages: BoardMessage[];
}

/** null board = the Main site-wide board. */
export interface NewMessage {
  body: string;
  board: number | null;
  /** local file uri from expo-image-picker */
  imageUri?: string;
}

export interface CreateNextEventBody {
  night_id: number | null;
  base_date?: string;
  start_time?: string;
  capacity?: number;
}

export interface EventPatchBody {
  title?: string;
  director_message?: string;
  notes?: string;
  start_time?: string | null;
  location?: string;
  capacity?: number | null;
  goalies_needed?: number | null;
  allow_guests?: boolean;
  beer_guy_enabled?: boolean;
  whiskey_guy_enabled?: boolean;
  auto_waitlist_enabled?: boolean;
  rsvp_locked?: boolean;
  goalie_rsvp_locked?: boolean;
}
