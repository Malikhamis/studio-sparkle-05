import { createFileRoute } from "@tanstack/react-router";
import {
  Cpu,
  Clapperboard,
  Sparkles,
  Mic,
  Scissors,
  Rocket,
  CircleCheck as CheckCircle2,
  Clock,
  CircleAlert as AlertCircle,
  Loader as Loader2,
  ChevronRight,
  RefreshCw,
  Play,
  Pause,
  PanelRight,
} from "lucide-react";
import { useState } from "react";
import { useRenderQueueStore } from "@/store/render-queue-store";
import { RenderQueuePanel } from "@/components/render-queue-panel";
import { cn } from "@/lib/utils";

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

function ProductionPage() {
  const {
    jobs,
    activeJobId,
    setActive,
    createJob,
    updateStageProgress,
    completeStage,
  } = useRenderQueueStore();
  const [showQueuePanel, setShowQueuePanel] = useState(true);

  const activeJob = jobs.find((j) => j.id === activeJobId) || jobs[0];

  const stages = activeJob
    ? activeJob.stages
    : [
        { id: "blueprint", status: "pending" as const, progress: 0 },
        { id: "capture", status: "pending" as const, progress: 0 },
        { id: "diffusion", status: "pending" as const, progress: 0 },
        { id: "audio", status: "pending" as const, progress: 0 },
        { id: "edit", status: "pending" as const, progress: 0 },
        { id: "publish", status: "pending" as const, progress: 0 },
      ];

  const activeIndex = stages.findIndex((s) => s.status === "running");
  const overallProgress = activeJob ? activeJob.overallProgress : 0;

  const stageIcons: Record<string, React.ElementType> = {
    blueprint: Clapperboard,
    capture: Cpu,
    diffusion: Sparkles,
    audio: Mic,
    edit: Scissors,
    publish: Rocket,
  };

  const stageDescriptions: Record<string, string> = {
    blueprint: "Scene breakdown from miDirector",
    capture: "Live capture + import for reference",
    diffusion: "AI image/video generation per scene",
    audio: "TTS narration, music, SFX",
    edit: "Auto-assembly, timeline, cuts",
    publish: "Render final, schedule, push",
  };

  const startPipeline = () => {
    const job = createJob({
      projectId: "project-current",
      title: `Production Render — ${new Date().toLocaleString()}`,
      maxRetries: 3,
    });
    setActive(job.id);
  };

  const statusColor = (status: string) => {
    switch (status) {
      case "complete":
        return "text-mint";
      case "running":
        return "text-iris";
      case "paused":
        return "text-gold";
      case "failed":
        return "text-[#FF5370]";
      default:
        return "text-text-dim";
    }
  };

  return (
    <div className="flex h-full w-full gap-5">
      {/* Main content */}
      <div className="flex-1 flex flex-col gap-5 min-w-0 overflow-y-auto">
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
            <button
              onClick={() => setShowQueuePanel(!showQueuePanel)}
              className="inline-flex h-9 items-center gap-1.5 rounded-md border border-white/10 bg-surface px-3 text-[12.5px] font-medium text-text-secondary transition-colors hover:bg-elevated"
            >
              <PanelRight className="h-3.5 w-3.5" />
              Queue
            </button>
            <button
              onClick={() => window.location.reload()}
              className="inline-flex h-9 items-center gap-1.5 rounded-md border border-white/10 bg-surface px-3 text-[12.5px] font-medium text-text-secondary transition-colors hover:bg-elevated"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              Refresh
            </button>
            <button
              onClick={startPipeline}
              className="inline-flex h-9 items-center gap-1.5 rounded-md px-3 text-[12.5px] font-semibold text-white"
              style={{ background: "var(--gradient-iris)" }}
            >
              <Play className="h-3.5 w-3.5" />
              Start Pipeline
            </button>
          </div>
        </header>

        {activeJob ? (
          <>
            {/* Overall progress */}
            <div className="hk-card p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[12px] font-medium text-text-secondary">
                  Overall Progress
                </span>
                <span className="text-[12px] font-semibold text-text-primary">
                  {overallProgress}%
                </span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-white/[0.06]">
                <div
                  className="h-full rounded-full transition-all"
                  style={{
                    width: `${overallProgress}%`,
                    background: "var(--gradient-brand)",
                  }}
                />
              </div>
              {activeJob.status && (
                <p className="mt-3 text-[11px] text-text-secondary">
                  Status:{" "}
                  <span className={cn("font-semibold", statusColor(activeJob.status))}>
                    {activeJob.status.charAt(0).toUpperCase() + activeJob.status.slice(1)}
                  </span>
                </p>
              )}
            </div>

            {/* Pipeline stages */}
            <div className="hk-card overflow-hidden">
              <div className="divide-y divide-white/[0.06]">
                {stages.map((stage, i) => (
                  <StageCard
                    key={stage.id}
                    stageId={stage.id as any}
                    stage={stage}
                    icon={stageIcons[stage.id]}
                    description={stageDescriptions[stage.id]}
                    isPast={i < activeIndex}
                    isActive={i === activeIndex}
                  />
                ))}
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center rounded border border-white/[0.06] bg-white/[0.02]">
            <div className="text-center">
              <Cpu className="h-12 w-12 mx-auto text-text-dim mb-3" />
              <p className="text-[14px] font-medium text-text-primary">
                No active render job
              </p>
              <p className="text-[12px] text-text-secondary mt-1">
                Click "Start Pipeline" to begin rendering
              </p>
            </div>
          </div>
        )}

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
                paused or overridden manually — open the queue panel to inspect logs, retry failed
                jobs, or manage multiple renders. This replaces the old Capture / Diffusion /
                Audio / Editor standalone tools.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Queue panel sidebar */}
      {showQueuePanel && (
        <div className="w-72 border-l border-white/[0.06] bg-surface/40 backdrop-blur-sm p-4 flex flex-col">
          <RenderQueuePanel />
        </div>
      )}
    </div>
  );
}

function StageCard({
  stageId,
  stage,
  icon: Icon,
  description,
  isPast,
  isActive,
}: {
  stageId: string;
  stage: any;
  icon: React.ElementType;
  description: string;
  isPast: boolean;
  isActive: boolean;
}) {
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
            <h3 className="text-[14px] font-semibold text-text-primary capitalize">
              {stageId}
            </h3>
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
          <p className="mt-0.5 text-[12px] text-text-secondary">{description}</p>

          {/* Progress bar for running stages */}
          {stage.status === "running" && (
            <div className="mt-2">
              <div className="flex items-center justify-between text-[10.5px] text-text-dim">
                <span>Processing</span>
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
        </div>
      </div>
      <button className="flex h-8 w-8 shrink-0 items-center justify-center rounded text-text-dim hover:bg-elevated hover:text-text-primary">
        <ChevronRight className="h-4 w-4" />
      </button>
    </div>
  );
}
