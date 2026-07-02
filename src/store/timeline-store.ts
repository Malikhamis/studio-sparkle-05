import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { idbStorage } from "@/lib/idb-storage";

/**
 * Timeline Editor — multi-track non-linear editing surface.
 * Reads from storyboard (video panels) and audio stores.
 * Supports trim, reorder, transitions, captions, markers, undo/redo.
 */

export type TrackKind = "video" | "voice" | "music" | "sfx" | "captions";

export type TransitionType = "cut" | "crossfade" | "dissolve" | "wipe";

export type CaptionStyle = "static" | "dynamic" | "karaoke" | "animated";

export type TimelineClip = {
  id: string;
  trackId: string;
  /** source reference — storyboard panel id, narration id, music id, sfx id, or caption */
  sourceId?: string;
  label: string;
  /** position on the timeline in seconds */
  start: number;
  /** clip duration in seconds */
  duration: number;
  /** trim from source start in seconds */
  trimIn: number;
  /** trim from source end in seconds */
  trimOut: number;
  /** transition into this clip from the previous one (video track only) */
  transition: TransitionType;
  /** thumbnail / preview url */
  thumbnailUrl?: string;
  /** caption text (captions track only) */
  text?: string;
  captionStyle?: CaptionStyle;
  color?: string;
};

export type TimelineTrack = {
  id: string;
  kind: TrackKind;
  name: string;
  clips: TimelineClip[];
  muted: boolean;
  hidden: boolean;
  locked: boolean;
  height: number;
};

export type Marker = {
  id: string;
  time: number;
  label: string;
  color: string;
};

export type TimelineProject = {
  id: string;
  title: string;
  tracks: TimelineTrack[];
  markers: Marker[];
  /** total duration in seconds (auto-computed but stored for persistence) */
  duration: number;
  fps: number;
  createdAt: number;
  updatedAt: number;
};

const uid = () =>
  globalThis.crypto?.randomUUID?.() ??
  `t_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;

const TRACK_COLORS: Record<TrackKind, string> = {
  video: "var(--accent-iris)",
  voice: "var(--accent-mint)",
  music: "var(--accent-gold)",
  sfx: "var(--accent-ember)",
  captions: "var(--accent-iris)",
};

export { TRACK_COLORS };

const defaultTracks = (): TimelineTrack[] => [
  { id: uid(), kind: "video", name: "Video", clips: [], muted: false, hidden: false, locked: false, height: 72 },
  { id: uid(), kind: "voice", name: "Voiceover", clips: [], muted: false, hidden: false, locked: false, height: 48 },
  { id: uid(), kind: "music", name: "Music", clips: [], muted: false, hidden: false, locked: false, height: 48 },
  { id: uid(), kind: "sfx", name: "SFX", clips: [], muted: false, hidden: false, locked: false, height: 40 },
  { id: uid(), kind: "captions", name: "Captions", clips: [], muted: false, hidden: false, locked: false, height: 40 },
];

const seed = (): TimelineProject[] => {
  const now = Date.now();
  const vidTrack = uid();
  const voiceTrack = uid();
  const musicTrack = uid();
  const sfxTrack = uid();
  const capTrack = uid();
  return [
    {
      id: uid(),
      title: "The Signal — Pilot Cut",
      fps: 24,
      duration: 18,
      createdAt: now,
      updatedAt: now,
      tracks: [
        {
          id: vidTrack, kind: "video", name: "Video", muted: false, hidden: false, locked: false, height: 72,
          clips: [
            { id: uid(), trackId: vidTrack, sourceId: "panel-1", label: "Cold Open — Listening Post", start: 0, duration: 6, trimIn: 0, trimOut: 0, transition: "cut", thumbnailUrl: "" },
            { id: uid(), trackId: vidTrack, sourceId: "panel-2", label: "Inciting Image — The Signal", start: 6, duration: 4, trimIn: 0, trimOut: 0, transition: "crossfade" },
            { id: uid(), trackId: vidTrack, sourceId: "panel-3", label: "Bridge — Commander Chen", start: 10, duration: 8, trimIn: 0, trimOut: 0, transition: "dissolve" },
          ],
        },
        {
          id: voiceTrack, kind: "voice", name: "Voiceover", muted: false, hidden: false, locked: false, height: 48,
          clips: [
            { id: uid(), trackId: voiceTrack, sourceId: "narr-1", label: "Cold Open narration", start: 0.5, duration: 5, trimIn: 0, trimOut: 0, transition: "cut" },
            { id: uid(), trackId: voiceTrack, sourceId: "narr-2", label: "Signal narration", start: 6.5, duration: 3, trimIn: 0, trimOut: 0, transition: "cut" },
            { id: uid(), trackId: voiceTrack, sourceId: "narr-3", label: "Bridge narration", start: 10.5, duration: 6, trimIn: 0, trimOut: 0, transition: "cut" },
          ],
        },
        {
          id: musicTrack, kind: "music", name: "Music", muted: false, hidden: false, locked: false, height: 48,
          clips: [
            { id: uid(), trackId: musicTrack, sourceId: "music-1", label: "Carrier Hum", start: 0, duration: 10, trimIn: 0, trimOut: 0, transition: "cut" },
            { id: uid(), trackId: musicTrack, sourceId: "music-2", label: "First Contact Theme", start: 10, duration: 8, trimIn: 0, trimOut: 0, transition: "crossfade" },
          ],
        },
        {
          id: sfxTrack, kind: "sfx", name: "SFX", muted: false, hidden: false, locked: false, height: 40,
          clips: [
            { id: uid(), trackId: sfxTrack, sourceId: "sfx-1", label: "Radio static sweep", start: 1, duration: 2, trimIn: 0, trimOut: 0, transition: "cut" },
            { id: uid(), trackId: sfxTrack, sourceId: "sfx-2", label: "Oscilloscope ping", start: 7, duration: 1, trimIn: 0, trimOut: 0, transition: "cut" },
            { id: uid(), trackId: sfxTrack, sourceId: "sfx-3", label: "Bridge door seal", start: 11, duration: 1.5, trimIn: 0, trimOut: 0, transition: "cut" },
          ],
        },
        {
          id: capTrack, kind: "captions", name: "Captions", muted: false, hidden: false, locked: false, height: 40,
          clips: [
            { id: uid(), trackId: capTrack, label: "The hum of old machines.", start: 0.5, duration: 4, trimIn: 0, trimOut: 0, transition: "cut", text: "The hum of old machines.", captionStyle: "dynamic" },
            { id: uid(), trackId: capTrack, label: "12.3 kilohertz.", start: 6.5, duration: 3, trimIn: 0, trimOut: 0, transition: "cut", text: "12.3 kilohertz. It repeats every 47 seconds.", captionStyle: "karaoke" },
            { id: uid(), trackId: capTrack, label: "All hands.", start: 10.5, duration: 5, trimIn: 0, trimOut: 0, transition: "cut", text: "All hands. This is not a drill.", captionStyle: "animated" },
          ],
        },
      ],
      markers: [
        { id: uid(), time: 6, label: "Signal reveal", color: "var(--accent-gold)" },
        { id: uid(), time: 10, label: "Act 2 — Bridge", color: "var(--accent-iris)" },
      ],
    },
  ];
};

const computeDuration = (tracks: TimelineTrack[]): number => {
  let max = 0;
  for (const t of tracks) {
    for (const c of t.clips) {
      const end = c.start + c.duration;
      if (end > max) max = end;
    }
  }
  return max;
};

type Snapshot = {
  tracks: TimelineTrack[];
  markers: Marker[];
};

type State = {
  projects: TimelineProject[];
  activeId: string | null;
  hydrated: boolean;

  // playhead + viewport (not persisted)
  playhead: number;
  pxPerSec: number;
  isPlaying: boolean;
  selectedClipId: string | null;

  // undo/redo
  history: Snapshot[];
  redoStack: Snapshot[];

  createProject: (title: string) => TimelineProject;
  deleteProject: (id: string) => void;
  setActive: (id: string | null) => void;
  renameProject: (id: string, title: string) => void;

  setPlayhead: (t: number) => void;
  setPxPerSec: (px: number) => void;
  setPlaying: (playing: boolean) => void;
  setSelectedClip: (id: string | null) => void;

  addClip: (projectId: string, trackId: string, input: Partial<Omit<TimelineClip, "id" | "trackId">>) => void;
  updateClip: (projectId: string, clipId: string, patch: Partial<Omit<TimelineClip, "id" | "trackId">>) => void;
  removeClip: (projectId: string, clipId: string) => void;
  splitClip: (projectId: string, clipId: string, atTime: number) => void;

  toggleTrackMute: (projectId: string, trackId: string) => void;
  toggleTrackHide: (projectId: string, trackId: string) => void;
  toggleTrackLock: (projectId: string, trackId: string) => void;

  addMarker: (projectId: string, time: number, label?: string) => void;
  updateMarker: (projectId: string, markerId: string, patch: Partial<Omit<Marker, "id">>) => void;
  removeMarker: (projectId: string, markerId: string) => void;

  undo: () => void;
  redo: () => void;
};

const snapshot = (p: TimelineProject): Snapshot => ({
  tracks: JSON.parse(JSON.stringify(p.tracks)),
  markers: JSON.parse(JSON.stringify(p.markers)),
});

const applySnapshot = (p: TimelineProject, snap: Snapshot): TimelineProject => ({
  ...p,
  tracks: JSON.parse(JSON.stringify(snap.tracks)),
  markers: JSON.parse(JSON.stringify(snap.markers)),
  duration: computeDuration(snap.tracks),
  updatedAt: Date.now(),
});

export const useTimelineStore = create<State>()(
  persist(
    (set, get) => {
      const pushHistory = (projectId: string) => {
        const p = get().projects.find((pr) => pr.id === projectId);
        if (!p) return;
        const snap = snapshot(p);
        set({
          history: [...get().history.slice(-49), snap],
          redoStack: [],
        });
      };

      const mutateProject = (projectId: string, fn: (p: TimelineProject) => TimelineProject) => {
        set({
          projects: get().projects.map((p) =>
            p.id === projectId ? { ...fn(p), duration: computeDuration(fn(p).tracks), updatedAt: Date.now() } : p
          ),
        });
      };

      return {
        projects: [],
        activeId: null,
        hydrated: false,
        playhead: 0,
        pxPerSec: 40,
        isPlaying: false,
        selectedClipId: null,
        history: [],
        redoStack: [],

        createProject: (title) => {
          const now = Date.now();
          const p: TimelineProject = {
            id: uid(),
            title: title.trim() || "Untitled Timeline",
            tracks: defaultTracks(),
            markers: [],
            duration: 0,
            fps: 24,
            createdAt: now,
            updatedAt: now,
          };
          set({ projects: [p, ...get().projects], activeId: p.id, history: [], redoStack: [] });
          return p;
        },

        deleteProject: (id) => {
          const remaining = get().projects.filter((p) => p.id !== id);
          set({
            projects: remaining,
            activeId: get().activeId === id ? remaining[0]?.id ?? null : get().activeId,
          });
        },

        setActive: (id) => set({ activeId: id, playhead: 0, selectedClipId: null, history: [], redoStack: [] }),
        renameProject: (id, title) => mutateProject(id, (p) => ({ ...p, title })),

        setPlayhead: (t) => set({ playhead: Math.max(0, t) }),
        setPxPerSec: (px) => set({ pxPerSec: Math.max(8, Math.min(200, px)) }),
        setPlaying: (playing) => set({ isPlaying: playing }),
        setSelectedClip: (id) => set({ selectedClipId: id }),

        addClip: (projectId, trackId, input) => {
          pushHistory(projectId);
          mutateProject(projectId, (p) => ({
            ...p,
            tracks: p.tracks.map((t) =>
              t.id === trackId
                ? {
                    ...t,
                    clips: [
                      ...t.clips,
                      {
                        id: uid(),
                        trackId,
                        label: input.label ?? "New clip",
                        start: input.start ?? 0,
                        duration: input.duration ?? 3,
                        trimIn: input.trimIn ?? 0,
                        trimOut: input.trimOut ?? 0,
                        transition: input.transition ?? "cut",
                        thumbnailUrl: input.thumbnailUrl,
                        text: input.text,
                        captionStyle: input.captionStyle,
                        sourceId: input.sourceId,
                        color: input.color,
                      },
                    ],
                  }
                : t
            ),
          }));
        },

        updateClip: (projectId, clipId, patch) => {
          mutateProject(projectId, (p) => ({
            ...p,
            tracks: p.tracks.map((t) => ({
              ...t,
              clips: t.clips.map((c) => (c.id === clipId ? { ...c, ...patch } : c)),
            })),
          }));
        },

        removeClip: (projectId, clipId) => {
          pushHistory(projectId);
          mutateProject(projectId, (p) => ({
            ...p,
            tracks: p.tracks.map((t) => ({
              ...t,
              clips: t.clips.filter((c) => c.id !== clipId),
            })),
          }));
          if (get().selectedClipId === clipId) set({ selectedClipId: null });
        },

        splitClip: (projectId, clipId, atTime) => {
          pushHistory(projectId);
          mutateProject(projectId, (p) => {
            let newClip: TimelineClip | null = null;
            const tracks = p.tracks.map((t) => ({
              ...t,
              clips: t.clips.flatMap((c) => {
                if (c.id !== clipId) return [c];
                if (atTime <= c.start || atTime >= c.start + c.duration) return [c];
                const firstDur = atTime - c.start;
                const secondDur = c.duration - firstDur;
                newClip = {
                  ...c,
                  id: uid(),
                  start: atTime,
                  duration: secondDur,
                  trimIn: c.trimIn + firstDur,
                  transition: "cut",
                };
                return [{ ...c, duration: firstDur }, newClip];
              }),
            }));
            return { ...p, tracks };
          });
        },

        toggleTrackMute: (projectId, trackId) =>
          mutateProject(projectId, (p) => ({
            ...p,
            tracks: p.tracks.map((t) => (t.id === trackId ? { ...t, muted: !t.muted } : t)),
          })),
        toggleTrackHide: (projectId, trackId) =>
          mutateProject(projectId, (p) => ({
            ...p,
            tracks: p.tracks.map((t) => (t.id === trackId ? { ...t, hidden: !t.hidden } : t)),
          })),
        toggleTrackLock: (projectId, trackId) =>
          mutateProject(projectId, (p) => ({
            ...p,
            tracks: p.tracks.map((t) => (t.id === trackId ? { ...t, locked: !t.locked } : t)),
          })),

        addMarker: (projectId, time, label = "Marker") => {
          mutateProject(projectId, (p) => ({
            ...p,
            markers: [...p.markers, { id: uid(), time, label, color: "var(--accent-gold)" }].sort((a, b) => a.time - b.time),
          }));
        },
        updateMarker: (projectId, markerId, patch) => {
          mutateProject(projectId, (p) => ({
            ...p,
            markers: p.markers.map((m) => (m.id === markerId ? { ...m, ...patch } : m)).sort((a, b) => a.time - b.time),
          }));
        },
        removeMarker: (projectId, markerId) => {
          mutateProject(projectId, (p) => ({
            ...p,
            markers: p.markers.filter((m) => m.id !== markerId),
          }));
        },

        undo: () => {
          const { history, redoStack, projects, activeId } = get();
          if (history.length === 0 || !activeId) return;
          const p = projects.find((pr) => pr.id === activeId);
          if (!p) return;
          const prev = history[history.length - 1];
          const currentSnap = snapshot(p);
          set({
            history: history.slice(0, -1),
            redoStack: [...redoStack, currentSnap],
            projects: projects.map((pr) => (pr.id === activeId ? applySnapshot(pr, prev) : pr)),
          });
        },

        redo: () => {
          const { redoStack, history, projects, activeId } = get();
          if (redoStack.length === 0 || !activeId) return;
          const p = projects.find((pr) => pr.id === activeId);
          if (!p) return;
          const next = redoStack[redoStack.length - 1];
          const currentSnap = snapshot(p);
          set({
            redoStack: redoStack.slice(0, -1),
            history: [...history, currentSnap],
            projects: projects.map((pr) => (pr.id === activeId ? applySnapshot(pr, next) : pr)),
          });
        },
      };
    },
    {
      name: "hooke:timelines",
      storage: createJSONStorage(() => idbStorage),
      partialize: (s) => ({ projects: s.projects, activeId: s.activeId }),
      onRehydrateStorage: () => (state) => {
        if (!state) return;
        state.hydrated = true;
        if (state.projects.length === 0) {
          const seeded = seed();
          state.projects = seeded;
          state.activeId = seeded[0]?.id ?? null;
        }
      },
    },
  ),
);
