// Shapes returned by the invite-server mobile API (invitations/api/serializers.py).
// Keep in sync with that module when the server changes.

export type RsvpStatus = "YES" | "NO" | "MAYBE" | "WAITLIST" | "NO_RESPONSE";
export type EventStatus = "DRAFT" | "OPEN" | "CLOSED" | "COMPLETED";

export interface Night {
  id: number;
  name: string;
  weekday: number; // 1=Sun … 7=Sat
  /** Night's board/header art, or null. Present on /api/boards/ and /api/nights/. */
  image_url?: string | null;
  /** Unread messages on this board for the caller. Present on /api/boards/. */
  unread?: number;
  // Present on GET /api/nights/ (the create-event picker); absent from board lists.
  default_time?: string | null;
  default_location?: string;
  default_capacity?: number | null;
  default_goalies_needed?: number | null;
  next_default_date?: string; // YYYY-MM-DD — next occurrence of weekday, today included
  default_preset?: {
    id: number;
    name: string;
    start_time: string | null;
    capacity: number | null;
  } | null;
}

export interface Me {
  id: number;
  username: string;
  email: string;
  first_name: string;
  last_name: string;
  full_name: string;
  is_director: boolean;
  is_president: boolean;
  is_goalie: boolean;
  is_goalie_skater: boolean;
  is_non_playing: boolean;
  player_type: PlayerType;
  director_approved: boolean;
  email_verified: boolean;
  phone_number: string;
  sms_opt_in: boolean;
  sms_provider: string;
  skill_assessment: string;
  join_year: number | null;
  metrics: MeMetrics;
  /** Only present on GET /api/me/, not on the PATCH response. */
  profile_choices?: {
    player_type: ProfileChoice[];
    skill_assessment: ProfileChoice[];
    sms_provider: ProfileChoice[];
  };
  /** Only present on the PATCH /api/me/ response. */
  email_reverification_sent?: boolean;
}

export type PlayerType = "non_playing" | "skater" | "goalie" | "goalie_skater";

export interface ProfileChoice {
  value: string;
  label: string;
}

export interface MeMetrics {
  years_in_obh: number | null;
  invited_count: number;
  yes_count: number;
  present_count: number;
  attendance_pct: number | null;
  beer_guy_count: number;
  whiskey_guy_count: number;
  invites_by_night: { name: string; count: number }[];
}

export interface ProfilePatch {
  first_name?: string;
  last_name?: string;
  email?: string;
  join_year?: number | null;
  phone_number?: string;
  sms_opt_in?: boolean;
  sms_provider?: string;
  skill_assessment?: string;
  player_type?: PlayerType;
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
  guests: RsvpGuest[];
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
  guest_names: string[];
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

export type PenaltySeverity = "MINOR" | "MAJOR";

export interface PenaltyBoxEntry {
  id: number;
  player_id: number;
  name: string;
  severity: PenaltySeverity;
  delay_hours: number;
  reason: string;
  eligible_at: string | null;
  is_active: boolean;
}

export interface InviteeEntry {
  player_id: number;
  name: string;
  status: RsvpStatus;
  sent_at: string | null;
}

/** Director-only extras on EventDetail. `null` for non-directors. */
export interface EventManage {
  title: string;
  director_notes: string;
  notes: string;
  date: string;
  rsvp_change_warning_hours: number | null;
  beer_guy_pays: boolean;
  whiskey_guy_pays: boolean;
  invite_header_image: string | null;
  invites_send_at: string | null;
  batch_invites_enabled: boolean;
  batch_invites_delay_hours: number;
  batch_invites_send_at: string | null;
  batch_invites_sent_at: string | null;
  batch_invitee_ids: number[];
  invitees: InviteeEntry[];
  penalty_box: PenaltyBoxEntry[];
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
  messages_unread: number; // unseen director posts on the event thread
  manage: EventManage | null; // director view only; null for players
  notices?: string[]; // present on the RSVP response
}

/** Players a director can add to an event, from GET /events/<id>/candidates/. */
export interface EventCandidates {
  addable: { id: number; name: string; is_goalie: boolean }[];
  invitable: { id: number; name: string; is_goalie: boolean }[];
  waitlist: WaitlistEntry[];
}

/** Body for POST /events/<id>/roster/ — one director roster edit. */
export type RosterAction =
  | { action: "add"; player_ids: number[]; to?: "roster" | "waitlist" }
  | { action: "add_invites"; player_ids: number[] }
  | { action: "remove_invite"; player_id: number }
  | { action: "add_batch"; player_ids: number[] }
  | { action: "remove_batch"; player_id: number }
  | { action: "send_invite"; player_id: number }
  | { action: "remove"; player_id: number }
  | { action: "promote"; waitlist_id?: number; player_id?: number }
  | { action: "set_present"; present: boolean; player_id?: number; day_player_id?: number }
  | { action: "set_paid"; paid: boolean; player_id?: number; day_player_id?: number }
  | { action: "add_day_player"; name: string; email?: string; is_goalie?: boolean }
  | { action: "remove_day_player"; day_player_id: number };

export interface NightMember {
  id: number;
  name: string;
  is_goalie: boolean;
}

export interface NightMembersResponse {
  night: { id: number; name: string };
  members: NightMember[];
  addable: NightMember[];
}

export interface EventPreset {
  id: number;
  night_id: number;
  name: string;
  is_default: boolean;
  start_time: string | null;
  capacity: number | null;
  rsvp_change_warning_hours: number | null;
  beer_guy_enabled: boolean;
  beer_guy_pays: boolean;
  whiskey_guy_enabled: boolean;
  whiskey_guy_pays: boolean;
  roster_player_ids: number[];
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

export interface LeagueNotice {
  id: number;
  message: string;
  is_active: boolean;
  sort_order: number;
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

export interface MessageReaction {
  emoji: string;
  count: number;
  mine: boolean;
}

/** Shape shared by the message boards and per-event threads. */
export interface ChatMessage {
  id: number;
  body: string;
  image_url: string | null;
  author_id: number;
  author_name: string;
  author_is_director: boolean;
  created_at: string;
  mine: boolean;
  can_delete: boolean;
  can_edit: boolean;
  reactions: MessageReaction[];
}

export type BoardMessage = ChatMessage;
export type EventMessage = ChatMessage;

export interface EventMessagesResponse {
  reaction_choices: string[];
  emoji_groups: EmojiGroup[];
  unread: number;
  messages: EventMessage[];
}

export interface EmojiGroup {
  title: string;
  emoji: string[];
}

export interface BoardsResponse {
  boards: Night[];
  unread_main: number;
  unread_total: number;
}

export interface MessagesResponse {
  board: { id: number; name: string } | null;
  reaction_choices: string[];
  emoji_groups: EmojiGroup[];
  can_email: boolean;
  unread_total: number;
  messages: BoardMessage[];
}

/** null board = the Main site-wide board. */
export interface NewMessage {
  body: string;
  board: number | null;
  /** local file uri from expo-image-picker */
  imageUri?: string;
  /** director only — also email the board's members */
  notify?: boolean;
}

export interface EditMessage {
  id: number;
  body?: string;
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
  director_notes?: string;
  notes?: string;
  date?: string;
  start_time?: string | null;
  location?: string;
  capacity?: number | null;
  goalies_needed?: number | null;
  rsvp_change_warning_hours?: number | null;
  allow_guests?: boolean;
  beer_guy_enabled?: boolean;
  beer_guy_pays?: boolean;
  whiskey_guy_enabled?: boolean;
  whiskey_guy_pays?: boolean;
  auto_waitlist_enabled?: boolean;
  rsvp_locked?: boolean;
  goalie_rsvp_locked?: boolean;
  batch_invites_enabled?: boolean;
  batch_invites_delay_hours?: number;
}

// ---- Player directory + skill ratings (director) ---------------------

export interface SkillRatings {
  hockey_sense: number;
  skating: number;
  defense: number;
  offense: number;
  goalie: number;
  ppv: number;
}

export type PlayerTypeTag = "skater" | "goalie" | "goalie_skater" | "non_playing";

export interface PlayerRow {
  id: number;
  name: string;
  profile_id: string;
  is_goalie: boolean;
  player_type: PlayerTypeTag;
  ratings: SkillRatings;
  rating_source: "night" | "global";
}

export interface PlayersResponse {
  night: { id: number; name: string } | null;
  nights: { id: number; name: string }[];
  players: PlayerRow[];
}

export interface PlayerNightRow {
  id: number;
  name: string;
  ratings: SkillRatings;
  rating_source: "night" | "global";
  can_edit: boolean;
}

export interface PlayerDetail {
  id: number;
  name: string;
  profile_id: string;
  is_goalie: boolean;
  is_goalie_skater: boolean;
  player_type: PlayerTypeTag;
  join_year: number | null;
  years_in_obh: number | null;
  skill_assessment: string;
  phone_number: string;
  global_ratings: SkillRatings;
  metrics: MeMetrics;
  nights: PlayerNightRow[];
}

export interface RatingPatch {
  night_id: number;
  hockey_sense?: number;
  skating?: number;
  defense?: number;
  offense?: number;
  goalie?: number;
}

// ---- Team Generator (director) --------------------------------------

export interface TeamEvent {
  id: number;
  display_name: string;
  date: string;
  start_time: string | null;
  status: string;
}

export interface TeamRosterPlayer {
  id: number | string;
  name: string;
  is_goalie: boolean;
  present: boolean;
  rating_hockey_sense: number;
  rating_skating: number;
  rating_defense: number;
  rating_offense: number;
  rating_goalie: number;
}

export interface TeamHistoryPlayer {
  id: number | string | null;
  name: string;
  ppv: number | null;
  is_goalie: boolean;
}

export interface TeamHistoryGoalie {
  id: number | string | null;
  name: string;
  weight: number | null;
}

export interface TeamHistoryEntry {
  id: number;
  event_id: number;
  event_name: string;
  night: string | null;
  created_at: string;
  created_by: string;
  note: string;
  gold_players: TeamHistoryPlayer[];
  black_players: TeamHistoryPlayer[];
  gold_goalie: TeamHistoryGoalie;
  black_goalie: TeamHistoryGoalie;
  balanced: boolean;
}

export interface SaveTeamsBody {
  goldPlayers: TeamHistoryPlayer[];
  blackPlayers: TeamHistoryPlayer[];
  goldGoalie: TeamHistoryGoalie | Record<string, never>;
  blackGoalie: TeamHistoryGoalie | Record<string, never>;
  note?: string;
}
