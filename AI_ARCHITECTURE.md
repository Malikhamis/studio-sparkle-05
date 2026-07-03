# Hooke AI Architecture

This document defines the AI agent system, provider abstraction, and context-aware generation protocols. It is the reference for all AI integration work.

---

## Design Principles

1. **Context always** — No AI call is context-free. Every prompt is built from project state.
2. **Agents, not prompts** — AI behavior is encapsulated in agents, not scattered across components.
3. **Graceful degradation** — If AI fails, the user gets a clear error and a recovery path — not a blank screen.
4. **Real providers only** — The mock client is for testing. Production code always uses a real provider or fails clearly.
5. **Outputs are assets** — Every AI output is stored, versioned, and reusable.

---

## Provider Abstraction Layer

Location: `src/lib/llm/`

All LLM clients implement a shared interface:

```typescript
interface LLMClient {
  chat(messages: LLMMessage[]): Promise<LLMResponse>;
  chatStream(messages: LLMMessage[], onToken: (token: string) => void): Promise<LLMResponse>;
  validateConfig(): Promise<void>;
  countTokens(text: string): Promise<number>;
}
```

### Supported Providers

| Provider | Client | Models |
|---|---|---|
| OpenAI | `src/lib/llm/openai.ts` | GPT-4o, GPT-4, GPT-3.5-turbo |
| Anthropic | `src/lib/llm/anthropic.ts` | Claude 3.5 Sonnet, Claude 3 Opus |
| Google Gemini | `src/lib/llm/gemini.ts` | Gemini 1.5 Pro, Gemini 1.5 Flash |
| Ollama | `src/lib/llm/ollama.ts` | Any locally hosted model |
| Mock | `src/lib/llm/mock.ts` | Testing only — never in production |

### Provider Selection

The active provider is set by the user in Settings → AI Providers. The selection is stored in the Memory System (User Memory layer) and read by the AI Agent Layer when constructing calls.

Provider routing:
```typescript
// src/lib/llm/index.ts
export function getActiveClient(): LLMClient {
  const settings = useSettingsStore.getState();
  const provider = settings.activeProvider;
  if (!provider || !provider.apiKey) {
    throw new LLMProviderError('No AI provider configured. Please add a provider in Settings → AI Providers.');
  }
  return createClient(provider);
}
```

---

## AI Agent Roster

Each agent is a function (or class) that accepts platform context and produces a typed output.

### Director Agent (`src/lib/agents/director.ts`)

**Responsibility:** Guides the miDirector interview and generates Blueprints.

**Inputs:**
- Interview answers (logline, audience, tone, length, format, references)
- Strategy preset
- User memory (past project preferences)

**Outputs:**
- Structured Blueprint JSON
- Interview response turns (conversational guidance)

**System prompt context:**
```
You are miDirector, an expert creative director for video productions.
You are working with a filmmaker on a [preset] production.
User memory: [relevant user preferences]
Your job: synthesize the interview answers into a production Blueprint.
```

**Output format:** Validated against the Blueprint schema. If validation fails, retry with error feedback (max 3 attempts).

---

### Writer Agent (`src/lib/agents/writer.ts`)

**Responsibility:** Generates story and scene text from Blueprint.

**Inputs:**
- Full Blueprint (logline, scenes, tone, references)
- Character roster from Project Graph
- Project Memory (what has been established)
- Specific generation target (episode, scene, dialogue)

**Outputs:**
- Scene prose / script
- Episode summaries
- Character dialogue

**System prompt context:**
```
You are a professional screenwriter working on [project title].
Blueprint: [full blueprint JSON]
Established characters: [character list from Project Graph]
Story memory: [relevant project memory entries]
Tone: [blueprint tone]
References: [blueprint references]
```

---

### Memory Manager Agent (`src/lib/agents/memory-manager.ts`)

**Responsibility:** Keeps project memory coherent and bounded.

**Triggers:**
- After any significant AI generation completes
- When Memory System size exceeds threshold

**Inputs:**
- Current memory entries
- Recent AI generation output
- Project Graph state

**Outputs:**
- Summarized memory entries (replaces verbose raw entries)
- Flagged contradictions (e.g., character detail changed after a generation used old detail)

---

## Context Building Protocol

Every AI agent builds its prompt using this protocol:

```typescript
async function buildContext(projectId: string, agentRole: AgentRole): Promise<AgentContext> {
  const graph = projectGraph.getProject(projectId);
  const blueprint = blueprintEngine.getBlueprint(projectId);
  const memory = memorySystem.getRelevantMemory(projectId, agentRole);
  const userPrefs = memorySystem.getUserMemory();

  return {
    projectTitle: graph.project.name,
    blueprint,
    characters: graph.getNodes('character'),
    locations: graph.getNodes('location'),
    projectMemory: memory.project,
    aiMemory: memory.ai,
    userPreferences: userPrefs,
  };
}
```

No agent skips this protocol. No prompt is context-free.

---

## Retry Policy

All AI calls use this retry policy:

```typescript
const RETRY_POLICY = {
  maxAttempts: 3,
  backoff: 'exponential',    // 1s, 2s, 4s
  retryOn: [
    'rate_limit',            // 429
    'server_error',          // 5xx
    'timeout',               // request timeout
    'malformed_response',    // JSON parse failure
  ],
  doNotRetryOn: [
    'invalid_api_key',       // 401 — user must fix settings
    'content_policy',        // 400 content refusal — surface to user
    'context_length',        // token limit exceeded — reduce context
  ],
};
```

After exhausting retries, the agent emits `ai:generation:failed` and surfaces a user-facing error with:
- What failed (human-readable)
- Why it likely failed
- What the user can do (check API key, reduce context, try a different provider)

---

## Output Validation

Every structured AI output is validated before use:

1. JSON is parsed (retry if malformed).
2. Output is validated against the expected schema using Zod.
3. If validation fails, a correction prompt is sent to the LLM (max 1 correction attempt).
4. If correction fails, the raw output is shown to the user with an edit interface.

Example Blueprint validation schema:
```typescript
const BlueprintSchema = z.object({
  title: z.string().min(1),
  preset: StrategyPresetSchema,
  logline: z.string(),
  scenes: z.array(SceneSchema).min(1).max(20),
  // ...
});
```

---

## Generation Queue

AI generations are queued, not fired simultaneously:

- Each project has one active generation slot.
- Queued generations are shown in the UI with status (pending, running, complete, failed).
- Users can cancel queued generations.
- Completed generations are stored before being surfaced to the user (no "generation disappeared on refresh").

Location: `src/lib/platform/generation-queue.ts` (Phase 5 implementation)

---

## Security: Prompt Injection Defense

User-provided content included in prompts is sanitized:

1. HTML-strip user input before including in prompts.
2. Wrap user content in clear delimiters: `<user-content>...</user-content>`.
3. System prompt explicitly instructs the model to treat delimited content as data, not instructions.
4. Output is validated against expected schema — instruction-following injections produce schema violations, which are rejected.

---

## Adding a New Agent

1. Define the agent's role, inputs, and outputs in this document.
2. Create `src/lib/agents/agent-name.ts` implementing the `Agent` interface.
3. Use `buildContext()` — never construct prompts without it.
4. Apply the standard retry policy.
5. Emit the standard AI events.
6. Validate all structured outputs with Zod.
7. Write outputs to the Asset Graph and Memory System.
8. Write tests that cover both success and failure paths.

---

*AI behavior is deterministic through agent contracts. Prompt engineering happens in agents, not in components.*
