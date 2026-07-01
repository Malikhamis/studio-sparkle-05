import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import {
  AudioWaveform,
  Mic,
  Music,
  Volume2,
  Plus,
  Trash2,
  Play,
  RefreshCw,
  Loader as Loader2,
  CircleCheck as CheckCircle2,
  CircleAlert as AlertCircle,
  Sparkles,
  X,
  Clock,
} from "lucide-react";
import {
  useAudioStore,
  EMOTION_PRESETS,
  MUSIC_MOODS,
  SFX_CATEGORIES,
  type AudioProject,
  type NarrationTrack,
  type MusicTrack,
  type SfxSuggestion,
  type NarrationStatus,
} from "@/store/audio-store";
import { useUniverseStore } from "@/store/universe-store";
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
import { Slider } from "@/components/ui/slider";
import {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from "@/components/ui/tabs";

export const Route = createFileRoute("/audio")({
  head: () => ({
    meta: [
      { title: "Audio Studio — Hooke" },
      {
        name: "description",
        content:
          "Smart narration, AI music selection, and SFX suggestions for your episodes.",
      },
      { property: "og:title", content: "Audio Studio — Hooke" },
      {
        property: "og:description",
        content: "TTS narration, music, and SFX for your stories.",
      },
    ],
  }),
  component: AudioPage,
});

const STATUS_META: Record<NarrationStatus, { label: string; color: string }> = {
  pending: { label: "Pending", color: "var(--text-dim)" },
  generating: { label: "Generating", color: "var(--accent-iris)" },
  complete: { label: "Complete", color: "var(--accent-mint)" },
  failed: { label: "Failed", color: "#FF5370" },
};

function AudioPage() {
  const {
    projects,
    activeId,
    setActive,
    deleteProject,
    createProject,
    addNarration,
    updateNarration,
    removeNarration,
    addMusic,
    updateMusic,
    removeMusic,
    addSfx,
    removeSfx,
    updateSfx,
  } = useAudioStore();

  const [showNew, setShowNew] = useState(false);

  const active = useMemo(
    () => projects.find((p) => p.id === activeId) ?? projects[0],
    [projects, activeId]
  );

  return (
    <div className="mx-auto flex w-full max-w-[1600px] flex-col gap-4">
      <header className="flex items-center gap-3">
        <div
          className="flex h-10 w-10 items-center justify-center rounded-xl"
          style={{ background: "var(--gradient-iris)" }}
        >
          <AudioWaveform className="h-5 w-5 text-white" />
        </div>
        <div>
          <h1 className="hk-text-display text-[20px] font-bold text-text-primary">
            Audio Studio
          </h1>
          <p className="text-[12px] text-text-secondary">
            Narration, music, and SFX — AI-assisted audio for your stories.
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
            New project
          </Button>
        </div>
      </header>

      {active ? (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-[220px_minmax(0,1fr)]">
          {/* Project rail */}
          <aside className="hk-card flex max-h-[calc(100vh-200px)] min-h-[400px] flex-col overflow-hidden">
            <div className="border-b border-white/[0.06] px-3 py-2.5">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-text-dim">
                Projects ({projects.length})
              </span>
            </div>
            <div className="flex-1 overflow-y-auto p-1.5">
              {projects.map((p) => {
                const isActive = p.id === active?.id;
                return (
                  <button
                    key={p.id}
                    onClick={() => setActive(p.id)}
                    className={`group flex w-full items-start gap-2 rounded-md px-2.5 py-2 text-left transition-colors ${
                      isActive
                        ? "bg-iris/15 text-iris"
                        : "text-text-secondary hover:bg-surface hover:text-text-primary"
                    }`}
                  >
                    <AudioWaveform className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-[13px] font-medium">{p.title}</div>
                      <div className="mt-0.5 truncate text-[10.5px] text-text-dim">
                        {p.narrations.length} narration · {p.music.length} music · {p.sfx.length} SFX
                      </div>
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        if (confirm(`Delete "${p.title}"?`)) deleteProject(p.id);
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

          {/* Audio workspace */}
          <div className="hk-card flex max-h-[calc(100vh-200px)] min-h-[400px] flex-col overflow-hidden">
            <div className="border-b border-white/[0.06] px-4 py-3">
              <h3 className="hk-text-display truncate text-[15px] font-semibold text-text-primary">
                {active.title}
              </h3>
              <div className="mt-0.5 flex items-center gap-3 text-[11px] text-text-dim">
                <span className="flex items-center gap-1">
                  <Mic className="h-3 w-3" />
                  {active.narrations.length} narration tracks
                </span>
                <span className="flex items-center gap-1">
                  <Music className="h-3 w-3" />
                  {active.music.length} music tracks
                </span>
                <span className="flex items-center gap-1">
                  <Volume2 className="h-3 w-3" />
                  {active.sfx.length} SFX
                </span>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4">
              <Tabs defaultValue="narration">
                <TabsList className="mb-4">
                  <TabsTrigger value="narration" className="gap-1.5">
                    <Mic className="h-3.5 w-3.5" />
                    Narration
                  </TabsTrigger>
                  <TabsTrigger value="music" className="gap-1.5">
                    <Music className="h-3.5 w-3.5" />
                    Music
                  </TabsTrigger>
                  <TabsTrigger value="sfx" className="gap-1.5">
                    <Volume2 className="h-3.5 w-3.5" />
                    SFX
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="narration">
                  <NarrationTab
                    project={active}
                    onAdd={(input) => addNarration(active.id, input)}
                    onUpdate={(id, patch) => updateNarration(active.id, id, patch)}
                    onRemove={(id) => removeNarration(active.id, id)}
                  />
                </TabsContent>

                <TabsContent value="music">
                  <MusicTab
                    project={active}
                    onAdd={(input) => addMusic(active.id, input)}
                    onUpdate={(id, patch) => updateMusic(active.id, id, patch)}
                    onRemove={(id) => removeMusic(active.id, id)}
                  />
                </TabsContent>

                <TabsContent value="sfx">
                  <SfxTab
                    project={active}
                    onAdd={(input) => addSfx(active.id, input)}
                    onRemove={(id) => removeSfx(active.id, id)}
                    onUpdate={(id, patch) => updateSfx(active.id, id, patch)}
                  />
                </TabsContent>
              </Tabs>
            </div>
          </div>
        </div>
      ) : (
        <div className="hk-card flex flex-col items-center justify-center gap-4 p-12 text-center">
          <div
            className="flex h-14 w-14 items-center justify-center rounded-2xl"
            style={{ background: "var(--gradient-iris)" }}
          >
            <AudioWaveform className="h-7 w-7 text-white" />
          </div>
          <div>
            <h2 className="hk-text-display text-[20px] font-bold text-text-primary">
              Create an audio project
            </h2>
            <p className="mx-auto mt-1 max-w-md text-[13px] text-text-secondary">
              Generate TTS narration, select music, and get smart SFX suggestions for your episodes.
            </p>
          </div>
          <Button
            onClick={() => setShowNew(true)}
            style={{ background: "var(--gradient-iris)" }}
            className="text-white"
          >
            <Plus className="h-3.5 w-3.5" />
            New project
          </Button>
        </div>
      )}

      {showNew && (
        <NewProjectDialog
          onClose={() => setShowNew(false)}
          onCreate={(title) => {
            createProject({ title });
            setShowNew(false);
          }}
        />
      )}
    </div>
  );
}

/* ---------- Narration Tab ---------- */

function NarrationTab({
  project,
  onAdd,
  onUpdate,
  onRemove,
}: {
  project: AudioProject;
  onAdd: (input: { sceneId: string; sceneLabel: string; text?: string }) => void;
  onUpdate: (id: string, patch: Partial<NarrationTrack>) => void;
  onRemove: (id: string) => void;
}) {
  const universes = useUniverseStore((s) => s.universes);
  const voiceProfiles = universes.flatMap((u) =>
    u.entities.filter((e) => e.kind === "voice").map((e) => ({
      id: e.id,
      label: `${u.name} — ${e.name}`,
    }))
  );

  const [newSceneLabel, setNewSceneLabel] = useState("");

  const add = () => {
    if (!newSceneLabel.trim()) return;
    onAdd({
      sceneId: `scene-${Date.now()}`,
      sceneLabel: newSceneLabel,
    });
    setNewSceneLabel("");
  };

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <Input
          value={newSceneLabel}
          onChange={(e) => setNewSceneLabel(e.target.value)}
          placeholder="Scene label (e.g. Scene 1 — Cold Open)"
          className="h-8 text-[12px]"
          onKeyDown={(e) => {
            if (e.key === "Enter") add();
          }}
        />
        <Button size="sm" onClick={add} disabled={!newSceneLabel.trim()}>
          <Plus className="h-3.5 w-3.5" />
          Add
        </Button>
      </div>

      {project.narrations.length === 0 ? (
        <div className="rounded-lg border border-dashed border-white/10 p-6 text-center">
          <Mic className="mx-auto h-6 w-6 text-text-dim/50" />
          <p className="mt-2 text-[12px] text-text-secondary">
            No narration tracks yet. Add a scene to begin.
          </p>
        </div>
      ) : (
        <div className="space-y-2.5">
          {project.narrations.map((track) => (
            <NarrationCard
              key={track.id}
              track={track}
              voiceProfiles={voiceProfiles}
              onUpdate={(patch) => onUpdate(track.id, patch)}
              onRemove={() => onRemove(track.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function NarrationCard({
  track,
  voiceProfiles,
  onUpdate,
  onRemove,
}: {
  track: NarrationTrack;
  voiceProfiles: { id: string; label: string }[];
  onUpdate: (patch: Partial<NarrationTrack>) => void;
  onRemove: () => void;
}) {
  const status = STATUS_META[track.status];

  return (
    <div className="rounded-lg border border-white/[0.06] bg-base/40 p-3">
      <div className="mb-2 flex items-center gap-2">
        <div
          className="flex h-6 w-6 items-center justify-center rounded text-[10.5px] font-semibold text-white"
          style={{ background: "var(--gradient-iris)" }}
        >
          <Mic className="h-3 w-3" />
        </div>
        <input
          value={track.sceneLabel}
          onChange={(e) => onUpdate({ sceneLabel: e.target.value })}
          className="hk-text-display flex-1 bg-transparent text-[13px] font-semibold text-text-primary focus:outline-none"
        />
        <span
          className="rounded-full px-2 py-0.5 text-[9px] font-medium uppercase"
          style={{
            background: `color-mix(in oklab, ${status.color} 20%, transparent)`,
            color: status.color,
          }}
        >
          {status.label}
        </span>
        <button
          onClick={onRemove}
          className="flex h-6 w-6 items-center justify-center rounded text-text-dim hover:bg-elevated hover:text-[#FF5370]"
        >
          <Trash2 className="h-3 w-3" />
        </button>
      </div>

      <Textarea
        value={track.text}
        onChange={(e) => onUpdate({ text: e.target.value })}
        rows={3}
        placeholder="Narration text for this scene..."
        className="mb-2 text-[12px]"
      />

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <div className="space-y-1">
          <Label className="text-[10px]">Voice</Label>
          <Select
            value={track.voiceProfileId ?? ""}
            onValueChange={(v) => onUpdate({ voiceProfileId: v || undefined })}
          >
            <SelectTrigger className="h-7 text-[11px]">
              <SelectValue placeholder="Default" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">Default</SelectItem>
              {voiceProfiles.map((v) => (
                <SelectItem key={v.id} value={v.id}>
                  {v.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <Label className="text-[10px]">Emotion</Label>
          <Select
            value={track.emotion}
            onValueChange={(v) => onUpdate({ emotion: v })}
          >
            <SelectTrigger className="h-7 text-[11px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {EMOTION_PRESETS.map((e) => (
                <SelectItem key={e.id} value={e.id}>
                  {e.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <div className="flex items-center justify-between">
            <Label className="text-[10px]">Speed</Label>
            <span className="text-[9px] text-text-dim">{track.speed.toFixed(2)}x</span>
          </div>
          <Slider
            value={[track.speed]}
            min={0.5}
            max={2}
            step={0.05}
            onValueChange={(v) => onUpdate({ speed: v[0] })}
          />
        </div>
        <div className="space-y-1">
          <div className="flex items-center justify-between">
            <Label className="text-[10px]">Pitch</Label>
            <span className="text-[9px] text-text-dim">{track.pitch > 0 ? `+${track.pitch}` : track.pitch}</span>
          </div>
          <Slider
            value={[track.pitch]}
            min={-12}
            max={12}
            step={1}
            onValueChange={(v) => onUpdate({ pitch: v[0] })}
          />
        </div>
      </div>

      <div className="mt-2 flex items-center gap-2 border-t border-white/[0.06] pt-2">
        <button
          onClick={() => onUpdate({ status: "generating" })}
          className="flex items-center gap-1 rounded-md px-2 py-1 text-[11px] font-medium text-iris hover:bg-iris/10"
          style={{ background: "var(--gradient-iris)" }}
        >
          <Sparkles className="h-3 w-3" />
          Generate TTS
        </button>
        {track.audioUrl && (
          <button className="flex items-center gap-1 rounded-md border border-white/10 px-2 py-1 text-[11px] text-text-secondary hover:bg-elevated">
            <Play className="h-3 w-3" />
            Preview
          </button>
        )}
        <button
          onClick={() => onUpdate({ status: "generating" })}
          className="flex items-center gap-1 text-[10.5px] text-text-dim hover:text-iris"
        >
          <RefreshCw className="h-3 w-3" />
          Regenerate
        </button>
      </div>
    </div>
  );
}

/* ---------- Music Tab ---------- */

function MusicTab({
  project,
  onAdd,
  onUpdate,
  onRemove,
}: {
  project: AudioProject;
  onAdd: (input: { label: string; mood?: string; bpm?: number }) => void;
  onUpdate: (id: string, patch: Partial<MusicTrack>) => void;
  onRemove: (id: string) => void;
}) {
  const universes = useUniverseStore((s) => s.universes);
  const musicThemes = universes.flatMap((u) =>
    u.entities.filter((e) => e.kind === "music").map((e) => ({
      id: e.id,
      label: `${u.name} — ${e.name}`,
    }))
  );

  const [newLabel, setNewLabel] = useState("");

  const add = () => {
    if (!newLabel.trim()) return;
    onAdd({ label: newLabel });
    setNewLabel("");
  };

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <Input
          value={newLabel}
          onChange={(e) => setNewLabel(e.target.value)}
          placeholder="Music track name..."
          className="h-8 text-[12px]"
          onKeyDown={(e) => {
            if (e.key === "Enter") add();
          }}
        />
        <Button size="sm" onClick={add} disabled={!newLabel.trim()}>
          <Plus className="h-3.5 w-3.5" />
          Add
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={() => onAdd({ label: "AI Suggestion", mood: "Cinematic" })}
        >
          <Sparkles className="h-3.5 w-3.5" />
          AI Suggest
        </Button>
      </div>

      {project.music.length === 0 ? (
        <div className="rounded-lg border border-dashed border-white/10 p-6 text-center">
          <Music className="mx-auto h-6 w-6 text-text-dim/50" />
          <p className="mt-2 text-[12px] text-text-secondary">
            No music tracks yet. Add one or get AI suggestions.
          </p>
        </div>
      ) : (
        <div className="space-y-2.5">
          {project.music.map((track) => (
            <MusicCard
              key={track.id}
              track={track}
              musicThemes={musicThemes}
              onUpdate={(patch) => onUpdate(track.id, patch)}
              onRemove={() => onRemove(track.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function MusicCard({
  track,
  musicThemes,
  onUpdate,
  onRemove,
}: {
  track: MusicTrack;
  musicThemes: { id: string; label: string }[];
  onUpdate: (patch: Partial<MusicTrack>) => void;
  onRemove: () => void;
}) {
  const status = STATUS_META[track.status];

  return (
    <div className="rounded-lg border border-white/[0.06] bg-base/40 p-3">
      <div className="mb-2 flex items-center gap-2">
        <div
          className="flex h-6 w-6 items-center justify-center rounded text-[10.5px] font-semibold text-white"
          style={{ background: "var(--gradient-iris)" }}
        >
          <Music className="h-3 w-3" />
        </div>
        <input
          value={track.label}
          onChange={(e) => onUpdate({ label: e.target.value })}
          className="hk-text-display flex-1 bg-transparent text-[13px] font-semibold text-text-primary focus:outline-none"
        />
        <span
          className="rounded-full px-2 py-0.5 text-[9px] font-medium uppercase"
          style={{
            background: `color-mix(in oklab, ${status.color} 20%, transparent)`,
            color: status.color,
          }}
        >
          {status.label}
        </span>
        <button
          onClick={onRemove}
          className="flex h-6 w-6 items-center justify-center rounded text-text-dim hover:bg-elevated hover:text-[#FF5370]"
        >
          <Trash2 className="h-3 w-3" />
        </button>
      </div>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <div className="space-y-1">
          <Label className="text-[10px]">Universe Theme</Label>
          <Select
            value={track.universeMusicId ?? ""}
            onValueChange={(v) => onUpdate({ universeMusicId: v || undefined })}
          >
            <SelectTrigger className="h-7 text-[11px]">
              <SelectValue placeholder="None" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">None</SelectItem>
              {musicThemes.map((m) => (
                <SelectItem key={m.id} value={m.id}>
                  {m.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <Label className="text-[10px]">Mood</Label>
          <Select
            value={track.mood}
            onValueChange={(v) => onUpdate({ mood: v })}
          >
            <SelectTrigger className="h-7 text-[11px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {MUSIC_MOODS.map((m) => (
                <SelectItem key={m} value={m}>
                  {m}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <div className="flex items-center justify-between">
            <Label className="text-[10px]">BPM</Label>
            <span className="text-[9px] text-text-dim">{track.bpm}</span>
          </div>
          <Slider
            value={[track.bpm]}
            min={40}
            max={200}
            step={1}
            onValueChange={(v) => onUpdate({ bpm: v[0] })}
          />
        </div>
        <div className="space-y-1">
          <div className="flex items-center justify-between">
            <Label className="text-[10px]">Volume</Label>
            <span className="text-[9px] text-text-dim">{track.volume}%</span>
          </div>
          <Slider
            value={[track.volume]}
            min={0}
            max={100}
            step={1}
            onValueChange={(v) => onUpdate({ volume: v[0] })}
          />
        </div>
      </div>

      {track.audioUrl && (
        <div className="mt-2 flex items-center gap-2 border-t border-white/[0.06] pt-2">
          <button className="flex items-center gap-1 rounded-md border border-white/10 px-2 py-1 text-[11px] text-text-secondary hover:bg-elevated">
            <Play className="h-3 w-3" />
            Preview
          </button>
        </div>
      )}
    </div>
  );
}

/* ---------- SFX Tab ---------- */

function SfxTab({
  project,
  onAdd,
  onRemove,
  onUpdate,
}: {
  project: AudioProject;
  onAdd: (input: { sceneId: string; label: string; category?: string }) => void;
  onRemove: (id: string) => void;
  onUpdate: (id: string, patch: Partial<SfxSuggestion>) => void;
}) {
  const [newLabel, setNewLabel] = useState("");
  const [newCategory, setNewCategory] = useState("Ambient");

  const add = () => {
    if (!newLabel.trim()) return;
    onAdd({
      sceneId: `scene-${Date.now()}`,
      label: newLabel,
      category: newCategory,
    });
    setNewLabel("");
  };

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <Input
          value={newLabel}
          onChange={(e) => setNewLabel(e.target.value)}
          placeholder="SFX label (e.g. Door creak)..."
          className="h-8 text-[12px]"
          onKeyDown={(e) => {
            if (e.key === "Enter") add();
          }}
        />
        <Select value={newCategory} onValueChange={setNewCategory}>
          <SelectTrigger className="h-8 w-32 text-[11px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {SFX_CATEGORIES.map((c) => (
              <SelectItem key={c} value={c}>
                {c}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button size="sm" onClick={add} disabled={!newLabel.trim()}>
          <Plus className="h-3.5 w-3.5" />
          Add
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={() => {
            onAdd({ sceneId: `scene-${Date.now()}`, label: "AI Suggested SFX", category: "Ambient" });
          }}
        >
          <Sparkles className="h-3.5 w-3.5" />
          Smart Suggest
        </Button>
      </div>

      {project.sfx.length === 0 ? (
        <div className="rounded-lg border border-dashed border-white/10 p-6 text-center">
          <Volume2 className="mx-auto h-6 w-6 text-text-dim/50" />
          <p className="mt-2 text-[12px] text-text-secondary">
            No SFX yet. Add effects manually or use Smart Suggest.
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {project.sfx.map((sfx) => (
            <SfxCard
              key={sfx.id}
              sfx={sfx}
              onUpdate={(patch) => onUpdate(sfx.id, patch)}
              onRemove={() => onRemove(sfx.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function SfxCard({
  sfx,
  onUpdate,
  onRemove,
}: {
  sfx: SfxSuggestion;
  onUpdate: (patch: Partial<SfxSuggestion>) => void;
  onRemove: () => void;
}) {
  const status = STATUS_META[sfx.status];

  return (
    <div className="flex items-center gap-2 rounded-lg border border-white/[0.06] bg-base/40 p-2.5">
      <div
        className="flex h-7 w-7 items-center justify-center rounded text-white"
        style={{ background: "var(--gradient-iris)" }}
      >
        <Volume2 className="h-3.5 w-3.5" />
      </div>
      <input
        value={sfx.label}
        onChange={(e) => onUpdate({ label: e.target.value })}
        className="flex-1 bg-transparent text-[12px] font-medium text-text-primary focus:outline-none"
      />
      <Select value={sfx.category} onValueChange={(v) => onUpdate({ category: v })}>
        <SelectTrigger className="h-6 w-24 text-[10px]">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {SFX_CATEGORIES.map((c) => (
            <SelectItem key={c} value={c}>
              {c}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <span
        className="rounded-full px-2 py-0.5 text-[9px] font-medium uppercase"
        style={{
          background: `color-mix(in oklab, ${status.color} 20%, transparent)`,
          color: status.color,
        }}
      >
        {status.label}
      </span>
      {sfx.audioUrl && (
        <button className="flex h-6 w-6 items-center justify-center rounded text-text-dim hover:text-text-primary">
          <Play className="h-3 w-3" />
        </button>
      )}
      <button
        onClick={onRemove}
        className="flex h-6 w-6 items-center justify-center rounded text-text-dim hover:text-[#FF5370]"
      >
        <Trash2 className="h-3 w-3" />
      </button>
    </div>
  );
}

/* ---------- New Project Dialog ---------- */

function NewProjectDialog({
  onClose,
  onCreate,
}: {
  onClose: () => void;
  onCreate: (title: string) => void;
}) {
  const [title, setTitle] = useState("");

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-sm rounded-xl border border-white/[0.08] bg-base p-4 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-[15px] font-semibold text-text-primary">New audio project</h3>
          <button onClick={onClose} className="text-text-dim hover:text-text-primary">
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label className="text-[11px]">Title</Label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="The Signal — Pilot Audio"
              className="h-8 text-[13px]"
              autoFocus
              onKeyDown={(e) => {
                if (e.key === "Enter" && title.trim()) onCreate(title);
              }}
            />
          </div>
        </div>
        <div className="mt-4 flex items-center justify-end gap-2">
          <Button size="sm" variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button
            size="sm"
            onClick={() => onCreate(title)}
            disabled={!title.trim()}
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
