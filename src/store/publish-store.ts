import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { idbStorage } from "@/lib/idb-storage";

/**
 * Publish & Analytics store.
 * Local-first simulation: platform connections, upload queue,
 * scheduled + published posts, per-post metrics that grow over time.
 */

export type Platform =
  | "youtube"
  | "tiktok"
  | "instagram"
  | "facebook"
  | "linkedin"
  | "x";

export const PLATFORMS: { id: Platform; label: string; color: string }[] = [
  { id: "youtube", label: "YouTube", color: "#FF0033" },
  { id: "tiktok", label: "TikTok", color: "#25F4EE" },
  { id: "instagram", label: "Instagram", color: "#E1306C" },
  { id: "facebook", label: "Facebook", color: "#1877F2" },
  { id: "linkedin", label: "LinkedIn", color: "#0A66C2" },
  { id: "x", label: "X", color: "#F5F5F5" },
];

export type Connection = {
  platform: Platform;
  handle: string;
  connectedAt: number;
};

export type PublishStatus =
  | "draft"
  | "scheduled"
  | "uploading"
  | "published"
  | "failed";

export type PostMetrics = {
  views: number;
  watchTime: number; // minutes
  likes: number;
  comments: number;
  shares: number;
};

export type PublishPost = {
  id: string;
  title: string;
  description: string;
  platforms: Platform[];
  status: PublishStatus;
  scheduledAt?: number;
  publishedAt?: number;
  uploadProgress: number;
  projectId?: string;
  thumbnailColor: string;
  metrics: PostMetrics;
  history: { ts: number; message: string }[];
  errorMessage?: string;
  createdAt: number;
};

type PublishState = {
  connections: Connection[];
  posts: PublishPost[];

  connect: (platform: Platform, handle: string) => void;
  disconnect: (platform: Platform) => void;

  createPost: (input: {
    title: string;
    description?: string;
    platforms: Platform[];
    scheduledAt?: number;
    projectId?: string;
  }) => string;
  updatePost: (id: string, patch: Partial<PublishPost>) => void;
  removePost: (id: string) => void;
  publishNow: (id: string) => void;
  retryPost: (id: string) => void;

  tick: () => void;
  seedIfEmpty: () => void;
};

const uid = () =>
  `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;

const THUMB_COLORS = [
  "#8b5cf6",
  "#06b6d4",
  "#f43f5e",
  "#f59e0b",
  "#22c55e",
  "#3b82f6",
];

function pushHistory(p: PublishPost, message: string) {
  p.history = [...p.history, { ts: Date.now(), message }].slice(-40);
}

export const usePublishStore = create<PublishState>()(
  persist(
    (set, get) => ({
      connections: [],
      posts: [],

      connect: (platform, handle) =>
        set((s) => ({
          connections: [
            ...s.connections.filter((c) => c.platform !== platform),
            { platform, handle, connectedAt: Date.now() },
          ],
        })),

      disconnect: (platform) =>
        set((s) => ({
          connections: s.connections.filter((c) => c.platform !== platform),
        })),

      createPost: (input) => {
        const id = uid();
        const now = Date.now();
        const post: PublishPost = {
          id,
          title: input.title.trim() || "Untitled Post",
          description: input.description ?? "",
          platforms: input.platforms,
          status: input.scheduledAt ? "scheduled" : "draft",
          scheduledAt: input.scheduledAt,
          uploadProgress: 0,
          projectId: input.projectId,
          thumbnailColor:
            THUMB_COLORS[Math.floor(Math.random() * THUMB_COLORS.length)],
          metrics: { views: 0, watchTime: 0, likes: 0, comments: 0, shares: 0 },
          history: [
            {
              ts: now,
              message: input.scheduledAt
                ? `Scheduled for ${new Date(input.scheduledAt).toLocaleString()}`
                : "Draft created",
            },
          ],
          createdAt: now,
        };
        set((s) => ({ posts: [post, ...s.posts] }));
        return id;
      },

      updatePost: (id, patch) =>
        set((s) => ({
          posts: s.posts.map((p) => (p.id === id ? { ...p, ...patch } : p)),
        })),

      removePost: (id) =>
        set((s) => ({ posts: s.posts.filter((p) => p.id !== id) })),

      publishNow: (id) =>
        set((s) => ({
          posts: s.posts.map((p) => {
            if (p.id !== id) return p;
            const np: PublishPost = {
              ...p,
              status: "uploading",
              uploadProgress: 0,
              scheduledAt: undefined,
              history: [...p.history],
            };
            pushHistory(np, "Upload started");
            return np;
          }),
        })),

      retryPost: (id) =>
        set((s) => ({
          posts: s.posts.map((p) => {
            if (p.id !== id) return p;
            const np: PublishPost = {
              ...p,
              status: "uploading",
              uploadProgress: 0,
              errorMessage: undefined,
              history: [...p.history],
            };
            pushHistory(np, "Retry started");
            return np;
          }),
        })),

      tick: () => {
        const now = Date.now();
        const posts = get().posts.map((p) => ({ ...p, history: [...p.history] }));
        let changed = false;

        for (const p of posts) {
          // scheduled → uploading when time hits
          if (p.status === "scheduled" && p.scheduledAt && p.scheduledAt <= now) {
            p.status = "uploading";
            p.uploadProgress = 0;
            pushHistory(p, "Scheduled window reached — uploading");
            changed = true;
          }

          // uploading progress
          if (p.status === "uploading") {
            const step = 8 + Math.random() * 10;
            p.uploadProgress = Math.min(100, p.uploadProgress + step);
            if (p.uploadProgress >= 100 && Math.random() < 0.05) {
              p.status = "failed";
              p.errorMessage = "Platform rejected upload (rate-limited)";
              pushHistory(p, `Failed on ${p.platforms.join(", ")}`);
            } else if (p.uploadProgress >= 100) {
              p.status = "published";
              p.publishedAt = now;
              p.uploadProgress = 100;
              pushHistory(p, `Published to ${p.platforms.join(", ")}`);
            }
            changed = true;
          }

          // metric growth for published posts
          if (p.status === "published" && p.publishedAt) {
            const ageHours = (now - p.publishedAt) / 3_600_000;
            const decay = 1 / (1 + ageHours * 0.35);
            const platformBoost = p.platforms.length;
            const newViews = Math.round(
              (25 + Math.random() * 90) * decay * platformBoost
            );
            if (newViews > 0) {
              p.metrics = {
                views: p.metrics.views + newViews,
                watchTime:
                  p.metrics.watchTime + Math.round(newViews * (0.6 + Math.random() * 0.9)),
                likes: p.metrics.likes + Math.round(newViews * 0.09),
                comments: p.metrics.comments + Math.round(newViews * 0.012),
                shares: p.metrics.shares + Math.round(newViews * 0.02),
              };
              changed = true;
            }
          }
        }

        if (changed) set({ posts });
      },

      seedIfEmpty: () => {
        if (get().posts.length > 0) return;
        const now = Date.now();
        const mkMetrics = (v: number): PostMetrics => ({
          views: v,
          watchTime: Math.round(v * 0.75),
          likes: Math.round(v * 0.09),
          comments: Math.round(v * 0.012),
          shares: Math.round(v * 0.02),
        });
        set({
          connections: [
            { platform: "youtube", handle: "@hooke.studio", connectedAt: now },
            { platform: "tiktok", handle: "@hooke", connectedAt: now },
            { platform: "instagram", handle: "@hooke.cine", connectedAt: now },
          ],
          posts: [
            {
              id: uid(),
              title: "Neon Alley — Trailer",
              description: "Cinematic sizzle for the Neon Alley series.",
              platforms: ["youtube", "tiktok", "instagram"],
              status: "published",
              publishedAt: now - 86_400_000 * 3,
              uploadProgress: 100,
              thumbnailColor: "#8b5cf6",
              metrics: mkMetrics(18420),
              history: [
                { ts: now - 86_400_000 * 3, message: "Published to youtube, tiktok, instagram" },
              ],
              createdAt: now - 86_400_000 * 3,
            },
            {
              id: uid(),
              title: "Sunrise Session · Ep 1",
              description: "Behind-the-scenes documentary cold open.",
              platforms: ["youtube", "linkedin"],
              status: "published",
              publishedAt: now - 86_400_000 * 1,
              uploadProgress: 100,
              thumbnailColor: "#f59e0b",
              metrics: mkMetrics(6120),
              history: [
                { ts: now - 86_400_000, message: "Published to youtube, linkedin" },
              ],
              createdAt: now - 86_400_000,
            },
            {
              id: uid(),
              title: "Product Reveal — Aurora",
              description: "Launch cut for Aurora reveal.",
              platforms: ["youtube", "instagram", "x"],
              status: "scheduled",
              scheduledAt: now + 3_600_000 * 6,
              uploadProgress: 0,
              thumbnailColor: "#06b6d4",
              metrics: mkMetrics(0),
              history: [
                { ts: now, message: "Scheduled for +6h" },
              ],
              createdAt: now,
            },
            {
              id: uid(),
              title: "Dream Chasers · Teaser",
              description: "Serialized universe teaser drop.",
              platforms: ["tiktok", "instagram"],
              status: "uploading",
              uploadProgress: 42,
              thumbnailColor: "#f43f5e",
              metrics: mkMetrics(0),
              history: [{ ts: now, message: "Upload started" }],
              createdAt: now,
            },
          ],
        });
      },
    }),
    {
      name: "hooke.publish.v1",
      storage: createJSONStorage(() => idbStorage),
      partialize: (s) => ({ connections: s.connections, posts: s.posts }),
    }
  )
);
