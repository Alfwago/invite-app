// "Add a player" on Manage → Roster: one card, three ways in — Skate Group
// (members of this skate's night), Borrow (another skate group, this skate
// only) and Walk-On (no account). Pure so it can be unit-tested.

export type AddMode = "group" | "borrow" | "walkon" | "reserve";

export interface AddModeOption {
  key: AddMode;
  label: string;
  /** The one line under the toggle while this mode is selected. */
  description: string;
  /** Why it can't be used right now; null = usable. Only Borrow has one. */
  disabledReason: string | null;
}

export interface AddModeInput {
  nightName: string | null;
  status: string;
  isPast?: boolean;
  /** `manage.can_borrow`: undefined on servers before 0.33 → no Borrow at all. */
  canBorrow?: boolean;
  /** `manage.can_reserve`: undefined before server 0.38.0 → no Reserve. */
  canReserve?: boolean;
  /** False for a non-skating event (server 0.40.0+): "Members", no Borrow. */
  isSkating?: boolean;
}

/**
 * Why Borrow is off, in the server's own words (services.
 * borrow_unavailable_reason, same order). The server decides `can_borrow`;
 * this only explains it.
 */
export function borrowOffReason({ nightName, status, isPast }: AddModeInput): string {
  if (!nightName) return "Borrowing only works for a skate group's skate.";
  if (isPast) return "This skate is over.";
  if (status !== "OPEN") return "Send this skate's invites first, then you can borrow players.";
  return "This skate is over.";
}

export function addModeOptions(input: AddModeInput): AddModeOption[] {
  const options: AddModeOption[] = [
    {
      key: "group",
      label: input.isSkating === false ? "Members" : "Skate Group",
      description: input.nightName ? `Members of ${input.nightName}.` : "Players with an account.",
      disabledReason: null,
    },
  ];
  // An older server never sends can_borrow: leave Borrow out entirely. A
  // party has no skate group to borrow into.
  if (input.canBorrow !== undefined && input.isSkating !== false) {
    options.push({
      key: "borrow",
      label: "Borrow",
      description: "From another skate group, for this skate only. They're notified.",
      disabledReason: input.canBorrow ? null : borrowOffReason(input),
    });
  }
  options.push({
    key: "walkon",
    label: "Walk-On",
    description: "Someone without an account. No emails sent.",
    disabledReason: null,
  });
  if (input.canReserve !== undefined) {
    options.push({
      key: "reserve",
      label: "Reserve",
      description: "Hold spots as \"Reserved by Director\" until you fill or release them.",
      disabledReason: input.canReserve ? null : "This skate is over.",
    });
  }
  return options;
}

/** The mode to show: the chosen one if it's there and usable, else Skate Group. */
export function resolveAddMode(chosen: AddMode | null | undefined, options: AddModeOption[]): AddMode {
  const hit = options.find((o) => o.key === chosen);
  return hit && !hit.disabledReason ? hit.key : "group";
}
