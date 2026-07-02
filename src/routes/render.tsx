import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import {
  Cpu,
  Play,
  Pause,
  RefreshCw,
  X,
  Trash2,
  Bell,
  ChevronDown,
  ChevronUp,
  Plus,
  CircleCheck as CheckCircle2,
  CircleAlert as AlertCircle,
  Loader as Loader2,
  Clock,
  Filter,
  Settings2,
} from "lucide-react";
import {
  useRenderStore,
  type RenderJob,
  type RenderKind,
  type RenderPriority,
  type RenderStatus,
} from "@/store/render-store";

export const Route = createFileRoute("/render")({
  head: () => ({
    meta: [
      { title: "Render Queue — Hooke" },
      {
        name: "description",
        content:
          "Multi-job render queue with pause, resume, retry, logs, priority, and notifications.",
      },
      { property: "og:title", content: "Render Queue — Hooke" },
      {
        property: "og:description",
        content:
          "Watch every shot, storyboard, narration, and final cut render in real time.",
      },
    ],
  }),
  component: RenderPage,
});

const KIND_LABEL: Record<RenderKind, string> = {
  shot: "Shot",
  storyboard: "Storyboard",
  narration: "Narration",
  music: "Music",
  "final-cut": "Final Cut",
  export: "Export",
};

const STATUS_STYLES: Record<
  RenderStatus,
  { dot: string; text: string; label: string }
> = {
  queued: { dot: "bg-white/40", text: "text-text-dim", label: "Queued" },
  running: { dot: "bg-[#5BE9B9]", text: "text-[#5BE9B9]", label: "Running" },
  paused: { dot: "bg-[#FFB454]", text: "text-[#FFB454]", label: "Paused" },
  complete: { dot: "bg-[#7C6BFF]", text: "text-[#7C6BFF]", label: "Complete" },
  failed: { dot: "bg-[#FF5370]", text: "text-[#FF5370]", label: "Failed" },
  cancelled: { dot: "bg-white/20", text: "text-text-dim", label: "Cancelled" },
};

const FILTERS: { id: "all" | RenderStatus; label: string }[] = [
  { id: "all", label: "All" },
  { id: "running", label: "Running" },
  { id: "queued", label: "Queued" },
  { id: "paused", label: "Paused" },
  { id: "complete", label: "Complete" },
  { id: "failed", label: "Failed" },
];

function RenderPage() {
  const {
    jobs,
    notifications,
    settings,
    tick,
    seedIfEmpty,
    pause,
    resume,
    retry,
    cancel,
    remove,
    clearCompleted,
    setPriority,
    updateSettings,
    markNotificationRead,
    clearNotifications,
    enqueue,
  } = useRenderStore();

  const [filter, setFilter] = useState<"all" | RenderStatus>("all");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [showNotifs, setShowNotifs] = useState(false);
  const [showSettings, setShowSettings] = useState(false);

  useEffect(() => {
    seedIfEmpty();
  }, [seedIfEmpty]);

  useEffect(() => {
    const id = setInterval(() => tick(), 1000);
    return () => clearInterval(id);
  }, [tick]);

  const filtered = useMemo(() => {
    const list = filter === "all" ? jobs : jobs.filter((j) => j.status === filter);
    return [...list].sort((a, b) => {
      const rank = (s: RenderStatus) =>
        s === "running" ? 0 : s === "queued" ? 1 : s === "paused" ? 2 : 3;
      return rank(a.status) - rank(b.status) || b.updatedAt - a.updatedAt;
    });
  }, [jobs, filter]);

  const stats = useMemo(() => {
    const s = { running: 0, queued: 0, complete: 0, failed: 0 };
    for (const j of jobs) {
      if (j.status === "running") s.running++;
      else if (j.status === "queued") s.queued++;
      else if (j.status === "complete") s.complete++;
      else if (j.status === "failed") s.failed++;
    }
    return s;
  }, [jobs]);

  const unread = notifications.filter((n) => !n.read).length;

  const addDemo = () => {
    const kinds: RenderKind[] = [
      "shot",
      "storyboard",
      "narration",
      "final-cut",
      "export",
    ];
    const k = kinds[Math.floor(Math.random() * kinds.length)];
    enqueue({
      label: `${KIND_LABEL[k]} · ${new Date().toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      })}`,
      kind: k,
      preset: settings.defaultPreset,
    });
  };

  return (
    <div className="flex h-full flex-col gap-4 p-4 md:p-6">
      {/* Header */}
      <header className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/[0.04] ring-1 ring-white/[0.06]">
            <Cpu className="h-5 w-5 text-[#7C6BFF]" />
          </div>
          <div>
            <h1 className="text-lg font-semibold tracking-tight text-text-primary">
              Render Queue
            </h1>
            <p className="text-xs text-text-dim">
              {stats.running} running · {stats.queued} queued · {stats.complete}{" "}
              complete · {stats.failed} failed
            </p>
          </div>
        </div>

        <div className="ml-auto flex flex-wrap items-center gap-2">
          <button
            onClick={addDemo}
            className="flex items-center gap-2 rounded-lg bg-[#7C6BFF] px-3 py-1.5 text-xs font-medium text-white hover:bg-[#8B7BFF]"
          >
            <Plus className="h-3.5 w-3.5" />
            New render
          </button>
          <button
            onClick={clearCompleted}
            className="flex items-center gap-2 rounded-lg bg-white/[0.04] px-3 py-1.5 text-xs text-text-dim ring-1 ring-white/[0.06] hover:text-text-primary"
          >
            <Trash2 className="h-3.5 w-3.5" />
            Clear done
          </button>
          <button
            onClick={() => setShowNotifs((v) => !v)}
            className="relative flex h-8 w-8 items-center justify-center rounded-lg bg-white/[0.04] ring-1 ring-white/[0.06] hover:text-text-primary"
          >
            <Bell className="h-4 w-4" />
            {unread > 0 && (
              <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-[#FF5370] px-1 text-[10px] font-semibold text-white">
                {unread}
              </span>
            )}
          </button>
          <button
            onClick={() => setShowSettings((v) => !v)}
            className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/[0.04] ring-1 ring-white/[0.06] hover:text-text-primary"
          >
            <Settings2 className="h-4 w-4" />
          </button>
        </div>
      </header>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2">
        <Filter className="h-3.5 w-3.5 text-text-dim" />
        {FILTERS.map((f) => (
          <button
            key={f.id}
            onClick={() => setFilter(f.id)}
            className={`rounded-full px-3 py-1 text-[11px] font-medium ring-1 transition ${
              filter === f.id
                ? "bg-[#7C6BFF]/20 text-[#B7ABFF] ring-[#7C6BFF]/40"
                : "bg-white/[0.02] text-text-dim ring-white/[0.06] hover:text-text-primary"
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      <div className="grid flex-1 min-h-0 gap-4 lg:grid-cols-[1fr_320px]">
        {/* Job list */}
        <div className="min-h-0 overflow-y-auto rounded-2xl bg-white/[0.02] ring-1 ring-white/[0.05]">
          {filtered.length === 0 ? (
            <div className="flex h-full min-h-[240px] flex-col items-center justify-center gap-2 p-10 text-center">
              <Cpu className="h-8 w-8 text-text-dim/60" />
              <p className="text-sm text-text-dim">No renders match this filter.</p>
            </div>
          ) : (
            <ul className="divide-y divide-white/[0.04]">
              {filtered.map((job) => (
                <JobRow
                  key={job.id}
                  job={job}
                  expanded={expandedId === job.id}
                  onToggle={() =>
                    setExpandedId((id) => (id === job.id ? null : job.id))
                  }
                  onPause={() => pause(job.id)}
                  onResume={() => resume(job.id)}
                  onRetry={() => retry(job.id)}
                  onCancel={() => cancel(job.id)}
                  onRemove={() => remove(job.id)}
                  onPriority={(p) => setPriority(job.id, p)}
                />
              ))}
            </ul>
          )}
        </div>

        {/* Side panel */}
        <aside className="flex flex-col gap-4">
          {showNotifs && (
            <div className="rounded-2xl bg-white/[0.02] ring-1 ring-white/[0.05]">
              <div className="flex items-center justify-between border-b border-white/[0.04] px-4 py-2.5">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-text-dim">
                  Notifications
                </h3>
                <button
                  onClick={clearNotifications}
                  className="text-[11px] text-text-dim hover:text-text-primary"
                >
                  Clear
                </button>
              </div>
              <ul className="max-h-64 overflow-y-auto divide-y divide-white/[0.04]">
                {notifications.length === 0 && (
                  <li className="p-4 text-xs text-text-dim">Nothing yet.</li>
                )}
                {notifications.map((n) => (
                  <li
                    key={n.id}
                    onClick={() => markNotificationRead(n.id)}
                    className={`cursor-pointer px-4 py-2 text-[12px] ${
                      n.read ? "text-text-dim" : "text-text-primary"
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span
                        className={`h-1.5 w-1.5 rounded-full ${
                          n.kind === "complete"
                            ? "bg-[#7C6BFF]"
                            : n.kind === "failed"
                              ? "bg-[#FF5370]"
                              : "bg-[#5BE9B9]"
                        }`}
                      />
                      <span className="flex-1 truncate">{n.message}</span>
                    </div>
                    <div className="mt-0.5 text-[10px] text-text-dim/70">
                      {new Date(n.ts).toLocaleTimeString()}
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {showSettings && (
            <div className="rounded-2xl bg-white/[0.02] p-4 ring-1 ring-white/[0.05]">
              <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-text-dim">
                Queue settings
              </h3>
              <label className="mb-3 block text-xs">
                <span className="mb-1 block text-text-dim">
                  Max concurrent renders
                </span>
                <input
                  type="number"
                  min={1}
                  max={6}
                  value={settings.maxConcurrent}
                  onChange={(e) =>
                    updateSettings({
                      maxConcurrent: Math.max(1, Math.min(6, +e.target.value)),
                    })
                  }
                  className="w-full rounded-lg bg-white/[0.04] px-2 py-1.5 text-text-primary ring-1 ring-white/[0.06] focus:outline-none focus:ring-[#7C6BFF]"
                />
              </label>
              <label className="mb-2 flex items-center gap-2 text-xs text-text-dim">
                <input
                  type="checkbox"
                  checked={settings.autoRetry}
                  onChange={(e) =>
                    updateSettings({ autoRetry: e.target.checked })
                  }
                />
                Auto-retry failed renders
              </label>
              <label className="flex items-center gap-2 text-xs text-text-dim">
                <input
                  type="checkbox"
                  checked={settings.notifyOnComplete}
                  onChange={(e) =>
                    updateSettings({ notifyOnComplete: e.target.checked })
                  }
                />
                Notify on complete
              </label>
              <div className="mt-3 border-t border-white/[0.04] pt-3">
                <div className="mb-2 text-[11px] uppercase tracking-wider text-text-dim">
                  Default preset
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <select
                    value={settings.defaultPreset.resolution}
                    onChange={(e) =>
                      updateSettings({
                        defaultPreset: {
                          ...settings.defaultPreset,
                          resolution: e.target.value as never,
                        },
                      })
                    }
                    className="rounded-lg bg-white/[0.04] px-2 py-1.5 ring-1 ring-white/[0.06]"
                  >
                    {["720p", "1080p", "1440p", "4K"].map((r) => (
                      <option key={r} value={r}>
                        {r}
                      </option>
                    ))}
                  </select>
                  <select
                    value={settings.defaultPreset.fps}
                    onChange={(e) =>
                      updateSettings({
                        defaultPreset: {
                          ...settings.defaultPreset,
                          fps: +e.target.value as never,
                        },
                      })
                    }
                    className="rounded-lg bg-white/[0.04] px-2 py-1.5 ring-1 ring-white/[0.06]"
                  >
                    {[24, 30, 60].map((f) => (
                      <option key={f} value={f}>
                        {f} fps
                      </option>
                    ))}
                  </select>
                  <select
                    value={settings.defaultPreset.format}
                    onChange={(e) =>
                      updateSettings({
                        defaultPreset: {
                          ...settings.defaultPreset,
                          format: e.target.value as never,
                        },
                      })
                    }
                    className="rounded-lg bg-white/[0.04] px-2 py-1.5 ring-1 ring-white/[0.06]"
                  >
                    {["mp4", "mov", "webm"].map((f) => (
                      <option key={f} value={f}>
                        {f}
                      </option>
                    ))}
                  </select>
                  <select
                    value={settings.defaultPreset.codec}
                    onChange={(e) =>
                      updateSettings({
                        defaultPreset: {
                          ...settings.defaultPreset,
                          codec: e.target.value as never,
                        },
                      })
                    }
                    className="rounded-lg bg-white/[0.04] px-2 py-1.5 ring-1 ring-white/[0.06]"
                  >
                    {["h264", "h265", "vp9", "prores"].map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          )}

          <div className="rounded-2xl bg-white/[0.02] p-4 ring-1 ring-white/[0.05]">
            <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-text-dim">
              Throughput
            </h3>
            <StatRow
              icon={<Loader2 className="h-3.5 w-3.5 text-[#5BE9B9]" />}
              label="Running"
              value={stats.running}
            />
            <StatRow
              icon={<Clock className="h-3.5 w-3.5 text-text-dim" />}
              label="Queued"
              value={stats.queued}
            />
            <StatRow
              icon={<CheckCircle2 className="h-3.5 w-3.5 text-[#7C6BFF]" />}
              label="Complete"
              value={stats.complete}
            />
            <StatRow
              icon={<AlertCircle className="h-3.5 w-3.5 text-[#FF5370]" />}
              label="Failed"
              value={stats.failed}
            />
          </div>
        </aside>
      </div>
    </div>
  );
}

function StatRow({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
}) {
  return (
    <div className="flex items-center justify-between border-b border-white/[0.04] py-2 last:border-b-0 last:pb-0">
      <div className="flex items-center gap-2 text-xs text-text-dim">
        {icon}
        {label}
      </div>
      <div className="text-sm font-semibold text-text-primary tabular-nums">
        {value}
      </div>
    </div>
  );
}

function JobRow({
  job,
  expanded,
  onToggle,
  onPause,
  onResume,
  onRetry,
  onCancel,
  onRemove,
  onPriority,
}: {
  job: RenderJob;
  expanded: boolean;
  onToggle: () => void;
  onPause: () => void;
  onResume: () => void;
  onRetry: () => void;
  onCancel: () => void;
  onRemove: () => void;
  onPriority: (p: RenderPriority) => void;
}) {
  const s = STATUS_STYLES[job.status];
  const canPause = job.status === "running" || job.status === "queued";
  const canResume = job.status === "paused";
  const canRetry = job.status === "failed" || job.status === "cancelled";

  return (
    <li className="px-4 py-3">
      <div className="flex items-center gap-3">
        <div className={`h-2 w-2 shrink-0 rounded-full ${s.dot}`} />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="truncate text-sm font-medium text-text-primary">
              {job.label}
            </span>
            <span className="rounded-full bg-white/[0.04] px-1.5 py-0.5 text-[10px] uppercase tracking-wider text-text-dim">
              {KIND_LABEL[job.kind]}
            </span>
          </div>
          <div className="mt-1 flex items-center gap-3 text-[11px] text-text-dim">
            <span className={s.text}>{s.label}</span>
            <span>
              {job.preset.resolution} · {job.preset.fps}fps · {job.preset.codec}
            </span>
            {job.status === "running" && job.eta != null && (
              <span>ETA {job.eta}s</span>
            )}
            {job.retries > 0 && <span>retries: {job.retries}</span>}
          </div>
          <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-white/[0.04]">
            <div
              className={`h-full transition-all ${
                job.status === "failed"
                  ? "bg-[#FF5370]"
                  : job.status === "complete"
                    ? "bg-[#7C6BFF]"
                    : job.status === "paused"
                      ? "bg-[#FFB454]"
                      : "bg-[#5BE9B9]"
              }`}
              style={{ width: `${job.progress}%` }}
            />
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-1">
          <select
            value={job.priority}
            onChange={(e) => onPriority(e.target.value as RenderPriority)}
            className="rounded-md bg-white/[0.04] px-1.5 py-1 text-[10px] uppercase tracking-wider text-text-dim ring-1 ring-white/[0.06]"
          >
            <option value="low">low</option>
            <option value="normal">med</option>
            <option value="high">high</option>
          </select>
          {canPause && (
            <IconBtn title="Pause" onClick={onPause}>
              <Pause className="h-3.5 w-3.5" />
            </IconBtn>
          )}
          {canResume && (
            <IconBtn title="Resume" onClick={onResume}>
              <Play className="h-3.5 w-3.5" />
            </IconBtn>
          )}
          {canRetry && (
            <IconBtn title="Retry" onClick={onRetry}>
              <RefreshCw className="h-3.5 w-3.5" />
            </IconBtn>
          )}
          {job.status !== "complete" && (
            <IconBtn title="Cancel" onClick={onCancel}>
              <X className="h-3.5 w-3.5" />
            </IconBtn>
          )}
          <IconBtn title="Remove" onClick={onRemove}>
            <Trash2 className="h-3.5 w-3.5" />
          </IconBtn>
          <IconBtn title="Logs" onClick={onToggle}>
            {expanded ? (
              <ChevronUp className="h-3.5 w-3.5" />
            ) : (
              <ChevronDown className="h-3.5 w-3.5" />
            )}
          </IconBtn>
        </div>
      </div>

      {expanded && (
        <div className="mt-3 rounded-lg bg-black/40 p-3 font-mono text-[11px] ring-1 ring-white/[0.04]">
          {job.errorMessage && (
            <div className="mb-2 rounded bg-[#FF5370]/10 px-2 py-1 text-[#FF9AAA]">
              {job.errorMessage}
            </div>
          )}
          <div className="max-h-48 space-y-0.5 overflow-y-auto">
            {job.logs
              .slice()
              .reverse()
              .map((l, i) => (
                <div
                  key={i}
                  className={
                    l.level === "error"
                      ? "text-[#FF9AAA]"
                      : l.level === "warn"
                        ? "text-[#FFD08A]"
                        : "text-text-dim"
                  }
                >
                  <span className="text-text-dim/50">
                    {new Date(l.ts).toLocaleTimeString()}
                  </span>{" "}
                  {l.message}
                </div>
              ))}
          </div>
          {job.outputUrl && (
            <div className="mt-2 truncate text-[#5BE9B9]">→ {job.outputUrl}</div>
          )}
        </div>
      )}
    </li>
  );
}

function IconBtn({
  onClick,
  title,
  children,
}: {
  onClick: () => void;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      title={title}
      className="flex h-7 w-7 items-center justify-center rounded-md text-text-dim hover:bg-white/[0.06] hover:text-text-primary"
    >
      {children}
    </button>
  );
}
