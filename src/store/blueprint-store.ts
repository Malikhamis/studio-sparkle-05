import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { idbStorage } from "@/lib/idb-storage";

export type StrategyPreset =
  | "cinematic"
  | "documentary"
  | "kinetic"
  | "product"
  | "narrative"
  | "social";

export type InterviewRole = "director" | "user";

export type InterviewTurn = {
  id: string;
  role: InterviewRole;
  content: string;
  at: number;
  /** which interview field this user turn answered (if any) */
  field?: InterviewFieldKey;
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
  step: number; // index into INTERVIEW_FIELDS, INTERVIEW_FIELDS.length === done
  blueprint?: Blueprint;
  createdAt: number;
  updatedAt: number;
};

type BlueprintState = {
  conversations: Conversation[];
  activeId: string | null;
  hydrated: boolean;
  /** true while waiting for the LLM to respond */
  isThinking: boolean;
  /** last AI error, if any */
  aiError: string | null;

  startConversation: (opts: { preset: StrategyPreset; projectId?: string; title?: string }) => Conversation;
  setActive: (id: string | null) => void;
  deleteConversation: (id: string) => void;

  /** Append a user reply to the active interview and advance the director (local heuristic). */
  reply: (content: string) => void;

  /** Append a user reply and get the next director question from the LLM. */
  replyWithAI: (content: string) => Promise<void>;

  /** Move to a specific step (skip / back). */
  jumpToStep: (step: number) => void;

  /** Generate or regenerate the blueprint from current answers. */
  generateBlueprint: () => Blueprint | undefined;

  /** Generate blueprint using the LLM for richer scene synthesis. */
  generateBlueprintWithAI: () => Promise<Blueprint | undefined>;

  updateScene: (sceneId: string, patch: Partial<Omit<Scene, "id" | "number">>) => void;
  addScene: () => void;
  removeScene: (sceneId: string) => void;
};

const uid = () =>
  globalThis.crypto?.randomUUID?.() ?? `c_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;

/* ---------- Interview script ---------- */

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

/* ---------- Strategy presets ---------- */

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

/* ---------- Director responses ---------- */

const ackPhrases = [
  "Got it.",
  "Noted.",
  "That gives me a lot to work with.",
  "Beautiful — locking that in.",
  "Strong direction.",
  "Okay, I can see it.",
];

function directorReplyForStep(step: number, preset: StrategyPreset): string {
  const ack = ackPhrases[step % ackPhrases.length];
  const next = INTERVIEW_FIELDS[step];
  if (!next) {
    return `${ack} I have everything I need. I'm drafting a ${preset} blueprint now — you'll see the scene list on the right.`;
  }
  return `${ack} ${next.question}`;
}

function openingMessage(preset: StrategyPreset): string {
  const p = STRATEGY_PRESETS.find((x) => x.id === preset);
  return `I'm miDirector. We're working in a ${p?.name.toLowerCase() ?? "cinematic"} register today — ${p?.blurb.toLowerCase() ?? ""} ${INTERVIEW_FIELDS[0].question}`;
}

/* ---------- Blueprint generation ---------- */

function buildBlueprint(c: Conversation): Blueprint {
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
    prompt: composePrompt({
      beat: beat.body,
      tone: a.tone ?? "",
      references: a.references ?? "",
      shotStyle: preset.shotStyle,
    }),
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
    createdAt: now,
    updatedAt: now,
  };
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

function composePrompt(input: {
  beat: string;
  tone: string;
  references: string;
  shotStyle: string;
}): string {
  const parts = [
    input.beat,
    input.shotStyle,
    input.tone && `Tone: ${input.tone}.`,
    input.references && `Reference: ${input.references}.`,
    "Cinematic, hyperreal, 35mm grain, color-graded.",
  ].filter(Boolean);
  return parts.join(" ");
}

/* ---------- Store ---------- */

export const useBlueprintStore = create<BlueprintState>()(
  persist(
    (set, get) => ({
      conversations: [],
      activeId: null,
      hydrated: false,
      isThinking: false,
      aiError: null,

      startConversation: ({ preset, projectId, title }) => {
        const now = Date.now();
        const c: Conversation = {
          id: uid(),
          projectId,
          title: title?.trim() || "Untitled interview",
          preset,
          turns: [
            {
              id: uid(),
              role: "director",
              content: openingMessage(preset),
              at: now,
            },
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

        set({
          conversations: get().conversations.map((c) => {
            if (c.id !== id) return c;
            const currentField = INTERVIEW_FIELDS[c.step]?.key;
            const nextStep = c.step + 1;
            const now = Date.now();
            const userTurn: InterviewTurn = {
              id: uid(),
              role: "user",
              content: trimmed,
              at: now,
              field: currentField,
            };
            const directorTurn: InterviewTurn = {
              id: uid(),
              role: "director",
              content: directorReplyForStep(nextStep, c.preset),
              at: now + 1,
            };
            const answers: InterviewAnswers = currentField
              ? { ...c.answers, [currentField]: trimmed }
              : c.answers;
            return {
              ...c,
              answers,
              step: nextStep,
              turns: [...c.turns, userTurn, directorTurn],
              updatedAt: now,
            };
          }),
        });
      },

      replyWithAI: async (content) => {
        const id = get().activeId;
        if (!id) return;
        const trimmed = content.trim();
        if (!trimmed) return;

        // Append user message immediately
        set({
          isThinking: true,
          aiError: null,
          conversations: get().conversations.map((c) => {
            if (c.id !== id) return c;
            const currentField = INTERVIEW_FIELDS[c.step]?.key;
            const nextStep = c.step + 1;
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
            return {
              ...c,
              answers,
              step: nextStep,
              turns: [...c.turns, userTurn],
              updatedAt: now,
            };
          }),
        });

        try {
          const { callLLM, buildDirectorSystemPrompt } = await import("@/lib/ai-gateway");
          const conv = get().conversations.find((c) => c.id === id);
          if (!conv) return;

          const strategyName = STRATEGY_PRESETS.find((p) => p.id === conv.preset)?.name ?? conv.preset;
          const systemPrompt = buildDirectorSystemPrompt({
            strategy: strategyName,
            projectTitle: conv.title,
          });

          const messages = [
            { role: "system" as const, content: systemPrompt },
            ...conv.turns
              .filter((t) => t.role === "user" || t.role === "director")
              .map((t) => ({
                role: (t.role === "director" ? "assistant" : "user") as "user" | "assistant",
                content: t.content,
              })),
          ];

          const response = await callLLM(messages, {
            phase: "intake",
            temperature: 0.8,
            maxTokens: 512,
          });

          set({
            isThinking: false,
            conversations: get().conversations.map((c) => {
              if (c.id !== id) return c;
              const directorTurn: InterviewTurn = {
                id: uid(),
                role: "director",
                content: response.content,
                at: Date.now(),
              };
              return { ...c, turns: [...c.turns, directorTurn], updatedAt: Date.now() };
            }),
          });
        } catch (err) {
          const msg = err instanceof Error ? err.message : "AI request failed";
          set({
            isThinking: false,
            aiError: msg,
            // Fall back to local heuristic so the interview still progresses
            conversations: get().conversations.map((c) => {
              if (c.id !== id) return c;
              const nextStep = c.step;
              const directorTurn: InterviewTurn = {
                id: uid(),
                role: "director",
                content: directorReplyForStep(nextStep, c.preset),
                at: Date.now(),
              };
              return { ...c, turns: [...c.turns, directorTurn], updatedAt: Date.now() };
            }),
          });
        }
      },

      jumpToStep: (step) => {
        const id = get().activeId;
        if (!id) return;
        set({
          conversations: get().conversations.map((c) =>
            c.id === id ? { ...c, step: Math.max(0, Math.min(step, INTERVIEW_FIELDS.length)) } : c,
          ),
        });
      },

      generateBlueprint: () => {
        const id = get().activeId;
        const c = get().conversations.find((x) => x.id === id);
        if (!c) return undefined;
        const bp = buildBlueprint(c);
        set({
          conversations: get().conversations.map((x) =>
            x.id === c.id ? { ...x, blueprint: bp, updatedAt: Date.now() } : x,
          ),
        });
        return bp;
      },

      generateBlueprintWithAI: async () => {
        const id = get().activeId;
        const c = get().conversations.find((x) => x.id === id);
        if (!c) return undefined;

        // Start from the local blueprint as a base
        const localBp = buildBlueprint(c);

        set({ isThinking: true, aiError: null });

        try {
          const { callLLM, buildDirectorSystemPrompt } = await import("@/lib/ai-gateway");
          const strategyName = STRATEGY_PRESETS.find((p) => p.id === c.preset)?.name ?? c.preset;

          const systemPrompt = buildDirectorSystemPrompt({
            strategy: strategyName,
            projectTitle: c.title,
            existingBlueprint: `${localBp.title} — ${localBp.logline}\n${localBp.scenes.map((s) => `Scene ${s.number}: ${s.heading} (${s.duration}s) — ${s.beat}`).join("\n")}`,
          });

          const userPrompt = `Based on the interview answers, generate a refined blueprint as JSON with this shape:
{
  "title": "string",
  "logline": "string (1-2 sentences)",
  "tone": "string (e.g. 'cinematic, tense')",
  "scenes": [
    { "heading": "string", "beat": "string (what happens)", "duration": number (seconds), "prompt": "string (visual generation prompt)" }
  ]
}
Return ONLY valid JSON, no markdown fences.

Interview answers:
${JSON.stringify(c.answers, null, 2)}`;

          const response = await callLLM(
            [
              { role: "system", content: systemPrompt },
              { role: "user", content: userPrompt },
            ],
            { phase: "intake", temperature: 0.7, maxTokens: 2048 }
          );

          // Parse JSON from response
          const jsonMatch = response.content.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
            const parsed = JSON.parse(jsonMatch[0]);
            const scenes: Scene[] = (parsed.scenes ?? []).map((s: { heading: string; beat: string; duration: number; prompt: string }, i: number) => ({
              id: uid(),
              number: i + 1,
              heading: s.heading ?? `Scene ${i + 1}`,
              beat: s.beat ?? "",
              shot: localBp.scenes[0]?.shot ?? "medium",
              duration: Math.max(1, s.duration ?? 6),
              prompt: s.prompt ?? "",
            }));

            const bp: Blueprint = {
              ...localBp,
              title: parsed.title ?? localBp.title,
              logline: parsed.logline ?? localBp.logline,
              tone: parsed.tone ?? localBp.tone,
              scenes: scenes.length > 0 ? scenes : localBp.scenes,
              updatedAt: Date.now(),
            };

            set({
              isThinking: false,
              conversations: get().conversations.map((x) =>
                x.id === c.id ? { ...x, blueprint: bp, updatedAt: Date.now() } : x
              ),
            });
            return bp;
          }

          // JSON parse failed — fall back to local
          set({
            isThinking: false,
            conversations: get().conversations.map((x) =>
              x.id === c.id ? { ...x, blueprint: localBp, updatedAt: Date.now() } : x
            ),
          });
          return localBp;
        } catch (err) {
          const msg = err instanceof Error ? err.message : "AI generation failed";
          set({
            isThinking: false,
            aiError: msg,
            conversations: get().conversations.map((x) =>
              x.id === c.id ? { ...x, blueprint: localBp, updatedAt: Date.now() } : x
            ),
          });
          return localBp;
        }
      },

      updateScene: (sceneId, patch) => {
        const id = get().activeId;
        set({
          conversations: get().conversations.map((c) => {
            if (c.id !== id || !c.blueprint) return c;
            return {
              ...c,
              blueprint: {
                ...c.blueprint,
                scenes: c.blueprint.scenes.map((s) => (s.id === sceneId ? { ...s, ...patch } : s)),
                updatedAt: Date.now(),
              },
            };
          }),
        });
      },

      addScene: () => {
        const id = get().activeId;
        set({
          conversations: get().conversations.map((c) => {
            if (c.id !== id || !c.blueprint) return c;
            const preset = STRATEGY_PRESETS.find((p) => p.id === c.blueprint!.preset)!;
            const number = c.blueprint.scenes.length + 1;
            const newScene: Scene = {
              id: uid(),
              number,
              heading: `Scene ${number}`,
              beat: "New beat — describe the moment.",
              shot: preset.shotStyle,
              duration: 6,
              prompt: composePrompt({
                beat: "New beat — describe the moment.",
                tone: c.blueprint.tone,
                references: c.blueprint.references,
                shotStyle: preset.shotStyle,
              }),
            };
            return {
              ...c,
              blueprint: {
                ...c.blueprint,
                scenes: [...c.blueprint.scenes, newScene],
                updatedAt: Date.now(),
              },
            };
          }),
        });
      },

      removeScene: (sceneId) => {
        const id = get().activeId;
        set({
          conversations: get().conversations.map((c) => {
            if (c.id !== id || !c.blueprint) return c;
            const scenes = c.blueprint.scenes
              .filter((s) => s.id !== sceneId)
              .map((s, i) => ({ ...s, number: i + 1 }));
            return {
              ...c,
              blueprint: { ...c.blueprint, scenes, updatedAt: Date.now() },
            };
          }),
        });
      },
    }),
    {
      name: "hooke:blueprints",
      storage: createJSONStorage(() => idbStorage),
      partialize: (s) => ({ conversations: s.conversations, activeId: s.activeId }),
      onRehydrateStorage: () => (state) => {
        if (state) state.hydrated = true;
      },
    },
  ),
);

export const INTERVIEW_TOTAL = INTERVIEW_FIELDS.length;
