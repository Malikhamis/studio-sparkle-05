import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { idbStorage } from "@/lib/idb-storage";
import { eventBus } from "@/lib/platform/event-bus";

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
        eventBus.emit("universe:created", { universeId: u.id, name: u.name });
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
        eventBus.emit("universe:updated", { universeId: id, fields: Object.keys(patch) });
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
        eventBus.emit("universe:entity:updated", { universeId, entityId: entity.id, kind });
        if (kind === "character") {
          eventBus.emit("character:created", { characterId: entity.id, universeId, name: entity.name });
        }
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
        const entity = get().universes.find((u) => u.id === universeId)?.entities.find((e) => e.id === entityId);
        if (entity) {
          eventBus.emit("universe:entity:updated", { universeId, entityId, kind: entity.kind });
          if (entity.kind === "character") {
            eventBus.emit("character:updated", { characterId: entityId, universeId, fields: Object.keys(patch) });
          }
        }
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
        if (state) state.hydrated = true;
      },
    },
  ),
);
