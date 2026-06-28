import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { idbStorage } from "@/lib/idb-storage";

export type ProjectStatus = "draft" | "active" | "rendering" | "published" | "archived";

export type Project = {
  id: string;
  name: string;
  description: string;
  tags: string[];
  status: ProjectStatus;
  favorite: boolean;
  createdAt: number;
  updatedAt: number;
};

export type ProjectSort = "updated" | "created" | "name";

type ProjectState = {
  projects: Project[];
  query: string;
  sort: ProjectSort;
  showArchived: boolean;
  hydrated: boolean;

  setQuery: (q: string) => void;
  setSort: (s: ProjectSort) => void;
  setShowArchived: (v: boolean) => void;

  createProject: (input: { name: string; description?: string; tags?: string[] }) => Project;
  updateProject: (id: string, patch: Partial<Omit<Project, "id" | "createdAt">>) => void;
  duplicateProject: (id: string) => Project | undefined;
  archiveProject: (id: string) => void;
  unarchiveProject: (id: string) => void;
  toggleFavorite: (id: string) => void;
  deleteProject: (id: string) => void;
};

const uid = () =>
  globalThis.crypto?.randomUUID?.() ?? `p_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;

const seed = (): Project[] => {
  const now = Date.now();
  return [
    {
      id: uid(),
      name: "Coastal Highway B-Roll",
      description: "Drone-captured coastal scenery, cinematic color treatment.",
      tags: ["b-roll", "drone", "cinematic"],
      status: "rendering",
      favorite: true,
      createdAt: now - 86_400_000 * 6,
      updatedAt: now - 3_600_000,
    },
    {
      id: uid(),
      name: "Founder Interview · Ep 03",
      description: "Long-form interview, documentary edit style.",
      tags: ["interview", "documentary"],
      status: "active",
      favorite: false,
      createdAt: now - 86_400_000 * 12,
      updatedAt: now - 86_400_000,
    },
    {
      id: uid(),
      name: "Product Reveal — Aurora",
      description: "Hero launch piece. Diffusion-heavy product showcase.",
      tags: ["launch", "diffusion", "hero"],
      status: "draft",
      favorite: true,
      createdAt: now - 86_400_000 * 2,
      updatedAt: now - 7_200_000,
    },
    {
      id: uid(),
      name: "Synthwave Music Video",
      description: "Music video cut, rhythm-driven editing.",
      tags: ["music", "kinetic"],
      status: "published",
      favorite: false,
      createdAt: now - 86_400_000 * 21,
      updatedAt: now - 86_400_000 * 4,
    },
  ];
};

export const useProjectStore = create<ProjectState>()(
  persist(
    (set, get) => ({
      projects: [],
      query: "",
      sort: "updated",
      showArchived: false,
      hydrated: false,

      setQuery: (q) => set({ query: q }),
      setSort: (s) => set({ sort: s }),
      setShowArchived: (v) => set({ showArchived: v }),

      createProject: ({ name, description = "", tags = [] }) => {
        const now = Date.now();
        const project: Project = {
          id: uid(),
          name: name.trim() || "Untitled Project",
          description,
          tags,
          status: "draft",
          favorite: false,
          createdAt: now,
          updatedAt: now,
        };
        set({ projects: [project, ...get().projects] });
        return project;
      },

      updateProject: (id, patch) =>
        set({
          projects: get().projects.map((p) =>
            p.id === id ? { ...p, ...patch, updatedAt: Date.now() } : p,
          ),
        }),

      duplicateProject: (id) => {
        const original = get().projects.find((p) => p.id === id);
        if (!original) return undefined;
        const now = Date.now();
        const copy: Project = {
          ...original,
          id: uid(),
          name: `${original.name} (copy)`,
          status: "draft",
          favorite: false,
          createdAt: now,
          updatedAt: now,
        };
        set({ projects: [copy, ...get().projects] });
        return copy;
      },

      archiveProject: (id) =>
        get().updateProject(id, { status: "archived" }),

      unarchiveProject: (id) =>
        get().updateProject(id, { status: "draft" }),

      toggleFavorite: (id) => {
        const p = get().projects.find((x) => x.id === id);
        if (!p) return;
        get().updateProject(id, { favorite: !p.favorite });
      },

      deleteProject: (id) =>
        set({ projects: get().projects.filter((p) => p.id !== id) }),
    }),
    {
      name: "hooke:projects",
      storage: createJSONStorage(() => idbStorage),
      partialize: (s) => ({ projects: s.projects, sort: s.sort, showArchived: s.showArchived }),
      onRehydrateStorage: () => (state) => {
        if (state && state.projects.length === 0) {
          state.projects = seed();
        }
        if (state) state.hydrated = true;
      },
    },
  ),
);
