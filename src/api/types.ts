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
}

export interface ProfilePatch {
  email?: string;
  join_year?: number | null;
  phone_number?: string;
  sms_opt_in?: boolean;
  sms_provider?: string;
  skill_assessment?: string;
  player_type?: PlayerType;
  notification_prefs?: Partial<NotificationPrefs>;
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
}

export type PayOverride = "" | "comp" | "charge";

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
}

/** Director-only extras on EventDetail. `null` for non-directors. */
export interface EventManage {
  title: string;
  director_notes: string;
  notes: string;
  date: string;
  rsvp_change_warning_hours: number | null;
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
  /** Show "Borrow a Goalie or Skater" (server 0.33+; missing → hide it). */
  can_borrow?: boolean;
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
  night_directors: { id: number; name: string }[]; // [] if none / can't message
  manage: EventManage | null; // director view only; null for players
  notices?: string[]; // present on the RSVP response
  my_borrow?: MyBorrow | null; // set when the viewer was borrowed onto this skate
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
  invitable: Candidate[];
  waitlist: WaitlistEntry[];
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
  | { action: "make_permanent"; player_id: number };

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
}

export interface TeamLineupGoalie {
  id: string;
  name: string;
  rating: number;
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

export interface Poll {
  id: number;
  title: string;
  description: string;
  closes_at: string | null;
  total_q: number;
  answered_q: number;
  all_answered: boolean;
  dismissed: boolean;
  questions: PollQuestion[];
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
}

export interface PollResultChoice {
  id: number;
  text: string;
  count: number;
  pct: number;
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
  questions: PollResultQuestion[];
}

export interface NewPoll {
  title: string;
  description?: string;
  closes_at?: string | null;
  questions: { text: string; choices: string[] }[];
}
