import {
  Hexagon,
  Clapperboard,
  FolderKanban,
  Library,
  Globe2,
  BookOpen,
  Cpu,
  Settings,
  type LucideIcon,
} from "lucide-react";

export type NavItem = {
  to: string;
  label: string;
  icon: LucideIcon;
  badge?: number;
};

export type NavSection = {
  label: string;
  items: NavItem[];
};

/**
 * Navigation sections shown in the sidebar.
 *
 * Rule: only routes with real, production-grade implementations appear here.
 * Routes that are not yet fully implemented are excluded — they have routes
 * (so deep links work) but are not surfaced in navigation.
 *
 * Currently excluded (not yet implemented):
 *   - /publish  — requires completed render pipeline
 *   - /analytics — requires real production data
 */
export const NAV_SECTIONS: NavSection[] = [
  {
    label: "Create",
    items: [
      { to: "/director", label: "miDirector", icon: Clapperboard },
      { to: "/story", label: "miStory", icon: BookOpen },
    ],
  },
  {
    label: "Produce",
    items: [
      { to: "/production", label: "Pipeline", icon: Cpu },
    ],
  },
  {
    label: "Library",
    items: [
      { to: "/", label: "Dashboard", icon: Hexagon },
      { to: "/projects", label: "Projects", icon: FolderKanban },
      { to: "/assets", label: "Assets", icon: Library },
      { to: "/universe", label: "miUniverse", icon: Globe2 },
    ],
  },
  {
    label: "Platform",
    items: [
      { to: "/settings", label: "Settings", icon: Settings },
    ],
  },
];

export const ALL_NAV_ITEMS: NavItem[] = NAV_SECTIONS.flatMap((s) => s.items);

export function findNavItem(pathname: string): NavItem | undefined {
  return (
    ALL_NAV_ITEMS.find((i) => i.to === pathname) ??
    ALL_NAV_ITEMS.filter((i) => i.to !== "/").find((i) => pathname.startsWith(i.to))
  );
}
