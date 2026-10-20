/** The bottom bar's tabs (1.8.0 #8: a Directors tab for directors, owner
 *  2026-10-20 8a A). Pure so the "which tab is lit" rules can be tested. */
export type TabKey = "home" | "events" | "messages" | "directors" | "profile";

export interface NavTab {
  key: TabKey;
  href: string;
  label: string;
  icon: "home" | "calendar" | "chatbubbles" | "clipboard" | "person";
  active: (path: string) => boolean;
}

/** Director screens that light the Directors tab (event Manage stays Events). */
const DIRECTOR_PATHS = ["/director", "/approvals", "/players", "/skate-groups", "/polls/manage", "/polls/new", "/new-event", "/teams", "/notices"];

const isDirectorPath = (p: string) => DIRECTOR_PATHS.some((d) => p === d || p.startsWith(`${d}/`));
const isEvents = (p: string) => p.startsWith("/events") || p.startsWith("/event/");
const isMessages = (p: string) => p.startsWith("/messages");
const isProfile = (p: string) => p.startsWith("/profile");

export function navTabs(isDirector: boolean): NavTab[] {
  const tabs: NavTab[] = [
    {
      key: "home",
      href: "/",
      label: "Home",
      icon: "home",
      // Anything not clearly another tab (players: their polls, inbox, notices…).
      active: (p) => !isEvents(p) && !isMessages(p) && !isProfile(p) && !(isDirector && isDirectorPath(p)),
    },
    { key: "events", href: "/events", label: "Events", icon: "calendar", active: isEvents },
    { key: "messages", href: "/messages", label: "Messages", icon: "chatbubbles", active: isMessages },
  ];
  if (isDirector) {
    tabs.push({ key: "directors", href: "/director", label: "Directors", icon: "clipboard", active: isDirectorPath });
  }
  tabs.push({ key: "profile", href: "/profile", label: "Profile", icon: "person", active: isProfile });
  return tabs;
}
