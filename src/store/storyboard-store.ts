import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { idbStorage } from "@/lib/idb-storage";

/**
 * Storyboard — visual scene-by-scene breakdown.
 * Pulls from a Blueprint or Story Episode and adds camera/shot metadata.
 */

export type CameraAngle =
  | "wide"
  | "medium"
  | "close"
  | "extreme-close"
  | "overhead"
  | "low"
  | "dutch";

export type CameraMovement =
  | "static"
  | "pan"
  | "tilt"
  | "dolly"
  | "tracking"
  | "handheld"
  | "crane"
  | "zoom";

export type PanelStatus = "pending" | "generating" | "complete" | "failed";

export type Panel = {
  id: string;
  number: number;
  sceneId: string; // link to blueprint scene or story scene
  heading: string;
  description: string;
  prompt: string;
  /** Camera direction metadata */
  angle: CameraAngle;
  movement: CameraMovement;
  shotDuration: number; // seconds
  notes: string;
  /** Generated visual */
  imageUrl?: string;
  status: PanelStatus;
};

export type Storyboard = {
  id: string;
  title: string;
  sourceType: "blueprint" | "episode" | "standalone";
  sourceId?: string; // blueprint id or episode id
  panels: Panel[];
  createdAt: number;
  updatedAt: number;
};

type State = {
  storyboards: Storyboard[];
  activeId: string | null;
  hydrated: boolean;

  createFromBlueprint: (input: {
    title: string;
    blueprintId: string;
    scenes: Array<{ id: string; number: number; heading: string; beat: string; prompt: string; duration: number }>;
  }) => Storyboard;

  createFromEpisode: (input: {
    title: string;
    episodeId: string;
    scenes: Array<{ id: string; number: number; heading: string; description: string; prompt: string; duration: number }>;
  }) => Storyboard;

  createStandalone: (title: string) => Storyboard;

  deleteStoryboard: (id: string) => void;
  setActive: (id: string | null) => void;

  updatePanel: (storyboardId: string, panelId: string, patch: Partial<Omit<Panel, "id" | "number">>) => void;
  addPanel: (storyboardId: string) => void;
  removePanel: (storyboardId: string, panelId: string) => void;
  reorderPanels: (storyboardId: string, panelIds: string[]) => void;
};

const uid = () =>
  globalThis.crypto?.randomUUID?.() ??
  `sb_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;

const seed = (): Storyboard[] => {
  const now = Date.now();
  return [
    {
      id: uid(),
      title: "The Signal — Pilot Boards",
      sourceType: "standalone",
      panels: [
        {
          id: uid(),
          number: 1,
          sceneId: uid(),
          heading: "Cold Open — Listening Post",
          description: "Iris alone in the dark, headphones on. A faint signal pulses.",
          prompt: "Dimly lit radio room, woman with headphones, blue glow of dials, cinematic, moody",
          angle: "medium",
          movement: "static",
          shotDuration: 6,
          notes: "Establish isolation. Hold on her face for the signal reveal.",
          status: "complete",
        },
        {
          id: uid(),
          number: 2,
          sceneId: uid(),
          heading: "Inciting Image — The Signal",
          description: "Close-up of the waveform on the oscilloscope. The signal spikes.",
          prompt: "Extreme close-up of oscilloscope waveform, green trace on dark screen, signal spike, sci-fi",
          angle: "extreme-close",
          movement: "zoom",
          shotDuration: 4,
          notes: "Sound design carries this. Let the waveform breathe.",
          status: "pending",
        },
        {
          id: uid(),
          number: 3,
          sceneId: uid(),
          heading: "Bridge — Commander Chen",
          description: "Chen reviews the data. The crew assembles.",
          prompt: "Spaceship bridge interior, crew gathering around console, holographic display, cinematic wide",
          angle: "wide",
          movement: "dolly",
          shotDuration: 8,
          notes: "Introduce Chen as authority. Dolly in to medium as she speaks.",
          status: "pending",
        },
      ],
      createdAt: now,
      updatedAt: now,
    },
  ];
};

export const CAMERA_ANGLES: { id: CameraAngle; label: string }[] = [
  { id: "wide", label: "Wide" },
  { id: "medium", label: "Medium" },
  { id: "close", label: "Close-up" },
  { id: "extreme-close", label: "Extreme Close" },
  { id: "overhead", label: "Overhead" },
  { id: "low", label: "Low Angle" },
  { id: "dutch", label: "Dutch Tilt" },
];

export const CAMERA_MOVEMENTS: { id: CameraMovement; label: string }[] = [
  { id: "static", label: "Static" },
  { id: "pan", label: "Pan" },
  { id: "tilt", label: "Tilt" },
  { id: "dolly", label: "Dolly" },
  { id: "tracking", label: "Tracking" },
  { id: "handheld", label: "Handheld" },
  { id: "crane", label: "Crane" },
  { id: "zoom", label: "Zoom" },
];

export const useStoryboardStore = create<State>()(
  persist(
    (set, get) => ({
      storyboards: [],
      activeId: null,
      hydrated: false,

      createFromBlueprint: ({ title, blueprintId, scenes }) => {
        const now = Date.now();
        const sb: Storyboard = {
          id: uid(),
          title: title.trim() || "Untitled Storyboard",
          sourceType: "blueprint",
          sourceId: blueprintId,
          panels: scenes.map((s, i) => ({
            id: uid(),
            number: i + 1,
            sceneId: s.id,
            heading: s.heading,
            description: s.beat,
            prompt: s.prompt,
            angle: "medium" as CameraAngle,
            movement: "static" as CameraMovement,
            shotDuration: s.duration,
            notes: "",
            status: "pending" as PanelStatus,
          })),
          createdAt: now,
          updatedAt: now,
        };
        set({ storyboards: [sb, ...get().storyboards], activeId: sb.id });
        return sb;
      },

      createFromEpisode: ({ title, episodeId, scenes }) => {
        const now = Date.now();
        const sb: Storyboard = {
          id: uid(),
          title: title.trim() || "Untitled Storyboard",
          sourceType: "episode",
          sourceId: episodeId,
          panels: scenes.map((s, i) => ({
            id: uid(),
            number: i + 1,
            sceneId: s.id,
            heading: s.heading,
            description: s.description,
            prompt: s.prompt,
            angle: "medium" as CameraAngle,
            movement: "static" as CameraMovement,
            shotDuration: s.duration,
            notes: "",
            status: "pending" as PanelStatus,
          })),
          createdAt: now,
          updatedAt: now,
        };
        set({ storyboards: [sb, ...get().storyboards], activeId: sb.id });
        return sb;
      },

      createStandalone: (title) => {
        const now = Date.now();
        const sb: Storyboard = {
          id: uid(),
          title: title.trim() || "Untitled Storyboard",
          sourceType: "standalone",
          panels: [],
          createdAt: now,
          updatedAt: now,
        };
        set({ storyboards: [sb, ...get().storyboards], activeId: sb.id });
        return sb;
      },

      deleteStoryboard: (id) => {
        const remaining = get().storyboards.filter((s) => s.id !== id);
        set({
          storyboards: remaining,
          activeId: get().activeId === id ? remaining[0]?.id ?? null : get().activeId,
        });
      },

      setActive: (id) => set({ activeId: id }),

      updatePanel: (storyboardId, panelId, patch) => {
        set({
          storyboards: get().storyboards.map((sb) =>
            sb.id === storyboardId
              ? {
                  ...sb,
                  panels: sb.panels.map((p) =>
                    p.id === panelId ? { ...p, ...patch } : p
                  ),
                  updatedAt: Date.now(),
                }
              : sb
          ),
        });
      },

      addPanel: (storyboardId) => {
        const sb = get().storyboards.find((s) => s.id === storyboardId);
        if (!sb) return;
        const number = sb.panels.length + 1;
        const panel: Panel = {
          id: uid(),
          number,
          sceneId: uid(),
          heading: `Panel ${number}`,
          description: "",
          prompt: "",
          angle: "medium",
          movement: "static",
          shotDuration: 5,
          notes: "",
          status: "pending",
        };
        set({
          storyboards: get().storyboards.map((s) =>
            s.id === storyboardId
              ? { ...s, panels: [...s.panels, panel], updatedAt: Date.now() }
              : s
          ),
        });
      },

      removePanel: (storyboardId, panelId) => {
        set({
          storyboards: get().storyboards.map((sb) =>
            sb.id === storyboardId
              ? {
                  ...sb,
                  panels: sb.panels
                    .filter((p) => p.id !== panelId)
                    .map((p, i) => ({ ...p, number: i + 1 })),
                  updatedAt: Date.now(),
                }
              : sb
          ),
        });
      },

      reorderPanels: (storyboardId, panelIds) => {
        set({
          storyboards: get().storyboards.map((sb) => {
            if (sb.id !== storyboardId) return sb;
            const map = new Map(sb.panels.map((p) => [p.id, p]));
            const reordered = panelIds
              .map((id) => map.get(id))
              .filter((p): p is Panel => !!p)
              .map((p, i) => ({ ...p, number: i + 1 }));
            return { ...sb, panels: reordered, updatedAt: Date.now() };
          }),
        });
      },
    }),
    {
      name: "hooke:storyboards",
      storage: createJSONStorage(() => idbStorage),
      partialize: (s) => ({ storyboards: s.storyboards, activeId: s.activeId }),
      onRehydrateStorage: () => (state) => {
        if (!state) return;
        state.hydrated = true;
        if (state.storyboards.length === 0) {
          const seeded = seed();
          state.storyboards = seeded;
          state.activeId = seeded[0]?.id ?? null;
        }
      },
    }
  )
);
