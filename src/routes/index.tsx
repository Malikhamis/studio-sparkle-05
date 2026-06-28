import { createFileRoute, Link } from "@tanstack/react-router";
import {
  Activity,
  Clapperboard,
  Cpu,
  FolderKanban,
  Play,
  Plus,
  Rocket,
  Sparkles,
  Upload,
  Video,
  Zap,
} from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Dashboard — Hooke" },
      {
        name: "description",
        content:
          "Overview of recent productions, active renders, hardware status, and quick actions in your Hooke workspace.",
      },
      { property: "og:title", content: "Dashboard — Hooke" },
      {
        property: "og:description",
        content:
          "Overview of recent productions, active renders, hardware status, and quick actions.",
      },
    ],
  }),
  component: DashboardPage,
});

function DashboardPage() {
  return (
    <div className="mx-auto flex w-full max-w-[1480px] flex-col gap-5">
      {/* Stat row */}
      <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          accent="iris"
          label="Active Projects"
          value="12"
          delta="+3 this week"
          icon={<FolderKanban className="h-8 w-8" />}
        />
        <StatCard
          accent="mint"
          label="Renders Today"
          value="48"
          delta="+18%"
          icon={<Sparkles className="h-8 w-8" />}
        />
        <StatCard
          accent="ember"
          label="GPU Utilization"
          value="68%"
          delta="RTX 4090 · 18 GB"
          icon={<Cpu className="h-8 w-8" />}
        />
        <StatCard
          accent="gold"
          label="Published"
          value="6"
          delta="2 scheduled"
          icon={<Rocket className="h-8 w-8" />}
        />
      </div>

      {/* miDirector hero panel */}
      <DirectorPanel />

      {/* Main grid */}
      <div className="grid grid-cols-1 gap-3.5 lg:grid-cols-[2fr_1fr]">
        <RecentProductionsCard />
        <ActivityFeedCard />
      </div>

      <div className="grid grid-cols-1 gap-3.5 lg:grid-cols-[1fr_2fr]">
        <QuickActionsCard />
        <ActiveRendersCard />
      </div>
    </div>
  );
}

/* ---------- Stat Card ---------- */
function StatCard({
  accent,
  label,
  value,
  delta,
  icon,
}: {
  accent: "iris" | "mint" | "ember" | "gold";
  label: string;
  value: string;
  delta: string;
  icon: React.ReactNode;
}) {
  const colorVar =
    accent === "iris"
      ? "var(--accent-iris)"
      : accent === "mint"
        ? "var(--accent-mint)"
        : accent === "ember"
          ? "var(--accent-ember)"
          : "var(--accent-gold)";
  return (
    <div className="hk-card hk-card-hover relative overflow-hidden px-[18px] py-4">
      <div
        className="absolute left-0 right-0 top-0 h-[2px]"
        style={{ background: `linear-gradient(90deg, ${colorVar}, transparent)` }}
      />
      <div className="mb-2 text-[11.5px] font-medium uppercase tracking-[0.3px] text-text-secondary">
        {label}
      </div>
      <div className="hk-text-display mb-1.5 text-[28px] font-bold leading-none text-text-primary">
        {value}
      </div>
      <div className="text-[11.5px] font-medium text-mint">{delta}</div>
      <div className="absolute bottom-3.5 right-4 opacity-10" style={{ color: colorVar }}>
        {icon}
      </div>
    </div>
  );
}

/* ---------- miDirector panel ---------- */
function DirectorPanel() {
  const strategies = [
    { label: "Cinematic", desc: "Slow, deliberate, lens-forward" },
    { label: "Documentary", desc: "Observational, candid" },
    { label: "Music Video", desc: "Rhythm-cut, kinetic" },
    { label: "Tutorial", desc: "Clear, instructional pacing" },
  ];
  return (
    <section
      className="overflow-hidden rounded-[20px] border hk-glow-iris"
      style={{
        background: "linear-gradient(135deg, var(--bg-surface) 0%, var(--bg-elevated) 100%)",
        borderColor: "rgba(108,99,255,0.2)",
      }}
    >
      <header
        className="flex items-center gap-3 border-b px-[22px] py-4"
        style={{
          background: "var(--gradient-director)",
          borderColor: "rgba(108,99,255,0.15)",
        }}
      >
        <div
          className="flex h-[38px] w-[38px] shrink-0 items-center justify-center rounded-[10px]"
          style={{ background: "var(--gradient-iris)" }}
        >
          <Clapperboard className="h-[18px] w-[18px] text-white" />
        </div>
        <div className="flex-1">
          <div className="hk-text-display text-[15px] font-bold text-text-primary">miDirector</div>
          <div className="mt-px text-[12px] text-text-secondary">
            Conversational AI that translates your intent into a shootable blueprint.
          </div>
        </div>
        <div className="flex items-center gap-1.5 text-[12px] font-medium text-mint">
          <span className="h-1.5 w-1.5 rounded-full bg-mint shadow-[0_0_6px_var(--accent-mint)]" />
          Online
        </div>
      </header>

      <div className="px-[22px] py-5">
        <div className="mb-4 grid grid-cols-2 gap-2.5 lg:grid-cols-4">
          {strategies.map((s) => (
            <button
              key={s.label}
              className="rounded-[10px] border border-white/10 bg-base/60 p-3 text-left transition-colors hover:border-iris/60 hover:bg-elevated"
            >
              <div className="text-[13px] font-semibold text-text-primary">{s.label}</div>
              <div className="mt-0.5 text-[11px] leading-snug text-text-secondary">{s.desc}</div>
            </button>
          ))}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Link
            to="/director"
            className="inline-flex items-center gap-2 rounded-md px-4 py-2 text-[13px] font-semibold text-white transition-opacity hover:opacity-90"
            style={{ background: "var(--gradient-iris)" }}
          >
            <Play className="h-3.5 w-3.5" />
            Start Interview
          </Link>
          <button className="inline-flex items-center gap-2 rounded-md border border-white/15 bg-transparent px-4 py-2 text-[13px] font-medium text-text-primary transition-colors hover:bg-surface">
            <Zap className="h-3.5 w-3.5" />
            Load Last Blueprint
          </button>
          <span className="ml-auto text-[11px] text-text-dim">8 active sessions</span>
        </div>
      </div>
    </section>
  );
}

/* ---------- Recent Productions ---------- */
function RecentProductionsCard() {
  const items = [
    { name: "Coastal Highway B-Roll", status: "Rendering", progress: 64, accent: "iris" as const },
    { name: "Founder Interview · Ep 03", status: "Editing", progress: 38, accent: "mint" as const },
    { name: "Product Reveal — Aurora", status: "Blueprint", progress: 12, accent: "gold" as const },
    { name: "Synthwave Music Video", status: "Published", progress: 100, accent: "ember" as const },
  ];
  return (
    <div className="hk-card">
      <CardHeader title="Recent Productions" subtitle="Last 7 days" />
      <div className="divide-y divide-white/[0.06]">
        {items.map((p) => (
          <div key={p.name} className="flex items-center gap-4 px-[18px] py-3.5">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-elevated text-text-secondary">
              <Video className="h-4 w-4" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="truncate text-[13.5px] font-medium text-text-primary">{p.name}</div>
              <div className="mt-1 h-[3px] w-full overflow-hidden rounded-full bg-white/[0.06]">
                <div
                  className="h-full rounded-full"
                  style={{
                    width: `${p.progress}%`,
                    background: `var(--accent-${p.accent})`,
                  }}
                />
              </div>
            </div>
            <div className="w-24 text-right text-[11.5px] font-medium text-text-secondary">
              {p.status}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ---------- Activity Feed ---------- */
function ActivityFeedCard() {
  const items = [
    { icon: Sparkles, color: "var(--accent-iris)", text: "Diffusion render queued — scene 04", time: "2m" },
    { icon: Upload, color: "var(--accent-mint)", text: "12 assets imported to Aurora", time: "14m" },
    { icon: Clapperboard, color: "var(--accent-gold)", text: "miDirector finalized blueprint", time: "1h" },
    { icon: Rocket, color: "var(--accent-ember)", text: "Published to YouTube — draft", time: "3h" },
    { icon: Activity, color: "var(--accent-iris)", text: "GPU spiked to 92% during render", time: "5h" },
  ];
  return (
    <div className="hk-card">
      <CardHeader title="Activity" subtitle="Live" />
      <div className="px-[18px] py-2">
        {items.map((a, i) => {
          const Icon = a.icon;
          return (
            <div key={i} className="flex items-start gap-3 py-2.5">
              <div
                className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-md"
                style={{ background: "rgba(255,255,255,0.04)", color: a.color }}
              >
                <Icon className="h-3.5 w-3.5" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="truncate text-[13px] text-text-primary">{a.text}</div>
                <div className="mt-0.5 text-[11px] text-text-dim">{a.time} ago</div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ---------- Quick Actions ---------- */
function QuickActionsCard() {
  const actions = [
    { to: "/projects", icon: Plus, label: "New Project", accent: "iris" as const },
    { to: "/director", icon: Clapperboard, label: "Start Director", accent: "mint" as const },
    { to: "/capture", icon: Video, label: "Capture Stream", accent: "ember" as const },
    { to: "/publish", icon: Rocket, label: "Publish Queue", accent: "gold" as const },
  ];
  return (
    <div className="hk-card">
      <CardHeader title="Quick Actions" />
      <div className="grid grid-cols-2 gap-2.5 p-[18px]">
        {actions.map((a) => {
          const Icon = a.icon;
          return (
            <Link
              key={a.label}
              to={a.to}
              className="hk-card-hover flex flex-col items-start gap-2.5 rounded-[10px] border border-white/[0.06] bg-elevated p-3.5 transition-colors hover:border-white/20"
            >
              <div
                className="flex h-9 w-9 items-center justify-center rounded-md"
                style={{
                  background: `color-mix(in oklab, var(--accent-${a.accent}) 18%, transparent)`,
                  color: `var(--accent-${a.accent})`,
                }}
              >
                <Icon className="h-4 w-4" />
              </div>
              <div className="text-[13px] font-medium text-text-primary">{a.label}</div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}

/* ---------- Active Renders ---------- */
function ActiveRendersCard() {
  const renders = [
    { name: "scene_04_diffusion.mp4", node: "ComfyUI · queue 2/5", progress: 78 },
    { name: "voiceover_narrator.wav", node: "Piper · TTS", progress: 44 },
    { name: "aurora_master_cut.mov", node: "Editor Engine · export", progress: 12 },
  ];
  return (
    <div className="hk-card">
      <CardHeader title="Active Renders" subtitle="3 running" />
      <div className="divide-y divide-white/[0.06]">
        {renders.map((r) => (
          <div key={r.name} className="px-[18px] py-3.5">
            <div className="mb-1.5 flex items-baseline gap-3">
              <div
                className="truncate text-[13px] font-medium text-text-primary"
                style={{ fontFamily: "var(--font-mono)" }}
              >
                {r.name}
              </div>
              <div className="ml-auto text-[11.5px] text-text-secondary">{r.progress}%</div>
            </div>
            <div className="text-[11px] text-text-dim">{r.node}</div>
            <div className="mt-2 h-1 w-full overflow-hidden rounded-full bg-white/[0.06]">
              <div
                className="h-full rounded-full"
                style={{
                  width: `${r.progress}%`,
                  background: "var(--gradient-brand)",
                }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ---------- shared ---------- */
function CardHeader({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div className="flex items-center gap-2.5 border-b border-white/[0.06] px-[18px] py-3.5">
      <h3 className="hk-text-display text-[14px] font-semibold text-text-primary">{title}</h3>
      {subtitle && <span className="ml-auto text-[12px] text-text-secondary">{subtitle}</span>}
    </div>
  );
}
