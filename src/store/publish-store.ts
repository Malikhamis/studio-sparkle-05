import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { idbStorage } from "@/lib/idb-storage";

/**
 * Publish Store — multi-platform export, scheduling, and upload queue management.
 * Supports YouTube, TikTok, Instagram, Facebook, LinkedIn, X (Twitter).
 * Handles OAuth token storage (when provided), scheduling, and export metadata.
 * Local state only — no external API calls required for scheduling/storage.
 */

export type PublishPlatform = "youtube" | "tiktok" | "instagram" | "facebook" | "linkedin" | "x";

export type PublishStatus = "draft" | "scheduled" | "uploading" | "published" | "failed";

export type PublishJob = {
  id: string;
  projectId: string;
  title: string;
  description: string;
  platforms: PublishPlatform[];
  status: PublishStatus;
  /** ISO 8601 timestamp for scheduled publish */
  scheduledTime?: number;
  /** Unix timestamp when actually published */
  publishedAt?: number;
  thumbnailUrl?: string;
  videoUrl?: string;
  tags: string[];
  visibility: "public" | "private" | "unlisted";
  createdAt: number;
  updatedAt: number;
  errorMessage?: string;
};

export type OAuthConfig = {
  platform: PublishPlatform;
  accessToken?: string;
  refreshToken?: string;
  tokenExpiry?: number;
  connected: boolean;
  accountName?: string;
  accountId?: string;
};

export type ExportTarget = {
  platform: PublishPlatform;
  resolution: "720p" | "1080p" | "4k";
  format: "mp4" | "webm";
  bitrate: number; // kbps
};

type State = {
  jobs: PublishJob[];
  activeJobId: string | null;
  oauthConfigs: OAuthConfig[];
  hydrated: boolean;

  createJob: (input: {
    projectId: string;
    title: string;
    description?: string;
    platforms: PublishPlatform[];
  }) => PublishJob;
  deleteJob: (id: string) => void;
  setActive: (id: string | null) => void;

  updateJob: (id: string, patch: Partial<Omit<PublishJob, "id" | "createdAt">>) => void;
  updateJobStatus: (id: string, status: PublishStatus) => void;
  scheduleJob: (id: string, scheduledTime: number) => void;
  publishNow: (id: string) => void;

  // OAuth management
  setOAuthToken: (
    platform: PublishPlatform,
    accessToken: string,
    refreshToken?: string,
    accountName?: string,
    accountId?: string
  ) => void;
  disconnectPlatform: (platform: PublishPlatform) => void;
  getOAuthConfig: (platform: PublishPlatform) => OAuthConfig | undefined;
  isConnected: (platform: PublishPlatform) => boolean;

  // Export & download
  downloadExport: (
    jobId: string,
    options: ExportTarget
  ) => void;
};

const uid = () =>
  globalThis.crypto?.randomUUID?.() ??
  `pub_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;

const defaultOAuthConfigs = (): OAuthConfig[] => [
  { platform: "youtube", connected: false },
  { platform: "tiktok", connected: false },
  { platform: "instagram", connected: false },
  { platform: "facebook", connected: false },
  { platform: "linkedin", connected: false },
  { platform: "x", connected: false },
];

const seed = (): PublishJob[] => {
  const now = Date.now();
  return [
    {
      id: uid(),
      projectId: "project-signal",
      title: "The Signal — Pilot",
      description:
        "First episode of The Signal sci-fi series. A mysterious 12.3kHz signal emerges from the void.",
      platforms: ["youtube", "tiktok"],
      status: "draft",
      tags: ["sci-fi", "mystery", "series", "first-episode"],
      visibility: "public",
      createdAt: now - 86400000,
      updatedAt: now,
    },
    {
      id: uid(),
      projectId: "project-signal",
      title: "The Signal — Pilot (LinkedIn Clip)",
      description:
        "Behind-the-scenes of The Signal production. Meet the team bringing sci-fi to life.",
      platforms: ["linkedin"],
      status: "published",
      tags: ["behind-the-scenes", "production", "ai-generated"],
      visibility: "public",
      publishedAt: now - 3600000,
      createdAt: now - 86400000,
      updatedAt: now,
    },
  ];
};

export const usePublishStore = create<State>()(
  persist(
    (set, get) => ({
      jobs: [],
      activeJobId: null,
      oauthConfigs: defaultOAuthConfigs(),
      hydrated: false,

      createJob: ({
        projectId,
        title,
        description = "",
        platforms,
      }) => {
        const now = Date.now();
        const job: PublishJob = {
          id: uid(),
          projectId,
          title: title.trim() || "Untitled Publish",
          description,
          platforms,
          status: "draft",
          tags: [],
          visibility: "public",
          createdAt: now,
          updatedAt: now,
        };
        set({ jobs: [job, ...get().jobs], activeJobId: job.id });
        return job;
      },

      deleteJob: (id) => {
        const remaining = get().jobs.filter((j) => j.id !== id);
        set({
          jobs: remaining,
          activeJobId:
            get().activeJobId === id ? remaining[0]?.id ?? null : get().activeJobId,
        });
      },

      setActive: (id) => set({ activeJobId: id }),

      updateJob: (id, patch) => {
        const now = Date.now();
        set({
          jobs: get().jobs.map((j) =>
            j.id === id ? { ...j, ...patch, updatedAt: now } : j
          ),
        });
      },

      updateJobStatus: (id, status) => {
        const now = Date.now();
        set({
          jobs: get().jobs.map((j) =>
            j.id === id
              ? {
                  ...j,
                  status,
                  publishedAt: status === "published" ? now : j.publishedAt,
                  updatedAt: now,
                }
              : j
          ),
        });
      },

      scheduleJob: (id, scheduledTime) => {
        const now = Date.now();
        if (scheduledTime <= now) {
          get().updateJobStatus(id, "failed");
          get().updateJob(id, {
            errorMessage: "Scheduled time must be in the future",
          });
          return;
        }
        set({
          jobs: get().jobs.map((j) =>
            j.id === id
              ? { ...j, status: "scheduled", scheduledTime, updatedAt: now }
              : j
          ),
        });
      },

      publishNow: (id) => {
        const job = get().jobs.find((j) => j.id === id);
        if (!job) return;

        // Check if all required platforms are connected
        const disconnected = job.platforms.filter((p) => !get().isConnected(p));
        if (disconnected.length > 0) {
          get().updateJobStatus(id, "failed");
          get().updateJob(id, {
            errorMessage: `Not connected to: ${disconnected.join(", ")}. Connect accounts in Settings > Publish.`,
          });
          return;
        }

        get().updateJobStatus(id, "uploading");
        // Simulate upload delay
        setTimeout(() => {
          get().updateJobStatus(id, "published");
        }, 2000);
      },

      setOAuthToken: (platform, accessToken, refreshToken, accountName, accountId) => {
        set({
          oauthConfigs: get().oauthConfigs.map((c) =>
            c.platform === platform
              ? {
                  ...c,
                  accessToken,
                  refreshToken,
                  connected: true,
                  accountName,
                  accountId,
                  tokenExpiry: Date.now() + 3600000, // 1 hour
                }
              : c
          ),
        });
      },

      disconnectPlatform: (platform) => {
        set({
          oauthConfigs: get().oauthConfigs.map((c) =>
            c.platform === platform
              ? {
                  ...c,
                  accessToken: undefined,
                  refreshToken: undefined,
                  connected: false,
                  accountName: undefined,
                  accountId: undefined,
                }
              : c
          ),
        });
      },

      getOAuthConfig: (platform) => {
        return get().oauthConfigs.find((c) => c.platform === platform);
      },

      isConnected: (platform) => {
        const config = get().getOAuthConfig(platform);
        return config?.connected ?? false;
      },

      downloadExport: (jobId, options) => {
        const job = get().jobs.find((j) => j.id === jobId);
        if (!job) return;

        // Simulate download - in production this would fetch from a server
        console.log(
          `Exporting ${job.title} to ${options.format} at ${options.resolution}...`
        );

        // Create a mock download link
        const mockBlob = new Blob(
          [
            JSON.stringify(
              {
                jobId,
                title: job.title,
                format: options.format,
                resolution: options.resolution,
                exportedAt: new Date().toISOString(),
              },
              null,
              2
            ),
          ],
          { type: "application/json" }
        );

        const url = URL.createObjectURL(mockBlob);
        const link = document.createElement("a");
        link.href = url;
        link.download = `${job.title.replace(/\s+/g, "-")}-${options.resolution}.${options.format}`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
      },
    }),
    {
      name: "hooke:publish",
      storage: createJSONStorage(() => idbStorage),
      partialize: (s) => ({
        jobs: s.jobs,
        activeJobId: s.activeJobId,
        oauthConfigs: s.oauthConfigs,
      }),
      onRehydrateStorage: () => (state) => {
        if (!state) return;
        state.hydrated = true;
        if (state.jobs.length === 0) {
          const seeded = seed();
          state.jobs = seeded;
          state.activeJobId = seeded[0]?.id ?? null;
        }
      },
    }
  )
);
