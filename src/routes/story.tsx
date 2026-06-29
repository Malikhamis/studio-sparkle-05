import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { BookOpen, Plus, ChevronRight, ChevronDown, Trash2, Pencil, Save, X, Globe as Globe2, Clock, Film, Layers } from "lucide-react";
import {
  useStoryStore,
  STORY_TEMPLATES,
  STORY_STYLES,
  type Series,
  type Season,
  type Episode,
  type Scene,
  type StoryTemplate,
  type StoryStyle,
  type EpisodeStatus,
} from "@/store/story-store";
import { useUniverseStore } from "@/store/universe-store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";

export const Route = createFileRoute("/story")({
  head: () => ({
    meta: [
      { title: "miStory — Hooke" },
      {
        name: "description",
        content:
          "Craft series, seasons, and episodes with AI-assisted scene generation.",
      },
      { property: "og:title", content: "miStory — Hooke" },
      {
        property: "og:description",
        content: "Hierarchical storytelling with universe linking.",
      },
    ],
  }),
  component: StoryPage,
});

const STATUS_STYLES: Record<EpisodeStatus, { label: string; color: string }> = {
  concept: { label: "Concept", color: "var(--accent-gold)" },
  scripted: { label: "Scripted", color: "var(--accent-iris)" },
  storyboarded: { label: "Storyboarded", color: "var(--accent-mint)" },
  rendering: { label: "Rendering", color: "var(--accent-ember)" },
  complete: { label: "Complete", color: "var(--accent-mint)" },
};

function StoryPage() {
  const {
    series,
    activeSeriesId,
    activeSeasonId,
    activeEpisodeId,
    createSeries,
    setActiveSeries,
    deleteSeries,
    createSeason,
    deleteSeason,
    setActiveSeason,
    createEpisode,
    deleteEpisode,
    setActiveEpisode,
    addScene,
    updateScene,
    removeScene,
  } = useStoryStore();

  const universes = useUniverseStore((s) => s.universes);

  const activeSeries = useMemo(
    () => series.find((s) => s.id === activeSeriesId) ?? series[0],
    [series, activeSeriesId]
  );
  const activeSeason = useMemo(
    () => activeSeries?.seasons.find((sn) => sn.id === activeSeasonId) ?? activeSeries?.seasons[0],
    [activeSeries, activeSeasonId]
  );
  const activeEpisode = useMemo(
    () => activeSeason?.episodes.find((ep) => ep.id === activeEpisodeId) ?? activeSeason?.episodes[0],
    [activeSeason, activeEpisodeId]
  );

  const linkedUniverse = useMemo(
    () => universes.find((u) => u.id === activeSeries?.universeId),
    [universes, activeSeries?.universeId]
  );

  return (
    <div className="mx-auto flex w-full max-w-[1600px] flex-col gap-4">
      {/* Header */}
      <header className="flex items-center gap-3">
        <div
          className="flex h-10 w-10 items-center justify-center rounded-xl"
          style={{ background: "var(--gradient-iris)" }}
        >
          <BookOpen className="h-5 w-5 text-white" />
        </div>
        <div>
          <h1 className="hk-text-display text-[20px] font-bold text-text-primary">miStory</h1>
          <p className="text-[12px] text-text-secondary">
            Series, seasons, episodes — AI-assisted storytelling.
          </p>
        </div>
        <div className="ml-auto">
          <NewSeriesButton onCreate={createSeries} />
        </div>
      </header>

      {activeSeries ? (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-[240px_minmax(0,1fr)_minmax(0,1.2fr)]">
          {/* Series rail */}
          <aside className="hk-card flex max-h-[calc(100vh-200px)] min-h-[400px] flex-col overflow-hidden">
            <div className="border-b border-white/[0.06] px-3 py-2.5">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-text-dim">
                Series ({series.length})
              </span>
            </div>
            <div className="flex-1 overflow-y-auto p-1.5">
              {series.map((s) => {
                const isActive = s.id === activeSeries?.id;
                const episodeCount = s.seasons.reduce((sum, sn) => sum + sn.episodes.length, 0);
                return (
                  <button
                    key={s.id}
                    onClick={() => setActiveSeries(s.id)}
                    className={`group flex w-full items-start gap-2 rounded-md px-2.5 py-2 text-left transition-colors ${
                      isActive
                        ? "bg-iris/15 text-iris"
                        : "text-text-secondary hover:bg-surface hover:text-text-primary"
                    }`}
                  >
                    <BookOpen className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-[13px] font-medium">{s.title}</div>
                      <div className="mt-0.5 truncate text-[10.5px] text-text-dim">
                        {s.seasons.length} season{s.seasons.length !== 1 ? "s" : ""} · {episodeCount} ep
                      </div>
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        if (confirm(`Delete "${s.title}"?`)) deleteSeries(s.id);
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

          {/* Season / Episode tree */}
          <div className="hk-card flex max-h-[calc(100vh-200px)] min-h-[400px] flex-col overflow-hidden">
            <div className="flex items-center justify-between border-b border-white/[0.06] px-3 py-2.5">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-text-dim">
                {activeSeries?.title}
              </span>
              <button
                onClick={() => {
                  if (!activeSeries) return;
                  createSeason(activeSeries.id, { title: `Season ${activeSeries.seasons.length + 1}` });
                }}
                className="flex h-6 items-center gap-1 rounded border border-dashed border-white/15 px-2 text-[10.5px] text-text-secondary hover:border-iris/50 hover:text-iris"
              >
                <Plus className="h-3 w-3" />
                Season
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-2">
              {activeSeries?.seasons.map((sn) => (
                <SeasonNode
                  key={sn.id}
                  season={sn}
                 isActive={sn.id === activeSeason?.id}
                  activeEpisodeId={activeEpisode?.id}
                  onSelectSeason={() => setActiveSeason(sn.id)}
                  onSelectEpisode={(epId) => setActiveEpisode(epId)}
                  onAddEpisode={() =>
                    createEpisode(activeSeries.id, sn.id, {
                      title: `Episode ${sn.episodes.length + 1}`,
                    })
                  }
                  onDeleteSeason={() => {
                    if (confirm(`Delete "${sn.title}"?`)) deleteSeason(activeSeries.id, sn.id);
                  }}
                  onDeleteEpisode={(epId) => deleteEpisode(activeSeries.id, sn.id, epId)}
                />
              ))}
            </div>
          </div>

          {/* Episode detail */}
          <div className="hk-card flex max-h-[calc(100vh-200px)] min-h-[400px] flex-col overflow-hidden">
            {activeEpisode ? (
              <EpisodeDetail
                episode={activeEpisode}
                universe={linkedUniverse}
                onAddScene={() =>
                  addScene(activeSeries!.id, activeSeason!.id, activeEpisode.id)
                }
                onUpdateScene={(sceneId, patch) =>
                  updateScene(activeSeries!.id, activeSeason!.id, activeEpisode.id, sceneId, patch)
                }
                onRemoveScene={(sceneId) =>
                  removeScene(activeSeries!.id, activeSeason!.id, activeEpisode.id, sceneId)
                }
              />
            ) : (
              <div className="flex flex-1 items-center justify-center gap-3 p-6 text-center">
                <div>
                  <Film className="mx-auto h-8 w-8 text-text-dim/50" />
                  <p className="mt-2 text-[13px] text-text-secondary">Select an episode</p>
                </div>
              </div>
            )}
          </div>
        </div>
      ) : (
        <EmptyStory onCreate={createSeries} />
      )}
    </div>
  );
}

function SeasonNode({
  season,
  isActive,
  activeEpisodeId,
  onSelectSeason,
  onSelectEpisode,
  onAddEpisode,
  onDeleteSeason,
  onDeleteEpisode,
}: {
  season: Season;
  isActive: boolean;
  activeEpisodeId?: string;
  onSelectSeason: () => void;
  onSelectEpisode: (epId: string) => void;
  onAddEpisode: () => void;
  onDeleteSeason: () => void;
  onDeleteEpisode: (epId: string) => void;
}) {
  const [expanded, setExpanded] = useState(isActive);
  return (
    <div className="mb-1">
      <button
        onClick={() => {
          setExpanded(!expanded);
          onSelectSeason();
        }}
        className={`group flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left transition-colors ${
          isActive ? "bg-elevated" : "hover:bg-elevated/60"
        }`}
      >
        {expanded ? (
          <ChevronDown className="h-3.5 w-3.5 shrink-0 text-text-dim" />
        ) : (
          <ChevronRight className="h-3.5 w-3.5 shrink-0 text-text-dim" />
        )}
        <Layers className="h-3.5 w-3.5 shrink-0 text-text-secondary" />
        <span className="flex-1 truncate text-[12.5px] font-medium text-text-primary">
          {season.title}
        </span>
        <span className="text-[10.5px] text-text-dim">{season.episodes.length}</span>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onDeleteSeason();
          }}
          className="hidden h-5 w-5 items-center justify-center rounded text-text-dim opacity-0 hover:text-[#FF5370] group-hover:flex group-hover:opacity-100"
        >
          <Trash2 className="h-3 w-3" />
        </button>
      </button>
      {expanded && (
        <div className="ml-4 mt-1 space-y-0.5 border-l border-white/10 pl-2">
          {season.episodes.map((ep) => {
            const status = STATUS_STYLES[ep.status];
            const epActive = ep.id === activeEpisodeId;
            return (
              <button
                key={ep.id}
                onClick={() => onSelectEpisode(ep.id)}
                className={`group flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left transition-colors ${
                  epActive
                    ? "bg-iris/15 text-iris"
                    : "text-text-secondary hover:bg-surface hover:text-text-primary"
                }`}
              >
                <Film className="h-3 w-3 shrink-0" />
                <span className="flex-1 truncate text-[12px]">
                  {ep.number}. {ep.title}
                </span>
                <span
                  className="rounded-full px-1.5 py-0.5 text-[9px] font-medium uppercase"
                  style={{
                    background: `color-mix(in oklab, ${status.color} 20%, transparent)`,
                    color: status.color,
                  }}
                >
                  {status.label}
                </span>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onDeleteEpisode(ep.id);
                  }}
                  className="hidden h-4 w-4 items-center justify-center rounded text-text-dim opacity-0 hover:text-[#FF5370] group-hover:flex group-hover:opacity-100"
                >
                  <X className="h-2.5 w-2.5" />
                </button>
              </button>
            );
          })}
          <button
            onClick={onAddEpisode}
            className="flex w-full items-center gap-1.5 rounded-md px-2 py-1.5 text-[11px] text-text-dim hover:bg-surface hover:text-text-primary"
          >
            <Plus className="h-3 w-3" />
            Add episode
          </button>
        </div>
      )}
    </div>
  );
}

function EpisodeDetail({
  episode,
  universe,
  onAddScene,
  onUpdateScene,
  onRemoveScene,
}: {
  episode: Episode;
  universe?: { id: string; name: string };
  onAddScene: () => void;
  onUpdateScene: (sceneId: string, patch: Partial<Scene>) => void;
  onRemoveScene: (sceneId: string) => void;
}) {
  const status = STATUS_STYLES[episode.status];
  const totalSec = episode.scenes.reduce((sum, sc) => sum + sc.duration, 0);

  return (
    <>
      <div className="border-b border-white/[0.06] px-4 py-3">
        <div className="flex items-start justify-between gap-2">
          <div>
            <h3 className="hk-text-display text-[15px] font-semibold text-text-primary">
              {episode.title}
            </h3>
            <p className="mt-0.5 text-[12px] text-text-secondary">
              {episode.logline || "No logline yet."}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span
              className="rounded-full px-2 py-0.5 text-[10.5px] font-medium"
              style={{
                background: `color-mix(in oklab, ${status.color} 20%, transparent)`,
                color: status.color,
              }}
            >
              {status.label}
            </span>
          </div>
        </div>
        <div className="mt-3 flex items-center gap-3 text-[11px] text-text-dim">
          <span className="flex items-center gap-1">
            <Clock className="h-3 w-3" />
            {formatDuration(totalSec)}
          </span>
          <span className="flex items-center gap-1">
            <Film className="h-3 w-3" />
            {episode.scenes.length} scene{episode.scenes.length !== 1 ? "s" : ""}
          </span>
          {universe && (
            <span className="flex items-center gap-1 text-iris">
              <Globe2 className="h-3 w-3" />
              {universe.name}
            </span>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        <div className="space-y-3">
          {episode.scenes.map((sc) => (
            <SceneCard
              key={sc.id}
              scene={sc}
              onUpdate={(patch) => onUpdateScene(sc.id, patch)}
              onRemove={() => onRemoveScene(sc.id)}
            />
          ))}
          {episode.scenes.length === 0 && (
            <div className="rounded-lg border border-dashed border-white/10 p-6 text-center">
              <Film className="mx-auto h-6 w-6 text-text-dim/50" />
              <p className="mt-2 text-[12px] text-text-secondary">
                No scenes yet. Add your first scene to begin.
              </p>
            </div>
          )}
        </div>
      </div>

      <div className="border-t border-white/[0.06] p-3">
        <button
          onClick={onAddScene}
          className="inline-flex h-9 w-full items-center justify-center gap-1.5 rounded-md text-[13px] font-semibold text-white"
          style={{ background: "var(--gradient-iris)" }}
        >
          <Plus className="h-3.5 w-3.5" />
          Add scene
        </button>
      </div>
    </>
  );
}

function SceneCard({
  scene,
  onUpdate,
  onRemove,
}: {
  scene: Scene;
  onUpdate: (patch: Partial<Scene>) => void;
  onRemove: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [heading, setHeading] = useState(scene.heading);
  const [description, setDescription] = useState(scene.description);
  const [prompt, setPrompt] = useState(scene.prompt);

  const save = () => {
    onUpdate({ heading, description, prompt });
    setEditing(false);
  };

  return (
    <div className="rounded-lg border border-white/[0.06] bg-base/40 p-3">
      <div className="mb-2 flex items-center gap-2">
        <div
          className="flex h-6 w-6 items-center justify-center rounded text-[10.5px] font-semibold text-white"
          style={{ background: "var(--gradient-iris)" }}
        >
          {scene.number}
        </div>
        {editing ? (
          <Input
            value={heading}
            onChange={(e) => setHeading(e.target.value)}
            className="h-7 flex-1 text-[13px]"
          />
        ) : (
          <input
            value={scene.heading}
            onChange={(e) => onUpdate({ heading: e.target.value })}
            className="hk-text-display flex-1 bg-transparent text-[13.5px] font-semibold text-text-primary focus:outline-none"
          />
        )}
        <div className="flex items-center gap-1">
          <input
            type="number"
            min={1}
            value={scene.duration}
            onChange={(e) => onUpdate({ duration: Math.max(1, Number(e.target.value) || 1) })}
            className="h-6 w-14 rounded border border-white/10 bg-base px-2 text-right text-[11px] text-text-primary focus:border-iris focus:outline-none"
          />
          <span className="text-[10.5px] text-text-dim">sec</span>
        </div>
        <button
          onClick={onRemove}
          className="ml-1 flex h-6 w-6 items-center justify-center rounded text-text-dim hover:bg-elevated hover:text-[#FF5370]"
        >
          <Trash2 className="h-3 w-3" />
        </button>
      </div>

      {editing ? (
        <>
          <Textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={2}
            placeholder="What happens in this scene..."
            className="mb-2 text-[12px]"
          />
          <Textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            rows={2}
            placeholder="Generation prompt..."
            className="font-mono text-[11.5px]"
          />
          <div className="mt-2 flex justify-end gap-1.5">
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
          <p className="text-[12px] leading-relaxed text-text-secondary">
            {scene.description || "No description."}
          </p>
          {scene.prompt && (
            <div className="mt-2 rounded border border-white/[0.06] bg-base/60 p-2">
              <div className="text-[10px] font-medium uppercase tracking-wider text-text-dim">
                Prompt
              </div>
              <p className="mt-0.5 font-mono text-[11px] text-text-secondary line-clamp-2">
                {scene.prompt}
              </p>
            </div>
          )}
          <button
            onClick={() => setEditing(true)}
            className="mt-2 flex items-center gap-1 text-[11px] text-text-dim hover:text-text-primary"
          >
            <Pencil className="h-3 w-3" />
            Edit
          </button>
        </>
      )}
    </div>
  );
}

function NewSeriesButton({
  onCreate,
}: {
  onCreate: (input: {
    title: string;
    logline?: string;
    universeId?: string;
    template: StoryTemplate;
    style: StoryStyle;
  }) => void;
}) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [logline, setLogline] = useState("");
  const [template, setTemplate] = useState<StoryTemplate>("cinematic");
  const [style, setStyle] = useState<StoryStyle>("cinematic");
  const universes = useUniverseStore((s) => s.universes);
  const [universeId, setUniverseId] = useState<string>("");

  const create = () => {
    onCreate({
      title,
      logline,
      universeId: universeId || undefined,
      template,
      style,
    });
    setTitle("");
    setLogline("");
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" style={{ background: "var(--gradient-iris)" }} className="text-white">
          <Plus className="h-3.5 w-3.5" />
          New series
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>New series</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label>Title</Label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="The Signal"
            />
          </div>
          <div className="space-y-1.5">
            <Label>Logline</Label>
            <Textarea
              value={logline}
              onChange={(e) => setLogline(e.target.value)}
              rows={2}
              placeholder="A deep-space crew chases a whisper from a dead star."
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Template</Label>
              <Select value={template} onValueChange={(v) => setTemplate(v as StoryTemplate)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {STORY_TEMPLATES.map((t) => (
                    <SelectItem key={t.id} value={t.id}>
                      {t.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Style</Label>
              <Select value={style} onValueChange={(v) => setStyle(v as StoryStyle)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {STORY_STYLES.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Link to Universe (optional)</Label>
            <Select value={universeId} onValueChange={setUniverseId}>
              <SelectTrigger>
                <SelectValue placeholder="None" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">None</SelectItem>
                {universes.map((u) => (
                  <SelectItem key={u.id} value={u.id}>
                    {u.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button disabled={!title.trim()} onClick={create}>
            Create
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function EmptyStory({
  onCreate,
}: {
  onCreate: (input: {
    title: string;
    logline?: string;
    universeId?: string;
    template: StoryTemplate;
    style: StoryStyle;
  }) => void;
}) {
  return (
    <div className="hk-card flex flex-col items-center justify-center gap-4 p-12 text-center">
      <div
        className="flex h-14 w-14 items-center justify-center rounded-2xl"
        style={{ background: "var(--gradient-iris)" }}
      >
        <BookOpen className="h-7 w-7 text-white" />
      </div>
      <div>
        <h2 className="hk-text-display text-[20px] font-bold text-text-primary">
          Start your first series
        </h2>
        <p className="mx-auto mt-1 max-w-md text-[13px] text-text-secondary">
          Create a series, add seasons and episodes, and link to a miUniverse for character and lore consistency.
        </p>
      </div>
      <NewSeriesButton onCreate={onCreate} />
    </div>
  );
}

function formatDuration(sec: number): string {
  if (sec < 60) return `${sec}s`;
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return s ? `${m}m ${s}s` : `${m}m`;
}
