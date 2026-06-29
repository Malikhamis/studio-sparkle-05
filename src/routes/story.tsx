import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { BookOpen, Plus, ChevronRight, ChevronDown, Trash2, Pencil, Save, X, Globe as Globe2, Clock, Film, Layers, Users, MapPin, Package, Heart, Sun, Cloud, StickyNote, MemoryStick, FileText, Image, Lightbulb, Wand as Wand2 } from "lucide-react";
import {
  useStoryStore,
  STORY_TEMPLATES,
  STORY_STYLES,
  type Series,
  type Season,
  type Episode,
  type Scene,
  type StoryMemory,
  type StoryTemplate,
  type StoryStyle,
  type EpisodeStatus,
  type InputMode,
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
    updateMemory,
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
                  seriesId={activeSeries.id}
                  onSelectSeason={() => setActiveSeason(sn.id)}
                  onSelectEpisode={(epId) => setActiveEpisode(epId)}
                  onCreateEpisode={(input) => createEpisode(activeSeries.id, sn.id, input)}
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
                onUpdateMemory={(patch) =>
                  updateMemory(activeSeries!.id, activeSeason!.id, activeEpisode.id, patch)
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
  seriesId,
  onSelectSeason,
  onSelectEpisode,
  onCreateEpisode,
  onDeleteSeason,
  onDeleteEpisode,
}: {
  season: Season;
  isActive: boolean;
  activeEpisodeId?: string;
  seriesId: string;
  onSelectSeason: () => void;
  onSelectEpisode: (epId: string) => void;
  onCreateEpisode: (input: { title: string; logline?: string }) => void;
  onDeleteSeason: () => void;
  onDeleteEpisode: (epId: string) => void;
}) {
  const [expanded, setExpanded] = useState(isActive);
  const [showNewEpisode, setShowNewEpisode] = useState(false);
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
            onClick={() => setShowNewEpisode(true)}
            className="flex w-full items-center gap-1.5 rounded-md px-2 py-1.5 text-[11px] text-text-dim hover:bg-surface hover:text-text-primary"
          >
            <Plus className="h-3 w-3" />
            Add episode
          </button>
        </div>
      )}

      {showNewEpisode && (
        <NewEpisodeDialog
          episodeCount={season.episodes.length + 1}
          onConfirm={(input) => {
            onCreateEpisode(input);
            setShowNewEpisode(false);
          }}
          onClose={() => setShowNewEpisode(false)}
        />
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
  onUpdateMemory,
}: {
  episode: Episode;
  universe?: { id: string; name: string };
  onAddScene: () => void;
  onUpdateScene: (sceneId: string, patch: Partial<Scene>) => void;
  onRemoveScene: (sceneId: string) => void;
  onUpdateMemory: (patch: Partial<StoryMemory>) => void;
}) {
  const status = STATUS_STYLES[episode.status];
  const totalSec = episode.scenes.reduce((sum, sc) => sum + sc.duration, 0);
  const [showMemory, setShowMemory] = useState(false);

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
            <button
              onClick={() => setShowMemory(!showMemory)}
              className={`flex h-7 items-center gap-1.5 rounded-md border px-2 text-[11px] font-medium transition-colors ${
                showMemory
                  ? "border-iris/50 bg-iris/15 text-iris"
                  : "border-white/10 text-text-dim hover:border-white/20 hover:text-text-secondary"
              }`}
            >
              <MemoryStick className="h-3 w-3" />
              Memory
            </button>
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

      {/* Story Memory Panel */}
      {showMemory && (
        <StoryMemoryPanel
          memory={episode.memory}
          onUpdate={onUpdateMemory}
        />
      )}

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

function StoryMemoryPanel({
  memory,
  onUpdate,
}: {
  memory: StoryMemory;
  onUpdate: (patch: Partial<StoryMemory>) => void;
}) {
  const addItem = (key: keyof Pick<StoryMemory, "characters" | "locations" | "props" | "emotions" | "notes">, value: string) => {
    const arr = memory[key];
    if (!value.trim() || arr.includes(value.trim())) return;
    onUpdate({ [key]: [...arr, value.trim()] });
  };

  const removeItem = (key: keyof Pick<StoryMemory, "characters" | "locations" | "props" | "emotions" | "notes">, value: string) => {
    onUpdate({ [key]: memory[key].filter((v) => v !== value) });
  };

  return (
    <div className="border-b border-white/[0.06] bg-base/50 p-3">
      <div className="grid grid-cols-2 gap-3">
        <MemoryField
          label="Characters"
          icon={Users}
          values={memory.characters}
          placeholder="Add character..."
          onAdd={(v) => addItem("characters", v)}
          onRemove={(v) => removeItem("characters", v)}
        />
        <MemoryField
          label="Locations"
          icon={MapPin}
          values={memory.locations}
          placeholder="Add location..."
          onAdd={(v) => addItem("locations", v)}
          onRemove={(v) => removeItem("locations", v)}
        />
        <MemoryField
          label="Props"
          icon={Package}
          values={memory.props}
          placeholder="Add prop..."
          onAdd={(v) => addItem("props", v)}
          onRemove={(v) => removeItem("props", v)}
        />
        <MemoryField
          label="Emotions"
          icon={Heart}
          values={memory.emotions}
          placeholder="Add emotion..."
          onAdd={(v) => addItem("emotions", v)}
          onRemove={(v) => removeItem("emotions", v)}
        />
      </div>

      <div className="mt-3 grid grid-cols-2 gap-3">
        <div className="flex items-center gap-2">
          <Sun className="h-3.5 w-3.5 text-text-dim" />
          <Input
            value={memory.timeOfDay ?? ""}
            onChange={(e) => onUpdate({ timeOfDay: e.target.value })}
            placeholder="Time of day..."
            className="h-7 text-[12px]"
          />
        </div>
        <div className="flex items-center gap-2">
          <Cloud className="h-3.5 w-3.5 text-text-dim" />
          <Input
            value={memory.weather ?? ""}
            onChange={(e) => onUpdate({ weather: e.target.value })}
            placeholder="Weather..."
            className="h-7 text-[12px]"
          />
        </div>
      </div>

      <div className="mt-3">
        <div className="flex items-center gap-1.5 mb-1">
          <StickyNote className="h-3.5 w-3.5 text-text-dim" />
          <span className="text-[10px] font-medium uppercase tracking-wider text-text-dim">
            Continuity Notes
          </span>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {memory.notes.map((note, i) => (
            <span
              key={i}
              className="group inline-flex items-center gap-1 rounded border border-white/10 bg-base px-2 py-0.5 text-[11px] text-text-secondary"
            >
              {note}
              <button
                onClick={() => removeItem("notes", note)}
                className="ml-0.5 text-text-dim hover:text-[#FF5370]"
              >
                <X className="h-2.5 w-2.5" />
              </button>
            </span>
          ))}
        </div>
        <Input
          placeholder="Add continuity note..."
          className="mt-1.5 h-7 text-[12px]"
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              addItem("notes", (e.target as HTMLInputElement).value);
              (e.target as HTMLInputElement).value = "";
            }
          }}
        />
      </div>
    </div>
  );
}

function MemoryField({
  label,
  icon: Icon,
  values,
  placeholder,
  onAdd,
  onRemove,
}: {
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  values: string[];
  placeholder: string;
  onAdd: (value: string) => void;
  onRemove: (value: string) => void;
}) {
  return (
    <div>
      <div className="flex items-center gap-1.5 mb-1">
        <Icon className="h-3.5 w-3.5 text-text-dim" />
        <span className="text-[10px] font-medium uppercase tracking-wider text-text-dim">
          {label}
        </span>
      </div>
      <div className="flex flex-wrap gap-1">
        {values.map((v, i) => (
          <span
            key={i}
            className="group inline-flex items-center gap-1 rounded border border-white/10 bg-base px-2 py-0.5 text-[11px] text-text-secondary"
          >
            {v}
            <button
              onClick={() => onRemove(v)}
              className="ml-0.5 text-text-dim hover:text-[#FF5370]"
            >
              <X className="h-2.5 w-2.5" />
            </button>
          </span>
        ))}
        <input
          placeholder={values.length === 0 ? placeholder : "+"}
          className="w-16 rounded border border-white/10 bg-base px-1.5 py-0.5 text-[11px] text-text-primary placeholder:text-text-dim/50 focus:border-iris focus:outline-none"
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              onAdd((e.target as HTMLInputElement).value);
              (e.target as HTMLInputElement).value = "";
            }
          }}
        />
      </div>
    </div>
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

const INPUT_MODES: { id: InputMode; label: string; icon: React.ComponentType<{ className?: string }>; description: string }[] = [
  { id: "script", label: "Script", icon: FileText, description: "Paste or write a script to generate scenes from" },
  { id: "image", label: "Image", icon: Image, description: "Upload an image to inspire the story" },
  { id: "idea", label: "Idea", icon: Lightbulb, description: "Describe your concept and let AI expand it" },
];

function NewEpisodeDialog({
  episodeCount,
  onConfirm,
  onClose,
}: {
  episodeCount: number;
  onConfirm: (input: { title: string; logline?: string }) => void;
  onClose: () => void;
}) {
  const [mode, setMode] = useState<InputMode>("idea");
  const [title, setTitle] = useState(`Episode ${episodeCount}`);
  const [logline, setLogline] = useState("");
  const [content, setContent] = useState("");

  const handleCreate = () => {
    onConfirm({ title, logline });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={onClose}>
      <div
        className="w-full max-w-md rounded-xl border border-white/[0.08] bg-base p-4 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-[15px] font-semibold text-text-primary">New episode</h3>
          <button onClick={onClose} className="text-text-dim hover:text-text-primary">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label className="text-[11px]">Input mode</Label>
            <div className="grid grid-cols-3 gap-2">
              {INPUT_MODES.map((m) => {
                const Icon = m.icon;
                const active = mode === m.id;
                return (
                  <button
                    key={m.id}
                    onClick={() => setMode(m.id)}
                    className={`flex flex-col items-center gap-1.5 rounded-lg border p-3 transition-colors ${
                      active
                        ? "border-iris/50 bg-iris/10 text-iris"
                        : "border-white/10 text-text-secondary hover:border-white/20 hover:bg-elevated"
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                    <span className="text-[11px] font-medium">{m.label}</span>
                  </button>
                );
              })}
            </div>
            <p className="text-[10.5px] text-text-dim">
              {INPUT_MODES.find((m) => m.id === mode)?.description}
            </p>
          </div>

          <div className="space-y-1.5">
            <Label className="text-[11px]">Title</Label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="h-8 text-[13px]"
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-[11px]">Logline</Label>
            <Textarea
              value={logline}
              onChange={(e) => setLogline(e.target.value)}
              rows={2}
              placeholder="Brief summary of this episode..."
              className="text-[12px]"
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-[11px]">
              {mode === "script" && "Script content"}
              {mode === "image" && "Image URL (optional)"}
              {mode === "idea" && "Your idea"}
            </Label>
            {mode === "script" && (
              <Textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                rows={4}
                placeholder="Paste your script here..."
                className="font-mono text-[11px]"
              />
            )}
            {mode === "image" && (
              <Input
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="https://..."
                className="h-8 text-[12px]"
              />
            )}
            {mode === "idea" && (
              <Textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                rows={3}
                placeholder="Describe your episode concept..."
                className="text-[12px]"
              />
            )}
          </div>
        </div>

        <div className="mt-4 flex items-center justify-end gap-2">
          <Button size="sm" variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button
            size="sm"
            onClick={handleCreate}
            disabled={!title.trim()}
            style={{ background: "var(--gradient-iris)" }}
            className="text-white"
          >
            <Wand2 className="h-3 w-3" />
            Create episode
          </Button>
        </div>
      </div>
    </div>
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
