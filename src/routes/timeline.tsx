import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useRef, useState, useEffect, useCallback } from "react";
import {
  Film, Plus, Trash2, Scissors, Undo2, Redo2, ZoomIn, ZoomOut,
  Play, Pause, SkipBack, SkipForward, Volume2, VolumeX, Eye, EyeOff,
  Lock, Unlock, Flag, Music, Mic, Sparkles, Type, Video, X, Save,
} from "lucide-react";
import {
  useTimelineStore,
  TRACK_COLORS,
  type TimelineProject,
  type TimelineTrack,
  type TimelineClip,
  type TrackKind,
  type TransitionType,
  type CaptionStyle,
} from "@/store/timeline-store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";

export const Route = createFileRoute("/timeline")({
  head: () => ({
    meta: [
      { title: "Timeline Editor — Hooke" },
      { name: "description", content: "Multi-track timeline editor with trim, transitions, captions, markers, and undo/redo." },
      { property: "og:title", content: "Timeline Editor — Hooke" },
      { property: "og:description", content: "Non-linear editing surface for cinematic storytelling." },
    ],
  }),
  component: TimelinePage,
});

const TRACK_ICONS: Record<TrackKind, React.ComponentType<{ className?: string }>> = {
  video: Video,
  voice: Mic,
  music: Music,
  sfx: Sparkles,
  captions: Type,
};

const TRANSITIONS: { id: TransitionType; label: string }[] = [
  { id: "cut", label: "Cut" },
  { id: "crossfade", label: "Crossfade" },
  { id: "dissolve", label: "Dissolve" },
  { id: "wipe", label: "Wipe" },
];

const CAPTION_STYLES: { id: CaptionStyle; label: string }[] = [
  { id: "static", label: "Static" },
  { id: "dynamic", label: "Dynamic" },
  { id: "karaoke", label: "Karaoke" },
  { id: "animated", label: "Animated" },
];

const RULER_HEIGHT = 28;
const HEADER_WIDTH = 160;
const TRACK_GAP = 2;

function formatTime(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  const f = Math.floor((sec % 1) * 24);
  return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}:${f.toString().padStart(2, "0")}`;
}

function TimelinePage() {
  const {
    projects, activeId, setActive, createProject, deleteProject, renameProject,
    playhead, pxPerSec, isPlaying, selectedClipId,
    setPlayhead, setPxPerSec, setPlaying, setSelectedClip,
    updateClip, removeClip, splitClip,
    toggleTrackMute, toggleTrackHide, toggleTrackLock,
    addMarker, updateMarker, removeMarker,
    undo, redo, history, redoStack,
  } = useTimelineStore();

  const active = useMemo(
    () => projects.find((p) => p.id === activeId) ?? projects[0],
    [projects, activeId],
  );

  const scrollRef = useRef<HTMLDivElement>(null);
  const rafRef = useRef<number>(0);

  // playback loop
  useEffect(() => {
    if (!isPlaying || !active) return;
    let last = performance.now();
    const tick = (now: number) => {
      const dt = (now - last) / 1000;
      last = now;
      const next = playhead + dt;
      if (next >= active.duration) {
        setPlaying(false);
        setPlayhead(active.duration);
      } else {
        setPlayhead(next);
        rafRef.current = requestAnimationFrame(tick);
      }
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [isPlaying, playhead, active, setPlayhead, setPlaying]);

  const selectedClip = useMemo(() => {
    if (!active || !selectedClipId) return null;
    for (const t of active.tracks) {
      const c = t.clips.find((cl) => cl.id === selectedClipId);
      if (c) return { clip: c, track: t };
    }
    return null;
  }, [active, selectedClipId]);

  const rulerClick = useCallback((e: React.MouseEvent) => {
    if (!scrollRef.current) return;
    const rect = scrollRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left + scrollRef.current.scrollLeft;
    setPlayhead(x / pxPerSec);
  }, [pxPerSec, setPlayhead]);

  if (!active) {
    return (
      <div className="mx-auto flex w-full max-w-[1600px] flex-col gap-4">
        <Header
          title="Timeline Editor"
          subtitle="Multi-track non-linear editing."
          onNew={() => createProject("Untitled Timeline")}
          canUndo={false}
          canRedo={false}
          onUndo={() => {}}
          onRedo={() => {}}
        />
        <div className="hk-card flex flex-col items-center justify-center gap-4 p-12 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl" style={{ background: "var(--gradient-iris)" }}>
            <Film className="h-7 w-7 text-white" />
          </div>
          <div>
            <h2 className="hk-text-display text-[20px] font-bold text-text-primary">Start your first timeline</h2>
            <p className="mx-auto mt-1 max-w-md text-[13px] text-text-secondary">
              Create a multi-track timeline to arrange video, voice, music, SFX, and captions.
            </p>
          </div>
          <Button onClick={() => createProject("Untitled Timeline")} style={{ background: "var(--gradient-iris)" }} className="text-white">
            <Plus className="h-4 w-4" />
            New timeline
          </Button>
        </div>
      </div>
    );
  }

  const totalWidth = Math.max(active.duration * pxPerSec + 200, 800);

  return (
    <div className="mx-auto flex w-full max-w-[1600px] flex-col gap-3">
      <Header
        title="Timeline Editor"
        subtitle="Multi-track non-linear editing."
        onNew={() => createProject("Untitled Timeline")}
        canUndo={history.length > 0}
        canRedo={redoStack.length > 0}
        onUndo={undo}
        onRedo={redo}
      />

      {/* Project bar */}
      <div className="hk-card flex items-center gap-3 px-4 py-2.5">
        <Select value={active.id} onValueChange={(id) => setActive(id)}>
          <SelectTrigger className="h-8 w-56 text-[13px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {projects.map((p) => (
              <SelectItem key={p.id} value={p.id}>{p.title}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Input
          value={active.title}
          onChange={(e) => renameProject(active.id, e.target.value)}
          className="h-8 flex-1 text-[13px]"
        />
        <Badge variant="secondary" className="text-[10px]">
          {active.tracks.length} tracks
        </Badge>
        <Badge variant="outline" className="text-[10px]">
          {formatTime(active.duration)}
        </Badge>
        <Button
          size="sm" variant="ghost"
          onClick={() => { if (confirm(`Delete "${active.title}"?`)) deleteProject(active.id); }}
          title="Delete timeline"
        >
          <Trash2 className="h-3.5 w-3.5 text-[#FF5370]" />
        </Button>
      </div>

      {/* Transport bar */}
      <div className="hk-card flex items-center gap-3 px-4 py-2">
        <div className="flex items-center gap-1">
          <Button size="icon" variant="ghost" className="size-8" onClick={() => setPlayhead(0)}>
            <SkipBack className="h-4 w-4" />
          </Button>
          <Button
            size="icon" className="size-9"
            style={{ background: "var(--gradient-iris)" }}
            onClick={() => setPlaying(!isPlaying)}
          >
            {isPlaying ? <Pause className="h-4 w-4 text-white" /> : <Play className="h-4 w-4 text-white" />}
          </Button>
          <Button size="icon" variant="ghost" className="size-8" onClick={() => setPlayhead(active.duration)}>
            <SkipForward className="h-4 w-4" />
          </Button>
        </div>
        <div className="font-mono text-[13px] text-text-primary">
          {formatTime(playhead)}
        </div>
        <span className="text-[11px] text-text-dim">/ {formatTime(active.duration)}</span>

        <div className="ml-auto flex items-center gap-1">
          <Button size="icon" variant="ghost" className="size-8" onClick={() => setPxPerSec(pxPerSec - 8)} title="Zoom out">
            <ZoomOut className="h-4 w-4" />
          </Button>
          <input
            type="range"
            min={8}
            max={200}
            value={pxPerSec}
            onChange={(e) => setPxPerSec(Number(e.target.value))}
            className="w-24"
          />
          <Button size="icon" variant="ghost" className="size-8" onClick={() => setPxPerSec(pxPerSec + 8)} title="Zoom in">
            <ZoomIn className="h-4 w-4" />
          </Button>
          <div className="mx-2 h-5 w-px bg-white/10" />
          <Button
            size="sm" variant="outline"
            disabled={!selectedClip}
            onClick={() => selectedClip && splitClip(active.id, selectedClip.clip.id, playhead)}
            title="Split at playhead"
          >
            <Scissors className="h-3.5 w-3.5" />
            Split
          </Button>
          <Button
            size="sm" variant="outline"
            onClick={() => addMarker(active.id, playhead, `Marker ${active.markers.length + 1}`)}
          >
            <Flag className="h-3.5 w-3.5" />
            Marker
          </Button>
        </div>
      </div>

      {/* Timeline canvas */}
      <div className="hk-card flex flex-col overflow-hidden">
        {/* Ruler + markers */}
        <div className="flex border-b border-white/[0.06]">
          <div className="shrink-0 border-r border-white/[0.06]" style={{ width: HEADER_WIDTH }} />
          <div className="relative overflow-hidden" style={{ width: `calc(100% - ${HEADER_WIDTH}px)` }}>
            <div
              ref={scrollRef}
              className="overflow-x-auto"
              onScroll={(e) => {
                const el = e.currentTarget;
                el.parentElement!.querySelector<HTMLElement>("[data-scroll-sync]")!.scrollLeft = el.scrollLeft;
              }}
            >
              <div style={{ width: totalWidth, height: RULER_HEIGHT + 24 }} className="relative">
                {/* Ruler ticks */}
                <Ruler duration={active.duration} pxPerSec={pxPerSec} onClick={rulerClick} />
                {/* Markers */}
                <div className="relative h-6">
                  {active.markers.map((m) => (
                    <div
                      key={m.id}
                      className="group absolute top-0 flex flex-col items-start"
                      style={{ left: m.time * pxPerSec }}
                    >
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => removeMarker(active.id, m.id)}
                          className="text-text-dim opacity-0 hover:text-[#FF5370] group-hover:opacity-100"
                        >
                          <X className="h-2.5 w-2.5" />
                        </button>
                        <Flag className="h-3 w-3" style={{ color: m.color }} />
                        <input
                          value={m.label}
                          onChange={(e) => updateMarker(active.id, m.id, { label: e.target.value })}
                          className="w-24 bg-transparent text-[10px] text-text-secondary focus:outline-none"
                        />
                      </div>
                      <div className="absolute top-5 h-2 w-px" style={{ background: m.color, height: 8 }} />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Tracks */}
        <div className="flex">
          {/* Track headers */}
          <div className="shrink-0 border-r border-white/[0.06]" style={{ width: HEADER_WIDTH }}>
            {active.tracks.map((t) => (
              <TrackHeader
                key={t.id}
                track={t}
                onMute={() => toggleTrackMute(active.id, t.id)}
                onHide={() => toggleTrackHide(active.id, t.id)}
                onLock={() => toggleTrackLock(active.id, t.id)}
              />
            ))}
          </div>

          {/* Track lanes */}
          <div
            data-scroll-sync
            className="relative overflow-hidden"
            style={{ width: `calc(100% - ${HEADER_WIDTH}px)` }}
          >
            <div className="overflow-x-auto">
              <div style={{ width: totalWidth, position: "relative" }}>
                {active.tracks.map((t) => (
                  <TrackLane
                    key={t.id}
                    track={t}
                    pxPerSec={pxPerSec}
                    playhead={playhead}
                    selectedClipId={selectedClipId}
                    onSelectClip={setSelectedClip}
                    onUpdateClip={(clipId, patch) => updateClip(active.id, clipId, patch)}
                    onRemoveClip={(clipId) => removeClip(active.id, clipId)}
                    onRulerClick={rulerClick}
                  />
                ))}
                {/* Playhead overlay */}
                <div
                  className="pointer-events-none absolute top-0 bottom-0 w-px z-20"
                  style={{
                    left: playhead * pxPerSec,
                    background: "var(--accent-iris)",
                    boxShadow: "0 0 6px var(--accent-iris)",
                  }}
                >
                  <div className="absolute -top-0 -left-1.5 h-3 w-3 rotate-45" style={{ background: "var(--accent-iris)" }} />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Inspector */}
      {selectedClip && (
        <ClipInspector
          clip={selectedClip.clip}
          track={selectedClip.track}
          onUpdate={(patch) => updateClip(active.id, selectedClip.clip.id, patch)}
          onRemove={() => removeClip(active.id, selectedClip.clip.id)}
          onClose={() => setSelectedClip(null)}
        />
      )}
    </div>
  );
}

function Header({
  title, subtitle, onNew, canUndo, canRedo, onUndo, onRedo,
}: {
  title: string;
  subtitle: string;
  onNew: () => void;
  canUndo: boolean;
  canRedo: boolean;
  onUndo: () => void;
  onRedo: () => void;
}) {
  return (
    <header className="flex items-center gap-3">
      <div className="flex h-10 w-10 items-center justify-center rounded-xl" style={{ background: "var(--gradient-iris)" }}>
        <Film className="h-5 w-5 text-white" />
      </div>
      <div>
        <h1 className="hk-text-display text-[20px] font-bold text-text-primary">{title}</h1>
        <p className="text-[12px] text-text-secondary">{subtitle}</p>
      </div>
      <div className="ml-auto flex items-center gap-1.5">
        <Button size="icon" variant="ghost" className="size-8" disabled={!canUndo} onClick={onUndo} title="Undo">
          <Undo2 className="h-4 w-4" />
        </Button>
        <Button size="icon" variant="ghost" className="size-8" disabled={!canRedo} onClick={onRedo} title="Redo">
          <Redo2 className="h-4 w-4" />
        </Button>
        <Button size="sm" onClick={onNew} style={{ background: "var(--gradient-iris)" }} className="text-white">
          <Plus className="h-3.5 w-3.5" />
          New timeline
        </Button>
      </div>
    </header>
  );
}

function Ruler({ duration, pxPerSec, onClick }: { duration: number; pxPerSec: number; onClick: (e: React.MouseEvent) => void }) {
  const step = pxPerSec >= 60 ? 1 : pxPerSec >= 30 ? 2 : pxPerSec >= 15 ? 5 : 10;
  const ticks: number[] = [];
  for (let t = 0; t <= duration + step; t += step) ticks.push(t);

  return (
    <div
      className="relative cursor-pointer border-b border-white/[0.06] bg-base/30"
      style={{ height: RULER_HEIGHT }}
      onClick={onClick}
    >
      {ticks.map((t) => (
        <div key={t} className="absolute top-0 flex flex-col items-start" style={{ left: t * pxPerSec }}>
          <div className="h-2 w-px bg-white/15" />
          <span className="mt-0.5 pl-0.5 font-mono text-[9px] text-text-dim">{formatTime(t)}</span>
        </div>
      ))}
    </div>
  );
}

function TrackHeader({
  track, onMute, onHide, onLock,
}: {
  track: TimelineTrack;
  onMute: () => void;
  onHide: () => void;
  onLock: () => void;
}) {
  const Icon = TRACK_ICONS[track.kind];
  return (
    <div
      className="flex items-center gap-2 border-b border-white/[0.04] px-3"
      style={{ height: track.height + TRACK_GAP * 2 }}
    >
      <Icon className="h-3.5 w-3.5 shrink-0" style={{ color: TRACK_COLORS[track.kind] }} />
      <span className="flex-1 truncate text-[12px] font-medium text-text-primary">{track.name}</span>
      <button onClick={onMute} className={`flex h-5 w-5 items-center justify-center rounded ${track.muted ? "text-[#FF5370]" : "text-text-dim hover:text-text-primary"}`} title="Mute">
        {track.muted ? <VolumeX className="h-3 w-3" /> : <Volume2 className="h-3 w-3" />}
      </button>
      <button onClick={onHide} className={`flex h-5 w-5 items-center justify-center rounded ${track.hidden ? "text-text-dim/50" : "text-text-dim hover:text-text-primary"}`} title="Hide">
        {track.hidden ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
      </button>
      <button onClick={onLock} className={`flex h-5 w-5 items-center justify-center rounded ${track.locked ? "text-iris" : "text-text-dim hover:text-text-primary"}`} title="Lock">
        {track.locked ? <Lock className="h-3 w-3" /> : <Unlock className="h-3 w-3" />}
      </button>
    </div>
  );
}

function TrackLane({
  track, pxPerSec, playhead, selectedClipId, onSelectClip, onUpdateClip, onRemoveClip,
}: {
  track: TimelineTrack;
  pxPerSec: number;
  playhead: number;
  selectedClipId: string | null;
  onSelectClip: (id: string | null) => void;
  onUpdateClip: (clipId: string, patch: Partial<TimelineClip>) => void;
  onRemoveClip: (clipId: string) => void;
  onRulerClick: (e: React.MouseEvent) => void;
}) {
  const dragRef = useRef<{ clipId: string; mode: "move" | "trim-l" | "trim-r"; startX: number; origStart: number; origDur: number } | null>(null);

  const onMouseDown = (e: React.MouseEvent, clip: TimelineClip, mode: "move" | "trim-l" | "trim-r") => {
    if (track.locked) return;
    e.stopPropagation();
    onSelectClip(clip.id);
    dragRef.current = { clipId: clip.id, mode, startX: e.clientX, origStart: clip.start, origDur: clip.duration };
  };

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      const d = dragRef.current;
      if (!d) return;
      const deltaSec = (e.clientX - d.startX) / pxPerSec;
      if (d.mode === "move") {
        const newStart = Math.max(0, d.origStart + deltaSec);
        onUpdateClip(d.clipId, { start: newStart });
      } else if (d.mode === "trim-l") {
        const maxShift = d.origDur - 0.5;
        const shift = Math.max(-d.origStart, Math.min(maxShift, deltaSec));
        onUpdateClip(d.clipId, { start: d.origStart + shift, duration: d.origDur - shift, trimIn: 0 });
      } else if (d.mode === "trim-r") {
        const newDur = Math.max(0.5, d.origDur + deltaSec);
        onUpdateClip(d.clipId, { duration: newDur });
      }
    };
    const onUp = () => { dragRef.current = null; };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => { window.removeEventListener("mousemove", onMove); window.removeEventListener("mouseup", onUp); };
  }, [pxPerSec, onUpdateClip]);

  if (track.hidden) {
    return <div className="border-b border-white/[0.04]" style={{ height: track.height + TRACK_GAP * 2 }} />;
  }

  return (
    <div
      className="relative border-b border-white/[0.04]"
      style={{ height: track.height + TRACK_GAP * 2 }}
      onClick={() => onSelectClip(null)}
    >
      {track.clips.map((clip) => {
        const isSelected = clip.id === selectedClipId;
        const left = clip.start * pxPerSec;
        const width = Math.max(20, clip.duration * pxPerSec);
        const color = TRACK_COLORS[track.kind];
        return (
          <div
            key={clip.id}
            className="group absolute rounded-md border overflow-hidden cursor-grab active:cursor-grabbing"
            style={{
              left, width, top: TRACK_GAP, height: track.height,
              background: `color-mix(in oklab, ${color} 18%, var(--base))`,
              borderColor: isSelected ? color : `color-mix(in oklab, ${color} 40%, transparent)`,
              boxShadow: isSelected ? `0 0 0 1.5px ${color}` : "none",
              opacity: track.muted ? 0.5 : 1,
            }}
            onMouseDown={(e) => onMouseDown(e, clip, "move")}
            onClick={(e) => { e.stopPropagation(); onSelectClip(clip.id); }}
          >
            {/* Transition indicator */}
            {track.kind === "video" && clip.transition !== "cut" && (
              <div
                className="absolute left-0 top-0 bottom-0 w-3 flex items-center justify-center"
                style={{ background: `color-mix(in oklab, ${color} 35%, transparent)` }}
              >
                <div className="h-full w-px bg-white/30" style={{ transform: clip.transition === "wipe" ? "skewX(-15deg)" : "none" }} />
              </div>
            )}

            {/* Label */}
            <div className="px-2 py-1 truncate">
              <span className="text-[10.5px] font-medium text-text-primary truncate block">
                {track.kind === "captions" ? (clip.text ?? clip.label) : clip.label}
              </span>
              {track.kind === "captions" && clip.captionStyle && (
                <span className="text-[9px] text-text-dim capitalize">{clip.captionStyle}</span>
              )}
            </div>

            {/* Audio waveform bars */}
            {(track.kind === "voice" || track.kind === "music" || track.kind === "sfx") && (
              <div className="absolute bottom-1 left-1 right-1 flex items-end gap-px h-1/3 opacity-50">
                {Array.from({ length: Math.floor(width / 3) }).map((_, i) => (
                  <div key={i} className="w-px bg-current" style={{ height: `${30 + Math.sin(i * 0.7) * 30 + 40}%`, color }} />
                ))}
              </div>
            )}

            {/* Trim handles */}
            {isSelected && !track.locked && (
              <>
                <div
                  className="absolute left-0 top-0 bottom-0 w-1.5 cursor-ew-resize bg-white/30"
                  onMouseDown={(e) => onMouseDown(e, clip, "trim-l")}
                />
                <div
                  className="absolute right-0 top-0 bottom-0 w-1.5 cursor-ew-resize bg-white/30"
                  onMouseDown={(e) => onMouseDown(e, clip, "trim-r")}
                />
                <button
                  className="absolute -top-1 right-1 flex h-4 w-4 items-center justify-center rounded-full bg-[#FF5370] text-white opacity-0 group-hover:opacity-100"
                  onClick={(e) => { e.stopPropagation(); onRemoveClip(clip.id); }}
                >
                  <X className="h-2.5 w-2.5" />
                </button>
              </>
            )}
          </div>
        );
      })}
    </div>
  );
}

function ClipInspector({
  clip, track, onUpdate, onRemove, onClose,
}: {
  clip: TimelineClip;
  track: TimelineTrack;
  onUpdate: (patch: Partial<TimelineClip>) => void;
  onRemove: () => void;
  onClose: () => void;
}) {
  return (
    <div className="hk-card flex items-start gap-4 p-3">
      <div className="flex items-center gap-2">
        <span className="text-[11px] font-semibold uppercase tracking-wider text-text-dim">Inspector</span>
        <Badge variant="outline" className="text-[10px] capitalize">{track.kind}</Badge>
      </div>
      <div className="flex flex-1 flex-wrap items-center gap-3">
        <div className="space-y-0.5">
          <Label className="text-[10px] text-text-dim">Label</Label>
          <Input
            value={clip.label}
            onChange={(e) => onUpdate({ label: e.target.value })}
            className="h-7 w-40 text-[12px]"
          />
        </div>
        <div className="space-y-0.5">
          <Label className="text-[10px] text-text-dim">Start</Label>
          <Input
            type="number"
            step={0.1}
            value={clip.start.toFixed(1)}
            onChange={(e) => onUpdate({ start: Math.max(0, Number(e.target.value) || 0) })}
            className="h-7 w-20 text-[12px]"
          />
        </div>
        <div className="space-y-0.5">
          <Label className="text-[10px] text-text-dim">Duration</Label>
          <Input
            type="number"
            step={0.1}
            value={clip.duration.toFixed(1)}
            onChange={(e) => onUpdate({ duration: Math.max(0.5, Number(e.target.value) || 0.5) })}
            className="h-7 w-20 text-[12px]"
          />
        </div>
        {track.kind === "video" && (
          <div className="space-y-0.5">
            <Label className="text-[10px] text-text-dim">Transition</Label>
            <Select value={clip.transition} onValueChange={(v) => onUpdate({ transition: v as TransitionType })}>
              <SelectTrigger className="h-7 w-32 text-[12px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                {TRANSITIONS.map((t) => (
                  <SelectItem key={t.id} value={t.id}>{t.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
        {track.kind === "captions" && (
          <>
            <div className="space-y-0.5">
              <Label className="text-[10px] text-text-dim">Caption text</Label>
              <Input
                value={clip.text ?? ""}
                onChange={(e) => onUpdate({ text: e.target.value })}
                className="h-7 w-48 text-[12px]"
              />
            </div>
            <div className="space-y-0.5">
              <Label className="text-[10px] text-text-dim">Style</Label>
              <Select value={clip.captionStyle ?? "static"} onValueChange={(v) => onUpdate({ captionStyle: v as CaptionStyle })}>
                <SelectTrigger className="h-7 w-28 text-[12px]"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {CAPTION_STYLES.map((s) => (
                    <SelectItem key={s.id} value={s.id}>{s.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </>
        )}
      </div>
      <div className="flex items-center gap-1">
        <Button size="sm" variant="ghost" onClick={onRemove} title="Delete clip">
          <Trash2 className="h-3.5 w-3.5 text-[#FF5370]" />
        </Button>
        <Button size="icon" variant="ghost" className="size-7" onClick={onClose}>
          <X className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  );
}
