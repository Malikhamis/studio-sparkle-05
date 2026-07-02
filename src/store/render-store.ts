import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { idbStorage } from "@/lib/idb-storage";

/**
 * Render Queue — orchestrates multi-job renders across the pipeline
 * (storyboard → shots → audio mix → final cut → export).
 *
 * Jobs are simulated locally with a ticking progress loop so the UI
 * behaves like a real queue: pause/resume/retry/cancel + logs + notifs.
 */

export type RenderStatus =
  | "queued"
  | "running"
  | "paused"
  | "complete"
  | "failed"
  | "cancelled";

export type RenderKind =
  | "shot"
  | "storyboard"
  | "narration"
  | "music"
  | "final-cut"
  | "export";

export type RenderPriority = "low" | "normal" | "high";

export type RenderPreset = {
  resolution: "720p" | "1080p" | "1440p" | "4K";
  fps: 24 | 30 | 60;
  format: "mp4" | "mov" | "webm";
  codec: "h264" | "h265" | "vp9" | "prores";
  bitrate?: string;
};

export type RenderLogEntry = {
  ts: number;
  level: "info" | "warn" | "error";
  message: string;
};

export type RenderJob = {
  id: string;
  label: string;
  kind: RenderKind;
  projectId?: string;
  sceneId?: string;
  status: RenderStatus;
  progress: number; // 0-100
  priority: RenderPriority;
  preset: RenderPreset;
  eta?: number; // seconds remaining
  startedAt?: number;
  completedAt?: number;
  createdAt: number;
  updatedAt: number;
  retries: number;
  outputUrl?: string;
  logs: RenderLogEntry[];
  errorMessage?: string;
};

export type RenderNotification = {
  id: string;
  jobId: string;
  kind: "complete" | "failed" | "started";
  message: string;
  ts: number;
  read: boolean;
};

export type RenderSettings = {
  maxConcurrent: number;
  autoRetry: boolean;
  notifyOnComplete: boolean;
  defaultPreset: RenderPreset;
};

type RenderState = {
  jobs: RenderJob[];
  notifications: RenderNotification[];
  settings: RenderSettings;
  tickRunning: boolean;

  enqueue: (
    input: Omit<
      RenderJob,
      | "id"
      | "status"
      | "progress"
      | "createdAt"
      | "updatedAt"
      | "retries"
      | "logs"
    > & { priority?: RenderPriority }
  ) => string;
  pause: (id: string) => void;
  resume: (id: string) => void;
  retry: (id: string) => void;
  cancel: (id: string) => void;
  remove: (id: string) => void;
  clearCompleted: () => void;
  setPriority: (id: string, priority: RenderPriority) => void;
  updateSettings: (patch: Partial<RenderSettings>) => void;
  markNotificationRead: (id: string) => void;
  clearNotifications: () => void;
  tick: () => void;
  seedIfEmpty: () => void;
};

const uid = () =>
  `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;

const DEFAULT_PRESET: RenderPreset = {
  resolution: "1080p",
  fps: 30,
  format: "mp4",
  codec: "h264",
  bitrate: "12M",
};

function log(job: RenderJob, level: RenderLogEntry["level"], message: string) {
  job.logs.push({ ts: Date.now(), level, message });
  if (job.logs.length > 200) job.logs.splice(0, job.logs.length - 200);
}

function priorityWeight(p: RenderPriority) {
  return p === "high" ? 3 : p === "normal" ? 2 : 1;
}

export const useRenderStore = create<RenderState>()(
  persist(
    (set, get) => ({
      jobs: [],
      notifications: [],
      tickRunning: false,
      settings: {
        maxConcurrent: 2,
        autoRetry: true,
        notifyOnComplete: true,
        defaultPreset: DEFAULT_PRESET,
      },

      enqueue: (input) => {
        const id = uid();
        const now = Date.now();
        const job: RenderJob = {
          id,
          label: input.label,
          kind: input.kind,
          projectId: input.projectId,
          sceneId: input.sceneId,
          status: "queued",
          progress: 0,
          priority: input.priority ?? "normal",
          preset: input.preset ?? get().settings.defaultPreset,
          createdAt: now,
          updatedAt: now,
          retries: 0,
          logs: [
            { ts: now, level: "info", message: `Queued ${input.kind} render` },
          ],
        };
        set((s) => ({ jobs: [job, ...s.jobs] }));
        return id;
      },

      pause: (id) =>
        set((s) => ({
          jobs: s.jobs.map((j) => {
            if (j.id !== id) return j;
            if (j.status !== "running" && j.status !== "queued") return j;
            const nj = { ...j, status: "paused" as const, updatedAt: Date.now() };
            log(nj, "info", "Paused by user");
            return nj;
          }),
        })),

      resume: (id) =>
        set((s) => ({
          jobs: s.jobs.map((j) => {
            if (j.id !== id) return j;
            if (j.status !== "paused") return j;
            const nj = { ...j, status: "queued" as const, updatedAt: Date.now() };
            log(nj, "info", "Resumed");
            return nj;
          }),
        })),

      retry: (id) =>
        set((s) => ({
          jobs: s.jobs.map((j) => {
            if (j.id !== id) return j;
            const nj: RenderJob = {
              ...j,
              status: "queued",
              progress: 0,
              retries: j.retries + 1,
              errorMessage: undefined,
              startedAt: undefined,
              completedAt: undefined,
              updatedAt: Date.now(),
            };
            log(nj, "info", `Retry #${nj.retries}`);
            return nj;
          }),
        })),

      cancel: (id) =>
        set((s) => ({
          jobs: s.jobs.map((j) => {
            if (j.id !== id) return j;
            if (j.status === "complete") return j;
            const nj = {
              ...j,
              status: "cancelled" as const,
              updatedAt: Date.now(),
            };
            log(nj, "warn", "Cancelled by user");
            return nj;
          }),
        })),

      remove: (id) =>
        set((s) => ({ jobs: s.jobs.filter((j) => j.id !== id) })),

      clearCompleted: () =>
        set((s) => ({
          jobs: s.jobs.filter(
            (j) => j.status !== "complete" && j.status !== "cancelled"
          ),
        })),

      setPriority: (id, priority) =>
        set((s) => ({
          jobs: s.jobs.map((j) =>
            j.id === id ? { ...j, priority, updatedAt: Date.now() } : j
          ),
        })),

      updateSettings: (patch) =>
        set((s) => ({ settings: { ...s.settings, ...patch } })),

      markNotificationRead: (id) =>
        set((s) => ({
          notifications: s.notifications.map((n) =>
            n.id === id ? { ...n, read: true } : n
          ),
        })),

      clearNotifications: () => set({ notifications: [] }),

      tick: () => {
        const state = get();
        const { maxConcurrent, autoRetry, notifyOnComplete } = state.settings;

        const jobs = state.jobs.map((j) => ({ ...j, logs: [...j.logs] }));
        const notifications = [...state.notifications];
        let changed = false;

        // Promote queued -> running (respect concurrency, priority)
        const running = jobs.filter((j) => j.status === "running");
        const slots = Math.max(0, maxConcurrent - running.length);
        if (slots > 0) {
          const queued = jobs
            .filter((j) => j.status === "queued")
            .sort(
              (a, b) =>
                priorityWeight(b.priority) - priorityWeight(a.priority) ||
                a.createdAt - b.createdAt
            )
            .slice(0, slots);
          for (const q of queued) {
            q.status = "running";
            q.startedAt = q.startedAt ?? Date.now();
            q.updatedAt = Date.now();
            log(q, "info", `Started render at ${q.preset.resolution}@${q.preset.fps}`);
            notifications.unshift({
              id: uid(),
              jobId: q.id,
              kind: "started",
              message: `${q.label} started`,
              ts: Date.now(),
              read: false,
            });
            changed = true;
          }
        }

        // Advance running jobs
        for (const j of jobs) {
          if (j.status !== "running") continue;
          const step =
            (j.kind === "final-cut" || j.kind === "export" ? 3 : 6) +
            Math.random() * 4;
          j.progress = Math.min(100, j.progress + step);
          j.updatedAt = Date.now();
          j.eta = Math.max(0, Math.round(((100 - j.progress) / step) * 1.2));

          // small chance of failure
          if (j.progress < 100 && Math.random() < 0.008) {
            j.status = "failed";
            j.errorMessage = "Renderer dropped a frame batch";
            log(j, "error", j.errorMessage);
            notifications.unshift({
              id: uid(),
              jobId: j.id,
              kind: "failed",
              message: `${j.label} failed`,
              ts: Date.now(),
              read: false,
            });
            if (autoRetry && j.retries < 2) {
              j.status = "queued";
              j.retries += 1;
              j.progress = 0;
              j.errorMessage = undefined;
              log(j, "info", `Auto-retry #${j.retries}`);
            }
            changed = true;
            continue;
          }

          if (j.progress >= 100) {
            j.status = "complete";
            j.progress = 100;
            j.completedAt = Date.now();
            j.outputUrl = `local://renders/${j.id}.${j.preset.format}`;
            log(j, "info", "Render complete");
            if (notifyOnComplete) {
              notifications.unshift({
                id: uid(),
                jobId: j.id,
                kind: "complete",
                message: `${j.label} finished`,
                ts: Date.now(),
                read: false,
              });
            }
          }
          changed = true;
        }

        if (changed) {
          set({
            jobs,
            notifications: notifications.slice(0, 50),
          });
        }
      },

      seedIfEmpty: () => {
        if (get().jobs.length > 0) return;
        const preset = get().settings.defaultPreset;
        const now = Date.now();
        const mk = (
          label: string,
          kind: RenderKind,
          status: RenderStatus,
          progress: number,
          priority: RenderPriority = "normal"
        ): RenderJob => ({
          id: uid(),
          label,
          kind,
          status,
          progress,
          priority,
          preset,
          createdAt: now - Math.floor(Math.random() * 100000),
          updatedAt: now,
          retries: 0,
          logs: [{ ts: now, level: "info", message: "Seeded" }],
          startedAt: status === "running" ? now - 20_000 : undefined,
          completedAt: status === "complete" ? now - 5_000 : undefined,
          outputUrl:
            status === "complete"
              ? `local://renders/seed-${kind}.${preset.format}`
              : undefined,
        });
        set({
          jobs: [
            mk("Neon Alley — Shot 04", "shot", "running", 62, "high"),
            mk("Voice · Ep. 1 Cold Open", "narration", "running", 28),
            mk("Storyboard v3 · Act II", "storyboard", "queued", 0),
            mk("Final Cut · Sizzle 30s", "final-cut", "queued", 0, "high"),
            mk("Export · 1080p H.264", "export", "paused", 44, "low"),
            mk("Music bed · Sunrise", "music", "complete", 100),
          ],
        });
      },
    }),
    {
      name: "hooke.render.v1",
      storage: createJSONStorage(() => idbStorage),
      partialize: (s) => ({
        jobs: s.jobs,
        notifications: s.notifications,
        settings: s.settings,
      }),
    }
  )
);
