import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import {
  LayoutGrid,
  Plus,
  Trash2,
  Pencil,
  Save,
  X,
  Film,
  Clock,
  Camera,
  Move,
  RefreshCw,
  Image as ImageIcon,
  Loader as Loader2,
  CircleCheck as CheckCircle2,
  CircleAlert as AlertCircle,
  ChevronRight,
} from "lucide-react";
import {
  useStoryboardStore,
  CAMERA_ANGLES,
  CAMERA_MOVEMENTS,
  type Storyboard,
  type Panel,
  type CameraAngle,
  type CameraMovement,
  type PanelStatus,
} from "@/store/storyboard-store";
import { useBlueprintStore } from "@/store/blueprint-store";
import { useStoryStore } from "@/store/story-store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export const Route = createFileRoute("/storyboard")({
  head: () => ({
    meta: [
      { title: "Storyboard — Hooke" },
      {
        name: "description",
        content:
          "Visual storyboard from blueprint scenes — camera angles, movement, shot duration, inline regenerate.",
      },
      { property: "og:title", content: "Storyboard — Hooke" },
      {
        property: "og:description",
        content: "Visual storyboard with camera direction per panel.",
      },
    ],
  }),
  component: StoryboardPage,
});

const STATUS_META: Record<PanelStatus, { label: string; color: string }> = {
  pending: { label: "Pending", color: "var(--text-dim)" },
  generating: { label: "Generating", color: "var(--accent-iris)" },
  complete: { label: "Complete", color: "var(--accent-mint)" },
  failed: { label: "Failed", color: "#FF5370" },
};

function StoryboardPage() {
  const {
    storyboards,
    activeId,
    setActive,
    deleteStoryboard,
    createStandalone,
    createFromBlueprint,
    createFromEpisode,
    addPanel,
    updatePanel,
    removePanel,
  } = useStoryboardStore();

  const [showNew, setShowNew] = useState(false);

  const active = useMemo(
    () => storyboards.find((s) => s.id === activeId) ?? storyboards[0],
    [storyboards, activeId]
  );

  return (
    <div className="mx-auto flex w-full max-w-[1600px] flex-col gap-4">
      {/* Header */}
      <header className="flex items-center gap-3">
        <div
          className="flex h-10 w-10 items-center justify-center rounded-xl"
          style={{ background: "var(--gradient-iris)" }}
        >
          <LayoutGrid className="h-5 w-5 text-white" />
        </div>
        <div>
          <h1 className="hk-text-display text-[20px] font-bold text-text-primary">
            Storyboard
          </h1>
          <p className="text-[12px] text-text-secondary">
            Visual scene-by-scene breakdown with camera direction.
          </p>
        </div>
        <div className="ml-auto">
          <Button
            size="sm"
            style={{ background: "var(--gradient-iris)" }}
            className="text-white"
            onClick={() => setShowNew(true)}
          >
            <Plus className="h-3.5 w-3.5" />
            New storyboard
          </Button>
        </div>
      </header>

      {active ? (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-[220px_minmax(0,1fr)]">
          {/* Storyboard rail */}
          <aside className="hk-card flex max-h-[calc(100vh-200px)] min-h-[400px] flex-col overflow-hidden">
            <div className="border-b border-white/[0.06] px-3 py-2.5">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-text-dim">
                Boards ({storyboards.length})
              </span>
            </div>
            <div className="flex-1 overflow-y-auto p-1.5">
              {storyboards.map((sb) => {
                const isActive = sb.id === active?.id;
                return (
                  <button
                    key={sb.id}
                    onClick={() => setActive(sb.id)}
                    className={`group flex w-full items-start gap-2 rounded-md px-2.5 py-2 text-left transition-colors ${
                      isActive
                        ? "bg-iris/15 text-iris"
                        : "text-text-secondary hover:bg-surface hover:text-text-primary"
                    }`}
                  >
                    <LayoutGrid className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-[13px] font-medium">{sb.title}</div>
                      <div className="mt-0.5 truncate text-[10.5px] text-text-dim">
                        {sb.panels.length} panels · {sb.sourceType}
                      </div>
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        if (confirm(`Delete "${sb.title}"?`)) deleteStoryboard(sb.id);
                      }}
                      className="hidden h-5 w-5 items-center justify-center rounded text-text-dim opacity-0 transition-opacity hover:text-[#FF5370] group-hover:flex group-hover:opacity-100"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </button>
                );
              })}
            </div>
          </aside>

          {/* Panel grid */}
          <div className="hk-card flex max-h-[calc(100vh-200px)] min-h-[400px] flex-col overflow-hidden">
            <div className="flex items-center justify-between border-b border-white/[0.06] px-4 py-3">
              <div className="min-w-0">
                <h3 className="hk-text-display truncate text-[15px] font-semibold text-text-primary">
                  {active.title}
                </h3>
                <div className="mt-0.5 flex items-center gap-3 text-[11px] text-text-dim">
                  <span className="flex items-center gap-1">
                    <Film className="h-3 w-3" />
                    {active.panels.length} panels
                  </span>
                  <span className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {formatDuration(
                      active.panels.reduce((sum, p) => sum + p.shotDuration, 0)
                    )}
                  </span>
                </div>
              </div>
              <button
                onClick={() => addPanel(active.id)}
                className="flex h-7 items-center gap-1.5 rounded-md border border-dashed border-white/15 px-2.5 text-[11px] text-text-secondary hover:border-iris/50 hover:text-iris"
              >
                <Plus className="h-3 w-3" />
                Panel
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4">
              {active.panels.length === 0 ? (
                <div className="rounded-lg border border-dashed border-white/10 p-8 text-center">
                  <LayoutGrid className="mx-auto h-8 w-8 text-text-dim/50" />
                  <p className="mt-2 text-[13px] text-text-secondary">
                    No panels yet. Add your first panel to begin.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
                  {active.panels.map((panel) => (
                    <PanelCard
                      key={panel.id}
                      panel={panel}
                      onUpdate={(patch) => updatePanel(active.id, panel.id, patch)}
                      onRemove={() => removePanel(active.id, panel.id)}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      ) : (
        <div className="hk-card flex flex-col items-center justify-center gap-4 p-12 text-center">
          <div
            className="flex h-14 w-14 items-center justify-center rounded-2xl"
            style={{ background: "var(--gradient-iris)" }}
          >
            <LayoutGrid className="h-7 w-7 text-white" />
          </div>
          <div>
            <h2 className="hk-text-display text-[20px] font-bold text-text-primary">
              Create a storyboard
            </h2>
            <p className="mx-auto mt-1 max-w-md text-[13px] text-text-secondary">
              Build a visual shot-by-shot breakdown from a blueprint, episode, or from scratch.
            </p>
          </div>
          <Button
            onClick={() => setShowNew(true)}
            style={{ background: "var(--gradient-iris)" }}
            className="text-white"
          >
            <Plus className="h-3.5 w-3.5" />
            New storyboard
          </Button>
        </div>
      )}

      {showNew && (
        <NewStoryboardDialog
          onClose={() => setShowNew(false)}
          onCreateStandalone={(title) => {
            createStandalone(title);
            setShowNew(false);
          }}
          onCreateFromBlueprint={(blueprintId, title) => {
            const conv = useBlueprintStore.getState().conversations.find(
              (c) => c.id === blueprintId
            );
            if (conv?.blueprint) {
              createFromBlueprint({
                title,
                blueprintId,
                scenes: conv.blueprint.scenes,
              });
            }
            setShowNew(false);
          }}
          onCreateFromEpisode={(episodeId, title) => {
            const state = useStoryStore.getState();
            for (const s of state.series) {
              for (const sn of s.seasons) {
                const ep = sn.episodes.find((e) => e.id === episodeId);
                if (ep) {
                  createFromEpisode({
                    title,
                    episodeId,
                    scenes: ep.scenes.length > 0
                      ? ep.scenes
                      : [{
                          id: ep.id,
                          number: 1,
                          heading: ep.title,
                          description: ep.logline,
                          prompt: "",
                          duration: 10,
                        }],
                  });
                  setShowNew(false);
                  return;
                }
              }
            }
          }}
        />
      )}
    </div>
  );
}

function PanelCard({
  panel,
  onUpdate,
  onRemove,
}: {
  panel: Panel;
  onUpdate: (patch: Partial<Panel>) => void;
  onRemove: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [heading, setHeading] = useState(panel.heading);
  const [description, setDescription] = useState(panel.description);
  const [prompt, setPrompt] = useState(panel.prompt);
  const [notes, setNotes] = useState(panel.notes);

  const status = STATUS_META[panel.status];

  const save = () => {
    onUpdate({ heading, description, prompt, notes });
    setEditing(false);
  };

  return (
    <div className="group flex flex-col overflow-hidden rounded-lg border border-white/[0.06] bg-base/40">
      {/* Panel image / placeholder */}
      <div className="relative aspect-video bg-base/80">
        {panel.imageUrl ? (
          <img
            src={panel.imageUrl}
            alt={panel.heading}
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center">
            {panel.status === "generating" ? (
              <Loader2 className="h-6 w-6 animate-spin text-iris" />
            ) : panel.status === "complete" ? (
              <ImageIcon className="h-6 w-6 text-mint" />
            ) : panel.status === "failed" ? (
              <AlertCircle className="h-6 w-6 text-[#FF5370]" />
            ) : (
              <ImageIcon className="h-6 w-6 text-text-dim/30" />
            )}
          </div>
        )}
        {/* Panel number badge */}
        <div
          className="absolute left-2 top-2 flex h-6 w-6 items-center justify-center rounded text-[10.5px] font-semibold text-white"
          style={{ background: "var(--gradient-iris)" }}
        >
          {panel.number}
        </div>
        {/* Status badge */}
        <div
          className="absolute right-2 top-2 rounded-full px-2 py-0.5 text-[9px] font-medium uppercase"
          style={{
            background: `color-mix(in oklab, ${status.color} 20%, transparent)`,
            color: status.color,
          }}
        >
          {status.label}
        </div>
      </div>

      {/* Panel content */}
      <div className="flex flex-1 flex-col p-3">
        {editing ? (
          <>
            <Input
              value={heading}
              onChange={(e) => setHeading(e.target.value)}
              className="mb-2 h-7 text-[13px]"
            />
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              placeholder="What happens in this shot..."
              className="mb-2 text-[12px]"
            />
            <Textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              rows={2}
              placeholder="Generation prompt..."
              className="mb-2 font-mono text-[11px]"
            />
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              placeholder="Director notes..."
              className="mb-2 text-[11px]"
            />
            <div className="flex justify-end gap-1.5">
              <Button size="sm" variant="ghost" onClick={() => setEditing(false)}>
                Cancel
              </Button>
              <Button size="sm" onClick={save}>
                <Save className="h-3 w-3" />
                Save
              </Button>
            </div>
          </>
        ) : (
          <>
            <h4 className="hk-text-display text-[13px] font-semibold text-text-primary">
              {panel.heading}
            </h4>
            <p className="mt-1 text-[11.5px] leading-relaxed text-text-secondary line-clamp-2">
              {panel.description || "No description."}
            </p>

            {/* Camera metadata */}
            <div className="mt-2 flex flex-wrap gap-1.5">
              <span className="inline-flex items-center gap-1 rounded border border-white/10 bg-base px-1.5 py-0.5 text-[10px] text-text-secondary">
                <Camera className="h-2.5 w-2.5" />
                {CAMERA_ANGLES.find((a) => a.id === panel.angle)?.label ?? panel.angle}
              </span>
              <span className="inline-flex items-center gap-1 rounded border border-white/10 bg-base px-1.5 py-0.5 text-[10px] text-text-secondary">
                <Move className="h-2.5 w-2.5" />
                {CAMERA_MOVEMENTS.find((m) => m.id === panel.movement)?.label ?? panel.movement}
              </span>
              <span className="inline-flex items-center gap-1 rounded border border-white/10 bg-base px-1.5 py-0.5 text-[10px] text-text-secondary">
                <Clock className="h-2.5 w-2.5" />
                {panel.shotDuration}s
              </span>
            </div>

            {panel.notes && (
              <div className="mt-2 rounded border border-white/[0.06] bg-base/60 p-2">
                <p className="text-[10.5px] italic text-text-dim">{panel.notes}</p>
              </div>
            )}

            {/* Actions */}
            <div className="mt-3 flex items-center gap-1.5 border-t border-white/[0.06] pt-2">
              <button
                onClick={() => setEditing(true)}
                className="flex items-center gap-1 text-[10.5px] text-text-dim hover:text-text-primary"
              >
                <Pencil className="h-3 w-3" />
                Edit
              </button>
              <button
                onClick={() => onUpdate({ status: "generating" })}
                className="flex items-center gap-1 text-[10.5px] text-text-dim hover:text-iris"
              >
                <RefreshCw className="h-3 w-3" />
                Regenerate
              </button>
              <button
                onClick={onRemove}
                className="ml-auto flex items-center gap-1 text-[10.5px] text-text-dim hover:text-[#FF5370]"
              >
                <Trash2 className="h-3 w-3" />
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function NewStoryboardDialog({
  onClose,
  onCreateStandalone,
  onCreateFromBlueprint,
  onCreateFromEpisode,
}: {
  onClose: () => void;
  onCreateStandalone: (title: string) => void;
  onCreateFromBlueprint: (blueprintId: string, title: string) => void;
  onCreateFromEpisode: (episodeId: string, title: string) => void;
}) {
  const [mode, setMode] = useState<"standalone" | "blueprint" | "episode">("standalone");
  const [title, setTitle] = useState("");

  const conversations = useBlueprintStore((s) => s.conversations);
  const blueprints = conversations.filter((c) => c.blueprint);

  const series = useStoryStore((s) => s.series);
  const episodes = series.flatMap((s) =>
    s.seasons.flatMap((sn) =>
      sn.episodes.map((ep) => ({
        id: ep.id,
        label: `${s.title} — ${sn.title} — Ep ${ep.number}: ${ep.title}`,
      }))
    )
  );

  const [blueprintId, setBlueprintId] = useState("");
  const [episodeId, setEpisodeId] = useState("");

  const create = () => {
    const t = title.trim() || "Untitled Storyboard";
    if (mode === "standalone") {
      onCreateStandalone(t);
    } else if (mode === "blueprint" && blueprintId) {
      onCreateFromBlueprint(blueprintId, t);
    } else if (mode === "episode" && episodeId) {
      onCreateFromEpisode(episodeId, t);
    }
  };

  const canCreate =
    mode === "standalone" ||
    (mode === "blueprint" && blueprintId) ||
    (mode === "episode" && episodeId);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-xl border border-white/[0.08] bg-base p-4 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-[15px] font-semibold text-text-primary">New storyboard</h3>
          <button onClick={onClose} className="text-text-dim hover:text-text-primary">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label className="text-[11px]">Source</Label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { id: "standalone" as const, label: "Blank" },
                { id: "blueprint" as const, label: "Blueprint" },
                { id: "episode" as const, label: "Episode" },
              ].map((m) => (
                <button
                  key={m.id}
                  onClick={() => setMode(m.id)}
                  className={`rounded-lg border p-2.5 text-[11px] font-medium transition-colors ${
                    mode === m.id
                      ? "border-iris/50 bg-iris/10 text-iris"
                      : "border-white/10 text-text-secondary hover:border-white/20 hover:bg-elevated"
                  }`}
                >
                  {m.label}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-[11px]">Title</Label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Untitled Storyboard"
              className="h-8 text-[13px]"
            />
          </div>

          {mode === "blueprint" && (
            <div className="space-y-1.5">
              <Label className="text-[11px]">Blueprint</Label>
              {blueprints.length === 0 ? (
                <p className="text-[11px] text-text-dim">
                  No blueprints yet. Generate one in miDirector first.
                </p>
              ) : (
                <Select value={blueprintId} onValueChange={setBlueprintId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select blueprint..." />
                  </SelectTrigger>
                  <SelectContent>
                    {blueprints.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.blueprint!.title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>
          )}

          {mode === "episode" && (
            <div className="space-y-1.5">
              <Label className="text-[11px]">Episode</Label>
              {episodes.length === 0 ? (
                <p className="text-[11px] text-text-dim">
                  No episodes yet. Create one in miStory first.
                </p>
              ) : (
                <Select value={episodeId} onValueChange={setEpisodeId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select episode..." />
                  </SelectTrigger>
                  <SelectContent>
                    {episodes.map((ep) => (
                      <SelectItem key={ep.id} value={ep.id}>
                        {ep.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>
          )}
        </div>

        <div className="mt-4 flex items-center justify-end gap-2">
          <Button size="sm" variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button
            size="sm"
            onClick={create}
            disabled={!canCreate}
            style={{ background: "var(--gradient-iris)" }}
            className="text-white"
          >
            Create
          </Button>
        </div>
      </div>
    </div>
  );
}

function formatDuration(sec: number): string {
  if (sec < 60) return `${sec}s`;
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return s ? `${m}m ${s}s` : `${m}m`;
}
