import {
  Hexagon,
  Clapperboard,
  FolderKanban,
  Library,
  Globe2,
  Video,
  Sparkles,
  Mic,
  Scissors,
  Rocket,
  BarChart3,
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

export const NAV_SECTIONS: NavSection[] = [
  {
    label: "Workspace",
    items: [
      { to: "/", label: "Dashboard", icon: Hexagon },
      { to: "/director", label: "miDirector", icon: Clapperboard, badge: 8 },
      { to: "/universe", label: "miUniverse", icon: Globe2 },
      { to: "/projects", label: "Projects", icon: FolderKanban },
      { to: "/assets", label: "Asset Library", icon: Library },
    ],
  },

  {
    label: "Production",
    items: [
      { to: "/capture", label: "Capture Stream", icon: Video },
      { to: "/diffusion", label: "Diffusion Layer", icon: Sparkles },
      { to: "/audio", label: "Audio Synth", icon: Mic },
      { to: "/editor", label: "Editor Engine", icon: Scissors },
    ],
  },
  {
    label: "Publish",
    items: [
      { to: "/publish", label: "Publish Gate", icon: Rocket },
      { to: "/analytics", label: "Analytics", icon: BarChart3 },
      { to: "/settings", label: "Settings", icon: Settings },
    ],
  },
];

export const ALL_NAV_ITEMS: NavItem[] = NAV_SECTIONS.flatMap((s) => s.items);

export function findNavItem(pathname: string): NavItem | undefined {
  // exact match first, then prefix
  return (
    ALL_NAV_ITEMS.find((i) => i.to === pathname) ??
    ALL_NAV_ITEMS.filter((i) => i.to !== "/").find((i) => pathname.startsWith(i.to))
  );
}
