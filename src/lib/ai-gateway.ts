import { useAIProviderStore, type PhaseRole } from "@/store/ai-provider-store";

export type ChatMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

export type GatewayResponse = {
  content: string;
  model: string;
  provider: string;
};

export type GatewayError = {
  error: string;
  status?: number;
};

/**
 * Calls the ai-gateway edge function with the active provider's credentials.
 * Returns the LLM response or throws with a descriptive error.
 */
export async function callLLM(
  messages: ChatMessage[],
  options?: {
    phase?: PhaseRole;
    temperature?: number;
    maxTokens?: number;
    model?: string;
  },
): Promise<GatewayResponse> {
  const store = useAIProviderStore.getState();
  const active = store.getActiveProvider(options?.phase);

  if (!active) {
    throw new Error("No AI provider connected. Go to Settings > AI Providers to add one.");
  }

  const { entry, connected } = active;
  const model = options?.model || connected.providerId === entry.id
    ? (store.phaseRouting.find((r) => r.phase === options?.phase)?.model || entry.defaultModel)
    : entry.defaultModel;

  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  if (!supabaseUrl) {
    throw new Error("Supabase URL not configured.");
  }

  const functionUrl = `${supabaseUrl}/functions/v1/ai-gateway`;

  const resp = await fetch(functionUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
    },
    body: JSON.stringify({
      provider: {
        id: entry.id,
        baseUrl: entry.baseUrl,
        model,
        authKind: entry.authKind,
      },
      credential: connected.credential,
      customBaseUrl: connected.customBaseUrl,
      messages,
      temperature: options?.temperature ?? 0.7,
      maxTokens: options?.maxTokens ?? 2048,
    }),
  });

  if (!resp.ok) {
    const err = await resp.json().catch(() => ({ error: `HTTP ${resp.status}` })) as GatewayError;
    const msg = err.error || `Request failed (${resp.status})`;

    if (resp.status === 401) {
      throw new Error(`Authentication failed. Check your ${entry.label} API key in Settings.`);
    }
    if (resp.status === 429) {
      throw new Error(`${entry.label} rate limit reached. Try again in a moment or switch providers.`);
    }
    throw new Error(msg);
  }

  return (await resp.json()) as GatewayResponse;
}

/**
 * Builds a system prompt for miDirector that's project- and universe-aware.
 */
export function buildDirectorSystemPrompt(context: {
  strategy?: string;
  projectTitle?: string;
  universeSummary?: string;
  existingBlueprint?: string;
}): string {
  const parts: string[] = [
    "You are miDirector, an expert AI film director and creative strategist inside the Hooke cinematic storytelling studio.",
    "Your job is to interview the user about their video project and help them build a shootable blueprint.",
    "Ask one focused question at a time. Be concise, warm, and specific. Adapt your tone to the project.",
    "When the user has provided enough detail, synthesize their answers into a clear blueprint with scenes, durations, and visual prompts.",
  ];

  if (context.strategy) {
    parts.push(`The user selected the "${context.strategy}" strategy preset. Tailor your questions and suggestions to this style.`);
  }
  if (context.projectTitle) {
    parts.push(`Project title: "${context.projectTitle}".`);
  }
  if (context.universeSummary) {
    parts.push(`Universe context (use this for continuity):\n${context.universeSummary}`);
  }
  if (context.existingBlueprint) {
    parts.push(`Current blueprint draft (refine or expand on this):\n${context.existingBlueprint}`);
  }

  return parts.join("\n\n");
}
