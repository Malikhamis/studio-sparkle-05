import { useEffect, useMemo, useRef, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import {
  Clapperboard,
  Plus,
  Send,
  Sparkles,
  Trash2,
  Download,
  ChevronLeft,
  ChevronRight,
  Wand2,
  PlusCircle,
  X,
  MessageSquare,
  Loader2,
} from "lucide-react";
import {
  useBlueprintStore,
  INTERVIEW_FIELDS,
  INTERVIEW_TOTAL,
  STRATEGY_PRESETS,
  type Conversation,
  type StrategyPreset,
} from "@/store/blueprint-store";

export const Route = createFileRoute("/director")({
  head: () => ({
    meta: [
      { title: "miDirector — Hooke" },
      {
        name: "description",
        content:
          "Conversational AI director that turns intent into a shootable blueprint.",
      },
      { property: "og:title", content: "miDirector — Hooke" },
      {
        property: "og:description",
        content:
          "Conversational AI director that turns intent into a shootable blueprint.",
      },
    ],
  }),
  component: DirectorPage,
});

function DirectorPage() {
  const conversations = useBlueprintStore((s) => s.conversations);
  const activeId = useBlueprintStore((s) => s.activeId);
  const setActive = useBlueprintStore((s) => s.setActive);
  const startConversation = useBlueprintStore((s) => s.startConversation);
  const deleteConversation = useBlueprintStore((s) => s.deleteConversation);

  const [creating, setCreating] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);

  const active = useMemo(
    () => conversations.find((c) => c.id === activeId) ?? null,
    [conversations, activeId],
  );

  // Auto-pick the most recent conversation when activeId is stale or null
  useEffect(() => {
    if (!active && conversations.length > 0) setActive(conversations[0].id);
  }, [active, conversations, setActive]);

  return (
    <div className="mx-auto flex w-full max-w-[1600px] flex-col gap-4">
      <header className="flex items-center gap-3">
        <button
          onClick={() => setHistoryOpen((v) => !v)}
          className="lg:hidden inline-flex h-9 items-center gap-1.5 rounded-md border border-white/10 bg-surface px-3 text-[12.5px] text-text-secondary hover:text-text-primary"
        >
          <MessageSquare className="h-3.5 w-3.5" />
          History
        </button>
        <div className="flex items-center gap-3">
          <div
            className="flex h-10 w-10 items-center justify-center rounded-xl"
            style={{ background: "var(--gradient-iris)" }}
          >
            <Clapperboard className="h-5 w-5 text-white" />
          </div>
          <div>
            <h1 className="hk-text-display text-[20px] font-bold text-text-primary">
              miDirector
            </h1>
            <p className="text-[12px] text-text-secondary">
              Conversational AI director — interview to blueprint.
            </p>
          </div>
        </div>
        <div className="ml-auto">
          <button
            onClick={() => setCreating(true)}
            className="inline-flex h-9 items-center gap-1.5 rounded-md px-3 text-[13px] font-semibold text-white"
            style={{ background: "var(--gradient-iris)" }}
          >
            <Plus className="h-3.5 w-3.5" />
            New interview
          </button>
        </div>
      </header>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[240px_minmax(0,1fr)_minmax(0,1.05fr)]">
        {/* History — desktop column */}
        <div className="hidden lg:block">
          <HistoryList
            conversations={conversations}
            activeId={activeId}
            onPick={setActive}
            onDelete={deleteConversation}
            onCreate={() => setCreating(true)}
          />
        </div>

        {/* History — mobile drawer */}
        {historyOpen && (
          <div className="fixed inset-0 z-50 flex lg:hidden">
            <div
              className="absolute inset-0 bg-black/70"
              onClick={() => setHistoryOpen(false)}
            />
            <div className="relative z-10 w-72 max-w-[80vw] border-r border-white/10 bg-base p-3">
              <div className="mb-2 flex items-center justify-between">
                <span className="text-[11.5px] font-medium uppercase tracking-wider text-text-secondary">
                  Interviews
                </span>
                <button
                  onClick={() => setHistoryOpen(false)}
                  className="flex h-7 w-7 items-center justify-center rounded-md text-text-secondary hover:bg-elevated"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
              <HistoryList
                conversations={conversations}
                activeId={activeId}
                onPick={(id) => {
                  setActive(id);
                  setHistoryOpen(false);
                }}
                onDelete={deleteConversation}
                onCreate={() => {
                  setCreating(true);
                  setHistoryOpen(false);
                }}
              />
            </div>
          </div>
        )}

        {active ? (
          <>
            <InterviewPane conversation={active} />
            <BlueprintPane conversation={active} />
          </>
        ) : (
          <div className="lg:col-span-2">
            <EmptyDirector onCreate={() => setCreating(true)} />
          </div>
        )}
      </div>

      {creating && (
        <NewInterviewDialog
          onClose={() => setCreating(false)}
          onCreate={(opts) => {
            startConversation(opts);
            setCreating(false);
          }}
        />
      )}
    </div>
  );
}

/* ---------- History sidebar ---------- */
function HistoryList({
  conversations,
  activeId,
  onPick,
  onDelete,
  onCreate,
}: {
  conversations: Conversation[];
  activeId: string | null;
  onPick: (id: string) => void;
  onDelete: (id: string) => void;
  onCreate: () => void;
}) {
  return (
    <div className="hk-card flex h-full max-h-[calc(100vh-180px)] flex-col p-2.5">
      <button
        onClick={onCreate}
        className="mb-2 inline-flex h-8 items-center justify-center gap-1.5 rounded-md border border-dashed border-white/15 text-[12px] text-text-secondary hover:border-iris/50 hover:text-iris"
      >
        <PlusCircle className="h-3.5 w-3.5" />
        New interview
      </button>
      <div className="flex-1 overflow-y-auto">
        {conversations.length === 0 ? (
          <div className="px-2 py-6 text-center text-[11.5px] text-text-dim">
            No interviews yet.
          </div>
        ) : (
          <ul className="flex flex-col gap-1">
            {conversations.map((c) => {
              const isActive = c.id === activeId;
              return (
                <li key={c.id}>
                  <button
                    onClick={() => onPick(c.id)}
                    className={`group flex w-full items-start gap-2 rounded-md px-2 py-2 text-left transition-colors ${
                      isActive
                        ? "bg-elevated"
                        : "hover:bg-elevated/60"
                    }`}
                  >
                    <div
                      className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full"
                      style={{
                        background: isActive
                          ? "var(--accent-iris)"
                          : "var(--text-dim)",
                      }}
                    />
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-[12.5px] font-medium text-text-primary">
                        {c.title}
                      </div>
                      <div className="mt-0.5 truncate text-[10.5px] uppercase tracking-wider text-text-dim">
                        {c.preset} ·{" "}
                        {c.blueprint
                          ? `${c.blueprint.scenes.length} scenes`
                          : `Step ${Math.min(c.step + 1, INTERVIEW_TOTAL)}/${INTERVIEW_TOTAL}`}
                      </div>
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        if (confirm(`Delete "${c.title}"?`)) onDelete(c.id);
                      }}
                      className="flex h-6 w-6 shrink-0 items-center justify-center rounded text-text-dim opacity-0 transition-opacity hover:text-[#FF5370] group-hover:opacity-100"
                      aria-label="Delete interview"
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}

/* ---------- Interview pane ---------- */
function InterviewPane({ conversation }: { conversation: Conversation }) {
  const reply = useBlueprintStore((s) => s.reply);
  const jumpToStep = useBlueprintStore((s) => s.jumpToStep);
  const generateBlueprint = useBlueprintStore((s) => s.generateBlueprint);
  const directorTyping = useBlueprintStore((s) => s.directorTyping);
  const generating = useBlueprintStore((s) => s.generating);

  const [draft, setDraft] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [conversation.turns.length]);

  const done = conversation.step >= INTERVIEW_TOTAL;
  const currentField = INTERVIEW_FIELDS[conversation.step];

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (done) return;
    reply(draft);
    setDraft("");
  };

  const progressPct = Math.min(
    100,
    Math.round((conversation.step / INTERVIEW_TOTAL) * 100),
  );

  return (
    <div className="hk-card flex h-[calc(100vh-200px)] min-h-[520px] flex-col overflow-hidden">
      {/* Progress */}
      <div className="border-b border-white/[0.06] px-4 py-3">
        <div className="mb-2 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-[11.5px] font-medium uppercase tracking-wider text-text-secondary">
              Interview
            </span>
            <span className="rounded-full bg-iris/10 px-2 py-0.5 text-[10.5px] font-medium text-iris">
              {STRATEGY_PRESETS.find((p) => p.id === conversation.preset)?.name}
            </span>
          </div>
          <span className="text-[11px] text-text-dim">
            {Math.min(conversation.step, INTERVIEW_TOTAL)}/{INTERVIEW_TOTAL}
          </span>
        </div>
        <div className="h-1 overflow-hidden rounded-full bg-elevated">
          <div
            className="h-full rounded-full transition-all"
            style={{
              width: `${progressPct}%`,
              background: "var(--gradient-iris)",
            }}
          />
        </div>
        <div className="mt-2 flex items-center gap-1 overflow-x-auto pb-0.5">
          {INTERVIEW_FIELDS.map((f, i) => (
            <button
              key={f.key}
              onClick={() => jumpToStep(i)}
              className={`shrink-0 rounded px-2 py-0.5 text-[10.5px] uppercase tracking-wider transition-colors ${
                i === conversation.step
                  ? "bg-iris/15 text-iris"
                  : i < conversation.step
                    ? "text-mint hover:bg-elevated"
                    : "text-text-dim hover:bg-elevated"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto p-4">
        {conversation.turns.map((t) => (
          <div
            key={t.id}
            className={`flex ${t.role === "user" ? "justify-end" : "justify-start"}`}
          >
            <div
              className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 text-[13px] leading-relaxed ${
                t.role === "user"
                  ? "text-white"
                  : "border border-white/[0.06] bg-elevated text-text-primary"
              } ${t.ephemeral ? "opacity-50" : ""}`}
              style={
                t.role === "user"
                  ? { background: "var(--gradient-iris)" }
                  : undefined
              }
            >
              {t.ephemeral ? (
                <span className="flex gap-1 py-0.5">
                  {[0, 1, 2].map((i) => (
                    <span
                      key={i}
                      className="h-1.5 w-1.5 animate-bounce rounded-full bg-text-dim"
                      style={{ animationDelay: `${i * 160}ms` }}
                    />
                  ))}
                </span>
              ) : (
                t.content
              )}
            </div>
          </div>
        ))}
        {directorTyping && !conversation.turns.some((t) => t.ephemeral) && (
          <div className="flex justify-start">
            <div className="rounded-2xl border border-white/[0.06] bg-elevated px-4 py-3">
              <span className="flex gap-1 py-0.5">
                {[0, 1, 2].map((i) => (
                  <span
                    key={i}
                    className="h-1.5 w-1.5 animate-bounce rounded-full bg-text-dim"
                    style={{ animationDelay: `${i * 160}ms` }}
                  />
                ))}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Composer / Generate */}
      <div className="border-t border-white/[0.06] p-3">
        {done ? (
          <button
            onClick={() => void generateBlueprint()}
            disabled={generating}
            className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-md text-[14px] font-semibold text-white disabled:opacity-60"
            style={{ background: "var(--gradient-iris)" }}
          >
            {generating ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Drafting blueprint…
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4" />
                {conversation.blueprint ? "Regenerate blueprint" : "Generate blueprint"}
              </>
            )}
          </button>
        ) : (
          <form onSubmit={submit} className="flex flex-col gap-2">
            {currentField?.hint && (
              <div className="px-1 text-[10.5px] text-text-dim">
                {currentField.hint}
              </div>
            )}
            <div className="flex items-end gap-2">
              <textarea
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    submit(e);
                  }
                }}
                placeholder={currentField?.placeholder ?? "Your answer…"}
                rows={2}
                className="min-h-[44px] flex-1 resize-none rounded-md border border-white/10 bg-base px-3 py-2 text-[13px] text-text-primary placeholder:text-text-dim focus:border-iris focus:outline-none"
              />
              <div className="flex flex-col gap-1">
                <button
                  type="button"
                  onClick={() => jumpToStep(conversation.step - 1)}
                  disabled={conversation.step === 0}
                  className="flex h-[20px] w-9 items-center justify-center rounded border border-white/10 text-text-secondary disabled:opacity-30 hover:bg-elevated"
                  aria-label="Previous"
                >
                  <ChevronLeft className="h-3 w-3" />
                </button>
                <button
                  type="button"
                  onClick={() => jumpToStep(conversation.step + 1)}
                  className="flex h-[20px] w-9 items-center justify-center rounded border border-white/10 text-text-secondary hover:bg-elevated"
                  aria-label="Skip"
                >
                  <ChevronRight className="h-3 w-3" />
                </button>
              </div>
              <button
                type="submit"
                disabled={!draft.trim() || directorTyping || generating}
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-md text-white disabled:opacity-40"
                style={{ background: "var(--gradient-iris)" }}
                aria-label="Send"
              >
                {directorTyping ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

/* ---------- Blueprint pane ---------- */
function BlueprintPane({ conversation }: { conversation: Conversation }) {
  const updateScene = useBlueprintStore((s) => s.updateScene);
  const addScene = useBlueprintStore((s) => s.addScene);
  const removeScene = useBlueprintStore((s) => s.removeScene);
  const generateBlueprint = useBlueprintStore((s) => s.generateBlueprint);
  const generating = useBlueprintStore((s) => s.generating);
  const generationError = useBlueprintStore((s) => s.generationError);

  const bp = conversation.blueprint;

  const downloadJson = () => {
    if (!bp) return;
    const blob = new Blob([JSON.stringify(bp, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${slug(bp.title)}-blueprint.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (!bp) {
    return (
      <div className="hk-card flex h-[calc(100vh-200px)] min-h-[520px] flex-col items-center justify-center gap-4 p-6 text-center">
        <div
          className="flex h-12 w-12 items-center justify-center rounded-2xl"
          style={{ background: "var(--gradient-iris)" }}
        >
          <Wand2 className="h-6 w-6 text-white" />
        </div>
        <div>
          <h3 className="hk-text-display text-[15px] font-semibold text-text-primary">
            Blueprint will appear here
          </h3>
          <p className="mx-auto mt-1 max-w-xs text-[12.5px] text-text-secondary">
            Answer the interview on the left. Once we have enough, miDirector
            drafts a shootable scene list with prompt templates.
          </p>
        </div>
        <button
          onClick={() => void generateBlueprint()}
          disabled={generating}
          className="inline-flex h-9 items-center gap-1.5 rounded-md border border-iris/40 bg-iris/10 px-3 text-[12.5px] font-medium text-iris hover:bg-iris/20 disabled:opacity-60"
        >
          {generating ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <Sparkles className="h-3.5 w-3.5" />
          )}
          {generating ? "Drafting…" : "Generate from current answers"}
        </button>
        {generationError && (
          <div className="mt-2 rounded-md border border-[#FF5370]/30 bg-[#FF5370]/10 px-3 py-2 text-[11.5px] text-[#FF5370]">
            Generation failed — local fallback used. {generationError.slice(0, 120)}
          </div>
        )}
      </div>
    );
  }

  const totalDuration = bp.scenes.reduce((sum, s) => sum + s.duration, 0);

  return (
    <div className="hk-card flex h-[calc(100vh-200px)] min-h-[520px] flex-col overflow-hidden">
      <div className="flex items-center justify-between border-b border-white/[0.06] px-4 py-3">
        <div className="min-w-0">
          <div className="text-[11.5px] font-medium uppercase tracking-wider text-text-secondary">
            Blueprint
          </div>
          <div className="hk-text-display truncate text-[15px] font-semibold text-text-primary">
            {bp.title}
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => void generateBlueprint()}
            disabled={generating}
            className="inline-flex h-8 items-center gap-1.5 rounded-md border border-white/10 px-2.5 text-[11.5px] text-text-secondary hover:bg-elevated hover:text-text-primary disabled:opacity-60"
            title="Regenerate"
          >
            {generating ? (
              <Loader2 className="h-3 w-3 animate-spin" />
            ) : (
              <Sparkles className="h-3 w-3" />
            )}
            {generating ? "Generating…" : "Regenerate"}
          </button>
          <button
            onClick={downloadJson}
            className="inline-flex h-8 items-center gap-1.5 rounded-md border border-white/10 px-2.5 text-[11.5px] text-text-secondary hover:bg-elevated hover:text-text-primary"
          >
            <Download className="h-3 w-3" />
            JSON
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        {/* Summary */}
        <div className="mb-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
          <Stat label="Scenes" value={String(bp.scenes.length)} />
          <Stat label="Runtime" value={fmtDuration(totalDuration)} />
          <Stat label="Format" value={bp.format} />
          <Stat
            label="Preset"
            value={
              STRATEGY_PRESETS.find((p) => p.id === bp.preset)?.name ?? bp.preset
            }
          />
        </div>

        <div className="mb-4 rounded-lg border border-white/[0.06] bg-base/40 p-3">
          <div className="mb-1 text-[10.5px] font-medium uppercase tracking-wider text-text-dim">
            Logline
          </div>
          <div className="text-[13px] leading-relaxed text-text-primary">
            {bp.logline || "—"}
          </div>
          {bp.tone && (
            <div className="mt-2 text-[11.5px] text-text-secondary">
              <span className="text-text-dim">Tone · </span>
              {bp.tone}
            </div>
          )}
        </div>

        <div className="flex flex-col gap-2.5">
          {bp.scenes.map((s) => (
            <div
              key={s.id}
              className="rounded-lg border border-white/[0.06] bg-base/40 p-3"
            >
              <div className="mb-2 flex items-center gap-2">
                <div
                  className="flex h-6 w-6 items-center justify-center rounded text-[10.5px] font-semibold text-white"
                  style={{ background: "var(--gradient-iris)" }}
                >
                  {s.number}
                </div>
                <input
                  value={s.heading}
                  onChange={(e) =>
                    updateScene(s.id, { heading: e.target.value })
                  }
                  className="hk-text-display flex-1 bg-transparent text-[13.5px] font-semibold text-text-primary focus:outline-none"
                />
                <div className="flex items-center gap-1">
                  <input
                    type="number"
                    min={1}
                    value={s.duration}
                    onChange={(e) =>
                      updateScene(s.id, {
                        duration: Math.max(1, Number(e.target.value) || 1),
                      })
                    }
                    className="h-6 w-14 rounded border border-white/10 bg-base px-2 text-right text-[11px] text-text-primary focus:border-iris focus:outline-none"
                  />
                  <span className="text-[10.5px] text-text-dim">sec</span>
                  <button
                    onClick={() => removeScene(s.id)}
                    className="ml-1 flex h-6 w-6 items-center justify-center rounded text-text-dim hover:bg-elevated hover:text-[#FF5370]"
                    aria-label="Remove scene"
                  >
                    <Trash2 className="h-3 w-3" />
                  </button>
                </div>
              </div>
              <textarea
                value={s.beat}
                onChange={(e) => updateScene(s.id, { beat: e.target.value })}
                rows={2}
                className="mb-2 w-full resize-none rounded border border-white/10 bg-base px-2.5 py-1.5 text-[12px] text-text-primary focus:border-iris focus:outline-none"
              />
              <div className="mb-1 text-[10px] font-medium uppercase tracking-wider text-text-dim">
                Prompt
              </div>
              <textarea
                value={s.prompt}
                onChange={(e) => updateScene(s.id, { prompt: e.target.value })}
                rows={2}
                className="w-full resize-none rounded border border-white/10 bg-base px-2.5 py-1.5 font-mono text-[11.5px] text-text-secondary focus:border-iris focus:outline-none"
              />
            </div>
          ))}
          <button
            onClick={addScene}
            className="inline-flex h-9 items-center justify-center gap-1.5 rounded-md border border-dashed border-white/15 text-[12px] text-text-secondary hover:border-iris/50 hover:text-iris"
          >
            <PlusCircle className="h-3.5 w-3.5" />
            Add scene
          </button>
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-white/[0.06] bg-base/40 p-2.5">
      <div className="text-[10px] font-medium uppercase tracking-wider text-text-dim">
        {label}
      </div>
      <div className="mt-0.5 truncate text-[13px] font-semibold text-text-primary">
        {value}
      </div>
    </div>
  );
}

/* ---------- New interview dialog ---------- */
function NewInterviewDialog({
  onClose,
  onCreate,
}: {
  onClose: () => void;
  onCreate: (opts: { title: string; preset: StrategyPreset }) => void;
}) {
  const [title, setTitle] = useState("");
  const [preset, setPreset] = useState<StrategyPreset>("cinematic");

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <form
        onSubmit={(e) => {
          e.preventDefault();
          onCreate({ title: title || "Untitled interview", preset });
        }}
        className="relative z-10 w-full max-w-lg overflow-hidden rounded-[16px] border border-white/10 bg-surface shadow-2xl"
      >
        <header className="flex items-center justify-between border-b border-white/[0.06] px-5 py-3.5">
          <h2 className="hk-text-display text-[15px] font-semibold text-text-primary">
            New interview
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="flex h-7 w-7 items-center justify-center rounded-md text-text-secondary hover:bg-elevated hover:text-text-primary"
          >
            <X className="h-4 w-4" />
          </button>
        </header>
        <div className="space-y-4 p-5">
          <label className="block">
            <div className="mb-1.5 text-[11.5px] font-medium uppercase tracking-wider text-text-secondary">
              Title
            </div>
            <input
              autoFocus
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Aurora launch film"
              className="h-9 w-full rounded-md border border-white/10 bg-base px-3 text-[13px] text-text-primary placeholder:text-text-dim focus:border-iris focus:outline-none"
            />
          </label>
          <div>
            <div className="mb-1.5 text-[11.5px] font-medium uppercase tracking-wider text-text-secondary">
              Strategy preset
            </div>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {STRATEGY_PRESETS.map((p) => {
                const active = preset === p.id;
                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => setPreset(p.id)}
                    className={`rounded-lg border p-3 text-left transition-colors ${
                      active
                        ? "border-iris bg-iris/10"
                        : "border-white/10 bg-base hover:border-white/20"
                    }`}
                  >
                    <div className="hk-text-display text-[13px] font-semibold text-text-primary">
                      {p.name}
                    </div>
                    <div className="mt-0.5 text-[11.5px] leading-snug text-text-secondary">
                      {p.blurb}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
        <footer className="flex justify-end gap-2 border-t border-white/[0.06] px-5 py-3">
          <button
            type="button"
            onClick={onClose}
            className="h-9 rounded-md border border-white/10 px-3 text-[13px] text-text-secondary hover:bg-elevated hover:text-text-primary"
          >
            Cancel
          </button>
          <button
            type="submit"
            className="inline-flex h-9 items-center gap-1.5 rounded-md px-3 text-[13px] font-semibold text-white"
            style={{ background: "var(--gradient-iris)" }}
          >
            <Sparkles className="h-3.5 w-3.5" />
            Start interview
          </button>
        </footer>
      </form>
    </div>
  );
}

/* ---------- Empty state ---------- */
function EmptyDirector({ onCreate }: { onCreate: () => void }) {
  return (
    <div className="hk-card flex h-[calc(100vh-200px)] min-h-[520px] flex-col items-center justify-center gap-4 p-8 text-center">
      <div
        className="flex h-14 w-14 items-center justify-center rounded-2xl"
        style={{ background: "var(--gradient-iris)" }}
      >
        <Clapperboard className="h-7 w-7 text-white" />
      </div>
      <div>
        <h2 className="hk-text-display text-[20px] font-bold text-text-primary">
          Start a new interview
        </h2>
        <p className="mx-auto mt-1 max-w-md text-[13px] text-text-secondary">
          miDirector will ask a short series of questions, then draft a
          shootable blueprint with editable scenes and prompt templates.
        </p>
      </div>
      <button
        onClick={onCreate}
        className="inline-flex h-10 items-center gap-1.5 rounded-md px-4 text-[13px] font-semibold text-white"
        style={{ background: "var(--gradient-iris)" }}
      >
        <Plus className="h-3.5 w-3.5" />
        New interview
      </button>
    </div>
  );
}

/* ---------- helpers ---------- */
function fmtDuration(sec: number) {
  if (sec < 60) return `${sec}s`;
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return s ? `${m}m ${s}s` : `${m}m`;
}
function slug(s: string) {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "") || "blueprint";
}
