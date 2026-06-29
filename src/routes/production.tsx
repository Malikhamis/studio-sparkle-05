import { createFileRoute } from "@tanstack/react-router";
import {
  Cpu,
  Clapperboard,
  Sparkles,
  Mic,
  Scissors,
  Rocket,
  CheckCircle2,
  Clock,
  AlertCircle,
  Loader2,
  ChevronRight,
  RefreshCw,
} from "lucide-react";
import { ModulePlaceholder } from "@/components/module-placeholder";

export const Route = createFileRoute("/production")({
  head: () => ({
    meta: [
      { title: "Production Pipeline — Hooke" },
      {
        name: "description",
        content:
          "Automated pipeline: blueprint to final cut with AI-driven capture, diffusion, audio, and edit.",
      },
      { property: "og:title", content: "Production Pipeline — Hooke" },
      {
        property: "og:description",
        content: "AI-driven production pipeline from blueprint to publish.",
      },
    ],
  }),
  component: ProductionPage,
});

type PipelineStage = {
  id: string;
  label: string;
  icon: React.ElementType;
  description: string;
  status: "pending" | "running" | "complete" | "failed";
  progress?: number;
  items?: { label: string; status: string }[];
};

const STAGES: PipelineStage[] = [
  {
    id: "blueprint",
    label: "Blueprint",
    icon: Clapperboard,
    description: "Scene breakdown from miDirector",
    status: "complete",
    progress: 100,
    items: [{ label: "8 scenes ready", status: "loaded" }],
  },
  {
    id: "capture",
    label: "Capture",
    icon: Cpu,
    description: "Live capture + import for reference",
    status: "pending",
  },
  {
    id: "diffusion",
    label: "Diffusion",
    icon: Sparkles,
    description: "AI image/video generation per scene",
    status: "running",
    progress: 38,
    items: [
      { label: "Scene 01", status: "complete" },
      { label: "Scene 02", status: "complete" },
      { label: "Scene 03", status: "generating" },
    ],
  },
  {
    id: "audio",
    label: "Audio",
    icon: Mic,
    description: "TTS narration, music, SFX",
    status: "pending",
  },
  {
    id: "edit",
    label: "Edit",
    icon: Scissors,
    description: "Auto-assembly, timeline, cuts",
    status: "pending",
  },
  {
    id: "publish",
    label: "Publish",
    icon: Rocket,
    description: "Render final, schedule, push",
    status: "pending",
  },
];

function ProductionPage() {
  const activeIndex = STAGES.findIndex((s) => s.status === "running");
  const overallProgress = Math.round(
    STAGES.reduce((sum, s) => {
      if (s.status === "complete") return sum + 100;
      if (s.status === "running" && s.progress) return sum + s.progress;
      return sum;
    }, 0) / STAGES.length
  );

  return (
    <div className="mx-auto flex w-full max-w-[1480px] flex-col gap-5">
      {/* Header */}
      <header className="flex items-center gap-3">
        <div
          className="flex h-10 w-10 items-center justify-center rounded-xl"
          style={{ background: "var(--gradient-iris)" }}
        >
          <Cpu className="h-5 w-5 text-white" />
        </div>
        <div>
          <h1 className="hk-text-display text-[20px] font-bold text-text-primary">
            Production Pipeline
          </h1>
          <p className="text-[12px] text-text-secondary">
            AI-driven workflow: blueprint → capture → diffusion → audio → edit → publish.
          </p>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <button className="inline-flex h-9 items-center gap-1.5 rounded-md border border-white/10 bg-surface px-3 text-[12.5px] font-medium text-text-secondary transition-colors hover:bg-elevated hover:text-text-primary">
            <RefreshCw className="h-3.5 w-3.5" />
            Refresh
          </button>
          <button
            className="inline-flex h-9 items-center gap-1.5 rounded-md px-3 text-[12.5px] font-semibold text-white"
            style={{ background: "var(--gradient-iris)" }}
          >
            Start Pipeline
          </button>
        </div>
      </header>

      {/* Overall progress */}
      <div className="hk-card p-4">
        <div className="flex items-center justify-between">
          <span className="text-[12px] font-medium text-text-secondary">Overall Progress</span>
          <span className="text-[12px] font-semibold text-text-primary">{overallProgress}%</span>
        </div>
        <div className="mt-2 h-2 overflow-hidden rounded-full bg-white/[0.06]">
          <div
            className="h-full rounded-full transition-all"
            style={{
              width: `${overallProgress}%`,
              background: "var(--gradient-brand)",
            }}
          />
        </div>
      </div>

      {/* Pipeline stages */}
      <div className="hk-card overflow-hidden">
        <div className="divide-y divide-white/[0.06]">
          {STAGES.map((stage, i) => (
            <StageCard
              key={stage.id}
              stage={stage}
              isPast={i < activeIndex}
              isActive={i === activeIndex}
            />
          ))}
        </div>
      </div>

      {/* Info banner */}
      <div className="rounded-lg border border-iris/30 bg-iris/10 p-4">
        <div className="flex items-start gap-3">
          <Cpu className="mt-0.5 h-5 w-5 shrink-0 text-iris" />
          <div>
            <h3 className="text-[13px] font-semibold text-text-primary">
              Automation-first, manual when needed
            </h3>
            <p className="mt-1 text-[12px] leading-relaxed text-text-secondary">
              The pipeline runs automatically from your miDirector blueprint. Each stage can be
              paused or overridden manually — click any stage to open its advanced controls. This
              replaces the old Capture / Diffusion / Audio / Editor standalone tools.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function StageCard({
  stage,
  isPast,
  isActive,
}: {
  stage: PipelineStage;
  isPast: boolean;
  isActive: boolean;
}) {
  const Icon = stage.icon;
  const statusColor =
    stage.status === "complete"
      ? "text-mint"
      : stage.status === "running"
        ? "text-iris"
        : stage.status === "failed"
          ? "text-[#FF5370]"
          : "text-text-dim";

  const bgStyle =
    isActive && stage.status === "running"
      ? { background: "linear-gradient(90deg, rgba(108,99,255,0.08), transparent)" }
      : undefined;

  return (
    <div className="flex items-start gap-4 p-4 transition-colors hover:bg-elevated/40" style={bgStyle}>
      <div className="flex items-center gap-3">
        <div
          className={`flex h-10 w-10 items-center justify-center rounded-lg ${
            stage.status === "complete"
              ? "bg-mint/15"
              : stage.status === "running"
                ? "bg-iris/15"
                : "bg-white/[0.04]"
          }`}
        >
          {stage.status === "running" ? (
            <Loader2 className="h-5 w-5 animate-spin text-iris" />
          ) : stage.status === "complete" ? (
            <CheckCircle2 className="h-5 w-5 text-mint" />
          ) : stage.status === "failed" ? (
            <AlertCircle className="h-5 w-5 text-[#FF5370]" />
          ) : (
            <Icon className={`h-5 w-5 ${statusColor}`} />
          )}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h3 className="text-[14px] font-semibold text-text-primary">{stage.label}</h3>
            {stage.status === "complete" && (
              <span className="rounded-full bg-mint/15 px-2 py-0.5 text-[10px] font-medium text-mint">
                Complete
              </span>
            )}
            {stage.status === "running" && (
              <span className="rounded-full bg-iris/15 px-2 py-0.5 text-[10px] font-medium text-iris">
                Running
              </span>
            )}
            {stage.status === "failed" && (
              <span className="rounded-full bg-[#FF5370]/15 px-2 py-0.5 text-[10px] font-medium text-[#FF5370]">
                Failed
              </span>
            )}
          </div>
          <p className="mt-0.5 text-[12px] text-text-secondary">{stage.description}</p>

          {/* Progress bar for running stages */}
          {stage.status === "running" && stage.progress !== undefined && (
            <div className="mt-2">
              <div className="flex items-center justify-between text-[10.5px] text-text-dim">
                <span>{stage.items?.length ?? 0} items processing</span>
                <span>{stage.progress}%</span>
              </div>
              <div className="mt-1 h-1 overflow-hidden rounded-full bg-white/[0.06]">
                <div
                  className="h-full rounded-full bg-iris transition-all"
                  style={{ width: `${stage.progress}%` }}
                />
              </div>
            </div>
          )}

          {/* Items */}
          {stage.items && stage.items.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1.5">
              {stage.items.map((item, idx) => (
                <span
                  key={idx}
                  className="inline-flex items-center gap-1 rounded bg-base/60 px-2 py-0.5 text-[10.5px] text-text-secondary"
                >
                  {item.status === "complete" && <CheckCircle2 className="h-2.5 w-2.5 text-mint" />}
                  {item.status === "generating" && (
                    <Loader2 className="h-2.5 w-2.5 animate-spin text-iris" />
                  )}
                  {item.label}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>
      <button className="flex h-8 w-8 shrink-0 items-center justify-center rounded text-text-dim hover:bg-elevated hover:text-text-primary">
        <ChevronRight className="h-4 w-4" />
      </button>
    </div>
  );
}
