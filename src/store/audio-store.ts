import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { idbStorage } from "@/lib/idb-storage";

/**
 * Audio Studio — narration, music, and SFX for episodes and storyboards.
 * Voice profiles and music themes are pulled from miUniverse entities.
 */

export type NarrationStatus = "pending" | "generating" | "complete" | "failed";

export type NarrationTrack = {
  id: string;
  sceneId: string;
  sceneLabel: string;
  text: string;
  /** Universe entity ID where kind === "voice" */
  voiceProfileId?: string;
  emotion: string;
  speed: number;
  pitch: number;
  audioUrl?: string;
  status: NarrationStatus;
  createdAt: number;
  updatedAt: number;
};

export type MusicTrack = {
  id: string;
  /** Universe entity ID where kind === "music" */
  universeMusicId?: string;
  label: string;
  mood: string;
  bpm: number;
  volume: number;
  audioUrl?: string;
  status: NarrationStatus;
  createdAt: number;
  updatedAt: number;
};

export type SfxSuggestion = {
  id: string;
  sceneId: string;
  label: string;
  category: string;
  audioUrl?: string;
  status: NarrationStatus;
};

export type AudioProject = {
  id: string;
  title: string;
  episodeId?: string;
  storyboardId?: string;
  narrations: NarrationTrack[];
  music: MusicTrack[];
  sfx: SfxSuggestion[];
  createdAt: number;
  updatedAt: number;
};

type State = {
  projects: AudioProject[];
  activeId: string | null;
  hydrated: boolean;

  createProject: (input: { title: string; episodeId?: string; storyboardId?: string }) => AudioProject;
  deleteProject: (id: string) => void;
  setActive: (id: string | null) => void;

  addNarration: (projectId: string, input: { sceneId: string; sceneLabel: string; text?: string }) => NarrationTrack;
  updateNarration: (projectId: string, narrationId: string, patch: Partial<Omit<NarrationTrack, "id" | "createdAt">>) => void;
  removeNarration: (projectId: string, narrationId: string) => void;

  addMusic: (projectId: string, input: { label: string; mood?: string; bpm?: number }) => MusicTrack;
  updateMusic: (projectId: string, musicId: string, patch: Partial<Omit<MusicTrack, "id" | "createdAt">>) => void;
  removeMusic: (projectId: string, musicId: string) => void;

  addSfx: (projectId: string, input: { sceneId: string; label: string; category?: string }) => SfxSuggestion;
  removeSfx: (projectId: string, sfxId: string) => void;
  updateSfx: (projectId: string, sfxId: string, patch: Partial<Omit<SfxSuggestion, "id">>) => void;
};

const uid = () =>
  globalThis.crypto?.randomUUID?.() ??
  `a_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;

export const EMOTION_PRESETS = [
  { id: "neutral", label: "Neutral" },
  { id: "calm", label: "Calm" },
  { id: "whisper", label: "Whisper" },
  { id: "urgent", label: "Urgent" },
  { id: "hopeful", label: "Hopeful" },
  { id: "tense", label: "Tense" },
  { id: "melancholy", label: "Melancholy" },
  { id: "excited", label: "Excited" },
  { id: "somber", label: "Somber" },
  { id: "narrator", label: "Narrator" },
];

export const SFX_CATEGORIES = [
  "Ambient",
  "Impact",
  "Whoosh",
  "UI",
  "Nature",
  "Foley",
  "Synth",
  "Voice",
];

export const MUSIC_MOODS = [
  "Cinematic",
  "Tense",
  "Uplifting",
  "Melancholy",
  "Energetic",
  "Ambient",
  "Dark",
  "Playful",
  "Epic",
  "Intimate",
];

const seed = (): AudioProject[] => {
  const now = Date.now();
  return [
    {
      id: uid(),
      title: "The Signal — Pilot Audio",
      narrations: [
        {
          id: uid(),
          sceneId: "scene-1",
          sceneLabel: "Cold Open — Listening Post",
          text: "The hum of old machines. A signal, faint, persistent, from somewhere that should be silent.",
          emotion: "whisper",
          speed: 0.95,
          pitch: 0,
          status: "complete",
          createdAt: now,
          updatedAt: now,
        },
        {
          id: uid(),
          sceneId: "scene-2",
          sceneLabel: "Inciting Image — The Signal",
          text: "12.3 kilohertz. It repeats every 47 seconds.",
          emotion: "tense",
          speed: 1.0,
          pitch: 0,
          status: "pending",
          createdAt: now,
          updatedAt: now,
        },
        {
          id: uid(),
          sceneId: "scene-3",
          sceneLabel: "Bridge — Commander Chen",
          text: "All hands. This is not a drill. We have contact.",
          emotion: "urgent",
          speed: 1.1,
          pitch: 0,
          status: "pending",
          createdAt: now,
          updatedAt: now,
        },
      ],
      music: [
        {
          id: uid(),
          label: "Carrier Hum",
          mood: "Dark",
          bpm: 60,
          volume: 65,
          status: "complete",
          createdAt: now,
          updatedAt: now,
        },
        {
          id: uid(),
          label: "First Contact Theme",
          mood: "Cinematic",
          bpm: 72,
          volume: 50,
          status: "pending",
          createdAt: now,
          updatedAt: now,
        },
      ],
      sfx: [
        {
          id: uid(),
          sceneId: "scene-1",
          label: "Radio static sweep",
          category: "Ambient",
          status: "complete",
        },
        {
          id: uid(),
          sceneId: "scene-2",
          label: "Oscilloscope ping",
          category: "UI",
          status: "pending",
        },
        {
          id: uid(),
          sceneId: "scene-3",
          label: "Bridge door seal",
          category: "Foley",
          status: "pending",
        },
      ],
      createdAt: now,
      updatedAt: now,
    },
  ];
};

export const useAudioStore = create<State>()(
  persist(
    (set, get) => ({
      projects: [],
      activeId: null,
      hydrated: false,

      createProject: ({ title, episodeId, storyboardId }) => {
        const now = Date.now();
        const p: AudioProject = {
          id: uid(),
          title: title.trim() || "Untitled Audio Project",
          episodeId,
          storyboardId,
          narrations: [],
          music: [],
          sfx: [],
          createdAt: now,
          updatedAt: now,
        };
        set({ projects: [p, ...get().projects], activeId: p.id });
        return p;
      },

      deleteProject: (id) => {
        const remaining = get().projects.filter((p) => p.id !== id);
        set({
          projects: remaining,
          activeId: get().activeId === id ? remaining[0]?.id ?? null : get().activeId,
        });
      },

      setActive: (id) => set({ activeId: id }),

      addNarration: (projectId, { sceneId, sceneLabel, text = "" }) => {
        const now = Date.now();
        const track: NarrationTrack = {
          id: uid(),
          sceneId,
          sceneLabel,
          text,
          emotion: "neutral",
          speed: 1,
          pitch: 0,
          status: "pending",
          createdAt: now,
          updatedAt: now,
        };
        set({
          projects: get().projects.map((p) =>
            p.id === projectId
              ? { ...p, narrations: [...p.narrations, track], updatedAt: now }
              : p
          ),
        });
        return track;
      },

      updateNarration: (projectId, narrationId, patch) => {
        set({
          projects: get().projects.map((p) =>
            p.id === projectId
              ? {
                  ...p,
                  narrations: p.narrations.map((n) =>
                    n.id === narrationId ? { ...n, ...patch, updatedAt: Date.now() } : n
                  ),
                  updatedAt: Date.now(),
                }
              : p
          ),
        });
      },

      removeNarration: (projectId, narrationId) => {
        set({
          projects: get().projects.map((p) =>
            p.id === projectId
              ? { ...p, narrations: p.narrations.filter((n) => n.id !== narrationId), updatedAt: Date.now() }
              : p
          ),
        });
      },

      addMusic: (projectId, { label, mood = "Cinematic", bpm = 72 }) => {
        const now = Date.now();
        const track: MusicTrack = {
          id: uid(),
          label,
          mood,
          bpm,
          volume: 60,
          status: "pending",
          createdAt: now,
          updatedAt: now,
        };
        set({
          projects: get().projects.map((p) =>
            p.id === projectId
              ? { ...p, music: [...p.music, track], updatedAt: now }
              : p
          ),
        });
        return track;
      },

      updateMusic: (projectId, musicId, patch) => {
        set({
          projects: get().projects.map((p) =>
            p.id === projectId
              ? {
                  ...p,
                  music: p.music.map((m) =>
                    m.id === musicId ? { ...m, ...patch, updatedAt: Date.now() } : m
                  ),
                  updatedAt: Date.now(),
                }
              : p
          ),
        });
      },

      removeMusic: (projectId, musicId) => {
        set({
          projects: get().projects.map((p) =>
            p.id === projectId
              ? { ...p, music: p.music.filter((m) => m.id !== musicId), updatedAt: Date.now() }
              : p
          ),
        });
      },

      addSfx: (projectId, { sceneId, label, category = "Ambient" }) => {
        const sfx: SfxSuggestion = {
          id: uid(),
          sceneId,
          label,
          category,
          status: "pending",
        };
        set({
          projects: get().projects.map((p) =>
            p.id === projectId
              ? { ...p, sfx: [...p.sfx, sfx], updatedAt: Date.now() }
              : p
          ),
        });
        return sfx;
      },

      removeSfx: (projectId, sfxId) => {
        set({
          projects: get().projects.map((p) =>
            p.id === projectId
              ? { ...p, sfx: p.sfx.filter((s) => s.id !== sfxId), updatedAt: Date.now() }
              : p
          ),
        });
      },

      updateSfx: (projectId, sfxId, patch) => {
        set({
          projects: get().projects.map((p) =>
            p.id === projectId
              ? {
                  ...p,
                  sfx: p.sfx.map((s) => (s.id === sfxId ? { ...s, ...patch } : s)),
                  updatedAt: Date.now(),
                }
              : p
          ),
        });
      },
    }),
    {
      name: "hooke:audio",
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
    }
  )
);
