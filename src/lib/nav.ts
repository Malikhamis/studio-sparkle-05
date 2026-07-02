import {
  Hexagon,
  Clapperboard,
  FolderKanban,
  Library,
  Globe2,
  BookOpen,
  Users,
  LayoutGrid,
  AudioWaveform,
  Film,
  Cpu,
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
    label: "Create",
    items: [
      { to: "/director", label: "miDirector", icon: Clapperboard },
      { to: "/story", label: "miStory", icon: BookOpen },
      { to: "/storyboard", label: "Storyboard", icon: LayoutGrid },
    ],
  },
  {
    label: "Produce",
    items: [
      { to: "/audio", label: "Audio Studio", icon: AudioWaveform },
      { to: "/timeline", label: "Timeline", icon: Film },
      { to: "/production", label: "Pipeline", icon: Cpu },
      { to: "/render", label: "Render Queue", icon: Loader },
    ],
  },
  {
    label: "Library",
    items: [
      { to: "/", label: "Dashboard", icon: Hexagon },
      { to: "/projects", label: "Projects", icon: FolderKanban },
      { to: "/assets", label: "Assets", icon: Library },
      { to: "/universe", label: "miUniverse", icon: Globe2 },
      { to: "/characters", label: "Characters", icon: Users },
    ],
  },
  {
    label: "Publish",
    items: [
      { to: "/publish", label: "Publish", icon: Rocket },
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
