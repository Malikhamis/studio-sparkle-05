import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { idbStorage } from "@/lib/idb-storage";

/**
 * Character Studio & Consistency Engine.
 * Persistent character sheets with reference-image pinning.
 * Characters can be standalone (cross-project library) or linked to a universe.
 */

export type CharacterStyle =
  | "cinematic"
  | "comic"
  | "anime"
  | "pixar"
  | "watercolor"
  | "noir"
  | "retro"
  | "realistic";

export type ReferenceImage = {
  id: string;
  url: string;
  label: string;
  /** which aspect of the character this image pins */
  kind: "face" | "hair" | "outfit" | "body" | "expression" | "scene" | "other";
  isPrimary: boolean;
};

export type CharacterSheet = {
  id: string;
  name: string;
  role: string; // Lead, Supporting, Extra, Antagonist...
  summary: string;

  // Physical
  age: string;
  height: string;
  build: string;
  hair: string;
  eyes: string;
  skin: string;
  distinguishingFeatures: string;

  // Costume
  outfit: string;
  accessories: string;

  // Voice & personality
  voice: string;
  personality: string;
  catchphrase: string;

  // Visual style
  style: CharacterStyle;
  colorPalette: string[]; // hex

  // Reference images for consistency
  references: ReferenceImage[];

  // Links
  universeId?: string;
  tags: string[];

  createdAt: number;
  updatedAt: number;
};

const uid = () =>
  globalThis.crypto?.randomUUID?.() ??
  `c_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;

const STYLES: { id: CharacterStyle; label: string }[] = [
  { id: "cinematic", label: "Cinematic" },
  { id: "realistic", label: "Realistic" },
  { id: "comic", label: "Comic" },
  { id: "anime", label: "Anime" },
  { id: "pixar", label: "Pixar-style" },
  { id: "watercolor", label: "Watercolor" },
  { id: "noir", label: "Noir" },
  { id: "retro", label: "Retro" },
];

export { STYLES as CHARACTER_STYLES };

type State = {
  characters: CharacterSheet[];
  activeId: string | null;
  hydrated: boolean;

  createCharacter: (input: Partial<Omit<CharacterSheet, "id" | "createdAt" | "updatedAt">>) => CharacterSheet;
  updateCharacter: (id: string, patch: Partial<Omit<CharacterSheet, "id" | "createdAt">>) => void;
  deleteCharacter: (id: string) => void;
  duplicateCharacter: (id: string) => void;
  setActive: (id: string | null) => void;

  addReference: (id: string, input: { url: string; label?: string; kind?: ReferenceImage["kind"] }) => void;
  updateReference: (id: string, refId: string, patch: Partial<Omit<ReferenceImage, "id">>) => void;
  removeReference: (id: string, refId: string) => void;
  setPrimaryReference: (id: string, refId: string) => void;
};

const blank = (): Omit<CharacterSheet, "id" | "createdAt" | "updatedAt"> => ({
  name: "Untitled character",
  role: "Supporting",
  summary: "",
  age: "",
  height: "",
  build: "",
  hair: "",
  eyes: "",
  skin: "",
  distinguishingFeatures: "",
  outfit: "",
  accessories: "",
  voice: "",
  personality: "",
  catchphrase: "",
  style: "cinematic",
  colorPalette: [],
  references: [],
  tags: [],
});

const seed = (): CharacterSheet[] => {
  const now = Date.now();
  return [
    {
      ...blank(),
      id: uid(),
      name: "Iris Vale",
      role: "Lead",
      summary: "Radio engineer, 28, quiet defiance. Hears things others don't.",
      age: "28",
      height: "5'7\"",
      build: "Lean, wiry",
      hair: "Black, cropped short",
      eyes: "Dark brown",
      skin: "Olive",
      distinguishingFeatures: "Scar across left eyebrow; always wears a silver ear cuff",
      outfit: "Olive flight jacket over white tee, dark cargo pants, scuffed boots",
      accessories: "Silver ear cuff, worn leather watch, radio earpiece",
      voice: "Low, measured, slight rasp when tired",
      personality: "Guarded but curious. Trusts machines more than people. Dry humor.",
      catchphrase: "Signal before silence.",
      style: "cinematic",
      colorPalette: ["#3B4A2A", "#E8E2D5", "#C76E3B"],
      references: [],
      tags: ["lead", "protagonist"],
      createdAt: now,
      updatedAt: now,
    },
  ];
};

export const useCharacterStore = create<State>()(
  persist(
    (set, get) => ({
      characters: [],
      activeId: null,
      hydrated: false,

      createCharacter: (input) => {
        const now = Date.now();
        const c: CharacterSheet = {
          ...blank(),
          ...input,
          id: uid(),
          createdAt: now,
          updatedAt: now,
        };
        set({ characters: [c, ...get().characters], activeId: c.id });
        return c;
      },

      updateCharacter: (id, patch) => {
        set({
          characters: get().characters.map((c) =>
            c.id === id ? { ...c, ...patch, updatedAt: Date.now() } : c,
          ),
        });
      },

      deleteCharacter: (id) => {
        const remaining = get().characters.filter((c) => c.id !== id);
        set({
          characters: remaining,
          activeId: get().activeId === id ? remaining[0]?.id ?? null : get().activeId,
        });
      },

      duplicateCharacter: (id) => {
        const orig = get().characters.find((c) => c.id === id);
        if (!orig) return;
        const now = Date.now();
        const copy: CharacterSheet = {
          ...orig,
          id: uid(),
          name: `${orig.name} (copy)`,
          references: orig.references.map((r) => ({ ...r, id: uid() })),
          createdAt: now,
          updatedAt: now,
        };
        set({ characters: [copy, ...get().characters], activeId: copy.id });
      },

      setActive: (id) => set({ activeId: id }),

      addReference: (id, { url, label = "", kind = "other" }) => {
        const c = get().characters.find((c) => c.id === id);
        if (!c) return;
        const ref: ReferenceImage = {
          id: uid(),
          url,
          label: label || kind,
          kind,
          isPrimary: c.references.length === 0,
        };
        set({
          characters: get().characters.map((ch) =>
            ch.id === id
              ? { ...ch, references: [...ch.references, ref], updatedAt: Date.now() }
              : ch,
          ),
        });
      },

      updateReference: (id, refId, patch) => {
        set({
          characters: get().characters.map((c) =>
            c.id === id
              ? {
                  ...c,
                  references: c.references.map((r) =>
                    r.id === refId ? { ...r, ...patch } : r,
                  ),
                  updatedAt: Date.now(),
                }
              : c,
          ),
        });
      },

      removeReference: (id, refId) => {
        set({
          characters: get().characters.map((c) =>
            c.id === id
              ? {
                  ...c,
                  references: c.references.filter((r) => r.id !== refId),
                  updatedAt: Date.now(),
                }
              : c,
          ),
        });
      },

      setPrimaryReference: (id, refId) => {
        set({
          characters: get().characters.map((c) =>
            c.id === id
              ? {
                  ...c,
                  references: c.references.map((r) => ({
                    ...r,
                    isPrimary: r.id === refId,
                  })),
                  updatedAt: Date.now(),
                }
              : c,
          ),
        });
      },
    }),
    {
      name: "hooke:characters",
      storage: createJSONStorage(() => idbStorage),
      partialize: (s) => ({ characters: s.characters, activeId: s.activeId }),
      onRehydrateStorage: () => (state) => {
        if (!state) return;
        state.hydrated = true;
        if (state.characters.length === 0) {
          const seeded = seed();
          state.characters = seeded;
          state.activeId = seeded[0].id;
        }
      },
    },
  ),
);
