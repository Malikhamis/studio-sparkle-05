import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import {
  Rocket,
  Plus,
  Calendar,
  Trash2,
  RefreshCw,
  Play,
  CircleCheck as CheckCircle2,
  CircleAlert as AlertCircle,
  Loader as Loader2,
  Clock,
  Link as LinkIcon,
  X,
} from "lucide-react";
import {
  usePublishStore,
  PLATFORMS,
  type Platform,
  type PublishPost,
  type PublishStatus,
} from "@/store/publish-store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";

export const Route = createFileRoute("/publish")({
  head: () => ({
    meta: [
      { title: "Publish — Hooke" },
      {
        name: "description",
        content:
          "Publish to YouTube, TikTok, Instagram, Facebook, LinkedIn, and X. Schedule, track uploads, and manage platform connections.",
      },
      { property: "og:title", content: "Publish — Hooke" },
      {
        property: "og:description",
        content:
          "Multi-platform publishing with scheduling, upload queue, and connection management.",
      },
    ],
  }),
  component: PublishPage,
});

const STATUS_STYLES: Record<
  PublishStatus,
  { dot: string; text: string; label: string }
> = {
  draft: { dot: "bg-white/40", text: "text-text-dim", label: "Draft" },
  scheduled: { dot: "bg-amber-400", text: "text-amber-300", label: "Scheduled" },
  uploading: { dot: "bg-sky-400", text: "text-sky-300", label: "Uploading" },
  published: { dot: "bg-emerald-400", text: "text-emerald-300", label: "Published" },
  failed: { dot: "bg-rose-400", text: "text-rose-300", label: "Failed" },
};

function PublishPage() {
  const { posts, connections, seedIfEmpty, tick } = usePublishStore();
  const [composerOpen, setComposerOpen] = useState(false);
  const [connectionsOpen, setConnectionsOpen] = useState(false);

  useEffect(() => {
    seedIfEmpty();
  }, [seedIfEmpty]);

  useEffect(() => {
    const id = setInterval(tick, 1500);
    return () => clearInterval(id);
  }, [tick]);

  const counts = useMemo(() => {
    const c = { draft: 0, scheduled: 0, uploading: 0, published: 0, failed: 0 };
    for (const p of posts) c[p.status]++;
    return c;
  }, [posts]);

  return (
    <div className="flex flex-col gap-6 p-4 md:p-6">
      <header className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-white/[0.04]">
            <Rocket className="h-5 w-5 text-text-primary" />
          </div>
          <div>
            <h1 className="text-[22px] font-semibold text-text-primary">Publish</h1>
            <p className="text-[12.5px] text-text-dim">
              {connections.length} platform{connections.length === 1 ? "" : "s"} connected · {posts.length} post
              {posts.length === 1 ? "" : "s"}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setConnectionsOpen(true)}
            className="text-[12px]"
          >
            <LinkIcon className="h-3.5 w-3.5" />
            Connections
          </Button>
          <Button
            size="sm"
            onClick={() => setComposerOpen(true)}
            style={{ background: "var(--gradient-iris)" }}
            className="text-[12px] text-white"
          >
            <Plus className="h-3.5 w-3.5" />
            New Post
          </Button>
        </div>
      </header>

      <div className="grid grid-cols-2 gap-2 md:grid-cols-5">
        {(Object.keys(STATUS_STYLES) as PublishStatus[]).map((s) => (
          <div key={s} className="hk-card p-3">
            <div className="flex items-center gap-2">
              <span className={`h-2 w-2 rounded-full ${STATUS_STYLES[s].dot}`} />
              <span className={`text-[11px] uppercase tracking-wide ${STATUS_STYLES[s].text}`}>
                {STATUS_STYLES[s].label}
              </span>
            </div>
            <div className="mt-1 text-[22px] font-semibold text-text-primary">{counts[s]}</div>
          </div>
        ))}
      </div>

      {posts.length === 0 ? (
        <div className="hk-card flex flex-col items-center gap-3 p-10 text-center">
          <Rocket className="h-8 w-8 text-text-dim" />
          <div>
            <div className="text-[14px] font-semibold text-text-primary">No posts yet</div>
            <p className="mt-1 text-[12px] text-text-dim">
              Create a post to publish or schedule across your connected platforms.
            </p>
          </div>
          <Button size="sm" onClick={() => setComposerOpen(true)} className="mt-2">
            <Plus className="h-3.5 w-3.5" />
            New Post
          </Button>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {posts.map((p) => (
            <PostRow key={p.id} post={p} />
          ))}
        </div>
      )}

      <ComposerDialog open={composerOpen} onOpenChange={setComposerOpen} />
      <ConnectionsDialog open={connectionsOpen} onOpenChange={setConnectionsOpen} />
    </div>
  );
}

function PostRow({ post }: { post: PublishPost }) {
  const { publishNow, retryPost, removePost } = usePublishStore();
  const status = STATUS_STYLES[post.status];

  return (
    <div className="hk-card flex flex-col gap-3 p-4">
      <div className="flex flex-col gap-3 md:flex-row md:items-start">
        <div
          className="h-16 w-full shrink-0 rounded-lg md:h-16 md:w-24"
          style={{
            background: `linear-gradient(135deg, ${post.thumbnailColor}, rgba(0,0,0,0.5))`,
          }}
        />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className={`h-2 w-2 rounded-full ${status.dot}`} />
            <span className={`text-[10px] uppercase tracking-wide ${status.text}`}>
              {status.label}
            </span>
            <h3 className="truncate text-[14px] font-semibold text-text-primary">{post.title}</h3>
          </div>
          {post.description && (
            <p className="mt-1 line-clamp-2 text-[12px] text-text-secondary">{post.description}</p>
          )}
          <div className="mt-2 flex flex-wrap items-center gap-1.5">
            {post.platforms.map((pl) => (
              <PlatformChip key={pl} platform={pl} />
            ))}
            {post.status === "scheduled" && post.scheduledAt && (
              <span className="ml-auto flex items-center gap-1 text-[11px] text-amber-300">
                <Clock className="h-3 w-3" />
                {new Date(post.scheduledAt).toLocaleString()}
              </span>
            )}
            {post.status === "published" && post.publishedAt && (
              <span className="ml-auto flex items-center gap-1 text-[11px] text-emerald-300">
                <CheckCircle2 className="h-3 w-3" />
                {new Date(post.publishedAt).toLocaleString()}
              </span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-1">
          {post.status === "draft" && (
            <Button size="sm" variant="outline" onClick={() => publishNow(post.id)}>
              <Play className="h-3.5 w-3.5" />
              Publish
            </Button>
          )}
          {post.status === "scheduled" && (
            <Button size="sm" variant="outline" onClick={() => publishNow(post.id)}>
              <Play className="h-3.5 w-3.5" />
              Publish now
            </Button>
          )}
          {post.status === "failed" && (
            <Button size="sm" variant="outline" onClick={() => retryPost(post.id)}>
              <RefreshCw className="h-3.5 w-3.5" />
              Retry
            </Button>
          )}
          <Button
            size="icon"
            variant="ghost"
            onClick={() => removePost(post.id)}
            className="h-8 w-8"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      {post.status === "uploading" && (
        <div className="flex items-center gap-2">
          <Loader2 className="h-3.5 w-3.5 animate-spin text-sky-300" />
          <Progress value={post.uploadProgress} className="h-1.5 flex-1" />
          <span className="w-10 text-right font-mono text-[11px] text-text-dim">
            {Math.round(post.uploadProgress)}%
          </span>
        </div>
      )}
      {post.status === "failed" && post.errorMessage && (
        <div className="flex items-start gap-2 rounded-md bg-rose-500/10 p-2 text-[11.5px] text-rose-300">
          <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          <span>{post.errorMessage}</span>
        </div>
      )}
      {post.status === "published" && (
        <div className="grid grid-cols-2 gap-2 rounded-lg bg-white/[0.02] p-2 md:grid-cols-5">
          <Stat label="Views" value={fmt(post.metrics.views)} />
          <Stat label="Watch min" value={fmt(post.metrics.watchTime)} />
          <Stat label="Likes" value={fmt(post.metrics.likes)} />
          <Stat label="Comments" value={fmt(post.metrics.comments)} />
          <Stat label="Shares" value={fmt(post.metrics.shares)} />
        </div>
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col">
      <span className="text-[10px] uppercase tracking-wide text-text-dim">{label}</span>
      <span className="text-[13px] font-semibold text-text-primary">{value}</span>
    </div>
  );
}

function PlatformChip({ platform }: { platform: Platform }) {
  const meta = PLATFORMS.find((p) => p.id === platform)!;
  return (
    <span
      className="inline-flex items-center gap-1 rounded-full border border-white/[0.06] px-2 py-0.5 text-[10.5px] text-text-secondary"
      style={{ boxShadow: `inset 0 0 0 1px ${meta.color}22` }}
    >
      <span className="h-1.5 w-1.5 rounded-full" style={{ background: meta.color }} />
      {meta.label}
    </span>
  );
}

function fmt(n: number) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}k`;
  return String(n);
}

function ComposerDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const { createPost, connections } = usePublishStore();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [selected, setSelected] = useState<Platform[]>([]);
  const [scheduleAt, setScheduleAt] = useState("");

  useEffect(() => {
    if (open) {
      setTitle("");
      setDescription("");
      setSelected(connections.map((c) => c.platform));
      setScheduleAt("");
    }
  }, [open, connections]);

  const toggle = (p: Platform) =>
    setSelected((s) => (s.includes(p) ? s.filter((x) => x !== p) : [...s, p]));

  const submit = () => {
    if (!title.trim() || selected.length === 0) return;
    createPost({
      title,
      description,
      platforms: selected,
      scheduledAt: scheduleAt ? new Date(scheduleAt).getTime() : undefined,
    });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>New post</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-4">
          <div className="space-y-1.5">
            <Label className="text-[11px] text-text-dim">Title</Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Post title" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-[11px] text-text-dim">Description</Label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Caption or description…"
              rows={3}
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-[11px] text-text-dim">Platforms</Label>
            <div className="flex flex-wrap gap-1.5">
              {PLATFORMS.map((p) => {
                const active = selected.includes(p.id);
                const connected = connections.some((c) => c.platform === p.id);
                return (
                  <button
                    key={p.id}
                    onClick={() => toggle(p.id)}
                    className={`flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] transition ${
                      active
                        ? "border-white/40 bg-white/10 text-text-primary"
                        : "border-white/[0.06] bg-transparent text-text-dim hover:text-text-secondary"
                    }`}
                  >
                    <span className="h-1.5 w-1.5 rounded-full" style={{ background: p.color }} />
                    {p.label}
                    {!connected && <span className="text-[9px] opacity-60">(not connected)</span>}
                  </button>
                );
              })}
            </div>
          </div>
          <div className="space-y-1.5">
            <Label className="flex items-center gap-1.5 text-[11px] text-text-dim">
              <Calendar className="h-3 w-3" />
              Schedule (optional)
            </Label>
            <Input
              type="datetime-local"
              value={scheduleAt}
              onChange={(e) => setScheduleAt(e.target.value)}
              className="text-[13px]"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={submit}
            disabled={!title.trim() || selected.length === 0}
            style={{ background: "var(--gradient-iris)" }}
            className="text-white"
          >
            {scheduleAt ? "Schedule" : "Save draft"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ConnectionsDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const { connections, connect, disconnect } = usePublishStore();
  const [handles, setHandles] = useState<Record<Platform, string>>(
    Object.fromEntries(PLATFORMS.map((p) => [p.id, ""])) as Record<Platform, string>
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Platform connections</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-2">
          {PLATFORMS.map((p) => {
            const active = connections.find((c) => c.platform === p.id);
            return (
              <div
                key={p.id}
                className="flex items-center gap-2 rounded-lg border border-white/[0.06] bg-white/[0.02] p-2.5"
              >
                <span className="h-2.5 w-2.5 rounded-full" style={{ background: p.color }} />
                <div className="min-w-0 flex-1">
                  <div className="text-[12.5px] font-medium text-text-primary">{p.label}</div>
                  {active ? (
                    <div className="text-[10.5px] text-emerald-300">Connected · {active.handle}</div>
                  ) : (
                    <div className="text-[10.5px] text-text-dim">Not connected</div>
                  )}
                </div>
                {active ? (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => disconnect(p.id)}
                    className="text-[11px]"
                  >
                    <X className="h-3 w-3" />
                    Disconnect
                  </Button>
                ) : (
                  <div className="flex items-center gap-1.5">
                    <Input
                      value={handles[p.id]}
                      onChange={(e) =>
                        setHandles((h) => ({ ...h, [p.id]: e.target.value }))
                      }
                      placeholder="@handle"
                      className="h-7 w-28 text-[11px]"
                    />
                    <Button
                      size="sm"
                      onClick={() => {
                        const h = handles[p.id].trim();
                        if (h) connect(p.id, h);
                      }}
                      className="text-[11px]"
                    >
                      Connect
                    </Button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
        <p className="text-[10.5px] text-text-dim">
          Local demo connections. OAuth flow arrives when platform APIs are wired up.
        </p>
      </DialogContent>
    </Dialog>
  );
}
