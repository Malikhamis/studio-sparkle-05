import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { idbStorage } from "@/lib/idb-storage";

/**
 * miStory — the flagship storytelling module.
 * Hierarchical: Series → Seasons → Episodes → Scenes
 * Each series links to a Universe for character/lore consistency.
 */

export type StoryTemplate =
  | "motivational"
  | "kids"
  | "horror"
  | "documentary"
  | "scifi"
  | "romance"
  | "comedy"
  | "thriller";

export type StoryStyle =
  | "cinematic"
  | "comic"
  | "anime"
  | "pixar"
  | "watercolor"
  | "noir"
  | "retro"
  | "minimal";

export type EpisodeStatus =
  | "concept"
  | "scripted"
  | "storyboarded"
  | "rendering"
  | "complete";

export type Scene = {
  id: string;
  number: number;
  heading: string;
  description: string;
  prompt: string;
  duration: number; // seconds
  imageUrl?: string;
  videoUrl?: string;
  status: "pending" | "generating" | "complete" | "failed";
};

export type StoryMemory = {
  /** Characters mentioned in this episode */
  characters: string[];
  /** Locations used */
  locations: string[];
  /** Key props/items */
  props: string[];
  /** Emotional arc tags */
  emotions: string[];
  /** Time of day consistency */
  timeOfDay?: string;
  /** Weather/atmosphere */
  weather?: string;
  /** Continuity notes */
  notes: string[];
};

export type InputMode = "script" | "image" | "idea";

export type StoryInput = {
  mode: InputMode;
  content: string;
  imageUrl?: string;
  blueprintId?: string;
};

export type Episode = {
  id: string;
  number: number;
  title: string;
  logline: string;
  status: EpisodeStatus;
  scenes: Scene[];
  duration: number; // total seconds (sum of scenes)
  blueprintId?: string; // link to miDirector blueprint
  /** Story memory for continuity tracking */
  memory: StoryMemory;
  /** Input source that generated this episode */
  inputSource?: StoryInput;
  createdAt: number;
  updatedAt: number;
};

export type Season = {
  id: string;
  number: number;
  title: string;
  logline: string;
  episodes: Episode[];
  createdAt: number;
  updatedAt: number;
};

export type Series = {
  id: string;
  title: string;
  logline: string;
  universeId?: string; // link to miUniverse
  template: StoryTemplate;
  style: StoryStyle;
  seasons: Season[];
  tags: string[];
  createdAt: number;
  updatedAt: number;
};

export const STORY_TEMPLATES: { id: StoryTemplate; label: string; blurb: string }[] = [
  { id: "motivational", label: "Motivational", blurb: "Inspirational arcs, triumph over adversity" },
  { id: "kids", label: "Kids", blurb: "Playful, simple stakes, clear lessons" },
  { id: "horror", label: "Horror", blurb: "Tension, dread, the uncanny" },
  { id: "documentary", label: "Documentary", blurb: "Observational, interview-driven" },
  { id: "scifi", label: "Sci-Fi", blurb: "Future, tech, speculative worlds" },
  { id: "romance", label: "Romance", blurb: "Connection, longing, emotional truth" },
  { id: "comedy", label: "Comedy", blurb: "Timing, surprise, the absurd" },
  { id: "thriller", label: "Thriller", blurb: "Suspense, twists, high stakes" },
];

export const STORY_STYLES: { id: StoryStyle; label: string }[] = [
  { id: "cinematic", label: "Cinematic" },
  { id: "comic", label: "Comic" },
  { id: "anime", label: "Anime" },
  { id: "pixar", label: "Pixar-style" },
  { id: "watercolor", label: "Watercolor" },
  { id: "noir", label: "Noir" },
  { id: "retro", label: "Retro" },
  { id: "minimal", label: "Minimal" },
];

const uid = () =>
  globalThis.crypto?.randomUUID?.() ??
  `s_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;

type State = {
  series: Series[];
  activeSeriesId: string | null;
  activeSeasonId: string | null;
  activeEpisodeId: string | null;
  hydrated: boolean;

  createSeries: (input: {
    title: string;
    logline?: string;
    universeId?: string;
    template: StoryTemplate;
    style: StoryStyle;
    tags?: string[];
  }) => Series;
  updateSeries: (id: string, patch: Partial<Pick<Series, "title" | "logline" | "universeId" | "template" | "style" | "tags">>) => void;
  deleteSeries: (id: string) => void;
  setActiveSeries: (id: string | null) => void;

  createSeason: (seriesId: string, input: { title: string; logline?: string }) => Season;
  updateSeason: (seriesId: string, seasonId: string, patch: Partial<Pick<Season, "title" | "logline">>) => void;
  deleteSeason: (seriesId: string, seasonId: string) => void;
  setActiveSeason: (id: string | null) => void;

  createEpisode: (seriesId: string, seasonId: string, input: { title: string; logline?: string }) => Episode;
  updateEpisode: (
    seriesId: string,
    seasonId: string,
    episodeId: string,
    patch: Partial<Pick<Episode, "title" | "logline" | "status" | "blueprintId">>
  ) => void;
  deleteEpisode: (seriesId: string, seasonId: string, episodeId: string) => void;
  setActiveEpisode: (id: string | null) => void;

  addScene: (seriesId: string, seasonId: string, episodeId: string, input?: Partial<Scene>) => Scene;
  updateScene: (
    seriesId: string,
    seasonId: string,
    episodeId: string,
    sceneId: string,
    patch: Partial<Omit<Scene, "id" | "number">>
  ) => void;
  removeScene: (seriesId: string, seasonId: string, episodeId: string, sceneId: string) => void;
  reorderScenes: (seriesId: string, seasonId: string, episodeId: string, sceneIds: string[]) => void;

  recalculateEpisodeDuration: (seriesId: string, seasonId: string, episodeId: string) => void;

  updateMemory: (
    seriesId: string,
    seasonId: string,
    episodeId: string,
    patch: Partial<StoryMemory>
  ) => void;
};

const seed = (): Series[] => {
  const now = Date.now();
  return [
    {
      id: uid(),
      title: "The Signal",
      logline: "A deep-space crew chases a whisper from a dead star.",
      universeId: undefined,
      template: "scifi",
      style: "cinematic",
      seasons: [
        {
          id: uid(),
          number: 1,
          title: "Season 1 — The Awakening",
          logline: "The signal arrives. Everything changes.",
          episodes: [
            {
              id: uid(),
              number: 1,
              title: "Pilot",
              logline: "First contact — or a ghost?",
              status: "scripted",
              scenes: [],
              duration: 0,
              memory: {
                characters: ["Iris Vale", "Commander Chen"],
                locations: ["Listening Post", "Bridge"],
                props: ["Signal decoder", "Old radio"],
                emotions: ["wonder", "tension", "hope"],
                timeOfDay: "blue hour",
                weather: "clear, windy",
                notes: ["Establish Iris as quiet, observant", "Signal first heard at 12.3kHz"],
              },
              createdAt: now,
              updatedAt: now,
            },
          ],
          createdAt: now,
          updatedAt: now,
        },
      ],
      tags: ["space", "mystery", "ensemble"],
      createdAt: now,
      updatedAt: now,
    },
  ];
};

export const useStoryStore = create<State>()(
  persist(
    (set, get) => ({
      series: [],
      activeSeriesId: null,
      activeSeasonId: null,
      activeEpisodeId: null,
      hydrated: false,

      createSeries: ({ title, logline = "", universeId, template, style, tags = [] }) => {
        const now = Date.now();
        const s: Series = {
          id: uid(),
          title: title.trim() || "Untitled Series",
          logline,
          universeId,
          template,
          style,
          seasons: [],
          tags,
          createdAt: now,
          updatedAt: now,
        };
        set({ series: [s, ...get().series], activeSeriesId: s.id });
        return s;
      },

      updateSeries: (id, patch) => {
        set({
          series: get().series.map((s) =>
            s.id === id ? { ...s, ...patch, updatedAt: Date.now() } : s
          ),
        });
      },

      deleteSeries: (id) => {
        const remaining = get().series.filter((s) => s.id !== id);
        set({
          series: remaining,
          activeSeriesId: get().activeSeriesId === id ? remaining[0]?.id ?? null : get().activeSeriesId,
        });
      },

      setActiveSeries: (id) => set({ activeSeriesId: id, activeSeasonId: null, activeEpisodeId: null }),

      createSeason: (seriesId, { title, logline = "" }) => {
        const now = Date.now();
        const series = get().series.find((s) => s.id === seriesId);
        if (!series) throw new Error("Series not found");
        const number = series.seasons.length + 1;
        const season: Season = {
          id: uid(),
          number,
          title: title.trim() || `Season ${number}`,
          logline,
          episodes: [],
          createdAt: now,
          updatedAt: now,
        };
        set({
          series: get().series.map((s) =>
            s.id === seriesId
              ? { ...s, seasons: [...s.seasons, season], updatedAt: now }
              : s
          ),
          activeSeasonId: season.id,
        });
        return season;
      },

      updateSeason: (seriesId, seasonId, patch) => {
        set({
          series: get().series.map((s) =>
            s.id === seriesId
              ? {
                  ...s,
                  seasons: s.seasons.map((sn) =>
                    sn.id === seasonId ? { ...sn, ...patch, updatedAt: Date.now() } : sn
                  ),
                  updatedAt: Date.now(),
                }
              : s
          ),
        });
      },

      deleteSeason: (seriesId, seasonId) => {
        set({
          series: get().series.map((s) =>
            s.id === seriesId
              ? {
                  ...s,
                  seasons: s.seasons.filter((sn) => sn.id !== seasonId),
                  updatedAt: Date.now(),
                }
              : s
          ),
          activeSeasonId: get().activeSeasonId === seasonId ? null : get().activeSeasonId,
        });
      },

      setActiveSeason: (id) => set({ activeSeasonId: id, activeEpisodeId: null }),

      createEpisode: (seriesId, seasonId, { title, logline = "" }) => {
        const now = Date.now();
        const series = get().series.find((s) => s.id === seriesId);
        if (!series) throw new Error("Series not found");
        const season = series.seasons.find((sn) => sn.id === seasonId);
        if (!season) throw new Error("Season not found");
        const number = season.episodes.length + 1;
        const episode: Episode = {
          id: uid(),
          number,
          title: title.trim() || `Episode ${number}`,
          logline,
          status: "concept",
          scenes: [],
          duration: 0,
          memory: {
            characters: [],
            locations: [],
            props: [],
            emotions: [],
            notes: [],
          },
          createdAt: now,
          updatedAt: now,
        };
        set({
          series: get().series.map((s) =>
            s.id === seriesId
              ? {
                  ...s,
                  seasons: s.seasons.map((sn) =>
                    sn.id === seasonId
                      ? { ...sn, episodes: [...sn.episodes, episode], updatedAt: now }
                      : sn
                  ),
                  updatedAt: now,
                }
              : s
          ),
          activeEpisodeId: episode.id,
        });
        return episode;
      },

      updateEpisode: (seriesId, seasonId, episodeId, patch) => {
        set({
          series: get().series.map((s) =>
            s.id === seriesId
              ? {
                  ...s,
                  seasons: s.seasons.map((sn) =>
                    sn.id === seasonId
                      ? {
                          ...sn,
                          episodes: sn.episodes.map((ep) =>
                            ep.id === episodeId ? { ...ep, ...patch, updatedAt: Date.now() } : ep
                          ),
                          updatedAt: Date.now(),
                        }
                      : sn
                  ),
                  updatedAt: Date.now(),
                }
              : s
          ),
        });
      },

      deleteEpisode: (seriesId, seasonId, episodeId) => {
        set({
          series: get().series.map((s) =>
            s.id === seriesId
              ? {
                  ...s,
                  seasons: s.seasons.map((sn) =>
                    sn.id === seasonId
                      ? {
                          ...sn,
                          episodes: sn.episodes.filter((ep) => ep.id !== episodeId),
                          updatedAt: Date.now(),
                        }
                      : sn
                  ),
                  updatedAt: Date.now(),
                }
              : s
          ),
          activeEpisodeId: get().activeEpisodeId === episodeId ? null : get().activeEpisodeId,
        });
      },

      setActiveEpisode: (id) => set({ activeEpisodeId: id }),

      addScene: (seriesId, seasonId, episodeId, input = {}) => {
        const series = get().series.find((s) => s.id === seriesId);
        if (!series) throw new Error("Series not found");
        const season = series.seasons.find((sn) => sn.id === seasonId);
        if (!season) throw new Error("Season not found");
        const episode = season.episodes.find((ep) => ep.id === episodeId);
        if (!episode) throw new Error("Episode not found");

        const number = episode.scenes.length + 1;
        const now = Date.now();
        const scene: Scene = {
          id: uid(),
          number,
          heading: input.heading ?? `Scene ${number}`,
          description: input.description ?? "",
          prompt: input.prompt ?? "",
          duration: input.duration ?? 5,
          status: input.status ?? "pending",
        };

        set({
          series: get().series.map((s) =>
            s.id === seriesId
              ? {
                  ...s,
                  seasons: s.seasons.map((sn) =>
                    sn.id === seasonId
                      ? {
                          ...sn,
                          episodes: sn.episodes.map((ep) =>
                            ep.id === episodeId
                              ? { ...ep, scenes: [...ep.scenes, scene], updatedAt: now }
                              : ep
                          ),
                          updatedAt: now,
                        }
                      : sn
                  ),
                  updatedAt: now,
                }
              : s
          ),
        });
        return scene;
      },

      updateScene: (seriesId, seasonId, episodeId, sceneId, patch) => {
        const now = Date.now();
        set({
          series: get().series.map((s) =>
            s.id === seriesId
              ? {
                  ...s,
                  seasons: s.seasons.map((sn) =>
                    sn.id === seasonId
                      ? {
                          ...sn,
                          episodes: sn.episodes.map((ep) =>
                            ep.id === episodeId
                              ? {
                                  ...ep,
                                  scenes: ep.scenes.map((sc) =>
                                    sc.id === sceneId ? { ...sc, ...patch } : sc
                                  ),
                                  updatedAt: now,
                                }
                              : ep
                          ),
                          updatedAt: now,
                        }
                      : sn
                  ),
                  updatedAt: now,
                }
              : s
          ),
        });
        get().recalculateEpisodeDuration(seriesId, seasonId, episodeId);
      },

      removeScene: (seriesId, seasonId, episodeId, sceneId) => {
        const now = Date.now();
        set({
          series: get().series.map((s) =>
            s.id === seriesId
              ? {
                  ...s,
                  seasons: s.seasons.map((sn) =>
                    sn.id === seasonId
                      ? {
                          ...sn,
                          episodes: sn.episodes.map((ep) =>
                            ep.id === episodeId
                              ? {
                                  ...ep,
                                  scenes: ep.scenes
                                    .filter((sc) => sc.id !== sceneId)
                                    .map((sc, i) => ({ ...sc, number: i + 1 })),
                                  updatedAt: now,
                                }
                              : ep
                          ),
                          updatedAt: now,
                        }
                      : sn
                  ),
                  updatedAt: now,
                }
              : s
          ),
        });
        get().recalculateEpisodeDuration(seriesId, seasonId, episodeId);
      },

      reorderScenes: (seriesId, seasonId, episodeId, sceneIds) => {
        const now = Date.now();
        set({
          series: get().series.map((s) =>
            s.id === seriesId
              ? {
                  ...s,
                  seasons: s.seasons.map((sn) =>
                    sn.id === seasonId
                      ? {
                          ...sn,
                          episodes: sn.episodes.map((ep) => {
                            if (ep.id !== episodeId) return ep;
                            const sceneMap = new Map(ep.scenes.map((sc) => [sc.id, sc]));
                            const reordered = sceneIds
                              .map((id) => sceneMap.get(id))
                              .filter((sc): sc is Scene => !!sc)
                              .map((sc, i) => ({ ...sc, number: i + 1 }));
                            return { ...ep, scenes: reordered, updatedAt: now };
                          }),
                          updatedAt: now,
                        }
                      : sn
                  ),
                  updatedAt: now,
                }
              : s
          ),
        });
        get().recalculateEpisodeDuration(seriesId, seasonId, episodeId);
      },

      recalculateEpisodeDuration: (seriesId, seasonId, episodeId) => {
        set({
          series: get().series.map((s) =>
            s.id === seriesId
              ? {
                  ...s,
                  seasons: s.seasons.map((sn) =>
                    sn.id === seasonId
                      ? {
                          ...sn,
                          episodes: sn.episodes.map((ep) =>
                            ep.id === episodeId
                              ? {
                                  ...ep,
                                  duration: ep.scenes.reduce((sum, sc) => sum + sc.duration, 0),
                                }
                              : ep
                          ),
                        }
                      : sn
                  ),
                }
              : s
          ),
        });
      },

      updateMemory: (seriesId, seasonId, episodeId, patch) => {
        const now = Date.now();
        set({
          series: get().series.map((s) =>
            s.id === seriesId
              ? {
                  ...s,
                  seasons: s.seasons.map((sn) =>
                    sn.id === seasonId
                      ? {
                          ...sn,
                          episodes: sn.episodes.map((ep) =>
                            ep.id === episodeId
                              ? { ...ep, memory: { ...ep.memory, ...patch }, updatedAt: now }
                              : ep
                          ),
                          updatedAt: now,
                        }
                      : sn
                  ),
                  updatedAt: now,
                }
              : s
          ),
        });
      },
    }),
    {
      name: "hooke:stories",
      storage: createJSONStorage(() => idbStorage),
      partialize: (s) => ({
        series: s.series,
        activeSeriesId: s.activeSeriesId,
        activeSeasonId: s.activeSeasonId,
        activeEpisodeId: s.activeEpisodeId,
      }),
      onRehydrateStorage: () => (state) => {
        if (!state) return;
        state.hydrated = true;
        if (state.series.length === 0) {
          const seeded = seed();
          state.series = seeded;
          state.activeSeriesId = seeded[0]?.id ?? null;
        }
      },
    }
  )
);
