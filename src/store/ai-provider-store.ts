import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { idbStorage } from "@/lib/idb-storage";

export type ProviderAuthKind = "key" | "login" | "url+key";

export type ProviderId =
  | "anthropic-login"
  | "openai-login"
  | "gemini-login"
  | "antigravity-login"
  | "anthropic-key"
  | "openai-key"
  | "gemini-key"
  | "openrouter"
  | "zai-glm"
  | "kimi-moonshot"
  | "moonshot-ai"
  | "minimax"
  | "deepseek"
  | "groq"
  | "xai-grok"
  | "mistral"
  | "cerebras"
  | "perplexity"
  | "together-ai"
  | "fireworks"
  | "deepinfra"
  | "nebius"
  | "baseten"
  | "chutes"
  | "nvidia-nim"
  | "hugging-face"
  | "scaleway"
  | "302-ai"
  | "cortecs"
  | "openai-compatible";

export type PhaseRole = "default" | "intake" | "design" | "build" | "verify" | "security";

export type ProviderEntry = {
  id: ProviderId;
  label: string;
  authKind: ProviderAuthKind;
  baseUrl: string;
  defaultModel: string;
  supportsChat: boolean;
  free: boolean;
};

export type ConnectedProvider = {
  providerId: ProviderId;
  /** API key or access token */
  credential: string;
  /** for url+key providers */
  customBaseUrl?: string;
  addedAt: number;
  isDefault: boolean;
};

export type PhaseRouting = {
  phase: PhaseRole;
  providerId: ProviderId | null;
  model: string;
};

export const PROVIDER_CATALOG: ProviderEntry[] = [
  { id: "anthropic-login",  label: "Anthropic (Claude)",      authKind: "login",   baseUrl: "https://api.anthropic.com/v1",              defaultModel: "claude-sonnet-4-6",          supportsChat: true,  free: false },
  { id: "openai-login",     label: "OpenAI (ChatGPT)",        authKind: "login",   baseUrl: "https://api.openai.com/v1",                 defaultModel: "gpt-4o",                     supportsChat: true,  free: false },
  { id: "gemini-login",     label: "Google Gemini",           authKind: "login",   baseUrl: "https://generativelanguage.googleapis.com", defaultModel: "gemini-2.0-flash",           supportsChat: true,  free: false },
  { id: "antigravity-login",label: "Antigravity",             authKind: "login",   baseUrl: "https://api.antigravity.ai/v1",             defaultModel: "ag-1",                       supportsChat: true,  free: false },
  { id: "anthropic-key",    label: "Anthropic API key",       authKind: "key",     baseUrl: "https://api.anthropic.com/v1",              defaultModel: "claude-sonnet-4-6",          supportsChat: true,  free: false },
  { id: "openai-key",       label: "OpenAI API key",          authKind: "key",     baseUrl: "https://api.openai.com/v1",                 defaultModel: "gpt-4o-mini",                supportsChat: true,  free: false },
  { id: "gemini-key",       label: "Gemini API key",          authKind: "key",     baseUrl: "https://generativelanguage.googleapis.com", defaultModel: "gemini-2.5-flash",           supportsChat: true,  free: true  },
  { id: "openrouter",       label: "OpenRouter",              authKind: "key",     baseUrl: "https://openrouter.ai/api/v1",              defaultModel: "meta-llama/llama-3.3-70b-instruct:free", supportsChat: true, free: true },
  { id: "zai-glm",          label: "Z.AI (GLM)",              authKind: "key",     baseUrl: "https://open.bigmodel.cn/api/paas/v4",      defaultModel: "glm-4-flash",                supportsChat: true,  free: true  },
  { id: "kimi-moonshot",    label: "Kimi (Moonshot)",         authKind: "key",     baseUrl: "https://api.moonshot.cn/v1",                defaultModel: "moonshot-v1-8k",             supportsChat: true,  free: false },
  { id: "moonshot-ai",      label: "Moonshot AI",             authKind: "key",     baseUrl: "https://api.moonshot.cn/v1",                defaultModel: "moonshot-v1-32k",            supportsChat: true,  free: false },
  { id: "minimax",          label: "MiniMax",                 authKind: "key",     baseUrl: "https://api.minimax.chat/v1",               defaultModel: "abab6.5s-chat",              supportsChat: true,  free: false },
  { id: "deepseek",         label: "DeepSeek",                authKind: "key",     baseUrl: "https://api.deepseek.com/v1",               defaultModel: "deepseek-chat",              supportsChat: true,  free: false },
  { id: "groq",             label: "Groq",                    authKind: "key",     baseUrl: "https://api.groq.com/openai/v1",            defaultModel: "llama-3.3-70b-versatile",    supportsChat: true,  free: true  },
  { id: "xai-grok",         label: "xAI (Grok)",              authKind: "key",     baseUrl: "https://api.x.ai/v1",                       defaultModel: "grok-3-mini",                supportsChat: true,  free: false },
  { id: "mistral",          label: "Mistral",                 authKind: "key",     baseUrl: "https://api.mistral.ai/v1",                 defaultModel: "mistral-small-latest",       supportsChat: true,  free: false },
  { id: "cerebras",         label: "Cerebras",                authKind: "key",     baseUrl: "https://api.cerebras.ai/v1",                defaultModel: "llama3.1-70b",               supportsChat: true,  free: true  },
  { id: "perplexity",       label: "Perplexity",              authKind: "key",     baseUrl: "https://api.perplexity.ai",                 defaultModel: "llama-3.1-sonar-large-128k-online", supportsChat: true, free: false },
  { id: "together-ai",      label: "Together AI",             authKind: "key",     baseUrl: "https://api.together.xyz/v1",               defaultModel: "meta-llama/Llama-3.3-70B-Instruct-Turbo", supportsChat: true, free: false },
  { id: "fireworks",        label: "Fireworks",               authKind: "key",     baseUrl: "https://api.fireworks.ai/inference/v1",     defaultModel: "accounts/fireworks/models/llama-v3p3-70b-instruct", supportsChat: true, free: false },
  { id: "deepinfra",        label: "DeepInfra",               authKind: "key",     baseUrl: "https://api.deepinfra.com/v1/openai",       defaultModel: "meta-llama/Llama-3.3-70B-Instruct", supportsChat: true, free: false },
  { id: "nebius",           label: "Nebius",                  authKind: "key",     baseUrl: "https://api.studio.nebius.ai/v1",           defaultModel: "meta-llama/Meta-Llama-3.1-70B-Instruct", supportsChat: true, free: false },
  { id: "baseten",          label: "Baseten",                 authKind: "key",     baseUrl: "https://bridge.baseten.co/v1/direct",       defaultModel: "llama-3-3-70b-instruct",     supportsChat: true,  free: false },
  { id: "chutes",           label: "Chutes",                  authKind: "key",     baseUrl: "https://llm.chutes.ai/v1",                  defaultModel: "deepseek-ai/DeepSeek-V3",    supportsChat: true,  free: true  },
  { id: "nvidia-nim",       label: "NVIDIA NIM",              authKind: "key",     baseUrl: "https://integrate.api.nvidia.com/v1",       defaultModel: "meta/llama-3.3-70b-instruct",supportsChat: true,  free: true  },
  { id: "hugging-face",     label: "Hugging Face",            authKind: "key",     baseUrl: "https://api-inference.huggingface.co/v1",   defaultModel: "meta-llama/Llama-3.3-70B-Instruct", supportsChat: true, free: true },
  { id: "scaleway",         label: "Scaleway",                authKind: "key",     baseUrl: "https://api.scaleway.ai/v1",                defaultModel: "llama-3.3-70b-instruct",     supportsChat: true,  free: false },
  { id: "302-ai",           label: "302.AI",                  authKind: "key",     baseUrl: "https://api.302.ai/v1",                     defaultModel: "gpt-4o-mini",                supportsChat: true,  free: false },
  { id: "cortecs",          label: "Cortecs",                 authKind: "key",     baseUrl: "https://api.cortecs.org/v1",                defaultModel: "llama-3.1-70b",              supportsChat: true,  free: false },
  { id: "openai-compatible",label: "OpenAI-compatible endpoint", authKind: "url+key", baseUrl: "",                                      defaultModel: "gpt-4o-mini",                supportsChat: true,  free: false },
];

const DEFAULT_PHASE_ROUTING: PhaseRouting[] = [
  { phase: "default",  providerId: null, model: "" },
  { phase: "intake",   providerId: null, model: "" },
  { phase: "design",   providerId: null, model: "" },
  { phase: "build",    providerId: null, model: "" },
  { phase: "verify",   providerId: null, model: "" },
  { phase: "security", providerId: null, model: "" },
];

type State = {
  connected: ConnectedProvider[];
  phaseRouting: PhaseRouting[];

  addProvider: (providerId: ProviderId, credential: string, customBaseUrl?: string) => void;
  removeProvider: (providerId: ProviderId) => void;
  setDefault: (providerId: ProviderId) => void;
  updateCredential: (providerId: ProviderId, credential: string, customBaseUrl?: string) => void;

  setPhaseRouting: (phase: PhaseRole, providerId: ProviderId | null, model: string) => void;

  getActiveProvider: (phase?: PhaseRole) => { entry: ProviderEntry; connected: ConnectedProvider } | null;
  getDefaultProvider: () => { entry: ProviderEntry; connected: ConnectedProvider } | null;
};

export const useAIProviderStore = create<State>()(
  persist(
    (set, get) => ({
      connected: [],
      phaseRouting: DEFAULT_PHASE_ROUTING,

      addProvider: (providerId, credential, customBaseUrl) => {
        const existing = get().connected.find((c) => c.providerId === providerId);
        if (existing) {
          get().updateCredential(providerId, credential, customBaseUrl);
          return;
        }
        const isFirst = get().connected.length === 0;
        set({
          connected: [
            ...get().connected,
            { providerId, credential, customBaseUrl, addedAt: Date.now(), isDefault: isFirst },
          ],
        });
      },

      removeProvider: (providerId) => {
        const remaining = get().connected.filter((c) => c.providerId !== providerId);
        // If we removed the default, promote next one
        const hadDefault = get().connected.find((c) => c.providerId === providerId)?.isDefault;
        if (hadDefault && remaining.length > 0) remaining[0].isDefault = true;
        set({ connected: remaining });
      },

      setDefault: (providerId) => {
        set({
          connected: get().connected.map((c) => ({ ...c, isDefault: c.providerId === providerId })),
        });
      },

      updateCredential: (providerId, credential, customBaseUrl) => {
        set({
          connected: get().connected.map((c) =>
            c.providerId === providerId ? { ...c, credential, customBaseUrl } : c
          ),
        });
      },

      setPhaseRouting: (phase, providerId, model) => {
        set({
          phaseRouting: get().phaseRouting.map((r) =>
            r.phase === phase ? { ...r, providerId, model } : r
          ),
        });
      },

      getDefaultProvider: () => {
        const { connected } = get();
        const def = connected.find((c) => c.isDefault) ?? connected[0] ?? null;
        if (!def) return null;
        const entry = PROVIDER_CATALOG.find((p) => p.id === def.providerId);
        if (!entry) return null;
        return { entry, connected: def };
      },

      getActiveProvider: (phase) => {
        const { phaseRouting } = get();
        if (phase && phase !== "default") {
          const routing = phaseRouting.find((r) => r.phase === phase);
          if (routing?.providerId) {
            const conn = get().connected.find((c) => c.providerId === routing.providerId);
            const entry = PROVIDER_CATALOG.find((p) => p.id === routing.providerId);
            if (conn && entry) return { entry, connected: conn };
          }
        }
        return get().getDefaultProvider();
      },
    }),
    {
      name: "hooke:ai-providers",
      storage: createJSONStorage(() => idbStorage),
    }
  )
);
