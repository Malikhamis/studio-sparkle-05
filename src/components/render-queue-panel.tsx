import {
  Check,
  ChevronRight,
  X,
  Pause,
  Play,
  RefreshCw,
  Trash2,
  Clock,
  AlertCircle,
  Loader,
  CheckCircle2,
  ChevronDown,
} from "lucide-react";
import { useRenderQueueStore } from "@/store/render-queue-store";
import { useState } from "react";
import { cn } from "@/lib/utils";

export function RenderQueuePanel() {
  const {
    jobs,
    activeJobId,
    setActive,
    selectedJobIds,
    toggleSelect,
    selectAll,
    clearSelection,
    pauseSelected,
    resumeSelected,
    deleteSelected,
    pauseJob,
    resumeJob,
    retryJob,
    cancelJob,
  } = useRenderQueueStore();

  const [expandedJobId, setExpandedJobId] = useState<string | null>(null);
  const activeJob = jobs.find((j) => j.id === activeJobId);
  const isAllSelected = jobs.length > 0 && selectedJobIds.size === jobs.length;
  const hasSelection = selectedJobIds.size > 0;

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
      case "queued":
        return "text-text-dim";
      default:
        return "text-text-secondary";
    }
  };

  const statusIcon = (status: string) => {
    switch (status) {
      case "complete":
        return <CheckCircle2 className="h-4 w-4 text-mint" />;
      case "running":
        return <Loader className="h-4 w-4 animate-spin text-iris" />;
      case "failed":
        return <AlertCircle className="h-4 w-4 text-[#FF5370]" />;
      case "paused":
        return <Pause className="h-4 w-4 text-gold" />;
      default:
        return <Clock className="h-4 w-4 text-text-dim" />;
    }
  };

  return (
    <div className="flex h-full flex-col gap-3">
      {/* Header with controls */}
      <div className="flex flex-col gap-2 border-b border-white/[0.06] pb-3">
        <div className="flex items-center justify-between">
          <h2 className="text-[13px] font-semibold text-text-primary">
            Render Queue
          </h2>
          <span className="inline-flex items-center gap-1 rounded bg-iris/15 px-2 py-0.5 text-[10px] font-medium text-iris">
            {jobs.length}
          </span>
        </div>

        {/* Batch actions */}
        {hasSelection && (
          <div className="flex items-center gap-1.5 rounded bg-elevated/60 p-2">
            <input
              type="checkbox"
              checked={isAllSelected}
              onChange={() => (isAllSelected ? clearSelection() : selectAll())}
              className="h-3.5 w-3.5 cursor-pointer rounded border border-white/20"
            />
            <span className="text-[10px] text-text-secondary flex-1">
              {selectedJobIds.size} selected
            </span>
            <button
              onClick={resumeSelected}
              className="inline-flex items-center gap-1 rounded px-2 py-1 text-[10px] hover:bg-white/[0.08] text-text-secondary"
              title="Resume selected"
            >
              <Play className="h-3 w-3" />
            </button>
            <button
              onClick={pauseSelected}
              className="inline-flex items-center gap-1 rounded px-2 py-1 text-[10px] hover:bg-white/[0.08] text-text-secondary"
              title="Pause selected"
            >
              <Pause className="h-3 w-3" />
            </button>
            <button
              onClick={deleteSelected}
              className="inline-flex items-center gap-1 rounded px-2 py-1 text-[10px] hover:bg-white/[0.08] text-[#FF5370]"
              title="Delete selected"
            >
              <Trash2 className="h-3 w-3" />
            </button>
          </div>
        )}
      </div>

      {/* Job list */}
      <div className="flex-1 overflow-y-auto space-y-2">
        {jobs.length === 0 ? (
          <div className="flex h-32 items-center justify-center rounded border border-white/[0.06] bg-white/[0.02]">
            <p className="text-[12px] text-text-secondary">No render jobs yet</p>
          </div>
        ) : (
          jobs.map((job) => {
            const isActive = job.id === activeJobId;
            const isExpanded = job.id === expandedJobId;
            const isSelected = selectedJobIds.has(job.id);

            return (
              <div
                key={job.id}
                className={cn(
                  "rounded border transition-colors cursor-pointer",
                  isActive
                    ? "border-iris/50 bg-iris/10"
                    : "border-white/[0.06] bg-white/[0.02] hover:bg-white/[0.04]"
                )}
              >
                {/* Job header */}
                <div
                  className="flex items-center gap-2 p-2"
                  onClick={() => setActive(job.id)}
                >
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => toggleSelect(job.id)}
                    onClick={(e) => e.stopPropagation()}
                    className="h-3.5 w-3.5 cursor-pointer rounded border border-white/20"
                  />

                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setExpandedJobId(isExpanded ? null : job.id);
                    }}
                    className="flex h-4 w-4 items-center justify-center text-text-dim hover:text-text-primary"
                  >
                    <ChevronDown
                      className={cn(
                        "h-3 w-3 transition-transform",
                        isExpanded && "rotate-180"
                      )}
                    />
                  </button>

                  <div className="flex items-center gap-1.5 text-text-secondary">
                    {statusIcon(job.status)}
                  </div>

                  <div className="flex-1 min-w-0">
                    <p className="text-[12px] font-medium text-text-primary truncate">
                      {job.title}
                    </p>
                    <p className="text-[10px] text-text-dim truncate">
                      {job.projectId}
                    </p>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <span
                      className={cn(
                        "text-[10px] font-semibold",
                        statusColor(job.status)
                      )}
                    >
                      {job.overallProgress}%
                    </span>
                  </div>

                  {/* Quick actions */}
                  <div className="flex items-center gap-0.5">
                    {job.status === "running" && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          pauseJob(job.id);
                        }}
                        className="flex h-6 w-6 items-center justify-center rounded text-text-dim hover:bg-gold/20 hover:text-gold transition-colors"
                        title="Pause"
                      >
                        <Pause className="h-3 w-3" />
                      </button>
                    )}
                    {job.status === "paused" && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          resumeJob(job.id);
                        }}
                        className="flex h-6 w-6 items-center justify-center rounded text-text-dim hover:bg-iris/20 hover:text-iris transition-colors"
                        title="Resume"
                      >
                        <Play className="h-3 w-3" />
                      </button>
                    )}
                    {job.status === "failed" && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          retryJob(job.id);
                        }}
                        className="flex h-6 w-6 items-center justify-center rounded text-text-dim hover:bg-[#FF5370]/20 hover:text-[#FF5370] transition-colors"
                        title="Retry"
                      >
                        <RefreshCw className="h-3 w-3" />
                      </button>
                    )}
                  </div>
                </div>

                {/* Progress bar */}
                <div className="px-2 pb-2">
                  <div className="h-1 overflow-hidden rounded-full bg-white/[0.06]">
                    <div
                      className={cn(
                        "h-full rounded-full transition-all",
                        job.status === "complete"
                          ? "bg-mint"
                          : job.status === "failed"
                            ? "bg-[#FF5370]"
                            : job.status === "paused"
                              ? "bg-gold"
                              : "bg-iris"
                      )}
                      style={{ width: `${job.overallProgress}%` }}
                    />
                  </div>
                </div>

                {/* Expanded details */}
                {isExpanded && (
                  <div className="border-t border-white/[0.06] p-2 space-y-2">
                    {/* Stages */}
                    <div className="space-y-1">
                      <p className="text-[10px] font-medium text-text-secondary">
                        Stages
                      </p>
                      <div className="space-y-0.5">
                        {job.stages.map((stage) => (
                          <div
                            key={stage.id}
                            className="flex items-center gap-2 text-[10px]"
                          >
                            <div className="flex h-3 w-3 items-center justify-center">
                              {stage.status === "complete" ? (
                                <Check className="h-2.5 w-2.5 text-mint" />
                              ) : stage.status === "running" ? (
                                <Loader className="h-2.5 w-2.5 animate-spin text-iris" />
                              ) : stage.status === "failed" ? (
                                <X className="h-2.5 w-2.5 text-[#FF5370]" />
                              ) : (
                                <div className="h-1.5 w-1.5 rounded-full bg-white/[0.2]" />
                              )}
                            </div>
                            <span className="flex-1 text-text-secondary capitalize">
                              {stage.id}
                            </span>
                            {stage.status === "running" && (
                              <span className="text-text-dim">
                                {stage.progress}%
                              </span>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Error message */}
                    {job.status === "failed" && job.errorMessage && (
                      <div className="rounded bg-[#FF5370]/10 p-1.5 border border-[#FF5370]/20">
                        <p className="text-[9px] text-[#FF5370]">
                          {job.errorMessage}
                        </p>
                      </div>
                    )}

                    {/* Recent logs */}
                    {job.logs.length > 0 && (
                      <div className="space-y-1">
                        <p className="text-[10px] font-medium text-text-secondary">
                          Recent Logs
                        </p>
                        <div className="max-h-24 overflow-y-auto space-y-0.5 rounded bg-black/30 p-1">
                          {job.logs
                            .slice(-3)
                            .reverse()
                            .map((log, idx) => (
                              <div
                                key={idx}
                                className="text-[9px] font-mono text-text-secondary"
                              >
                                <span
                                  className={cn(
                                    log.level === "error"
                                      ? "text-[#FF5370]"
                                      : log.level === "success"
                                        ? "text-mint"
                                        : log.level === "warn"
                                          ? "text-gold"
                                          : "text-text-dim"
                                  )}
                                >
                                  [{log.level}]
                                </span>{" "}
                                {log.message}
                              </div>
                            ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
