/**
 * Blueprint Store — miDirector
 *
 * Manages the interview-to-blueprint workflow.
 *
 * When an AI provider is configured in Settings, the Director agent uses a
 * real LLM for both conversational responses and blueprint synthesis.
 * When no provider is configured, both fall back to local heuristics so the
 * app stays functional — with an explicit console warning, not silent fakery.
 */

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { idbStorage } from "@/lib/idb-storage";
import { eventBus } from "@/lib/platform/event-bus";
import { createClient } from "@/lib/llm";
import { useSettingsStore } from "@/store/settings-store";

export type StrategyPreset =
  | "cinematic"
  | "documentary"
  | "kinetic"
  | "product"
  | "narrative"
  | "social";

export type InterviewRole = "director" | "user" | "system";

export type InterviewTurn = {
  id: string;
  role: InterviewRole;
  content: string;
  at: number;
  /** which interview field this user turn answered (if any) */
  field?: InterviewFieldKey;
  /** ephemeral: true = placeholder shown while director is typing */
  ephemeral?: boolean;
};

export type InterviewFieldKey =
  | "logline"
  | "audience"
  | "tone"
  | "length"
  | "format"
  | "references";

export type InterviewAnswers = Partial<Record<InterviewFieldKey, string>>;

export type Scene = {
  id: string;
  number: number;
  heading: string;
  beat: string;
  shot: string;
  duration: number; // seconds
  prompt: string;
};

export type Blueprint = {
  id: string;
  title: string;
  preset: StrategyPreset;
  logline: string;
  audience: string;
  tone: string;
  length: string;
  format: string;
  references: string;
  scenes: Scene[];
  generatedByLLM?: boolean;
  createdAt: number;
  updatedAt: number;
};

export type Conversation = {
  id: string;
  projectId?: string;
  title: string;
  preset: StrategyPreset;
  turns: InterviewTurn[];
  answers: InterviewAnswers;
  step: number; // index into INTERVIEW_FIELDS; INTERVIEW_FIELDS.length === done
  blueprint?: Blueprint;
  createdAt: number;
  updatedAt: number;
};

type BlueprintState = {
  conversations: Conversation[];
  activeId: string | null;
  /** Blueprint generation in progress */
  generating: boolean;
  /** Director LLM response in progress */
  directorTyping: boolean;
  generationError: string | null;
  hydrated: boolean;

  startConversation: (opts: { preset: StrategyPreset; projectId?: string; title?: string }) => Conversation;
  setActive: (id: string | null) => void;
  deleteConversation: (id: string) => void;

  /**
   * Append a user reply to the active interview and advance the director.
   * The director's response comes from the LLM when a provider is configured,
   * or from local heuristics otherwise.
   */
  reply: (content: string) => void;

  /** Move to a specific step (skip / back). */
  jumpToStep: (step: number) => void;

  /**
   * Generate or regenerate the blueprint from current answers.
   * Uses the real LLM when a provider is configured; falls back to local
   * synthesis with an explicit warning when not configured.
   */
  generateBlueprint: () => Promise<Blueprint | undefined>;

  updateScene: (sceneId: string, patch: Partial<Omit<Scene, "id" | "number">>) => void;
  addScene: () => void;
  removeScene: (sceneId: string) => void;
};

const uid = () =>
  globalThis.crypto?.randomUUID?.() ?? `c_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;

const opId = () =>
  `op_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;

/* ─── Interview script ──────────────────────────────────────────────────── */

export const INTERVIEW_FIELDS: {
  key: InterviewFieldKey;
  label: string;
  question: string;
  placeholder: string;
  hint?: string;
}[] = [
  {
    key: "logline",
    label: "Logline",
    question: "In one or two sentences, what is this film about?",
    placeholder: "A drifter returns to her hometown to confront the storm that shaped her.",
    hint: "Premise + character + stakes.",
  },
  {
    key: "audience",
    label: "Audience",
    question: "Who is this for? Where will they see it?",
    placeholder: "Brand-side creative directors, watched in pitch decks and on socials.",
  },
  {
    key: "tone",
    label: "Tone",
    question: "Describe the emotional texture. Three adjectives is plenty.",
    placeholder: "Hushed, luminous, defiant.",
  },
  {
    key: "length",
    label: "Length",
    question: "How long should the final cut run?",
    placeholder: "About 75 seconds.",
    hint: "Approximate — we'll fit scenes to budget.",
  },
  {
    key: "format",
    label: "Format",
    question: "Aspect ratio and delivery format?",
    placeholder: "16:9, 4K, HDR for premiere; 9:16 cutdown for socials.",
  },
  {
    key: "references",
    label: "References",
    question: "Any references — directors, films, palettes, music?",
    placeholder: "Lubezki handheld; the blue hour of Drive; Mica Levi for score.",
  },
];

/* ─── Strategy presets ──────────────────────────────────────────────────── */

export const STRATEGY_PRESETS: {
  id: StrategyPreset;
  name: string;
  blurb: string;
  defaultScenes: number;
  shotStyle: string;
}[] = [
  {
    id: "cinematic",
    name: "Cinematic",
    blurb: "Anamorphic compositions, long takes, painterly light.",
    defaultScenes: 6,
    shotStyle: "Anamorphic 2.39:1, shallow depth, motivated practicals.",
  },
  {
    id: "documentary",
    name: "Documentary",
    blurb: "Handheld intimacy, natural light, observational rhythm.",
    defaultScenes: 5,
    shotStyle: "Handheld 16mm look, available light, vérité framing.",
  },
  {
    id: "kinetic",
    name: "Kinetic",
    blurb: "Whip pans, hard cuts, beat-locked motion.",
    defaultScenes: 8,
    shotStyle: "Wide-to-tight whip pans, snap zooms, on-beat smash cuts.",
  },
  {
    id: "product",
    name: "Product",
    blurb: "Macro detail, controlled studio light, hero turntables.",
    defaultScenes: 5,
    shotStyle: "Macro 100mm, polarized softboxes, slow turntable hero.",
  },
  {
    id: "narrative",
    name: "Narrative",
    blurb: "Scene work, dialogue beats, classical coverage.",
    defaultScenes: 6,
    shotStyle: "Master / OTS / single coverage, motivated camera moves.",
  },
  {
    id: "social",
    name: "Social",
    blurb: "Vertical-first, hook in 1s, captions baked.",
    defaultScenes: 4,
    shotStyle: "9:16 close framing, kinetic captions, hook + payoff cadence.",
  },
];

/* ─── Local fallbacks (no LLM configured) ──────────────────────────────── */

function directorReplyFallback(step: number, preset: StrategyPreset): string {
  const acks = [
    "Got it.",
    "Noted.",
    "That gives me a lot to work with.",
    "Beautiful — locking that in.",
    "Strong direction.",
    "Okay, I can see it.",
  ];
  const ack = acks[step % acks.length];
  const next = INTERVIEW_FIELDS[step];
  if (!next) {
    return `${ack} I have everything I need. I'm drafting a ${preset} blueprint — you'll see the scene list on the right.`;
  }
  return `${ack} ${next.question}`;
}

function openingMessage(preset: StrategyPreset): string {
  const p = STRATEGY_PRESETS.find((x) => x.id === preset);
  return `I'm miDirector. We're working in a ${p?.name.toLowerCase() ?? "cinematic"} register today — ${p?.blurb.toLowerCase() ?? ""} ${INTERVIEW_FIELDS[0].question}`;
}

function parseDurationGuess(s?: string): number | null {
  if (!s) return null;
  const m = s.match(/(\d+(?:\.\d+)?)\s*(s|sec|seconds|m|min|minutes)?/i);
  if (!m) return null;
  const n = parseFloat(m[1]);
  const unit = (m[2] ?? "s").toLowerCase();
  return unit.startsWith("m") ? Math.round(n * 60) : Math.round(n);
}

function synthesizeBeats(logline: string, count: number): { heading: string; body: string }[] {
  const arcs = [
    { heading: "Cold Open", body: `Establish the world implied by: ${logline}` },
    { heading: "Inciting Image", body: "The visual hook — a single arresting frame that promises the piece." },
    { heading: "Setup", body: "Introduce the protagonist and the texture of their world." },
    { heading: "Tension", body: "Pressure builds. Pace tightens, framing closes in." },
    { heading: "Turn", body: "A break in rhythm — the piece pivots emotionally." },
    { heading: "Climax", body: "Largest scale, deepest commitment to the tone." },
    { heading: "Release", body: "Breath. Wide frames. The world after the moment." },
    { heading: "Coda", body: "A final image that earns the logline." },
  ];
  return arcs.slice(0, count);
}

function composePrompt(input: { beat: string; tone: string; references: string; shotStyle: string }): string {
  return [
    input.beat,
    input.shotStyle,
    input.tone && `Tone: ${input.tone}.`,
    input.references && `Reference: ${input.references}.`,
    "Cinematic, hyperreal, 35mm grain, color-graded.",
  ].filter(Boolean).join(" ");
}

function buildBlueprintLocal(c: Conversation): Blueprint {
  console.warn(
    "[miDirector] No AI provider configured — using local blueprint synthesis. " +
      "Add a provider in Settings → AI Providers for real AI generation."
  );
  const preset = STRATEGY_PRESETS.find((p) => p.id === c.preset)!;
  const a = c.answers;
  const sceneCount = preset.defaultScenes;
  const totalSeconds = parseDurationGuess(a.length) ?? sceneCount * 10;
  const per = Math.max(3, Math.round(totalSeconds / sceneCount));
  const beats = synthesizeBeats(a.logline ?? "Untitled piece", sceneCount);
  const scenes: Scene[] = beats.map((beat, i) => ({
    id: uid(),
    number: i + 1,
    heading: beat.heading,
    beat: beat.body,
    shot: preset.shotStyle,
    duration: per,
    prompt: composePrompt({ beat: beat.body, tone: a.tone ?? "", references: a.references ?? "", shotStyle: preset.shotStyle }),
  }));
  const now = Date.now();
  return {
    id: uid(),
    title: c.title,
    preset: c.preset,
    logline: a.logline ?? "",
    audience: a.audience ?? "",
    tone: a.tone ?? "",
    length: a.length ?? `${totalSeconds}s`,
    format: a.format ?? "16:9 4K",
    references: a.references ?? "",
    scenes,
    generatedByLLM: false,
    createdAt: now,
    updatedAt: now,
  };
}

/* ─── LLM helpers ───────────────────────────────────────────────────────── */

function buildDirectorPrompt(c: Conversation, userAnswer: string, currentField: typeof INTERVIEW_FIELDS[number] | undefined, nextField: typeof INTERVIEW_FIELDS[number] | undefined): string {
  const answered = Object.entries(c.answers)
    .map(([k, v]) => `- ${k}: ${v}`)
    .join("\n");
  return [
    `Production: "${c.title}" (${c.preset} preset)`,
    answered ? `Answers so far:\n${answered}` : "",
    currentField ? `Producer just answered "${currentField.label}": "${userAnswer}"` : `Producer: "${userAnswer}"`,
    nextField
      ? `Ask them: "${nextField.question}"`
      : `The interview is complete. Announce briefly that you have everything you need and will draft the blueprint now.`,
  ].filter(Boolean).join("\n");
}

function buildBlueprintPrompt(c: Conversation): string {
  const preset = STRATEGY_PRESETS.find((p) => p.id === c.preset)!;
  const a = c.answers;
  const sceneCount = preset.defaultScenes;
  const totalSeconds = parseDurationGuess(a.length) ?? sceneCount * 10;

  return `Generate a ${preset.name} production blueprint from this interview.

Return ONLY valid JSON — no explanation, no markdown, no code blocks.

Interview:
- Logline: ${a.logline ?? ""}
- Audience: ${a.audience ?? ""}
- Tone: ${a.tone ?? ""}
- Runtime: ${a.length ?? `approximately ${totalSeconds}s`}
- Format: ${a.format ?? "16:9"}
- References: ${a.references ?? "none"}
- Preset: ${preset.name} — ${preset.blurb}
- Shot style: ${preset.shotStyle}

JSON schema (match exactly):
{
  "title": "<evocative 2–5 word title>",
  "scenes": [
    {
      "number": 1,
      "heading": "<short scene name>",
      "beat": "<narrative beat — what happens emotionally and story-wise>",
      "shot": "<specific camera and visual description>",
      "duration": <integer seconds>,
      "prompt": "<detailed AI image/video generation prompt>"
    }
  ]
}

Rules:
- Exactly ${sceneCount} scenes
- Scene durations sum to approximately ${totalSeconds} seconds
- Each prompt: specific, visual, diffusion-ready; weave references in as visual language
- Maintain a clear emotional arc
- Pacing: ${preset.id === "kinetic" ? "short, punchy scenes (2–4s)" : preset.id === "documentary" ? "varied, observational (8–15s)" : "measured variety (6–12s)"}`;
}

function parseLLMBlueprint(
  json: string,
  c: Conversation
): Blueprint | null {
  try {
    // Strip markdown code fences if the model wrapped it
    const cleaned = json.replace(/^```[a-z]*\n?/im, "").replace(/```\s*$/im, "").trim();
    const parsed = JSON.parse(cleaned);
    const preset = STRATEGY_PRESETS.find((p) => p.id === c.preset)!;
    const a = c.answers;
    const totalSeconds = parseDurationGuess(a.length) ?? preset.defaultScenes * 10;

    if (!parsed.title || !Array.isArray(parsed.scenes) || parsed.scenes.length === 0) {
      console.error("[miDirector] LLM returned invalid blueprint shape:", parsed);
      return null;
    }

    const scenes: Scene[] = parsed.scenes.map((s: Record<string, unknown>, i: number) => ({
      id: uid(),
      number: typeof s.number === "number" ? s.number : i + 1,
      heading: String(s.heading ?? `Scene ${i + 1}`),
      beat: String(s.beat ?? ""),
      shot: String(s.shot ?? preset.shotStyle),
      duration: typeof s.duration === "number" ? Math.max(1, s.duration) : Math.round(totalSeconds / parsed.scenes.length),
      prompt: String(s.prompt ?? ""),
    }));

    const now = Date.now();
    return {
      id: uid(),
      title: String(parsed.title),
      preset: c.preset,
      logline: a.logline ?? "",
      audience: a.audience ?? "",
      tone: a.tone ?? "",
      length: a.length ?? `${totalSeconds}s`,
      format: a.format ?? "16:9",
      references: a.references ?? "",
      scenes,
      generatedByLLM: true,
      createdAt: now,
      updatedAt: now,
    };
  } catch (err) {
    console.error("[miDirector] Failed to parse LLM blueprint JSON:", err, "\nRaw:", json);
    return null;
  }
}

/* ─── Store ─────────────────────────────────────────────────────────────── */

export const useBlueprintStore = create<BlueprintState>()(
  persist(
    (set, get) => ({
      conversations: [],
      activeId: null,
      generating: false,
      directorTyping: false,
      generationError: null,
      hydrated: false,

      startConversation: ({ preset, projectId, title }) => {
        const now = Date.now();
        const c: Conversation = {
          id: uid(),
          projectId,
          title: title?.trim() || "Untitled interview",
          preset,
          turns: [
            { id: uid(), role: "director", content: openingMessage(preset), at: now },
          ],
          answers: {},
          step: 0,
          createdAt: now,
          updatedAt: now,
        };
        set({ conversations: [c, ...get().conversations], activeId: c.id });
        return c;
      },

      setActive: (id) => set({ activeId: id }),

      deleteConversation: (id) => {
        const remaining = get().conversations.filter((c) => c.id !== id);
        set({
          conversations: remaining,
          activeId: get().activeId === id ? remaining[0]?.id ?? null : get().activeId,
        });
      },

      reply: (content) => {
        const id = get().activeId;
        if (!id) return;
        const trimmed = content.trim();
        if (!trimmed) return;

        // Find the active conversation
        const c = get().conversations.find((x) => x.id === id);
        if (!c) return;

        const currentField = INTERVIEW_FIELDS[c.step]?.key;
        const nextStep = c.step + 1;
        const done = nextStep >= INTERVIEW_FIELDS.length;
        const now = Date.now();

        const userTurn: InterviewTurn = {
          id: uid(),
          role: "user",
          content: trimmed,
          at: now,
          field: currentField,
        };

        const answers: InterviewAnswers = currentField
          ? { ...c.answers, [currentField]: trimmed }
          : c.answers;

        // Placeholder ephemeral turn — will be replaced when director responds
        const ephemeralId = uid();
        const ephemeralTurn: InterviewTurn = {
          id: ephemeralId,
          role: "director",
          content: "…",
          at: now + 1,
          ephemeral: true,
        };

        set({
          directorTyping: true,
          conversations: get().conversations.map((conv) =>
            conv.id !== id
              ? conv
              : {
                  ...conv,
                  answers,
                  step: nextStep,
                  turns: [...conv.turns, userTurn, ephemeralTurn],
                  updatedAt: now,
                }
          ),
        });

        // ── Async director response ──
        const providerConfig = useSettingsStore.getState().getActiveConfig("general");

        const replaceEphemeral = (directorContent: string) => {
          set({
            directorTyping: false,
            conversations: get().conversations.map((conv) => {
              if (conv.id !== id) return conv;
              return {
                ...conv,
                turns: conv.turns.map((t) =>
                  t.id === ephemeralId
                    ? { ...t, content: directorContent, ephemeral: false }
                    : t
                ),
              };
            }),
          });
        };

        if (!providerConfig) {
          // Local fallback — synchronous
          const localReply = directorReplyFallback(nextStep, c.preset);
          replaceEphemeral(localReply);
          if (done) void get().generateBlueprint();
          return;
        }

        // LLM director response
        const currentFieldDef = INTERVIEW_FIELDS[c.step];
        const nextFieldDef = INTERVIEW_FIELDS[nextStep];

        const operation = opId();
        eventBus.emit("ai:generation:started", {
          operationId: operation,
          agent: "director",
          projectId: c.projectId,
          description: "Director interview response",
        });

        createClient(providerConfig)
          .then((client) =>
            client.chat([
              {
                role: "system",
                content:
                  "You are miDirector, an AI film director conducting a creative interview. " +
                  "Respond with elegant brevity — like a seasoned director who has heard everything. " +
                  "Maximum 2 sentences. Acknowledge what was shared, then ask the next question. " +
                  "No lists, no markdown, no meta-commentary about the process.",
              },
              {
                role: "user",
                content: buildDirectorPrompt(
                  { ...c, answers },
                  trimmed,
                  currentFieldDef,
                  nextFieldDef
                ),
              },
            ])
          )
          .then((response) => {
            eventBus.emit("ai:generation:completed", {
              operationId: operation,
              agent: "director",
              projectId: c.projectId,
              tokensUsed: response.tokensUsed,
            });
            replaceEphemeral(response.content.trim());
            if (done) void get().generateBlueprint();
          })
          .catch((err) => {
            console.error("[miDirector] Director LLM call failed:", err);
            eventBus.emit("ai:generation:failed", {
              operationId: operation,
              agent: "director",
              projectId: c.projectId,
              error: String(err),
              retryable: true,
            });
            // Fall back to local response on error
            replaceEphemeral(directorReplyFallback(nextStep, c.preset));
            if (done) void get().generateBlueprint();
          });
      },

      jumpToStep: (step) => {
        const id = get().activeId;
        if (!id) return;
        set({
          conversations: get().conversations.map((c) =>
            c.id === id
              ? { ...c, step: Math.max(0, Math.min(step, INTERVIEW_FIELDS.length)) }
              : c,
          ),
        });
      },

      generateBlueprint: async () => {
        const id = get().activeId;
        const c = get().conversations.find((x) => x.id === id);
        if (!c) return undefined;

        set({ generating: true, generationError: null });

        const providerConfig = useSettingsStore.getState().getActiveConfig("blueprintGeneration");

        let bp: Blueprint;
        const operation = opId();

        if (!providerConfig) {
          bp = buildBlueprintLocal(c);
        } else {
          eventBus.emit("ai:generation:started", {
            operationId: operation,
            agent: "director",
            projectId: c.projectId,
            description: `Blueprint synthesis — ${c.title}`,
          });

          try {
            const client = await createClient(providerConfig);
            const response = await client.chat([
              {
                role: "system",
                content:
                  "You are an AI film director. Return ONLY valid JSON — no explanation, no markdown code blocks, no text outside the JSON object.",
              },
              { role: "user", content: buildBlueprintPrompt(c) },
            ]);

            const parsed = parseLLMBlueprint(response.content, c);
            if (!parsed) {
              console.warn("[miDirector] Falling back to local synthesis after LLM parse failure.");
              bp = buildBlueprintLocal(c);
            } else {
              bp = parsed;
            }

            eventBus.emit("ai:generation:completed", {
              operationId: operation,
              agent: "director",
              projectId: c.projectId,
              tokensUsed: response.tokensUsed,
            });
          } catch (err) {
            console.error("[miDirector] Blueprint LLM call failed:", err);
            eventBus.emit("ai:generation:failed", {
              operationId: operation,
              agent: "director",
              projectId: c.projectId,
              error: String(err),
              retryable: true,
            });
            set({ generating: false, generationError: String(err) });
            // Fall back to local synthesis so the user isn't left with nothing
            bp = buildBlueprintLocal(c);
          }
        }

        set({
          generating: false,
          generationError: null,
          conversations: get().conversations.map((x) =>
            x.id === c.id ? { ...x, blueprint: bp, updatedAt: Date.now() } : x,
          ),
        });

        eventBus.emit("blueprint:generated", {
          projectId: c.projectId ?? "",
          blueprintId: bp.id,
          conversationId: c.id,
        });

        return bp;
      },

      updateScene: (sceneId, patch) => {
        const id = get().activeId;
        const c = get().conversations.find((x) => x.id === id);
        set({
          conversations: get().conversations.map((conv) => {
            if (conv.id !== id || !conv.blueprint) return conv;
            return {
              ...conv,
              blueprint: {
                ...conv.blueprint,
                scenes: conv.blueprint.scenes.map((s) =>
                  s.id === sceneId ? { ...s, ...patch } : s,
                ),
                updatedAt: Date.now(),
              },
            };
          }),
        });
        if (c?.blueprint) {
          eventBus.emit("blueprint:updated", {
            blueprintId: c.blueprint.id,
            projectId: c.projectId ?? "",
            fields: Object.keys(patch),
          });
        }
      },

      addScene: () => {
        const id = get().activeId;
        const c = get().conversations.find((x) => x.id === id);
        set({
          conversations: get().conversations.map((conv) => {
            if (conv.id !== id || !conv.blueprint) return conv;
            const preset = STRATEGY_PRESETS.find((p) => p.id === conv.blueprint!.preset)!;
            const number = conv.blueprint.scenes.length + 1;
            const newScene: Scene = {
              id: uid(),
              number,
              heading: `Scene ${number}`,
              beat: "New beat — describe the moment.",
              shot: preset.shotStyle,
              duration: 6,
              prompt: composePrompt({
                beat: "New beat — describe the moment.",
                tone: conv.blueprint.tone,
                references: conv.blueprint.references,
                shotStyle: preset.shotStyle,
              }),
            };
            return {
              ...conv,
              blueprint: {
                ...conv.blueprint,
                scenes: [...conv.blueprint.scenes, newScene],
                updatedAt: Date.now(),
              },
            };
          }),
        });
        if (c?.blueprint) {
          eventBus.emit("blueprint:scene:added", {
            blueprintId: c.blueprint.id,
            sceneId: "new",
          });
        }
      },

      removeScene: (sceneId) => {
        const id = get().activeId;
        const c = get().conversations.find((x) => x.id === id);
        set({
          conversations: get().conversations.map((conv) => {
            if (conv.id !== id || !conv.blueprint) return conv;
            const scenes = conv.blueprint.scenes
              .filter((s) => s.id !== sceneId)
              .map((s, i) => ({ ...s, number: i + 1 }));
            return {
              ...conv,
              blueprint: { ...conv.blueprint, scenes, updatedAt: Date.now() },
            };
          }),
        });
        if (c?.blueprint) {
          eventBus.emit("blueprint:scene:removed", {
            blueprintId: c.blueprint.id,
            sceneId,
          });
        }
      },
    }),
    {
      name: "hooke:blueprints",
      storage: createJSONStorage(() => idbStorage),
      partialize: (s) => ({
        conversations: s.conversations.map((c) => ({
          ...c,
          // Strip ephemeral turns before persisting
          turns: c.turns.filter((t) => !t.ephemeral),
        })),
        activeId: s.activeId,
      }),
      onRehydrateStorage: () => (state) => {
        if (state) state.hydrated = true;
      },
    },
  ),
);

export const INTERVIEW_TOTAL = INTERVIEW_FIELDS.length;
