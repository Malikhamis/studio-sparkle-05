import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo } from "react";
import {
  BarChart3,
  Eye,
  Clock,
  Heart,
  MessageCircle,
  Share2,
  Rocket,
  Loader as Loader2,
} from "lucide-react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { usePublishStore, PLATFORMS, type Platform } from "@/store/publish-store";
import { useRenderStore } from "@/store/render-store";

export const Route = createFileRoute("/analytics")({
  head: () => ({
    meta: [
      { title: "Analytics — Hooke" },
      {
        name: "description",
        content:
          "Views, watch time, engagement, and render statistics across your Hooke productions.",
      },
      { property: "og:title", content: "Analytics — Hooke" },
      {
        property: "og:description",
        content: "Publishing performance and render throughput at a glance.",
      },
    ],
  }),
  component: AnalyticsPage,
});

function AnalyticsPage() {
  const { posts, seedIfEmpty, tick } = usePublishStore();
  const { jobs, seedIfEmpty: seedRender } = useRenderStore();

  useEffect(() => {
    seedIfEmpty();
    seedRender();
  }, [seedIfEmpty, seedRender]);

  useEffect(() => {
    const id = setInterval(tick, 2500);
    return () => clearInterval(id);
  }, [tick]);

  const totals = useMemo(() => {
    const t = { views: 0, watchTime: 0, likes: 0, comments: 0, shares: 0 };
    for (const p of posts) {
      t.views += p.metrics.views;
      t.watchTime += p.metrics.watchTime;
      t.likes += p.metrics.likes;
      t.comments += p.metrics.comments;
      t.shares += p.metrics.shares;
    }
    return t;
  }, [posts]);

  const engagementRate = totals.views
    ? ((totals.likes + totals.comments + totals.shares) / totals.views) * 100
    : 0;

  const perPlatform = useMemo(() => {
    const map = new Map<Platform, number>();
    for (const p of posts) {
      if (p.metrics.views === 0) continue;
      const share = p.metrics.views / p.platforms.length;
      for (const pl of p.platforms) {
        map.set(pl, (map.get(pl) ?? 0) + share);
      }
    }
    return PLATFORMS.map((meta) => ({
      name: meta.label,
      views: Math.round(map.get(meta.id) ?? 0),
      color: meta.color,
    })).filter((r) => r.views > 0);
  }, [posts]);

  const trend = useMemo(() => {
    // 14-day synthetic trend derived from published post metrics
    const days = 14;
    const now = Date.now();
    const buckets = Array.from({ length: days }, (_, i) => {
      const dayIdx = days - 1 - i;
      const t = now - dayIdx * 86_400_000;
      return {
        day: new Date(t).toLocaleDateString(undefined, { month: "short", day: "numeric" }),
        views: 0,
        engagement: 0,
      };
    });
    for (const p of posts) {
      if (!p.publishedAt) continue;
      const ageDays = Math.floor((now - p.publishedAt) / 86_400_000);
      for (let d = 0; d < days; d++) {
        const dayAge = days - 1 - d;
        if (dayAge < ageDays) continue;
        const decay = 1 / (1 + (dayAge - ageDays) * 0.5);
        buckets[d].views += Math.round(p.metrics.views * decay * 0.08);
        buckets[d].engagement += Math.round(
          (p.metrics.likes + p.metrics.comments + p.metrics.shares) * decay * 0.08
        );
      }
    }
    return buckets;
  }, [posts]);

  const renderStats = useMemo(() => {
    const s = { total: jobs.length, complete: 0, running: 0, failed: 0, avgMs: 0 };
    let sum = 0;
    let n = 0;
    for (const j of jobs) {
      if (j.status === "complete") {
        s.complete++;
        if (j.completedAt && j.startedAt) {
          sum += j.completedAt - j.startedAt;
          n++;
        }
      } else if (j.status === "running") s.running++;
      else if (j.status === "failed") s.failed++;
    }
    s.avgMs = n ? Math.round(sum / n) : 0;
    return s;
  }, [jobs]);

  const topPosts = useMemo(
    () => [...posts].sort((a, b) => b.metrics.views - a.metrics.views).slice(0, 5),
    [posts]
  );

  return (
    <div className="flex flex-col gap-6 p-4 md:p-6">
      <header className="flex items-center gap-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-white/[0.04]">
          <BarChart3 className="h-5 w-5 text-text-primary" />
        </div>
        <div>
          <h1 className="text-[22px] font-semibold text-text-primary">Analytics</h1>
          <p className="text-[12.5px] text-text-dim">
            Publishing performance and render throughput.
          </p>
        </div>
      </header>

      <div className="grid grid-cols-2 gap-2 md:grid-cols-5">
        <KpiCard icon={Eye} label="Views" value={fmt(totals.views)} tone="#8b5cf6" />
        <KpiCard icon={Clock} label="Watch min" value={fmt(totals.watchTime)} tone="#06b6d4" />
        <KpiCard icon={Heart} label="Likes" value={fmt(totals.likes)} tone="#f43f5e" />
        <KpiCard icon={MessageCircle} label="Comments" value={fmt(totals.comments)} tone="#f59e0b" />
        <KpiCard icon={Share2} label="Shares" value={fmt(totals.shares)} tone="#22c55e" />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="hk-card col-span-1 flex flex-col gap-3 p-4 lg:col-span-2">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-[14px] font-semibold text-text-primary">Views · last 14 days</h2>
              <p className="text-[11px] text-text-dim">
                Engagement rate {engagementRate.toFixed(1)}%
              </p>
            </div>
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={trend}>
                <defs>
                  <linearGradient id="viewsFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#8b5cf6" stopOpacity={0.5} />
                    <stop offset="100%" stopColor="#8b5cf6" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="engFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#06b6d4" stopOpacity={0.4} />
                    <stop offset="100%" stopColor="#06b6d4" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="rgba(255,255,255,0.05)" vertical={false} />
                <XAxis dataKey="day" stroke="rgba(255,255,255,0.35)" fontSize={10} tickLine={false} />
                <YAxis stroke="rgba(255,255,255,0.35)" fontSize={10} tickLine={false} width={30} />
                <Tooltip
                  contentStyle={{
                    background: "rgba(15,15,20,0.95)",
                    border: "1px solid rgba(255,255,255,0.08)",
                    borderRadius: 8,
                    fontSize: 11,
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="views"
                  stroke="#8b5cf6"
                  fill="url(#viewsFill)"
                  strokeWidth={2}
                />
                <Area
                  type="monotone"
                  dataKey="engagement"
                  stroke="#06b6d4"
                  fill="url(#engFill)"
                  strokeWidth={2}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="hk-card flex flex-col gap-3 p-4">
          <h2 className="text-[14px] font-semibold text-text-primary">Views by platform</h2>
          {perPlatform.length === 0 ? (
            <div className="flex h-52 items-center justify-center text-[12px] text-text-dim">
              No published views yet.
            </div>
          ) : (
            <div className="h-52">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={perPlatform}
                    dataKey="views"
                    nameKey="name"
                    innerRadius={40}
                    outerRadius={70}
                    stroke="none"
                  >
                    {perPlatform.map((p) => (
                      <Cell key={p.name} fill={p.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      background: "rgba(15,15,20,0.95)",
                      border: "1px solid rgba(255,255,255,0.08)",
                      borderRadius: 8,
                      fontSize: 11,
                    }}
                  />
                  <Legend
                    wrapperStyle={{ fontSize: 10, color: "rgba(255,255,255,0.6)" }}
                    iconSize={8}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="hk-card flex flex-col gap-3 p-4">
          <div className="flex items-center gap-2">
            <Rocket className="h-4 w-4 text-text-secondary" />
            <h2 className="text-[14px] font-semibold text-text-primary">Top posts</h2>
          </div>
          {topPosts.length === 0 ? (
            <div className="py-6 text-center text-[12px] text-text-dim">No posts yet.</div>
          ) : (
            <ul className="flex flex-col gap-2">
              {topPosts.map((p) => (
                <li
                  key={p.id}
                  className="flex items-center gap-3 rounded-lg border border-white/[0.05] bg-white/[0.02] p-2"
                >
                  <div
                    className="h-9 w-14 shrink-0 rounded"
                    style={{
                      background: `linear-gradient(135deg, ${p.thumbnailColor}, rgba(0,0,0,0.4))`,
                    }}
                  />
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-[12.5px] font-medium text-text-primary">{p.title}</div>
                    <div className="text-[10.5px] text-text-dim">
                      {p.platforms.length} platform · {p.status}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-[13px] font-semibold text-text-primary">
                      {fmt(p.metrics.views)}
                    </div>
                    <div className="text-[10px] text-text-dim">views</div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="hk-card flex flex-col gap-3 p-4">
          <div className="flex items-center gap-2">
            <Loader2 className="h-4 w-4 text-text-secondary" />
            <h2 className="text-[14px] font-semibold text-text-primary">Render throughput</h2>
          </div>
          <div className="grid grid-cols-4 gap-2">
            <MiniStat label="Total" value={renderStats.total} />
            <MiniStat label="Complete" value={renderStats.complete} tone="text-emerald-300" />
            <MiniStat label="Running" value={renderStats.running} tone="text-sky-300" />
            <MiniStat label="Failed" value={renderStats.failed} tone="text-rose-300" />
          </div>
          <div className="text-[11px] text-text-dim">
            Avg completion:{" "}
            <span className="text-text-secondary">
              {renderStats.avgMs
                ? `${Math.round(renderStats.avgMs / 1000)}s`
                : "—"}
            </span>
          </div>
          <div className="h-40">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={[
                  { name: "Complete", value: renderStats.complete, fill: "#22c55e" },
                  { name: "Running", value: renderStats.running, fill: "#38bdf8" },
                  { name: "Failed", value: renderStats.failed, fill: "#f43f5e" },
                ]}
              >
                <CartesianGrid stroke="rgba(255,255,255,0.05)" vertical={false} />
                <XAxis dataKey="name" stroke="rgba(255,255,255,0.35)" fontSize={10} tickLine={false} />
                <YAxis stroke="rgba(255,255,255,0.35)" fontSize={10} tickLine={false} width={24} />
                <Tooltip
                  contentStyle={{
                    background: "rgba(15,15,20,0.95)",
                    border: "1px solid rgba(255,255,255,0.08)",
                    borderRadius: 8,
                    fontSize: 11,
                  }}
                />
                <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                  {[
                    { fill: "#22c55e" },
                    { fill: "#38bdf8" },
                    { fill: "#f43f5e" },
                  ].map((c, i) => (
                    <Cell key={i} fill={c.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}

function KpiCard({
  icon: Icon,
  label,
  value,
  tone,
}: {
  icon: typeof Eye;
  label: string;
  value: string;
  tone: string;
}) {
  return (
    <div className="hk-card flex flex-col gap-2 p-3">
      <div className="flex items-center gap-2">
        <div
          className="flex h-7 w-7 items-center justify-center rounded-lg"
          style={{ background: `${tone}22`, color: tone }}
        >
          <Icon className="h-3.5 w-3.5" />
        </div>
        <span className="text-[11px] uppercase tracking-wide text-text-dim">{label}</span>
      </div>
      <div className="text-[22px] font-semibold text-text-primary">{value}</div>
    </div>
  );
}

function MiniStat({
  label,
  value,
  tone = "text-text-primary",
}: {
  label: string;
  value: number;
  tone?: string;
}) {
  return (
    <div className="rounded-md bg-white/[0.03] p-2">
      <div className="text-[10px] uppercase tracking-wide text-text-dim">{label}</div>
      <div className={`text-[16px] font-semibold ${tone}`}>{value}</div>
    </div>
  );
}

function fmt(n: number) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}k`;
  return String(n);
}
