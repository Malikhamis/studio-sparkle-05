import { createFileRoute } from "@tanstack/react-router";
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import {
  TrendingUp,
  Eye,
  Heart,
  Share2,
  MessageSquare,
  Zap,
  Clock,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";
import { useAnalyticsStore } from "@/store/analytics-store";
import { useMemo } from "react";

export const Route = createFileRoute("/analytics")({
  head: () => ({
    meta: [
      { title: "Analytics — Hooke" },
      {
        name: "description",
        content: "Production metrics, render statistics, and publishing performance.",
      },
      { property: "og:title", content: "Analytics — Hooke" },
      {
        property: "og:description",
        content: "Track your production performance across all platforms.",
      },
    ],
  }),
  component: AnalyticsPage,
});

const COLORS = {
  iris: "#6C63FF",
  mint: "#00D9FF",
  gold: "#FFB84D",
  ember: "#FF6B6B",
  rose: "#FF69B4",
};

function AnalyticsPage() {
  const {
    getProductionSummary,
    getViewsTrend,
    getEngagementTrend,
    getRenderSuccessRate,
    getAverageRenderDuration,
    getTopPerformingPublish,
    getTopPlatforms,
  } = useAnalyticsStore();

  const summary = useMemo(() => getProductionSummary(), []);
  const viewsTrend = useMemo(() => getViewsTrend(30), []);
  const engagementTrend = useMemo(() => getEngagementTrend(30), []);
  const renderSuccessRate = useMemo(() => getRenderSuccessRate(), []);
  const avgRenderDuration = useMemo(() => getAverageRenderDuration(), []);
  const topPublish = useMemo(() => getTopPerformingPublish(), []);
  const topPlatforms = useMemo(() => getTopPlatforms(), []);

  return (
    <div className="mx-auto flex w-full max-w-[1480px] flex-col gap-5">
      {/* Header */}
      <header className="flex items-center gap-3">
        <div
          className="flex h-10 w-10 items-center justify-center rounded-xl"
          style={{ background: "var(--gradient-iris)" }}
        >
          <TrendingUp className="h-5 w-5 text-white" />
        </div>
        <div>
          <h1 className="hk-text-display text-[20px] font-bold text-text-primary">
            Analytics Dashboard
          </h1>
          <p className="text-[12px] text-text-secondary">
            Production metrics, render performance, and publishing insights.
          </p>
        </div>
      </header>

      {/* Summary cards */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <MetricCard
          label="Total Views"
          value={summary.totalViews}
          icon={Eye}
          color="iris"
          trend={viewsTrend.length > 0 ? 12 : 0}
        />
        <MetricCard
          label="Total Engagement"
          value={summary.totalEngagement}
          icon={Zap}
          color="gold"
          trend={8}
        />
        <MetricCard
          label="Render Success Rate"
          value={`${renderSuccessRate}%`}
          icon={CheckCircle2}
          color="mint"
          trend={5}
        />
        <MetricCard
          label="Avg Render Time"
          value={`${Math.floor(avgRenderDuration / 60)}m`}
          icon={Clock}
          color="ember"
          trend={-3}
        />
      </div>

      {/* Primary charts */}
      <div className="grid gap-3 lg:grid-cols-2">
        {/* Views trend */}
        <div className="hk-card p-4">
          <h2 className="mb-4 text-[13px] font-semibold text-text-primary">
            Views Trend (30 days)
          </h2>
          {viewsTrend.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={viewsTrend}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                <XAxis
                  dataKey="label"
                  stroke="rgba(255,255,255,0.4)"
                  tick={{ fontSize: 11 }}
                />
                <YAxis stroke="rgba(255,255,255,0.4)" tick={{ fontSize: 11 }} />
                <Tooltip
                  contentStyle={{
                    background: "rgba(0,0,0,0.8)",
                    border: "1px solid rgba(255,255,255,0.2)",
                    borderRadius: "8px",
                  }}
                  labelStyle={{ color: "#fff" }}
                />
                <Line
                  type="monotone"
                  dataKey="value"
                  stroke={COLORS.iris}
                  strokeWidth={2}
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex h-[300px] items-center justify-center rounded bg-white/[0.02]">
              <p className="text-[12px] text-text-secondary">No data yet</p>
            </div>
          )}
        </div>

        {/* Engagement trend */}
        <div className="hk-card p-4">
          <h2 className="mb-4 text-[13px] font-semibold text-text-primary">
            Engagement Trend (30 days)
          </h2>
          {engagementTrend.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={engagementTrend}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                <XAxis
                  dataKey="label"
                  stroke="rgba(255,255,255,0.4)"
                  tick={{ fontSize: 11 }}
                />
                <YAxis stroke="rgba(255,255,255,0.4)" tick={{ fontSize: 11 }} />
                <Tooltip
                  contentStyle={{
                    background: "rgba(0,0,0,0.8)",
                    border: "1px solid rgba(255,255,255,0.2)",
                    borderRadius: "8px",
                  }}
                  labelStyle={{ color: "#fff" }}
                />
                <Line
                  type="monotone"
                  dataKey="value"
                  stroke={COLORS.gold}
                  strokeWidth={2}
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex h-[300px] items-center justify-center rounded bg-white/[0.02]">
              <p className="text-[12px] text-text-secondary">No data yet</p>
            </div>
          )}
        </div>
      </div>

      {/* Secondary charts */}
      <div className="grid gap-3 lg:grid-cols-2">
        {/* Top platforms */}
        <div className="hk-card p-4">
          <h2 className="mb-4 text-[13px] font-semibold text-text-primary">
            Top Platforms by Views
          </h2>
          {topPlatforms.length > 0 ? (
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={topPlatforms}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                <XAxis dataKey="platform" stroke="rgba(255,255,255,0.4)" tick={{ fontSize: 11 }} />
                <YAxis stroke="rgba(255,255,255,0.4)" tick={{ fontSize: 11 }} />
                <Tooltip
                  contentStyle={{
                    background: "rgba(0,0,0,0.8)",
                    border: "1px solid rgba(255,255,255,0.2)",
                    borderRadius: "8px",
                  }}
                  labelStyle={{ color: "#fff" }}
                />
                <Bar dataKey="views" fill={COLORS.iris} radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex h-[250px] items-center justify-center rounded bg-white/[0.02]">
              <p className="text-[12px] text-text-secondary">No data yet</p>
            </div>
          )}
        </div>

        {/* Render metrics */}
        <div className="hk-card p-4">
          <h2 className="mb-4 text-[13px] font-semibold text-text-primary">
            Production Summary
          </h2>
          <div className="space-y-3">
            <div className="flex items-center justify-between rounded bg-white/[0.02] p-3">
              <span className="text-[12px] text-text-secondary">Total Renders</span>
              <span className="text-[14px] font-semibold text-text-primary">
                {summary.totalRenders}
              </span>
            </div>
            <div className="flex items-center justify-between rounded bg-white/[0.02] p-3">
              <span className="text-[12px] text-text-secondary">Successful</span>
              <span className="text-[14px] font-semibold text-mint">
                {summary.successfulRenders}
              </span>
            </div>
            <div className="flex items-center justify-between rounded bg-white/[0.02] p-3">
              <span className="text-[12px] text-text-secondary">Failed</span>
              <span className="text-[14px] font-semibold text-[#FF5370]">
                {summary.failedRenders}
              </span>
            </div>
            <div className="flex items-center justify-between rounded bg-white/[0.02] p-3">
              <span className="text-[12px] text-text-secondary">Total Published</span>
              <span className="text-[14px] font-semibold text-iris">
                {summary.totalPublished}
              </span>
            </div>
            <div className="flex items-center justify-between rounded bg-white/[0.02] p-3">
              <span className="text-[12px] text-text-secondary">Projects</span>
              <span className="text-[14px] font-semibold text-gold">
                {summary.totalProjects}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Top performing publish */}
      {topPublish && (
        <div className="hk-card p-4">
          <h2 className="mb-3 text-[13px] font-semibold text-text-primary">
            Top Performing Publish
          </h2>
          <div className="rounded border border-white/[0.06] bg-white/[0.02] p-3">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1 min-w-0">
                <h3 className="text-[13px] font-semibold text-text-primary truncate">
                  {topPublish.title}
                </h3>
                <p className="text-[11px] text-text-secondary">
                  {topPublish.platform} · Published{" "}
                  {new Date(topPublish.publishedAt).toLocaleDateString()}
                </p>
              </div>
              <div className="flex flex-col gap-1 text-right">
                <div className="flex items-center gap-1.5">
                  <Eye className="h-3.5 w-3.5 text-iris" />
                  <span className="text-[12px] font-semibold text-iris">
                    {topPublish.views.toLocaleString()}
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Zap className="h-3.5 w-3.5 text-gold" />
                  <span className="text-[12px] font-semibold text-gold">
                    {topPublish.engagement?.toFixed(1)}%
                  </span>
                </div>
              </div>
            </div>
            <div className="mt-3 grid grid-cols-4 gap-2">
              <EngagementStat label="Likes" value={topPublish.likes} icon={Heart} />
              <EngagementStat label="Shares" value={topPublish.shares} icon={Share2} />
              <EngagementStat label="Comments" value={topPublish.comments} icon={MessageSquare} />
              <EngagementStat
                label="Watch Time"
                value={`${(topPublish.watchTime / 3600).toFixed(1)}h`}
                icon={Clock}
              />
            </div>
          </div>
        </div>
      )}

      {/* Info banner */}
      <div className="rounded-lg border border-iris/30 bg-iris/10 p-4">
        <div className="flex items-start gap-3">
          <TrendingUp className="mt-0.5 h-5 w-5 shrink-0 text-iris" />
          <div>
            <h3 className="text-[13px] font-semibold text-text-primary">
              Analytics from local data
            </h3>
            <p className="mt-1 text-[12px] leading-relaxed text-text-secondary">
              This dashboard aggregates metrics from your render queue and publish history stored
              locally. Metrics sync automatically when you complete renders or publish videos. No
              external analytics service needed.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function MetricCard({
  label,
  value,
  icon: Icon,
  color,
  trend,
}: {
  label: string;
  value: string | number;
  icon: React.ElementType;
  color: "iris" | "mint" | "gold" | "ember";
  trend?: number;
}) {
  const colorMap = {
    iris: "text-iris bg-iris/15",
    mint: "text-mint bg-mint/15",
    gold: "text-gold bg-gold/15",
    ember: "text-ember bg-ember/15",
  };

  const trendColor = (trend?: number) => {
    if (!trend) return "text-text-secondary";
    return trend > 0 ? "text-mint" : "text-[#FF5370]";
  };

  return (
    <div className="hk-card p-3">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-[11px] text-text-secondary">{label}</p>
          <p className="mt-2 text-[18px] font-bold text-text-primary">{value}</p>
          {trend !== undefined && trend !== 0 && (
            <p className={`mt-1 text-[10px] font-medium ${trendColor(trend)}`}>
              {trend > 0 ? "↑" : "↓"} {Math.abs(trend)}% vs last period
            </p>
          )}
        </div>
        <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${colorMap[color]}`}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </div>
  );
}

function EngagementStat({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: string | number;
  icon: React.ElementType;
}) {
  return (
    <div className="rounded bg-white/[0.02] p-2 text-center">
      <Icon className="mx-auto h-4 w-4 text-text-secondary" />
      <p className="mt-1 text-[9px] text-text-secondary">{label}</p>
      <p className="text-[12px] font-semibold text-text-primary">{value}</p>
    </div>
  );
}
