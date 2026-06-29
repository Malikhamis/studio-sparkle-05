import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { idbStorage } from "@/lib/idb-storage";

/**
 * miUniverse — the persistent creative-OS layer.
 * Every later module (miStory, storyboard, brand kit, character consistency)
 * reads/writes here so a universe stays coherent across projects.
 */

export type EntityKind =
  | "character"
  | "location"
  | "prop"
  | "vehicle"
  | "lore"
  | "timeline"
  | "voice"
  | "music";

export type UniverseEntity = {
  id: string;
  kind: EntityKind;
  name: string;
  summary: string;
  /** free-form structured fields — different kinds use different shapes */
  details: Record<string, string>;
  imageUrl?: string;
  tags: string[];
  createdAt: number;
  updatedAt: number;
};

export type BrandKit = {
  colors: string[]; // hex
  fontHeading: string;
  fontBody: string;
  logoUrl?: string;
  introUrl?: string;
  outroUrl?: string;
  watermarkUrl?: string;
  cta: string;
  musicTheme: string;
};

export type Universe = {
  id: string;
  name: string;
  logline: string;
  genre: string;
  era: string;
  coverUrl?: string;
  entities: UniverseEntity[];
  brand: BrandKit;
  /** project IDs that opted into this universe */
  linkedProjectIds: string[];
  createdAt: number;
  updatedAt: number;
};

const defaultBrand = (): BrandKit => ({
  colors: ["#0A0A0F", "#F5F5F2", "#D4AF37"],
  fontHeading: "Space Grotesk",
  fontBody: "Inter",
  cta: "Watch the next chapter →",
  musicTheme: "cinematic-low",
});

export const ENTITY_KINDS: { kind: EntityKind; label: string; plural: string }[] = [
  { kind: "character", label: "Character", plural: "Characters" },
  { kind: "location", label: "Location", plural: "Locations" },
  { kind: "prop", label: "Prop", plural: "Props" },
  { kind: "vehicle", label: "Vehicle", plural: "Vehicles" },
  { kind: "lore", label: "Lore", plural: "Lore" },
  { kind: "timeline", label: "Timeline event", plural: "Timeline" },
  { kind: "voice", label: "Voice profile", plural: "Voices" },
  { kind: "music", label: "Music theme", plural: "Music" },
];

const uid = () =>
  globalThis.crypto?.randomUUID?.() ??
  `u_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;

type State = {
  universes: Universe[];
  activeId: string | null;
  hydrated: boolean;

  createUniverse: (input: { name: string; logline?: string; genre?: string; era?: string }) => Universe;
  deleteUniverse: (id: string) => void;
  updateUniverse: (id: string, patch: Partial<Pick<Universe, "name" | "logline" | "genre" | "era" | "coverUrl">>) => void;
  setActive: (id: string | null) => void;

  updateBrand: (id: string, patch: Partial<BrandKit>) => void;

  addEntity: (universeId: string, input: { kind: EntityKind; name: string; summary?: string; details?: Record<string, string>; tags?: string[] }) => UniverseEntity;
  updateEntity: (universeId: string, entityId: string, patch: Partial<Omit<UniverseEntity, "id" | "createdAt">>) => void;
  removeEntity: (universeId: string, entityId: string) => void;

  linkProject: (universeId: string, projectId: string) => void;
  unlinkProject: (universeId: string, projectId: string) => void;
};

/* seed */
const seed = (): Universe[] => {
  const now = Date.now();
  const u: Universe = {
    id: uid(),
    name: "The Dream Chasers",
    logline: "A crew of misfits chase a vanished signal across a half-built world.",
    genre: "Speculative drama",
    era: "Near future",
    entities: [
      {
        id: uid(), kind: "character", name: "Iris Vale",
        summary: "Lead — radio engineer, 28, quiet defiance.",
        details: { age: "28", hair: "Black, cropped", outfit: "Olive flight jacket, white tee", voice: "Low, measured" },
        tags: ["lead"],
        createdAt: now, updatedAt: now,
      },
      {
        id: uid(), kind: "location", name: "The Listening Post",
        summary: "Abandoned shortwave station on a wind-scoured ridge.",
        details: { mood: "Hushed, luminous", time: "Blue hour", weather: "Constant wind" },
        tags: ["recurring"],
        createdAt: now, updatedAt: now,
      },
      {
        id: uid(), kind: "lore", name: "The Carrier Hum",
        summary: "A 12.3kHz tone no one transmits, heard only after midnight.",
        details: { firstHeard: "Episode 1, cold open" },
        tags: ["mystery"],
        createdAt: now, updatedAt: now,
      },
    ],
    brand: { ...defaultBrand(), colors: ["#0B0E13", "#E8E2D5", "#C76E3B"], cta: "Tune in →" },
    linkedProjectIds: [],
    createdAt: now,
    updatedAt: now,
  };
  return [u];
};

export const useUniverseStore = create<State>()(
  persist(
    (set, get) => ({
      universes: [],
      activeId: null,
      hydrated: false,

      createUniverse: ({ name, logline = "", genre = "", era = "" }) => {
        const now = Date.now();
        const u: Universe = {
          id: uid(),
          name: name.trim() || "Untitled universe",
          logline, genre, era,
          entities: [],
          brand: defaultBrand(),
          linkedProjectIds: [],
          createdAt: now,
          updatedAt: now,
        };
        set({ universes: [u, ...get().universes], activeId: u.id });
        return u;
      },

      deleteUniverse: (id) => {
        const remaining = get().universes.filter((u) => u.id !== id);
        set({
          universes: remaining,
          activeId: get().activeId === id ? remaining[0]?.id ?? null : get().activeId,
        });
      },

      updateUniverse: (id, patch) => {
        set({
          universes: get().universes.map((u) =>
            u.id === id ? { ...u, ...patch, updatedAt: Date.now() } : u,
          ),
        });
      },

      setActive: (id) => set({ activeId: id }),

      updateBrand: (id, patch) => {
        set({
          universes: get().universes.map((u) =>
            u.id === id ? { ...u, brand: { ...u.brand, ...patch }, updatedAt: Date.now() } : u,
          ),
        });
      },

      addEntity: (universeId, { kind, name, summary = "", details = {}, tags = [] }) => {
        const now = Date.now();
        const entity: UniverseEntity = {
          id: uid(), kind,
          name: name.trim() || "Untitled",
          summary, details, tags,
          createdAt: now, updatedAt: now,
        };
        set({
          universes: get().universes.map((u) =>
            u.id === universeId
              ? { ...u, entities: [entity, ...u.entities], updatedAt: now }
              : u,
          ),
        });
        return entity;
      },

      updateEntity: (universeId, entityId, patch) => {
        set({
          universes: get().universes.map((u) =>
            u.id === universeId
              ? {
                  ...u,
                  entities: u.entities.map((e) =>
                    e.id === entityId ? { ...e, ...patch, updatedAt: Date.now() } : e,
                  ),
                  updatedAt: Date.now(),
                }
              : u,
          ),
        });
      },

      removeEntity: (universeId, entityId) => {
        set({
          universes: get().universes.map((u) =>
            u.id === universeId
              ? { ...u, entities: u.entities.filter((e) => e.id !== entityId), updatedAt: Date.now() }
              : u,
          ),
        });
      },

      linkProject: (universeId, projectId) => {
        set({
          universes: get().universes.map((u) =>
            u.id === universeId && !u.linkedProjectIds.includes(projectId)
              ? { ...u, linkedProjectIds: [...u.linkedProjectIds, projectId], updatedAt: Date.now() }
              : u,
          ),
        });
      },

      unlinkProject: (universeId, projectId) => {
        set({
          universes: get().universes.map((u) =>
            u.id === universeId
              ? { ...u, linkedProjectIds: u.linkedProjectIds.filter((p) => p !== projectId), updatedAt: Date.now() }
              : u,
          ),
        });
      },
    }),
    {
      name: "hooke:universes",
      storage: createJSONStorage(() => idbStorage),
      partialize: (s) => ({ universes: s.universes, activeId: s.activeId }),
      onRehydrateStorage: () => (state) => {
        if (!state) return;
        state.hydrated = true;
        if (state.universes.length === 0) {
          const seeded = seed();
          state.universes = seeded;
          state.activeId = seeded[0].id;
        }
      },
    },
  ),
);
