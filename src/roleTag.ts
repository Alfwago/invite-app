// Roster role mark (1.8.1, owner 2026-10-26): a night director playing
// goalie keeps "ND" and gets "G" too — before, the goalie slot replaced the
// director tag. Same rule as the website's _roster_role_tag.html. A
// non-skating event's creator is its "Host" (owner 2026-10-27).

interface RoleFlags {
  is_goalie?: boolean;
  /** The creator of a non-skating event (server 0.40.0+): "Host". */
  is_host?: boolean;
  is_director?: boolean;
  is_acting_director?: boolean;
  is_assistant_director?: boolean;
}

/** "ND G", "Acting ND", "G", "" … — the director role first, then G. */
export function roleTag(entry: RoleFlags): string {
  const role = entry.is_host
    ? "Host"
    : entry.is_director
      ? "ND"
    : entry.is_acting_director
      ? "Acting ND"
      : entry.is_assistant_director
        ? "AD"
        : "";
  return [role, entry.is_goalie ? "G" : ""].filter(Boolean).join(" ");
}
