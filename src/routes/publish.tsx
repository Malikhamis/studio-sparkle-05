import { createFileRoute } from "@tanstack/react-router";
import {
  Rocket,
  Plus,
  Calendar,
  Share2,
  Download,
  Eye,
  AlertCircle,
  CheckCircle2,
  Clock,
  Loader,
  Trash2,
  Copy,
  Youtube,
  Music,
  Instagram,
  Facebook,
  Linkedin,
  Twitter,
} from "lucide-react";
import { useState } from "react";
import { usePublishStore } from "@/store/publish-store";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/publish")({
  head: () => ({
    meta: [
      { title: "Publish Gate — Hooke" },
      {
        name: "description",
        content: "OAuth configuration, upload queue, scheduling, approvals, and export-only mode.",
      },
      { property: "og:title", content: "Publish Gate — Hooke" },
      {
        property: "og:description",
        content: "OAuth configuration, upload queue, scheduling, approvals, and export-only mode.",
      },
    ],
  }),
  component: PublishPage,
});

const PLATFORM_ICONS: Record<string, React.ElementType> = {
  youtube: Youtube,
  tiktok: Music,
  instagram: Instagram,
  facebook: Facebook,
  linkedin: Linkedin,
  x: Twitter,
};

const PLATFORM_COLORS: Record<string, string> = {
  youtube: "#FF0000",
  tiktok: "#000000",
  instagram: "#E4405F",
  facebook: "#1877F2",
  linkedin: "#0A66C2",
  x: "#000000",
};

function PublishPage() {
  const {
    jobs,
    activeJobId,
    setActive,
    createJob,
    updateJob,
    deleteJob,
    scheduleJob,
    publishNow,
    oauthConfigs,
    setOAuthToken,
    disconnectPlatform,
    isConnected,
    downloadExport,
  } = usePublishStore();

  const [showNewJob, setShowNewJob] = useState(false);
  const [newJobTitle, setNewJobTitle] = useState("");
  const [newJobDescription, setNewJobDescription] = useState("");
  const [selectedPlatforms, setSelectedPlatforms] = useState<
    ("youtube" | "tiktok" | "instagram" | "facebook" | "linkedin" | "x")[]
  >([]);
  const [showSettings, setShowSettings] = useState(false);

  const activeJob = jobs.find((j) => j.id === activeJobId) || jobs[0];

  const handleCreateJob = () => {
    if (!newJobTitle.trim() || selectedPlatforms.length === 0) return;
    createJob({
      projectId: "project-current",
      title: newJobTitle,
      description: newJobDescription,
      platforms: selectedPlatforms,
    });
    setNewJobTitle("");
    setNewJobDescription("");
    setSelectedPlatforms([]);
    setShowNewJob(false);
  };

  const statusColor = (status: string) => {
    switch (status) {
      case "published":
        return "text-mint";
      case "uploading":
        return "text-iris";
      case "scheduled":
        return "text-gold";
      case "failed":
        return "text-[#FF5370]";
      default:
        return "text-text-dim";
    }
  };

  const statusIcon = (status: string) => {
    switch (status) {
      case "published":
        return <CheckCircle2 className="h-4 w-4 text-mint" />;
      case "uploading":
        return <Loader className="h-4 w-4 animate-spin text-iris" />;
      case "scheduled":
        return <Clock className="h-4 w-4 text-gold" />;
      case "failed":
        return <AlertCircle className="h-4 w-4 text-[#FF5370]" />;
      default:
        return <Eye className="h-4 w-4 text-text-dim" />;
    }
  };

  return (
    <div className="mx-auto flex w-full max-w-[1480px] gap-5">
      {/* Main content */}
      <div className="flex-1 flex flex-col gap-5">
        {/* Header */}
        <header className="flex items-center gap-3">
          <div
            className="flex h-10 w-10 items-center justify-center rounded-xl"
            style={{ background: "var(--gradient-iris)" }}
          >
            <Rocket className="h-5 w-5 text-white" />
          </div>
          <div>
            <h1 className="hk-text-display text-[20px] font-bold text-text-primary">
              Publish Gate
            </h1>
            <p className="text-[12px] text-text-secondary">
              Schedule, upload, and manage exports across YouTube, TikTok, Instagram, Facebook,
              LinkedIn, and X.
            </p>
          </div>
          <div className="ml-auto flex items-center gap-2">
            <button
              onClick={() => setShowSettings(!showSettings)}
              className="inline-flex h-9 items-center gap-1.5 rounded-md border border-white/10 bg-surface px-3 text-[12.5px] font-medium text-text-secondary transition-colors hover:bg-elevated"
            >
              Settings
            </button>
            <button
              onClick={() => setShowNewJob(true)}
              className="inline-flex h-9 items-center gap-1.5 rounded-md px-3 text-[12.5px] font-semibold text-white"
              style={{ background: "var(--gradient-iris)" }}
            >
              <Plus className="h-3.5 w-3.5" />
              New Publish
            </button>
          </div>
        </header>

        {/* Settings panel */}
        {showSettings && (
          <div className="hk-card p-4">
            <h2 className="mb-4 text-[13px] font-semibold text-text-primary">
              Platform Connections
            </h2>
            <div className="grid gap-3 lg:grid-cols-2">
              {oauthConfigs.map((config) => {
                const Icon = PLATFORM_ICONS[config.platform];
                return (
                  <div
                    key={config.platform}
                    className="flex items-center justify-between rounded border border-white/[0.06] bg-white/[0.02] p-3"
                  >
                    <div className="flex items-center gap-2">
                      <Icon className="h-5 w-5" style={{ color: PLATFORM_COLORS[config.platform] }} />
                      <div>
                        <p className="text-[12px] font-medium text-text-primary capitalize">
                          {config.platform}
                        </p>
                        {config.connected ? (
                          <p className="text-[10px] text-mint">
                            Connected as {config.accountName || "Account"}
                          </p>
                        ) : (
                          <p className="text-[10px] text-text-secondary">Not connected</p>
                        )}
                      </div>
                    </div>
                    {config.connected ? (
                      <button
                        onClick={() => disconnectPlatform(config.platform)}
                        className="rounded px-2 py-1 text-[10px] font-medium text-[#FF5370] hover:bg-[#FF5370]/10"
                      >
                        Disconnect
                      </button>
                    ) : (
                      <button
                        onClick={() => {
                          // Simulate OAuth flow
                          setOAuthToken(
                            config.platform,
                            `token_${config.platform}_${Date.now()}`,
                            `refresh_${config.platform}_${Date.now()}`,
                            `Demo Account (${config.platform})`
                          );
                        }}
                        className="rounded px-2 py-1 text-[10px] font-medium text-iris hover:bg-iris/10"
                      >
                        Connect
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
            <p className="mt-4 text-[11px] text-text-secondary">
              ℹ️ In production, these would trigger OAuth flows. For now, "Connect" stores a mock
              token locally. Disconnect to test the "not connected" state.
            </p>
          </div>
        )}

        {/* New job form */}
        {showNewJob && (
          <div className="hk-card p-4">
            <h2 className="mb-4 text-[13px] font-semibold text-text-primary">
              Create Publish Job
            </h2>
            <div className="space-y-3">
              <div>
                <label className="block text-[11px] font-medium text-text-secondary mb-1">
                  Title
                </label>
                <input
                  type="text"
                  value={newJobTitle}
                  onChange={(e) => setNewJobTitle(e.target.value)}
                  placeholder="e.g., The Signal Episode 01"
                  className="w-full rounded border border-white/10 bg-surface px-3 py-2 text-[12px] text-text-primary placeholder:text-text-dim focus:border-iris/50 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-[11px] font-medium text-text-secondary mb-1">
                  Description (optional)
                </label>
                <textarea
                  value={newJobDescription}
                  onChange={(e) => setNewJobDescription(e.target.value)}
                  placeholder="Video description..."
                  rows={3}
                  className="w-full rounded border border-white/10 bg-surface px-3 py-2 text-[12px] text-text-primary placeholder:text-text-dim focus:border-iris/50 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-[11px] font-medium text-text-secondary mb-2">
                  Platforms
                </label>
                <div className="grid grid-cols-2 gap-2 lg:grid-cols-3">
                  {(["youtube", "tiktok", "instagram", "facebook", "linkedin", "x"] as const).map(
                    (platform) => (
                      <button
                        key={platform}
                        onClick={() =>
                          setSelectedPlatforms((prev) =>
                            prev.includes(platform)
                              ? prev.filter((p) => p !== platform)
                              : [...prev, platform]
                          )
                        }
                        className={cn(
                          "rounded border px-3 py-2 text-[11px] font-medium transition-colors",
                          selectedPlatforms.includes(platform)
                            ? "border-iris/50 bg-iris/15 text-iris"
                            : "border-white/10 bg-white/[0.02] text-text-secondary hover:border-white/20"
                        )}
                      >
                        {platform.charAt(0).toUpperCase() + platform.slice(1)}
                      </button>
                    )
                  )}
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={handleCreateJob}
                  className="flex-1 rounded px-3 py-2 text-[12px] font-semibold text-white"
                  style={{ background: "var(--gradient-iris)" }}
                >
                  Create
                </button>
                <button
                  onClick={() => setShowNewJob(false)}
                  className="rounded border border-white/10 px-3 py-2 text-[12px] font-medium text-text-secondary hover:bg-elevated"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Job list */}
        {jobs.length === 0 ? (
          <div className="flex flex-1 items-center justify-center rounded border border-white/[0.06] bg-white/[0.02]">
            <div className="text-center">
              <Rocket className="h-12 w-12 mx-auto text-text-dim mb-3" />
              <p className="text-[14px] font-medium text-text-primary">
                No publish jobs yet
              </p>
              <p className="text-[12px] text-text-secondary mt-1">
                Create your first publish job to get started
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-2">
            {jobs.map((job) => {
              const isActive = job.id === activeJobId;
              return (
                <div
                  key={job.id}
                  onClick={() => setActive(job.id)}
                  className={cn(
                    "hk-card cursor-pointer p-3 transition-all",
                    isActive && "border-iris/50 bg-iris/10"
                  )}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        {statusIcon(job.status)}
                        <h3 className="text-[13px] font-semibold text-text-primary truncate">
                          {job.title}
                        </h3>
                        <span
                          className={cn(
                            "rounded-full px-2 py-0.5 text-[9px] font-medium capitalize",
                            job.status === "published"
                              ? "bg-mint/15 text-mint"
                              : job.status === "uploading"
                                ? "bg-iris/15 text-iris"
                                : job.status === "scheduled"
                                  ? "bg-gold/15 text-gold"
                                  : job.status === "failed"
                                    ? "bg-[#FF5370]/15 text-[#FF5370]"
                                    : "bg-text-dim/10 text-text-dim"
                          )}
                        >
                          {job.status}
                        </span>
                      </div>
                      {job.description && (
                        <p className="mt-1 text-[11px] text-text-secondary truncate">
                          {job.description}
                        </p>
                      )}
                      <div className="mt-2 flex flex-wrap gap-1">
                        {job.platforms.map((platform) => {
                          const Icon = PLATFORM_ICONS[platform];
                          return (
                            <div
                              key={platform}
                              className="flex items-center gap-1 rounded bg-white/[0.06] px-2 py-0.5"
                            >
                              <Icon
                                className="h-3 w-3"
                                style={{ color: PLATFORM_COLORS[platform] }}
                              />
                              <span className="text-[10px] text-text-secondary capitalize">
                                {platform}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      {job.status === "draft" && (
                        <>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              publishNow(job.id);
                            }}
                            className="flex h-7 w-7 items-center justify-center rounded text-text-dim hover:bg-iris/20 hover:text-iris"
                            title="Publish now"
                          >
                            <Rocket className="h-3.5 w-3.5" />
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              downloadExport(job.id, {
                                platform: job.platforms[0],
                                resolution: "1080p",
                                format: "mp4",
                                bitrate: 5000,
                              });
                            }}
                            className="flex h-7 w-7 items-center justify-center rounded text-text-dim hover:bg-gold/20 hover:text-gold"
                            title="Download export"
                          >
                            <Download className="h-3.5 w-3.5" />
                          </button>
                        </>
                      )}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteJob(job.id);
                        }}
                        className="flex h-7 w-7 items-center justify-center rounded text-text-dim hover:bg-[#FF5370]/20 hover:text-[#FF5370]"
                        title="Delete"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Info banner */}
        <div className="rounded-lg border border-iris/30 bg-iris/10 p-4">
          <div className="flex items-start gap-3">
            <Rocket className="mt-0.5 h-5 w-5 shrink-0 text-iris" />
            <div>
              <h3 className="text-[13px] font-semibold text-text-primary">
                Local-first publishing
              </h3>
              <p className="mt-1 text-[12px] leading-relaxed text-text-secondary">
                Create publish jobs, connect platform accounts (OAuth tokens stored locally), and
                manage your queue. "Publish Now" queues jobs. "Download Export" lets you export
                without uploading. No actual uploads occur — this is UI for managing your workflow.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
