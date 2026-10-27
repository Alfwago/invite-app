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
  /** Server 0.35.1+: the same art made for a dark tile (transparent, grey
   * edge, 256px), or null — fall back to image_url. */
  tile_image_url?: string | null;
  /** Server 0.35.1+: "Mon" / "Sundae" for under the board tile. */
  short_label?: string;
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

/** GET /api/auth/signup/directors/ — the signup screen's approving-director picker. */
export interface SignupDirector {
  id: number;
  name: string;
}

/** POST /api/auth/signup/ — mirrors the website's OpenSignupForm fields exactly. */
export interface SignupBody {
  username: string;
  password: string;
  first_name: string;
  last_name: string;
  email: string;
  phone_number: string;
  skill_assessment: "A" | "B" | "C" | "D";
  director_id: number;
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
  /** Absent on servers that predate notification settings — hide the card. */
  notification_prefs?: NotificationPrefs;
  sms_provider: string;
  skill_assessment: string;
  join_year: number | null;
  metrics: MeMetrics;
  /** Names are locked — this is the caller's own pending request (any
   * director), or null. See POST/DELETE /api/me/name-change/. */
  pending_name_change: PendingNameChange | null;
  pending_username_change: PendingUsernameChange | null;
  /** Only present on GET /api/me/, not on the PATCH response. */
  profile_choices?: {
    player_type: ProfileChoice[];
    skill_assessment: ProfileChoice[];
    sms_provider: ProfileChoice[];
  };
  /** Only present on the PATCH /api/me/ response. */
  email_reverification_sent?: boolean;
}

export interface PendingUsernameChange {
  id: number;
  username: string;
  created_at: string;
  expires_at: string;
}

export interface PendingNameChange {
  id: number;
  first_name: string;
  last_name: string;
  created_at: string;
  expires_at: string;
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

/** Push-notification preferences (Profile → Notifications). `all` on = every
 *  push; off = only the categories switched on. Emails are unaffected. */
export interface NotificationPrefs {
  all: boolean;
  invites: boolean;
  director_messages: boolean;
  president_messages: boolean;
  /** Server 0.35.0+: the caller's skate groups and whether each is muted.
   *  Absent on older servers — hide the "Skate groups" section. */
  nights?: NightMute[];
}

export interface NightMute {
  id: number;
  name: string;
  muted: boolean;
}

/** PATCH /api/me/ notification_prefs: the switches, plus (0.35.0+) the
 *  full list of muted skate-group ids. */
export type NotificationPrefsPatch = Partial<Omit<NotificationPrefs, "nights">> & {
  muted_night_ids?: number[];
};

export interface ProfilePatch {
  email?: string;
  join_year?: number | null;
  phone_number?: string;
  sms_opt_in?: boolean;
  sms_provider?: string;
  skill_assessment?: string;
  player_type?: PlayerType;
  notification_prefs?: NotificationPrefsPatch;
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
  /** Server 0.40.0+: false = a non-skating event (party, golf outing). Its
   *  goalie numbers and skater_spots_open are null; open spots are in
   *  spots_open. Missing on older servers = a skate. */
  is_skating?: boolean;
  spots_open?: number | null;
}

export interface MyRsvp {
  status: RsvpStatus;
  is_goalie: boolean;
  guest_count: number;
  guests: RsvpGuest[];
  /** Server 0.40.0+: family coming to watch an away skate. */
  family_count?: number;
  is_beer_guy: boolean;
  is_whiskey_guy: boolean;
  responded_at: string | null;
  /** Server 0.34.3+: the late-change window, or null when no change of
   *  theirs could be a late drop. Absent on older servers. */
  late_change?: LateChange | null;
  /** Server 0.35.0+: they dropped late, aren't a Yes and still owe the fine
   *  — the note for switching No ↔ Maybe. Null otherwise; absent on older
   *  servers. */
  late_drop_owed?: LateDropOwed | null;
  /** Server 0.36.0+: promoted off the waitlist and not answered yet — the
   *  Confirm / Can't make it card replaces the RSVP buttons. Null otherwise;
   *  absent on older servers (their RSVP Yes/No answers it). */
  promotion?: PromotionInfo | null;
}

/** `my_rsvp.promotion` / Home `pending_promotions[]` — see src/promotion.ts. */
export interface PromotionInfo {
  pending: true;
  promoted_at: string;
  /** "You've been promoted to the roster for Thu Oct 16 · 8:30 PM. Can you make it?" */
  prompt: string;
  when_label: string;
  confirm_label: string;
  decline_label: string;
}

/** Home `pending_promotions[]` rows (server 0.36.0+). */
export interface PendingPromotion extends PromotionInfo {
  event_id: number;
  event_name: string;
}

/** `my_rsvp.late_drop_owed` — see src/lateChange.ts. */
export interface LateDropOwed {
  fee_amount: string;
  /** "You still owe the $20 late-change fee — only changing back to Yes clears it." */
  message: string;
}

/** `my_rsvp.late_change` — see src/lateChange.ts. */
export interface LateChange {
  hours: number;
  /** ISO datetimes: warn while now is between them. */
  window_start: string;
  starts_at: string;
  /** A drop now would owe the late-change fee. */
  fee: boolean;
  fee_amount: string;
}

export interface EventSummary {
  id: number;
  public_id: string;
  title: string;
  display_name: string;
  /** Bundled night logo for the skate-day card ("Monday"); "" = default. */
  logo_key?: string;
  date: string; // YYYY-MM-DD
  start_time: string | null; // HH:MM:SS
  location: string;
  status: EventStatus;
  night: { id: number; name: string; /** "Tuesday" (server 0.33+) */ weekday?: string } | null;
  roster: RosterStats;
  my_rsvp: MyRsvp | null;
  can_manage: boolean;
  /** Server archived it (6h after start) — shown read-only under "Recent".
   *  Optional: servers before the Recent-events fix don't send it. */
  is_past?: boolean;
  /** Custom events (server 0.40.0+; missing on older servers = a skate).
   *  is_skating false = a party / golf outing: no goalies or hockey, guests
   *  are a count. A skate somewhere else can carry arrive-by, directions,
   *  venue notes and a family count. directions_url falls back to a map
   *  search of the location (or "" for a home-rink skate). cost_per_person
   *  = a party's cost, or a skate's price when it isn't the usual one. */
  is_skating?: boolean;
  arrive_by?: string | null; // HH:MM:SS
  directions_url?: string;
  venue_notes?: string;
  allow_family?: boolean;
  cost_per_person?: string | null;
}

export interface RosterGuest {
  name: string;
  skill: string;
  present: boolean;
  paid: boolean;
}

export interface RosterEntry {
  player_id: number;
  name: string;
  status: RsvpStatus;
  is_goalie: boolean;
  is_director: boolean; // night's primary director
  /** The creator of a non-skating event (server 0.40.0+) — shown as "Host". */
  is_host?: boolean;
  is_assistant_director?: boolean; // night's assistant director
  /** The AD standing in for an ND who isn't on the roster ("Acting ND"),
   *  exempt like the ND. Server 0.34+; missing on older servers. */
  is_acting_director?: boolean;
  pays: boolean; // false = goalie / director / beer-or-whiskey guy who's exempt
  /** Director's per-event pay override: "" (usual rule), "comp" or "charge".
   *  Server 0.34+ (missing before — then the control is hidden). */
  pay_override?: PayOverride;
  guest_count: number;
  guest_names: string[];
  /** Server 0.40.0+: family coming to watch an away skate. */
  family_count?: number;
  guests: RosterGuest[]; // director view only; [] otherwise
  is_beer_guy: boolean;
  is_whiskey_guy: boolean;
  present: boolean;
  paid: boolean;
  added_by_director: boolean;
  /** Gold/Black once a director publishes teams; null before (or for players not on a side). */
  team: "Gold" | "Black" | null;
  /** Borrowed from another skate group for this skate only (server 0.33+;
   *  missing on older servers). Shown to everyone as a "Borrowed" badge. */
  is_borrowed?: boolean;
  borrowed_from_name?: string;
  /** Late drop (Yes → No/Maybe inside the change window). Directors only;
   *  null / "" for players and for every other row. Server 0.34.3+
   *  (missing before — then Manage → Roster shows no late drops).
   *  `late_drop_label` = "6:15 PM (2h 24m before)", server-formatted local time. */
  late_drop_at?: string | null;
  late_drop_minutes_before?: number | null;
  late_drop_label?: string;
  /** The late drop's fine (server 0.35.0+, directors only): "owes" = the
   *  skate's price (`manage.skate_fee`), "waived" = the event's Settings →
   *  "Fine late drops" is off ("no fine"), "none" = exempt (goalie, ND,
   *  comped — "no fee"). null when not a late drop; missing on older
   *  servers. On a late-drop row `pays` = owes. */
  late_fine?: LateFine | null;
  /** Promoted off the waitlist, hasn't answered (server 0.36.0+, directors
   *  only): the roster's "Pending" badge. Missing on older servers. */
  promotion_pending?: boolean;
  /** The late drop is on the public Late Scratches board (server 0.36.0
   *  build 97+, directors only). Missing on older servers → no Post control. */
  late_drop_posted?: boolean;
}

export type PayOverride = "" | "comp" | "charge";

export type LateFine = "owes" | "waived" | "none";

export interface DayPlayer {
  id: number;
  name: string;
  is_goalie: boolean;
  pays: boolean;
  /** See RosterEntry.pay_override. */
  pay_override?: PayOverride;
  present: boolean;
  paid: boolean;
  /** One score, interpreted by is_goalie: 0-3 goalie, 0-5 skater. Feeds
   *  Team Generator. Director view only — null for players. */
  rating_ppv: string | null;
  /** Server 0.38.0+: a spot a director is holding ("Reserved by Director").
   *  Counts toward the limit; no Present/Paid; not in the Team Generator. */
  is_reservation?: boolean;
  /** Directors only ("" for players). */
  reservation_note?: string;
}

export interface WaitlistEntry {
  waitlist_id: number;
  player_id: number;
  name: string;
  is_goalie: boolean;
  /** Present on GET /events/<id>/candidates/ rows; true ⇒ prompt Goalie/Skater
   *  before promoting. Not sent on EventDetail.waitlist. */
  is_goalie_skater?: boolean;
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

export interface Taunt {
  id: number;
  author: string;
  author_id: number;
  mine: boolean;
  text: string;
  created_at: string;
}

/** Active penalty-box entry as seen by any player on the event (top-level
 *  EventDetail.penalty_box) — carries chirps + whether the viewer may chirp. */
export interface PlayerPenaltyEntry {
  id: number;
  player_id: number;
  name: string;
  is_me: boolean;
  severity: PenaltySeverity;
  reason: string;
  eligible_at: string | null;
  can_taunt: boolean;
  taunts: Taunt[];
}

/** A late drop a director posted to the public Late Scratches board
 *  (EventDetail.late_scratches, server 0.36.0 build 97+). Never carries money.
 *  `label` = "Dropped Tue 6:15 PM · 2h 24m before". `id` = the invitation. */
export interface LateScratchEntry {
  id: number;
  player_id: number;
  name: string;
  is_me: boolean;
  status: RsvpStatus;
  dropped_at: string;
  drop_label: string;
  lead: string;
  label: string;
  can_taunt: boolean;
  taunts: Taunt[];
}

export interface MyPenalty {
  in_box: boolean;
  eligible_at: string | null;
  severity: PenaltySeverity;
  reason: string;
}

export interface InviteeEntry {
  player_id: number;
  name: string;
  status: RsvpStatus;
  sent_at: string | null;
  /** Server 0.38.0+: not in this skate's group — their group ("" if a member). */
  from_group?: string;
  /** Its short label ("Thu"). */
  from_group_short?: string;
}

/** Director-only extras on EventDetail. `null` for non-directors. */
export interface EventManage {
  title: string;
  director_notes: string;
  notes: string;
  date: string;
  rsvp_change_warning_hours: number | null;
  /** Settings → "Fine late drops", next to the warning hours (server
   *  0.35.0+; missing on older servers → the switch is hidden). */
  fine_late_drops?: boolean;
  /** The skate's price in dollars — also the late-drop fine (server 0.35.0+). */
  skate_fee?: number;
  whiskey_guy_pays: boolean;
  /** The directions link as the director typed it (server 0.40.0+); the
   *  event's own directions_url adds a map fallback. Missing on older
   *  servers → the venue fields are hidden. */
  directions_url?: string;
  invite_header_image: string | null;
  invites_send_at: string | null;
  batch_invites_enabled: boolean;
  batch_invites_delay_hours: number;
  batch_invites_send_at: string | null;
  batch_invites_sent_at: string | null;
  batch_invitee_ids: number[];
  invitees: InviteeEntry[];
  penalty_box: PenaltyBoxEntry[];
  /** Show "Borrow a Goalie or Skater" (server 0.33+; missing → hide it). */
  can_borrow?: boolean;
  /** Director-reserved spots (server 0.38.0+; missing → no Reserve mode). */
  can_reserve?: boolean;
  /** Server 0.38.0+: for the "Only newly added / Send to all" prompt. */
  invite_send_counts?: { sent_before: boolean; all: number; new: number };
  /** Server 0.39.0+: "Add N and send now" (true once invites are out). */
  can_add_and_send?: boolean;
}

/** The viewer's "You're filling in for <Night>" card (server 0.33+). */
export interface MyBorrow {
  night_name: string;
  borrowed_from_name: string;
  added_by_name: string;
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
  team_assignment: TeamAssignment | null; // set once a director publishes teams
  penalty_box: PlayerPenaltyEntry[]; // active entries + chirps, visible to all
  my_penalty: MyPenalty | null; // the viewer's own box status, or null
  /** Late Scratches board (server 0.36.0 build 97+; missing → no card). */
  late_scratches?: LateScratchEntry[];
  /** Set while the viewer is on that board. */
  my_late_scratch?: { on_board: boolean } | null;
  night_directors: { id: number; name: string }[]; // [] if none / can't message
  manage: EventManage | null; // director view only; null for players
  notices?: string[]; // present on the RSVP response
  my_borrow?: MyBorrow | null; // set when the viewer was borrowed onto this skate
  /** Server 0.36.0+: the skate's header art (event upload → night upload →
   *  night logo → default), same as the invite email. */
  header_image_url?: string | null;
  /** Present on a `borrow` roster action's response. */
  borrow_result?: { name: string; role: "goalie" | "skater"; pushed: boolean };
  /** Present on a `make_permanent` response: false = already a member. */
  joined?: boolean;
}

/** A player a director can add to an event, from GET /events/<id>/candidates/.
 *  `is_goalie_skater` true ⇒ prompt Goalie/Skater before adding to the roster. */
export interface Candidate {
  id: number;
  name: string;
  is_goalie: boolean;
  is_goalie_skater: boolean;
}

export interface EventCandidates {
  addable: Candidate[];
  /** Server 0.38.0+: everyone not yet invited (other groups come in as Borrowed). */
  invitable: Candidate[];
  waitlist: WaitlistEntry[];
  /** Server 0.38.0+: skate groups for the invite picker, this skate's first. */
  invite_groups?: { id: number | null; name: string; member_ids: number[]; members?: { id: number; name: string }[] }[];
  /** Server 0.38.0+: already on the invite list (not shown in the picker). */
  invited_ids?: number[];
  /** Server 0.38.0+: this skate's own group — hidden in the picker unless searching. */
  own_group_id?: number | null;
}

/** Body for POST /events/<id>/roster/ — one director roster edit. */
export type RosterAction =
  | {
      action: "add";
      player_ids: number[];
      to?: "roster" | "waitlist";
      /** Goalie/Skater choice per Goalie&Skater player (id → role). */
      roles?: Record<string, "goalie" | "skater">;
    }
  | { action: "add_invites"; player_ids: number[] }
  /** Server 0.39.0+ (only when manage.can_add_and_send). */
  | { action: "add_invites_send"; player_ids: number[] }
  | { action: "remove_invite"; player_id: number }
  | { action: "add_batch"; player_ids: number[] }
  | { action: "remove_batch"; player_id: number }
  | { action: "send_invite"; player_id: number }
  | { action: "remove"; player_id: number }
  | {
      action: "promote";
      waitlist_id?: number;
      player_id?: number;
      /** Goalie/Skater choice for a Goalie&Skater player being promoted. */
      role?: "goalie" | "skater";
    }
  | { action: "reorder_waitlist"; waitlist_id: number; direction: "up" | "down" }
  | { action: "set_present"; present: boolean; player_id?: number; day_player_id?: number }
  | { action: "set_paid"; paid: boolean; player_id?: number; day_player_id?: number }
  /** Director's per-event "Comp" control (server 0.34+). */
  | { action: "set_pay_override"; pay_override: PayOverride; player_id?: number; day_player_id?: number }
  /** Post a late drop to the Late Scratches board / take it off (server 0.36.0 b97+). */
  | { action: "set_late_drop_posted"; player_id: number; posted: boolean }
  | {
      action: "add_day_player";
      name: string;
      email?: string;
      is_goalie?: boolean;
      /** 0-3 goalie / 0-5 skater; omitted → server default (2.0 / 3.0). */
      rating_ppv?: number | string;
    }
  | {
      action: "edit_day_player";
      day_player_id: number;
      name?: string;
      email?: string;
      is_goalie?: boolean;
      rating_ppv?: number | string;
    }
  | { action: "remove_day_player"; day_player_id: number }
  | { action: "set_beer_guy"; player_id: number | null }
  | { action: "set_whiskey_guy"; player_id: number | null }
  | { action: "guest_present"; player_id: number; guest_index: number; present: boolean }
  | { action: "guest_paid"; player_id: number; guest_index: number; paid: boolean }
  | { action: "remove_guest"; player_id: number; guest_index: number }
  /** A player from another skate group, this skate only (server 0.33+). */
  | { action: "borrow"; player_id: number; role: "goalie" | "skater" }
  /** A borrowed player joins this skate group for good. */
  | { action: "make_permanent"; player_id: number }
  /** Director-reserved spots (server 0.38.0+). */
  | { action: "reserve_spots"; count: number; is_goalie?: boolean; note?: string }
  | { action: "release_reservation"; day_player_id: number }
  | { action: "fill_reservation"; day_player_id: number; player_id: number };

export interface NightMember {
  id: number;
  name: string;
  is_goalie: boolean;
  is_goalie_skater: boolean;
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
  /** Server 0.40.0+: family coming to watch (allow_family skates). */
  family_count?: number;
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

/** Published Team Generator result for the viewer, on /api/home/ and
 *  /api/events/<id>/. `null` unless a director has published teams for that
 *  event AND the viewer is on one of the sides. */
export interface TeamAssignment {
  event_id: number;
  team: "Gold" | "Black";
  jersey: string; // "Wear your gold jersey." / "Wear a dark shirt."
  published_at: string;
  moved_from: "Gold" | "Black" | null; // set when a re-push changed your team
}

export interface HomeData {
  notices: LeagueNotice[];
  next_skate: EventSummary | null;
  nights: HomeNight[];
  custom_events: EventSummary[];
  team_assignment: TeamAssignment | null; // for the viewer's NEXT skate only
  /** Newest post on the next skate's night board from the last 24h, for the
   *  skate-day card. null = none / not a member of that board. `at` = Unix seconds. */
  next_skate_board_message?: { author: string; text: string; at: number } | null;
  /** Newest version submitted to the App/Play Store — see
   *  SiteConfiguration.latest_app_version. "" when nothing's configured.
   *  Since 1.6.0 only the fallback for servers without /api/app-version/. */
  latest_app_version: string;
  /** Server 0.36.0+: waitlist promotions to answer — the Home card. */
  pending_promotions?: PendingPromotion[];
}

/** GET /api/app-version/ (server 0.33+): newest version per platform. iOS =
 *  Site configuration "Latest app version", Android = "Android app version".
 *  "" = not configured. */
export interface AppVersions {
  ios: string;
  android: string;
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
  /** @-mentions on this post (board messages only; [] elsewhere). */
  mentions?: { id: number; name: string }[];
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
  /** ids of @-mentioned board members */
  mentionIds?: number[];
}

export interface EditMessage {
  id: number;
  body?: string;
  imageUri?: string;
  mentionIds?: number[];
}

/** POST /api/events/non-skating/ (server 0.40.0+, Admins + Presidents):
 *  a party / golf outing. Times are "HH:MM". */
export interface NonSkatingEventBody {
  title: string;
  date: string;
  start_time: string;
  location: string;
  arrive_by?: string;
  directions_url?: string;
  venue_notes?: string;
  capacity?: number;
  skate_fee?: number;
  allow_guests: boolean;
  notes?: string;
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
  /** Server 0.35.0+ only — send just when `manage.fine_late_drops` exists. */
  fine_late_drops?: boolean;
  /** Server 0.35.0+ only — send just when `manage.skate_fee` exists. */
  skate_fee?: number;
  allow_guests?: boolean;
  beer_guy_enabled?: boolean;
  whiskey_guy_enabled?: boolean;
  whiskey_guy_pays?: boolean;
  auto_waitlist_enabled?: boolean;
  rsvp_locked?: boolean;
  goalie_rsvp_locked?: boolean;
  batch_invites_enabled?: boolean;
  batch_invites_delay_hours?: number;
  /** Venue details — server 0.40.0+ only (send just when manage.directions_url exists). */
  arrive_by?: string | null;
  directions_url?: string;
  venue_notes?: string;
  allow_family?: boolean;
}

// ---- Player directory + skill ratings (director) ---------------------

export interface SkillRatings {
  hockey_sense: number;
  skating: number;
  defense: number;
  offense: number;
  goalie: number;
  ppv: number;
  /** false = Not Rated (no rating for this night, or a 0.00 PPV). */
  rated: boolean;
}

/** A Global Score (or Global Goalie Score). `score` null = Not Rated. */
export interface GlobalScore {
  score: number | null;
  /** How it was reached: "one rated night" / "average of both nights" / … */
  rule: string;
  nights: { name: string; value: number }[];
}

export type PlayerTypeTag = "skater" | "goalie" | "goalie_skater" | "non_playing";

export interface PlayerRow {
  id: number;
  name: string;
  profile_id: string;
  is_goalie: boolean;
  player_type: PlayerTypeTag;
  /** That night's ratings when ?night= is set (all 0, rated false otherwise). */
  ratings: SkillRatings;
  rating_source: "night" | "none";
  global_score: number | null;
  global_goalie_score: number | null;
  /** Server 0.39.3+, non-playing members only: their title, shown instead
   *  of a PPV ("🏒 Front Office" until a director sets one). */
  member_title?: string;
  /** What a director typed ("" = the default). */
  member_title_raw?: string;
  /** Server 0.38.0+ sort fields (#6/#7). ISO dates; null = none. */
  join_date?: string | null;
  last_skated?: string | null;
  /** Position of the player's first skate group in the usual order (999 = none). */
  group_rank?: number;
}

export interface PlayersResponse {
  /** Server 0.38.0+: the sort options, default first. */
  sorts?: { key: string; label: string }[];
  night: { id: number; name: string } | null;
  nights: { id: number; name: string }[];
  players: PlayerRow[];
}

export interface PlayerNightRow {
  id: number;
  name: string;
  ratings: SkillRatings;
  rating_source: "night" | "none";
  can_edit: boolean;
}

export interface PlayerDetail {
  id: number;
  name: string;
  profile_id: string;
  is_goalie: boolean;
  is_goalie_skater: boolean;
  player_type: PlayerTypeTag;
  /** Server 0.39.3+, non-playing members only (see PlayerRow). */
  member_title?: string;
  member_title_raw?: string;
  join_year: number | null;
  years_in_obh: number | null;
  skill_assessment: string;
  phone_number: string;
  /** Retired per-player ratings — always null now. */
  global_ratings: null;
  global_score: GlobalScore;
  /** Goalies only. */
  global_goalie_score: GlobalScore | null;
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
  /** Server 0.36.0+: the skate's header art (the invite email's image) for
   *  the team sheet PDF. Missing on older servers. */
  header_image_url?: string | null;
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
  published_at: string | null; // set on the split that's currently live to players
}

/** One row of the shared lineup (server 0.34+, GET /api/teams/events/<id>/lineup/). */
export interface TeamLineupPlayer {
  /** "123" (profile id), "guest_<inv>_<n>" or "day_<id>" — always a string. */
  id: string;
  name: string;
  is_goalie: boolean;
  present: boolean;
  ppv: number;
  goalie_rating: number;
  /** What they balance at: goalie rating in a goalie slot, skater PPV otherwise. */
  rating: number;
  team: "Gold" | "Black" | null;
  /** In a goalie slot (then `team` is null). */
  slot: "Gold" | "Black" | null;
  locked: boolean;
  /** RSVP'd after the teams were made — the server added them to the smaller team. */
  is_new: boolean;
  /** Promoted off the waitlist, not confirmed yet — shown with a "?"
   *  (server 0.36.0+; missing before). */
  pending?: boolean;
}

export interface TeamLineupGoalie {
  id: string;
  name: string;
  rating: number;
  pending?: boolean;
}

/** The event's one lineup, shared by the website and the app (server 0.34+).
 *  Every edit sends `version`; a stale one gets 409 + the current lineup. */
export interface TeamLineup {
  event_id: number;
  version: number;
  updated_by: string;
  updated_at: string | null;
  balanced: boolean;
  locked: boolean;
  locked_by: string;
  locked_at: string | null;
  published_at: string | null;
  present_only: boolean;
  roster_count: number;
  present_count: number;
  /** Roster order. */
  players: TeamLineupPlayer[];
  gold: string[];
  black: string[];
  gold_goalie: TeamLineupGoalie | null;
  black_goalie: TeamLineupGoalie | null;
  gold_total: number;
  black_total: number;
  pairs: [string, string][];
  splits: [string, string][];
  pair_names: Record<string, string>;
}

export interface TeamLineupVersion {
  version: number;
  updated_by: string;
  updated_at: string | null;
}

/** POST /api/teams/events/<id>/lineup/ — one edit (plus `version`). */
export type TeamLineupAction =
  | { action: "balance" | "refresh" | "clear_locks" | "clear_pairs_splits" }
  | { action: "swap_teams" | "swap_goalies" | "lock_teams" | "unlock_teams" }
  | { action: "move"; player: string; team?: "Gold" | "Black" }
  | { action: "set_lock"; player: string; locked: boolean }
  | { action: "pair_add" | "pair_remove" | "split_add" | "split_remove"; a: string; b: string }
  | { action: "present_only"; on: boolean };

export interface TeamLineupPublishResult extends TeamHistoryEntry {
  recipients: number;
  notified: number;
  lineup: TeamLineup;
}

// ---- Player approval queue (director) ------------------------------

export interface PendingApproval {
  profile_id: number;
  user_id: number;
  name: string;
  email: string;
  sponsor: string;
  account_ready: boolean;
  /** Server 0.33+: this user may resend the setup link (sponsor or admin,
   *  setup unfinished). Absent on older servers → no Resend button. */
  can_resend?: boolean;
}

/** GET /api/approvals/invite/ (server 0.33+). */
export interface SiteInviteOptions {
  can_choose_director: boolean;
  directors: { id: number; name: string }[];
  default_director_id: number;
}

export interface SiteInviteResult {
  email: string;
  /** "sent" | "exists" | "invalid" | "other_director" (string: newer servers may add more). */
  status: string;
  message: string;
}

export interface SiteInviteResponse {
  results: SiteInviteResult[];
  sent: number;
  director: { id: number; name: string };
  pending: PendingApproval[];
}

export interface SiteInviteResendResponse {
  sent: boolean;
  detail: string;
  pending: PendingApproval[];
}

export interface PendingUsernameChangeApproval {
  id: number;
  user_id: number;
  name: string;
  current_username: string;
  proposed_username: string;
  created_at: string;
  expires_at: string;
}

export interface PendingNameChangeApproval {
  id: number;
  user_id: number;
  name: string;
  current_first_name: string;
  current_last_name: string;
  proposed_first_name: string;
  proposed_last_name: string;
  created_at: string;
  expires_at: string;
}

// ---- Polls (player) ------------------------------------------------

export interface PollChoice {
  id: number;
  text: string;
}

export interface PollQuestion {
  id: number;
  text: string;
  my_choice_id: number | null;
  choices: PollChoice[];
}

/** A skate group a poll is for (server 0.36.0+). */
export interface PollNight {
  id: number;
  name: string;
  short_label: string;
}

export interface Poll {
  id: number;
  title: string;
  description: string;
  closes_at: string | null;
  total_q: number;
  answered_q: number;
  all_answered: boolean;
  dismissed: boolean;
  /** Server 0.36.0+: [] = everyone (Global). Missing on older servers. */
  nights?: PollNight[];
  /** "Everyone" or "Monday Mules, Thursday Night". */
  audience_label?: string;
  /** Server 0.36.2+: true = directors can see who picked what ("Names shown"). */
  show_names?: boolean;
  questions: PollQuestion[];
}

/** GET /api/polls/closed/ rows and /api/polls/<id>/results/ (server 0.36.0+):
 *  a closed poll's results for the players who could vote. */
export interface ClosedPoll {
  id: number;
  title: string;
  description: string;
  closes_at: string | null;
  created_at: string;
  nights: PollNight[];
  audience_label: string;
  questions: (PollResultQuestion & { my_choice_id: number | null })[];
}

// ---- Direct messages / inbox (player) ----------------------------

export interface DMConversation {
  user_id: number | null; // null = OBH system notifications
  name: string;
  is_system: boolean;
  last_body: string;
  last_at: string;
  unread: number;
}

export interface DMMessage {
  id: number;
  body: string;
  mine: boolean;
  is_system: boolean;
  author: string;
  created_at: string;
  edited_at: string | null;
  can_edit: boolean;
  event_id: number | null;
  reactions: MessageReaction[];
}

export interface DMThread {
  other_id?: number;
  other_name: string;
  is_system: boolean;
  can_reply?: boolean;
  reaction_choices?: string[];
  messages: DMMessage[];
}

// ---- Poll authoring (director) -----------------------------------

export interface PollSummary {
  id: number;
  title: string;
  status: "ACTIVE" | "CLOSED";
  is_open: boolean;
  question_count: number;
  total_votes: number;
  created_at: string;
  closes_at: string | null;
  nights?: PollNight[];
  audience_label?: string;
  /** Server 0.36.2+. */
  show_names?: boolean;
}

/** GET /api/director/polls/. `pickable_nights` / `can_create_global` are
 *  server 0.36.0+ — absent before, so the app hides the group picker. */
export interface ManagePollsResponse {
  polls: PollSummary[];
  pickable_nights?: PollNight[];
  can_create_global?: boolean;
}

export interface PollResultChoice {
  id: number;
  text: string;
  count: number;
  pct: number;
  /** Director results of a Names shown poll (server 0.36.2+): "Last, First" A-Z. */
  voters?: string[];
}

export interface PollResultQuestion {
  id: number;
  text: string;
  total: number;
  choices: PollResultChoice[];
}

export interface PollResults {
  id: number;
  title: string;
  description: string;
  status: "ACTIVE" | "CLOSED";
  is_open: boolean;
  closes_at: string | null;
  nights?: PollNight[];
  audience_label?: string;
  /** Server 0.36.2+: Names shown (true) or Anonymous. */
  show_names?: boolean;
  questions: PollResultQuestion[];
  /** Present when the request asked to notify (server 0.36.0+). */
  notified?: { recipients: number; emailed: number; pushed: number };
}

export interface NewPoll {
  title: string;
  description?: string;
  closes_at?: string | null;
  questions: { text: string; choices: string[] }[];
  /** Server 0.36.0+: [] / missing = everyone. Older servers ignore it. */
  night_ids?: number[];
  /** Server 0.36.0+: email + push + inbox to everyone who can vote. */
  notify?: boolean;
  /** Server 0.36.2+: Names shown (directors see who picked what). Default Anonymous. */
  show_names?: boolean;
}

/** GET /api/directors/ (server 0.38.0+): who the Skate Directors are and
 *  which skate groups each runs. */
export interface DirectoryEntry {
  id: number;
  name: string;
  role: "Director" | "President" | "Site Director";
  nights: { id: number; name: string; role: "Night Director" | "Assistant Director" | "Director" }[];
  email: string;
  phone: string;
}

/** GET /api/home-ads/ (server 0.38.1+): uploaded picture/GIF ads for the top
 *  of Home, from Admin → Home page ads ("Show on" App or Both). */
export interface HomeAdItem {
  id: number;
  name: string;
  image_url: string;
  link_url: string;
  alt_text: string;
  /** Changes on "Show again to everyone". */
  key: string;
  /** How long x hides it; 0 = this app session. */
  hide_seconds: number;
}

/** GET /api/branding/ (server 0.38.2+): the website's current header and Home
 *  hero picks; null = use the app's built-in image. */
export interface Branding {
  header_url: string | null;
  hero_url: string | null;
}
