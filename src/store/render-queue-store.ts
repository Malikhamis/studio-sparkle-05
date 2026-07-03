import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { idbStorage } from "@/lib/idb-storage";

/**
 * Render Queue — job-based production pipeline management.
 * Tracks queued, running, paused, failed, and complete render jobs.
 * Each job can be resumed, paused, retried, or inspected for logs.
 * Persists to IndexedDB.
 */

export type RenderJobStatus = "queued" | "running" | "paused" | "failed" | "complete";

export type RenderStageId = "blueprint" | "capture" | "diffusion" | "audio" | "edit" | "publish";

export type RenderStage = {
  id: RenderStageId;
  status: "pending" | "running" | "complete" | "failed" | "skipped";
  progress: number; // 0-100
  startTime?: number;
  endTime?: number;
  errorMessage?: string;
};

export type RenderJobLog = {
  timestamp: number;
  level: "info" | "warn" | "error" | "success";
  message: string;
  stage?: RenderStageId;
};

export type RenderJob = {
  id: string;
  projectId: string;
  title: string;
  status: RenderJobStatus;
  /** Overall progress 0-100 across all stages */
  overallProgress: number;
  stages: RenderStage[];
  logs: RenderJobLog[];
  createdAt: number;
  updatedAt: number;
  startTime?: number;
  completedAt?: number;
  errorMessage?: string;
  /** Auto-retry count for failed jobs */
  retryCount: number;
  maxRetries: number;
};

type State = {
  jobs: RenderJob[];
  activeJobId: string | null;
  hydrated: boolean;

  // Multi-select and batch operations
  selectedJobIds: Set<string>;

  createJob: (input: {
    projectId: string;
    title: string;
    maxRetries?: number;
  }) => RenderJob;
  deleteJob: (id: string) => void;
  setActive: (id: string | null) => void;

  updateJobStatus: (id: string, status: RenderJobStatus) => void;
  updateStageProgress: (
    jobId: string,
    stageId: RenderStageId,
    progress: number
  ) => void;
  completeStage: (jobId: string, stageId: RenderStageId) => void;
  failStage: (
    jobId: string,
    stageId: RenderStageId,
    errorMessage: string
  ) => void;

  addLog: (
    jobId: string,
    message: string,
    level: "info" | "warn" | "error" | "success",
    stage?: RenderStageId
  ) => void;

  pauseJob: (id: string) => void;
  resumeJob: (id: string) => void;
  retryJob: (id: string) => void;
  cancelJob: (id: string) => void;

  // Multi-select operations
  toggleSelect: (jobId: string) => void;
  selectAll: () => void;
  clearSelection: () => void;
  pauseSelected: () => void;
  resumeSelected: () => void;
  deleteSelected: () => void;
};

const uid = () =>
  globalThis.crypto?.randomUUID?.() ??
  `rq_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;

const defaultStages = (): RenderStage[] => [
  {
    id: "blueprint",
    status: "pending",
    progress: 0,
  },
  {
    id: "capture",
    status: "pending",
    progress: 0,
  },
  {
    id: "diffusion",
    status: "pending",
    progress: 0,
  },
  {
    id: "audio",
    status: "pending",
    progress: 0,
  },
  {
    id: "edit",
    status: "pending",
    progress: 0,
  },
  {
    id: "publish",
    status: "pending",
    progress: 0,
  },
];

const computeOverallProgress = (stages: RenderStage[]): number => {
  if (stages.length === 0) return 0;
  const completed = stages.filter((s) => s.status === "complete").length;
  const inProgress = stages
    .filter((s) => s.status === "running")
    .reduce((sum, s) => sum + s.progress, 0);
  return Math.round(
    (completed * 100 + inProgress) / stages.length / 100
  );
};

const seed = (): RenderJob[] => {
  const now = Date.now();
  return [
    {
      id: uid(),
      projectId: "project-signal",
      title: "The Signal — Pilot Render",
      status: "running",
      overallProgress: 38,
      stages: [
        {
          id: "blueprint",
          status: "complete",
          progress: 100,
          startTime: now - 600000,
          endTime: now - 540000,
        },
        {
          id: "capture",
          status: "complete",
          progress: 100,
          startTime: now - 540000,
          endTime: now - 360000,
        },
        {
          id: "diffusion",
          status: "running",
          progress: 38,
          startTime: now - 360000,
        },
        {
          id: "audio",
          status: "pending",
          progress: 0,
        },
        {
          id: "edit",
          status: "pending",
          progress: 0,
        },
        {
          id: "publish",
          status: "pending",
          progress: 0,
        },
      ],
      logs: [
        {
          timestamp: now - 600000,
          level: "info",
          message: "Blueprint stage started",
          stage: "blueprint",
        },
        {
          timestamp: now - 540000,
          level: "success",
          message: "Blueprint stage complete (8 scenes)",
          stage: "blueprint",
        },
        {
          timestamp: now - 540000,
          level: "info",
          message: "Capture stage started",
          stage: "capture",
        },
        {
          timestamp: now - 360000,
          level: "success",
          message: "Capture stage complete (24 assets)",
          stage: "capture",
        },
        {
          timestamp: now - 360000,
          level: "info",
          message: "Diffusion stage started",
          stage: "diffusion",
        },
        {
          timestamp: now - 300000,
          level: "info",
          message: "Scene 01 generated",
          stage: "diffusion",
        },
        {
          timestamp: now - 240000,
          level: "info",
          message: "Scene 02 generated",
          stage: "diffusion",
        },
        {
          timestamp: now - 180000,
          level: "info",
          message: "Scene 03 processing (38%)",
          stage: "diffusion",
        },
      ],
      createdAt: now - 600000,
      updatedAt: now,
      startTime: now - 600000,
      retryCount: 0,
      maxRetries: 3,
    },
    {
      id: uid(),
      projectId: "project-signal",
      title: "The Signal — Episode 02",
      status: "queued",
      overallProgress: 0,
      stages: defaultStages(),
      logs: [
        {
          timestamp: now,
          level: "info",
          message: "Job queued for processing",
        },
      ],
      createdAt: now,
      updatedAt: now,
      retryCount: 0,
      maxRetries: 3,
    },
  ];
};

export const useRenderQueueStore = create<State>()(
  persist(
    (set, get) => ({
      jobs: [],
      activeJobId: null,
      hydrated: false,
      selectedJobIds: new Set(),

      createJob: ({ projectId, title, maxRetries = 3 }) => {
        const now = Date.now();
        const job: RenderJob = {
          id: uid(),
          projectId,
          title: title.trim() || "Untitled Render",
          status: "queued",
          overallProgress: 0,
          stages: defaultStages(),
          logs: [
            {
              timestamp: now,
              level: "info",
              message: "Job queued for processing",
            },
          ],
          createdAt: now,
          updatedAt: now,
          retryCount: 0,
          maxRetries,
        };
        set({ jobs: [job, ...get().jobs], activeJobId: job.id });
        return job;
      },

      deleteJob: (id) => {
        const remaining = get().jobs.filter((j) => j.id !== id);
        const newSelected = new Set(get().selectedJobIds);
        newSelected.delete(id);
        set({
          jobs: remaining,
          activeJobId: get().activeJobId === id ? remaining[0]?.id ?? null : get().activeJobId,
          selectedJobIds: newSelected,
        });
      },

      setActive: (id) => set({ activeJobId: id }),

      updateJobStatus: (id, status) => {
        const now = Date.now();
        set({
          jobs: get().jobs.map((j) =>
            j.id === id
              ? {
                  ...j,
                  status,
                  startTime: status === "running" ? (j.startTime ?? now) : j.startTime,
                  completedAt: status === "complete" ? now : j.completedAt,
                  updatedAt: now,
                }
              : j
          ),
        });
      },

      updateStageProgress: (jobId, stageId, progress) => {
        const now = Date.now();
        set({
          jobs: get().jobs.map((j) =>
            j.id === jobId
              ? {
                  ...j,
                  stages: j.stages.map((s) =>
                    s.id === stageId
                      ? { ...s, progress: Math.max(0, Math.min(100, progress)), status: progress > 0 && s.status === "pending" ? "running" : s.status }
                      : s
                  ),
                  overallProgress: computeOverallProgress(
                    j.stages.map((s) =>
                      s.id === stageId
                        ? { ...s, progress: Math.max(0, Math.min(100, progress)), status: progress > 0 && s.status === "pending" ? "running" : s.status }
                        : s
                    )
                  ),
                  updatedAt: now,
                }
              : j
          ),
        });
      },

      completeStage: (jobId, stageId) => {
        const now = Date.now();
        set({
          jobs: get().jobs.map((j) =>
            j.id === jobId
              ? {
                  ...j,
                  stages: j.stages.map((s) =>
                    s.id === stageId
                      ? {
                          ...s,
                          status: "complete",
                          progress: 100,
                          endTime: now,
                        }
                      : s
                  ),
                  overallProgress: computeOverallProgress(
                    j.stages.map((s) =>
                      s.id === stageId
                        ? {
                            ...s,
                            status: "complete",
                            progress: 100,
                            endTime: now,
                          }
                        : s
                    )
                  ),
                  updatedAt: now,
                }
              : j
          ),
        });
        get().addLog(jobId, `${stageId} stage complete`, "success", stageId);
      },

      failStage: (jobId, stageId, errorMessage) => {
        const now = Date.now();
        set({
          jobs: get().jobs.map((j) =>
            j.id === jobId
              ? {
                  ...j,
                  stages: j.stages.map((s) =>
                    s.id === stageId
                      ? {
                          ...s,
                          status: "failed",
                          errorMessage,
                          endTime: now,
                        }
                      : s
                  ),
                  updatedAt: now,
                }
              : j
          ),
        });
        get().addLog(jobId, errorMessage, "error", stageId);
      },

      addLog: (jobId, message, level, stage) => {
        const now = Date.now();
        set({
          jobs: get().jobs.map((j) =>
            j.id === jobId
              ? {
                  ...j,
                  logs: [
                    ...j.logs,
                    {
                      timestamp: now,
                      level,
                      message,
                      stage,
                    },
                  ],
                  updatedAt: now,
                }
              : j
          ),
        });
      },

      pauseJob: (id) => {
        get().updateJobStatus(id, "paused");
        get().addLog(id, "Job paused by user", "info");
      },

      resumeJob: (id) => {
        get().updateJobStatus(id, "running");
        get().addLog(id, "Job resumed by user", "info");
      },

      retryJob: (id) => {
        const job = get().jobs.find((j) => j.id === id);
        if (!job || job.retryCount >= job.maxRetries) return;

        const now = Date.now();
        set({
          jobs: get().jobs.map((j) =>
            j.id === id
              ? {
                  ...j,
                  status: "queued",
                  retryCount: j.retryCount + 1,
                  stages: defaultStages(),
                  logs: [
                    ...j.logs,
                    {
                      timestamp: now,
                      level: "info",
                      message: `Retry ${job.retryCount + 1}/${job.maxRetries}`,
                    },
                  ],
                  updatedAt: now,
                }
              : j
          ),
        });
      },

      cancelJob: (id) => {
        get().updateJobStatus(id, "failed");
        get().addLog(id, "Job cancelled by user", "info");
      },

      toggleSelect: (jobId) => {
        const newSelected = new Set(get().selectedJobIds);
        if (newSelected.has(jobId)) {
          newSelected.delete(jobId);
        } else {
          newSelected.add(jobId);
        }
        set({ selectedJobIds: newSelected });
      },

      selectAll: () => {
        const allIds = new Set(get().jobs.map((j) => j.id));
        set({ selectedJobIds: allIds });
      },

      clearSelection: () => {
        set({ selectedJobIds: new Set() });
      },

      pauseSelected: () => {
        const selected = get().selectedJobIds;
        selected.forEach((id) => get().pauseJob(id));
      },

      resumeSelected: () => {
        const selected = get().selectedJobIds;
        selected.forEach((id) => get().resumeJob(id));
      },

      deleteSelected: () => {
        const selected = get().selectedJobIds;
        selected.forEach((id) => get().deleteJob(id));
        set({ selectedJobIds: new Set() });
      },
    }),
    {
      name: "hooke:render-queue",
      storage: createJSONStorage(() => idbStorage),
      partialize: (s) => ({
        jobs: s.jobs,
        activeJobId: s.activeJobId,
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
