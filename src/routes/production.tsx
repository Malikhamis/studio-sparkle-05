/**
 * Production Pipeline
 *
 * Shows the blueprint → capture → diffusion → audio → edit → publish pipeline.
 * The blueprint stage connects to the real miDirector blueprint store.
 * All other stages are pending until their engines are wired up — no fake
 * progress bars or pretend-running states.
 */

import { createFileRoute, Link } from "@tanstack/react-router";
import {
  Cpu,
  Clapperboard,
  Sparkles,
  Mic,
  Scissors,
  Rocket,
  CircleCheck as CheckCircle2,
  CircleAlert as AlertCircle,
  ChevronRight,
  Info,
} from "lucide-react";
import { useBlueprintStore } from "@/store/blueprint-store";

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

type StageStatus = "pending" | "ready" | "complete" | "failed";

type PipelineStage = {
  id: string;
  label: string;
  icon: React.ElementType;
  description: string;
  status: StageStatus;
  detail?: string;
};

function ProductionPage() {
  const conversations = useBlueprintStore((s) => s.conversations);
  const activeId = useBlueprintStore((s) => s.activeId);

  // Use the active conversation's blueprint if it exists, else the most recent one.
  const activeConv =
    conversations.find((c) => c.id === activeId) ??
    [...conversations].sort((a, b) => b.updatedAt - a.updatedAt)[0];

  const blueprint = activeConv?.blueprint;
  const hasBlueprint = !!blueprint;

  const stages: PipelineStage[] = [
    {
      id: "blueprint",
      label: "Blueprint",
      icon: Clapperboard,
      description: "Scene breakdown from miDirector",
      status: hasBlueprint ? "complete" : "pending",
      detail: hasBlueprint
        ? `${blueprint.scenes.length} scene${blueprint.scenes.length !== 1 ? "s" : ""} · "${blueprint.title}"`
        : "Run a miDirector interview to generate a blueprint.",
    },
    {
      id: "capture",
      label: "Capture",
      icon: Cpu,
      description: "Live capture + import for reference footage",
      status: "pending",
      detail: "Not yet wired — upload reference footage via Assets.",
    },
    {
      id: "diffusion",
      label: "Diffusion",
      icon: Sparkles,
      description: "AI image / video generation per scene",
      status: "pending",
      detail: "Not yet wired — diffusion engine in roadmap.",
    },
    {
      id: "audio",
      label: "Audio",
      icon: Mic,
      description: "TTS narration, music, sound design",
      status: "pending",
      detail: "Not yet wired — audio engine in roadmap.",
    },
    {
      id: "edit",
      label: "Edit",
      icon: Scissors,
      description: "Auto-assembly, timeline, cuts",
      status: "pending",
      detail: "Not yet wired — editor engine in roadmap.",
    },
    {
      id: "publish",
      label: "Publish",
      icon: Rocket,
      description: "Render final, schedule, distribute",
      status: "pending",
      detail: "Not yet wired — publish engine in roadmap.",
    },
  ];

  const completeCount = stages.filter((s) => s.status === "complete").length;
  const overallPct = Math.round((completeCount / stages.length) * 100);

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
        {!hasBlueprint && (
          <div className="ml-auto">
            <Link
              to="/director"
              className="inline-flex h-9 items-center gap-1.5 rounded-md px-3 text-[12.5px] font-semibold text-white"
              style={{ background: "var(--gradient-iris)" }}
            >
              <Clapperboard className="h-3.5 w-3.5" />
              Create Blueprint
            </Link>
          </div>
        )}
      </header>

      {/* Overall progress */}
      <div className="hk-card p-4">
        <div className="flex items-center justify-between">
          <span className="text-[12px] font-medium text-text-secondary">Overall Progress</span>
          <span className="text-[12px] font-semibold text-text-primary">{overallPct}%</span>
        </div>
        <div className="mt-2 h-2 overflow-hidden rounded-full bg-white/[0.06]">
          <div
            className="h-full rounded-full transition-all"
            style={{
              width: `${overallPct}%`,
              background: "var(--gradient-brand)",
            }}
          />
        </div>
        <div className="mt-2 text-[11px] text-text-dim">
          {completeCount} of {stages.length} stages ready
        </div>
      </div>

      {/* Pipeline stages */}
      <div className="hk-card overflow-hidden">
        <div className="divide-y divide-white/[0.06]">
          {stages.map((stage) => (
            <StageCard key={stage.id} stage={stage} />
          ))}
        </div>
      </div>

      {/* Info banner */}
      <div className="rounded-lg border border-iris/30 bg-iris/10 p-4">
        <div className="flex items-start gap-3">
          <Info className="mt-0.5 h-5 w-5 shrink-0 text-iris" />
          <div>
            <h3 className="text-[13px] font-semibold text-text-primary">
              Automation-first, manual when needed
            </h3>
            <p className="mt-1 text-[12px] leading-relaxed text-text-secondary">
              The pipeline runs automatically from your miDirector blueprint. Each stage can be
              paused or overridden manually. Stages marked{" "}
              <span className="text-text-primary font-medium">Pending</span> are on the
              roadmap — they'll light up as they're wired to live engines.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function StageCard({ stage }: { stage: PipelineStage }) {
  const Icon = stage.icon;
  const isComplete = stage.status === "complete";
  const isFailed = stage.status === "failed";

  return (
    <div className="flex items-start gap-4 p-4 transition-colors hover:bg-elevated/40">
      <div className="flex items-center gap-3">
        <div
          className={`flex h-10 w-10 items-center justify-center rounded-lg ${
            isComplete
              ? "bg-mint/15"
              : isFailed
                ? "bg-[#FF5370]/15"
                : "bg-white/[0.04]"
          }`}
        >
          {isComplete ? (
            <CheckCircle2 className="h-5 w-5 text-mint" />
          ) : isFailed ? (
            <AlertCircle className="h-5 w-5 text-[#FF5370]" />
          ) : (
            <Icon className="h-5 w-5 text-text-dim" />
          )}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h3 className="text-[14px] font-semibold text-text-primary">{stage.label}</h3>
            {isComplete && (
              <span className="rounded-full bg-mint/15 px-2 py-0.5 text-[10px] font-medium text-mint">
                Ready
              </span>
            )}
            {isFailed && (
              <span className="rounded-full bg-[#FF5370]/15 px-2 py-0.5 text-[10px] font-medium text-[#FF5370]">
                Failed
              </span>
            )}
            {!isComplete && !isFailed && (
              <span className="rounded-full bg-white/[0.06] px-2 py-0.5 text-[10px] font-medium text-text-dim">
                Pending
              </span>
            )}
          </div>
          <p className="mt-0.5 text-[12px] text-text-secondary">{stage.description}</p>
          {stage.detail && (
            <p className="mt-1 text-[11.5px] text-text-dim">{stage.detail}</p>
          )}
        </div>
      </div>
      <button className="flex h-8 w-8 shrink-0 items-center justify-center rounded text-text-dim hover:bg-elevated hover:text-text-primary">
        <ChevronRight className="h-4 w-4" />
      </button>
    </div>
  );
}
