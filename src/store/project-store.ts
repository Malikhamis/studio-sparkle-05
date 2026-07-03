import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { idbStorage } from "@/lib/idb-storage";
import { eventBus } from "@/lib/platform/event-bus";
import { projectGraph } from "@/lib/platform/project-graph";

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
        // Register in Project Graph and emit event
        try {
          projectGraph.registerProject(project.id, project.name);
        } catch {
          // Graph may not be loaded yet on first run; event still emitted
          eventBus.emit("project:created", { projectId: project.id, name: project.name });
        }
        return project;
      },

      updateProject: (id, patch) => {
        set({
          projects: get().projects.map((p) =>
            p.id === id ? { ...p, ...patch, updatedAt: Date.now() } : p,
          ),
        });
        eventBus.emit("project:updated", { projectId: id, fields: Object.keys(patch) });
      },

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

      archiveProject: (id) => {
        get().updateProject(id, { status: "archived" });
        eventBus.emit("project:archived", { projectId: id });
      },

      unarchiveProject: (id) =>
        get().updateProject(id, { status: "draft" }),

      toggleFavorite: (id) => {
        const p = get().projects.find((x) => x.id === id);
        if (!p) return;
        get().updateProject(id, { favorite: !p.favorite });
      },

      deleteProject: (id) => {
        set({ projects: get().projects.filter((p) => p.id !== id) });
        eventBus.emit("project:deleted", { projectId: id });
      },
    }),
    {
      name: "hooke:projects",
      storage: createJSONStorage(() => idbStorage),
      partialize: (s) => ({ projects: s.projects, sort: s.sort, showArchived: s.showArchived }),
      onRehydrateStorage: () => (state) => {
        if (state) state.hydrated = true;
      },
    },
  ),
);
