import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { idbStorage } from "@/lib/idb-storage";

/**
 * Analytics Store — production metrics, render statistics, and publishing history.
 * Aggregates data from render queue and publish stores.
 * Tracks views, engagement, watch time (simulated for local data).
 */

export type AnalyticsMetric = {
  timestamp: number;
  label: string;
  value: number;
};

export type PublishingMetric = {
  publishId: string;
  projectId: string;
  title: string;
  platform: string;
  publishedAt: number;
  views: number;
  likes: number;
  shares: number;
  comments: number;
  watchTime: number; // in seconds
  engagement: number; // percentage
};

export type RenderMetric = {
  jobId: string;
  projectId: string;
  duration: number; // in seconds
  timestamp: number;
  status: "success" | "failed";
  stages: {
    id: string;
    duration: number;
  }[];
};

export type ProductionSummary = {
  totalProjects: number;
  totalRenders: number;
  successfulRenders: number;
  failedRenders: number;
  averageRenderTime: number; // in seconds
  totalPublished: number;
  totalViews: number;
  totalEngagement: number; // sum of all engagements
  lastRenderTime?: number;
  lastPublishTime?: number;
};

type State = {
  publishingMetrics: PublishingMetric[];
  renderMetrics: RenderMetric[];
  hydrated: boolean;

  // Metrics recording
  recordPublishMetric: (metric: PublishingMetric) => void;
  recordRenderMetric: (metric: RenderMetric) => void;

  // Analytics queries
  getProductionSummary: () => ProductionSummary;
  getPublishingMetricsForPeriod: (
    startTime: number,
    endTime: number
  ) => PublishingMetric[];
  getRenderMetricsForPeriod: (
    startTime: number,
    endTime: number
  ) => RenderMetric[];
  getViewsTrend: (days: number) => AnalyticsMetric[];
  getEngagementTrend: (days: number) => AnalyticsMetric[];
  getRenderSuccessRate: () => number;
  getAverageRenderDuration: () => number;
  getTopPerformingPublish: () => PublishingMetric | null;
  getTopPlatforms: () => { platform: string; views: number }[];
};

const seed = (): {
  publishingMetrics: PublishingMetric[];
  renderMetrics: RenderMetric[];
} => {
  const now = Date.now();
  const dayAgo = now - 86400000;
  const weekAgo = now - 604800000;

  return {
    publishingMetrics: [
      {
        publishId: "pub-1",
        projectId: "project-signal",
        title: "The Signal — Pilot (LinkedIn Clip)",
        platform: "linkedin",
        publishedAt: dayAgo,
        views: 1243,
        likes: 87,
        shares: 12,
        comments: 34,
        watchTime: 45000, // 12.5 hours total
        engagement: 9.8,
      },
      {
        publishId: "pub-2",
        projectId: "project-signal",
        title: "The Signal — Pilot (YouTube Teaser)",
        platform: "youtube",
        publishedAt: weekAgo,
        views: 5847,
        likes: 324,
        shares: 89,
        comments: 156,
        watchTime: 175200, // 48.7 hours total
        engagement: 8.2,
      },
    ],
    renderMetrics: [
      {
        jobId: "rq-1",
        projectId: "project-signal",
        duration: 1247, // ~20 min
        timestamp: dayAgo,
        status: "success",
        stages: [
          { id: "blueprint", duration: 12 },
          { id: "capture", duration: 180 },
          { id: "diffusion", duration: 720 },
          { id: "audio", duration: 240 },
          { id: "edit", duration: 95 },
          { id: "publish", duration: 0 },
        ],
      },
      {
        jobId: "rq-2",
        projectId: "project-signal",
        duration: 1523, // ~25 min
        timestamp: now - 3600000,
        status: "success",
        stages: [
          { id: "blueprint", duration: 10 },
          { id: "capture", duration: 200 },
          { id: "diffusion", duration: 850 },
          { id: "audio", duration: 310 },
          { id: "edit", duration: 153 },
          { id: "publish", duration: 0 },
        ],
      },
      {
        jobId: "rq-3",
        projectId: "project-signal",
        duration: 0,
        timestamp: now - 7200000,
        status: "failed",
        stages: [
          { id: "blueprint", duration: 15 },
          { id: "capture", duration: 0 },
          { id: "diffusion", duration: 0 },
          { id: "audio", duration: 0 },
          { id: "edit", duration: 0 },
          { id: "publish", duration: 0 },
        ],
      },
    ],
  };
};

export const useAnalyticsStore = create<State>()(
  persist(
    (set, get) => ({
      publishingMetrics: [],
      renderMetrics: [],
      hydrated: false,

      recordPublishMetric: (metric) => {
        set((state) => ({
          publishingMetrics: [metric, ...state.publishingMetrics],
        }));
      },

      recordRenderMetric: (metric) => {
        set((state) => ({
          renderMetrics: [metric, ...state.renderMetrics],
        }));
      },

      getProductionSummary: () => {
        const state = get();
        const renders = state.renderMetrics;
        const publishes = state.publishingMetrics;

        const successfulRenders = renders.filter((r) => r.status === "success").length;
        const failedRenders = renders.filter((r) => r.status === "failed").length;
        const avgRenderTime =
          renders.length > 0
            ? renders.reduce((sum, r) => sum + r.duration, 0) / renders.length
            : 0;

        const totalViews = publishes.reduce((sum, p) => sum + p.views, 0);
        const totalEngagement = publishes.reduce(
          (sum, p) => sum + (p.likes + p.shares + p.comments),
          0
        );

        // Extract unique projects from both sources
        const uniqueProjects = new Set<string>();
        renders.forEach((r) => uniqueProjects.add(r.projectId));
        publishes.forEach((p) => uniqueProjects.add(p.projectId));

        return {
          totalProjects: uniqueProjects.size,
          totalRenders: renders.length,
          successfulRenders,
          failedRenders,
          averageRenderTime: Math.round(avgRenderTime),
          totalPublished: publishes.length,
          totalViews,
          totalEngagement,
          lastRenderTime: renders[0]?.timestamp,
          lastPublishTime: publishes[0]?.publishedAt,
        };
      },

      getPublishingMetricsForPeriod: (startTime, endTime) => {
        return get().publishingMetrics.filter(
          (m) => m.publishedAt >= startTime && m.publishedAt <= endTime
        );
      },

      getRenderMetricsForPeriod: (startTime, endTime) => {
        return get().renderMetrics.filter(
          (m) => m.timestamp >= startTime && m.timestamp <= endTime
        );
      },

      getViewsTrend: (days) => {
        const now = Date.now();
        const startTime = now - days * 86400000;
        const metrics = get().getPublishingMetricsForPeriod(startTime, now);

        const dailyViews: Record<string, number> = {};

        metrics.forEach((m) => {
          const date = new Date(m.publishedAt).toLocaleDateString();
          dailyViews[date] = (dailyViews[date] || 0) + m.views;
        });

        return Object.entries(dailyViews).map(([label, value]) => ({
          timestamp: new Date(label).getTime(),
          label,
          value,
        }));
      },

      getEngagementTrend: (days) => {
        const now = Date.now();
        const startTime = now - days * 86400000;
        const metrics = get().getPublishingMetricsForPeriod(startTime, now);

        const dailyEngagement: Record<string, number> = {};

        metrics.forEach((m) => {
          const date = new Date(m.publishedAt).toLocaleDateString();
          const engagement = m.likes + m.shares + m.comments;
          dailyEngagement[date] = (dailyEngagement[date] || 0) + engagement;
        });

        return Object.entries(dailyEngagement).map(([label, value]) => ({
          timestamp: new Date(label).getTime(),
          label,
          value,
        }));
      },

      getRenderSuccessRate: () => {
        const state = get();
        if (state.renderMetrics.length === 0) return 0;
        const successful = state.renderMetrics.filter((r) => r.status === "success").length;
        return Math.round((successful / state.renderMetrics.length) * 100);
      },

      getAverageRenderDuration: () => {
        const state = get();
        if (state.renderMetrics.length === 0) return 0;
        const successful = state.renderMetrics.filter((r) => r.status === "success");
        if (successful.length === 0) return 0;
        return Math.round(
          successful.reduce((sum, r) => sum + r.duration, 0) / successful.length
        );
      },

      getTopPerformingPublish: () => {
        const state = get();
        if (state.publishingMetrics.length === 0) return null;
        return state.publishingMetrics.reduce((top, current) =>
          current.views > top.views ? current : top
        );
      },

      getTopPlatforms: () => {
        const state = get();
        const platformViews: Record<string, number> = {};

        state.publishingMetrics.forEach((m) => {
          platformViews[m.platform] = (platformViews[m.platform] || 0) + m.views;
        });

        return Object.entries(platformViews)
          .map(([platform, views]) => ({ platform, views }))
          .sort((a, b) => b.views - a.views);
      },
    }),
    {
      name: "hooke:analytics",
      storage: createJSONStorage(() => idbStorage),
      partialize: (s) => ({
        publishingMetrics: s.publishingMetrics,
        renderMetrics: s.renderMetrics,
      }),
      onRehydrateStorage: () => (state) => {
        if (!state) return;
        state.hydrated = true;
        if (state.publishingMetrics.length === 0 && state.renderMetrics.length === 0) {
          const seeded = seed();
          state.publishingMetrics = seeded.publishingMetrics;
          state.renderMetrics = seeded.renderMetrics;
        }
      },
    }
  )
);
