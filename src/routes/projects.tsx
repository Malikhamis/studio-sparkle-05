import { useState, useMemo } from "react";
import { createFileRoute } from "@tanstack/react-router";
import {
  Archive,
  ArchiveRestore,
  Copy,
  FolderKanban,
  MoreVertical,
  Plus,
  Search,
  Star,
  Trash2,
  Video,
  X,
} from "lucide-react";
import {
  useProjectStore,
  type Project,
  type ProjectSort,
  type ProjectStatus,
} from "@/store/project-store";

export const Route = createFileRoute("/projects")({
  head: () => ({
    meta: [
      { title: "Projects — Hooke" },
      {
        name: "description",
        content: "Create, duplicate, archive, tag, and search your video productions.",
      },
      { property: "og:title", content: "Projects — Hooke" },
      {
        property: "og:description",
        content: "Create, duplicate, archive, tag, and search your video productions.",
      },
    ],
  }),
  component: ProjectsPage,
});

const STATUS_STYLES: Record<ProjectStatus, { label: string; color: string }> = {
  draft: { label: "Draft", color: "var(--accent-gold)" },
  active: { label: "Active", color: "var(--accent-iris)" },
  rendering: { label: "Rendering", color: "var(--accent-mint)" },
  published: { label: "Published", color: "var(--accent-ember)" },
  archived: { label: "Archived", color: "var(--text-dim)" },
};

function ProjectsPage() {
  const projects = useProjectStore((s) => s.projects);
  const query = useProjectStore((s) => s.query);
  const sort = useProjectStore((s) => s.sort);
  const showArchived = useProjectStore((s) => s.showArchived);
  const setQuery = useProjectStore((s) => s.setQuery);
  const setSort = useProjectStore((s) => s.setSort);
  const setShowArchived = useProjectStore((s) => s.setShowArchived);

  const [creating, setCreating] = useState(false);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    let list = projects.filter((p) => (showArchived ? true : p.status !== "archived"));
    if (q) {
      list = list.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          p.description.toLowerCase().includes(q) ||
          p.tags.some((t) => t.toLowerCase().includes(q)),
      );
    }
    const sorted = [...list];
    if (sort === "name") sorted.sort((a, b) => a.name.localeCompare(b.name));
    else if (sort === "created") sorted.sort((a, b) => b.createdAt - a.createdAt);
    else sorted.sort((a, b) => b.updatedAt - a.updatedAt);
    // favorites pinned to top
    sorted.sort((a, b) => Number(b.favorite) - Number(a.favorite));
    return sorted;
  }, [projects, query, sort, showArchived]);

  return (
    <div className="mx-auto flex w-full max-w-[1480px] flex-col gap-5">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div>
          <h1 className="hk-text-display text-[22px] font-bold text-text-primary">Projects</h1>
          <p className="mt-0.5 text-[12.5px] text-text-secondary">
            {filtered.length} of {projects.length} productions
          </p>
        </div>
        <div className="flex flex-1 flex-wrap items-center gap-2 sm:justify-end">
          <div className="relative min-w-0 flex-1 sm:max-w-xs">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-text-dim" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search projects, tags…"
              className="h-9 w-full rounded-md border border-white/10 bg-surface pl-9 pr-3 text-[13px] text-text-primary placeholder:text-text-dim focus:border-iris focus:outline-none"
            />
          </div>
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value as ProjectSort)}
            className="h-9 rounded-md border border-white/10 bg-surface px-2 text-[12.5px] text-text-primary focus:border-iris focus:outline-none"
          >
            <option value="updated">Recently updated</option>
            <option value="created">Recently created</option>
            <option value="name">Name (A–Z)</option>
          </select>
          <label className="flex h-9 items-center gap-2 rounded-md border border-white/10 bg-surface px-3 text-[12.5px] text-text-secondary">
            <input
              type="checkbox"
              checked={showArchived}
              onChange={(e) => setShowArchived(e.target.checked)}
              className="accent-iris"
            />
            Archived
          </label>
          <button
            onClick={() => setCreating(true)}
            className="inline-flex h-9 items-center gap-1.5 rounded-md px-3 text-[13px] font-semibold text-white transition-opacity hover:opacity-90"
            style={{ background: "var(--gradient-iris)" }}
          >
            <Plus className="h-3.5 w-3.5" />
            New
          </button>
        </div>
      </header>

      {filtered.length === 0 ? (
        <EmptyState onCreate={() => setCreating(true)} />
      ) : (
        <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filtered.map((p) => (
            <ProjectCard key={p.id} project={p} />
          ))}
        </div>
      )}

      {creating && <CreateProjectDialog onClose={() => setCreating(false)} />}
    </div>
  );
}

/* ---------- Card ---------- */
function ProjectCard({ project }: { project: Project }) {
  const toggleFavorite = useProjectStore((s) => s.toggleFavorite);
  const duplicateProject = useProjectStore((s) => s.duplicateProject);
  const archiveProject = useProjectStore((s) => s.archiveProject);
  const unarchiveProject = useProjectStore((s) => s.unarchiveProject);
  const deleteProject = useProjectStore((s) => s.deleteProject);
  const [menuOpen, setMenuOpen] = useState(false);

  const status = STATUS_STYLES[project.status];

  return (
    <div className="hk-card hk-card-hover relative flex flex-col">
      <div
        className="relative flex h-28 items-center justify-center overflow-hidden"
        style={{
          background:
            "linear-gradient(135deg, var(--bg-elevated) 0%, var(--bg-panel) 100%)",
        }}
      >
        <Video className="h-8 w-8 text-text-dim/60" />
        <div
          className="absolute left-3 top-3 inline-flex items-center gap-1.5 rounded-full border bg-black/40 px-2 py-0.5 text-[10.5px] font-medium uppercase tracking-wider backdrop-blur"
          style={{ color: status.color, borderColor: `${status.color}55` }}
        >
          <span
            className="h-1.5 w-1.5 rounded-full"
            style={{ background: status.color }}
          />
          {status.label}
        </div>
        <button
          onClick={() => toggleFavorite(project.id)}
          className="absolute right-3 top-3 flex h-7 w-7 items-center justify-center rounded-md bg-black/40 text-text-secondary backdrop-blur transition-colors hover:text-gold"
          aria-label={project.favorite ? "Unfavorite" : "Favorite"}
        >
          <Star
            className={`h-3.5 w-3.5 ${project.favorite ? "fill-gold text-gold" : ""}`}
          />
        </button>
      </div>

      <div className="flex flex-1 flex-col gap-2 p-4">
        <div className="flex items-start gap-2">
          <h3 className="hk-text-display flex-1 truncate text-[14px] font-semibold text-text-primary">
            {project.name}
          </h3>
          <div className="relative">
            <button
              onClick={() => setMenuOpen((v) => !v)}
              className="flex h-7 w-7 items-center justify-center rounded-md text-text-secondary hover:bg-elevated hover:text-text-primary"
              aria-label="Project actions"
            >
              <MoreVertical className="h-4 w-4" />
            </button>
            {menuOpen && (
              <>
                <div
                  className="fixed inset-0 z-10"
                  onClick={() => setMenuOpen(false)}
                />
                <div className="absolute right-0 top-8 z-20 w-44 overflow-hidden rounded-md border border-white/10 bg-elevated shadow-xl">
                  <MenuItem
                    icon={<Copy className="h-3.5 w-3.5" />}
                    label="Duplicate"
                    onClick={() => {
                      duplicateProject(project.id);
                      setMenuOpen(false);
                    }}
                  />
                  {project.status === "archived" ? (
                    <MenuItem
                      icon={<ArchiveRestore className="h-3.5 w-3.5" />}
                      label="Unarchive"
                      onClick={() => {
                        unarchiveProject(project.id);
                        setMenuOpen(false);
                      }}
                    />
                  ) : (
                    <MenuItem
                      icon={<Archive className="h-3.5 w-3.5" />}
                      label="Archive"
                      onClick={() => {
                        archiveProject(project.id);
                        setMenuOpen(false);
                      }}
                    />
                  )}
                  <MenuItem
                    icon={<Trash2 className="h-3.5 w-3.5" />}
                    label="Delete"
                    danger
                    onClick={() => {
                      if (confirm(`Delete "${project.name}"? This cannot be undone.`)) {
                        deleteProject(project.id);
                      }
                      setMenuOpen(false);
                    }}
                  />
                </div>
              </>
            )}
          </div>
        </div>
        <p className="line-clamp-2 text-[12px] leading-relaxed text-text-secondary">
          {project.description || "No description yet."}
        </p>
        <div className="mt-auto flex flex-wrap items-center gap-1.5 pt-2">
          {project.tags.slice(0, 3).map((t) => (
            <span
              key={t}
              className="rounded bg-elevated px-1.5 py-0.5 text-[10.5px] font-medium text-text-secondary"
            >
              {t}
            </span>
          ))}
          <span className="ml-auto text-[10.5px] text-text-dim">
            {relativeTime(project.updatedAt)}
          </span>
        </div>
      </div>
    </div>
  );
}

function MenuItem({
  icon,
  label,
  onClick,
  danger,
}: {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  danger?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex w-full items-center gap-2 px-3 py-2 text-left text-[12.5px] transition-colors hover:bg-surface ${
        danger ? "text-[#FF5370]" : "text-text-primary"
      }`}
    >
      {icon}
      {label}
    </button>
  );
}

/* ---------- Create dialog ---------- */
function CreateProjectDialog({ onClose }: { onClose: () => void }) {
  const createProject = useProjectStore((s) => s.createProject);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [tagsInput, setTagsInput] = useState("");

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const tags = tagsInput
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean);
    createProject({ name, description, tags });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={onClose}
      />
      <form
        onSubmit={submit}
        className="relative z-10 w-full max-w-md overflow-hidden rounded-[16px] border border-white/10 bg-surface shadow-2xl"
      >
        <header className="flex items-center justify-between border-b border-white/[0.06] px-5 py-3.5">
          <h2 className="hk-text-display text-[15px] font-semibold text-text-primary">
            New Project
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="flex h-7 w-7 items-center justify-center rounded-md text-text-secondary hover:bg-elevated hover:text-text-primary"
          >
            <X className="h-4 w-4" />
          </button>
        </header>
        <div className="space-y-3.5 p-5">
          <Field label="Name">
            <input
              autoFocus
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Aurora launch film"
              className="h-9 w-full rounded-md border border-white/10 bg-base px-3 text-[13px] text-text-primary placeholder:text-text-dim focus:border-iris focus:outline-none"
            />
          </Field>
          <Field label="Description">
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              placeholder="A short note about scope, audience, or tone."
              className="w-full resize-none rounded-md border border-white/10 bg-base px-3 py-2 text-[13px] text-text-primary placeholder:text-text-dim focus:border-iris focus:outline-none"
            />
          </Field>
          <Field label="Tags" hint="Comma-separated">
            <input
              value={tagsInput}
              onChange={(e) => setTagsInput(e.target.value)}
              placeholder="launch, hero, diffusion"
              className="h-9 w-full rounded-md border border-white/10 bg-base px-3 text-[13px] text-text-primary placeholder:text-text-dim focus:border-iris focus:outline-none"
            />
          </Field>
        </div>
        <footer className="flex justify-end gap-2 border-t border-white/[0.06] px-5 py-3">
          <button
            type="button"
            onClick={onClose}
            className="h-9 rounded-md border border-white/10 bg-transparent px-3 text-[13px] text-text-secondary hover:bg-elevated hover:text-text-primary"
          >
            Cancel
          </button>
          <button
            type="submit"
            className="inline-flex h-9 items-center gap-1.5 rounded-md px-3 text-[13px] font-semibold text-white"
            style={{ background: "var(--gradient-iris)" }}
          >
            <Plus className="h-3.5 w-3.5" />
            Create
          </button>
        </footer>
      </form>
    </div>
  );
}

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <div className="mb-1.5 flex items-center justify-between">
        <span className="text-[11.5px] font-medium uppercase tracking-wider text-text-secondary">
          {label}
        </span>
        {hint && <span className="text-[10.5px] text-text-dim">{hint}</span>}
      </div>
      {children}
    </label>
  );
}

/* ---------- Empty state ---------- */
function EmptyState({ onCreate }: { onCreate: () => void }) {
  return (
    <div className="hk-card flex flex-col items-center justify-center gap-3 px-6 py-16 text-center">
      <div
        className="flex h-12 w-12 items-center justify-center rounded-2xl"
        style={{ background: "var(--gradient-iris)" }}
      >
        <FolderKanban className="h-6 w-6 text-white" />
      </div>
      <div>
        <h3 className="hk-text-display text-[15px] font-semibold text-text-primary">
          No projects match
        </h3>
        <p className="mt-1 text-[12.5px] text-text-secondary">
          Try a different search or create something new.
        </p>
      </div>
      <button
        onClick={onCreate}
        className="mt-1 inline-flex h-9 items-center gap-1.5 rounded-md px-3 text-[13px] font-semibold text-white"
        style={{ background: "var(--gradient-iris)" }}
      >
        <Plus className="h-3.5 w-3.5" />
        New Project
      </button>
    </div>
  );
}

function relativeTime(ts: number) {
  const diff = Date.now() - ts;
  const m = Math.floor(diff / 60_000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d}d ago`;
  return new Date(ts).toLocaleDateString();
}
