# Migration Strategy

**Branch:** `phase-5-ai-brain`  
**Date:** 2026-07-03

This document defines the safe migration path from the current state of the codebase to the v2 platform architecture. It ensures no working feature is broken during the transition.

---

## Guiding Principle

We do not rewrite everything at once. We migrate systematically, one system at a time, always keeping the application in a runnable state between steps. The migration is complete when every item in the Technical Debt Register is resolved and every platform system from the Architecture document is implemented.

---

## Phase 2A: Fix Blocking Issues First

These must be resolved before any other migration work begins.

### Step 1: Create `src/lib/ai-providers.ts`
The missing interface file that all LLM clients import. Without this, the LLM clients don't compile.

```typescript
// src/lib/ai-providers.ts
export interface LLMMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface LLMResponse {
  content: string;
  stopReason?: string;
  tokensUsed?: { input: number; output: number };
}

export interface LLMConfig {
  apiKey: string;
  model: string;
  temperature?: number;
  maxTokens?: number;
  timeout?: number;
}

export interface LLMClient {
  chat(messages: LLMMessage[]): Promise<LLMResponse>;
  chatStream(messages: LLMMessage[], onToken: (token: string) => void): Promise<LLMResponse>;
  validateConfig(): Promise<void>;
  countTokens(text: string): Promise<number>;
}
```

### Step 2: Add mock client production guard
```typescript
// src/lib/llm/mock.ts — add to constructor
if (typeof process !== 'undefined' && process.env.NODE_ENV === 'production') {
  throw new Error('[Hooke] MockLLMClient cannot be used in production.');
}
```

### Step 3: Fix TypeScript strict violations in LLM clients
Replace `Promise<any>` with typed returns.

---

## Phase 2B: Implement Platform Core Systems

In dependency order:

### Step 1: Event Bus
No dependencies. Can be implemented immediately.  
File: `src/lib/platform/event-bus.ts`

### Step 2: Project Graph
Depends on Event Bus (emits events on mutations).  
File: `src/lib/platform/project-graph.ts`

### Step 3: Memory System
Depends on Event Bus.  
Files: `src/lib/platform/memory/`

### Step 4: Asset Graph
Depends on Event Bus and Project Graph.  
File: `src/lib/platform/asset-graph.ts`

### Step 5: Blueprint Engine
Depends on Project Graph and Memory System.  
File: `src/lib/platform/blueprint-engine.ts`

---

## Phase 2C: Settings (Unblocks AI)

### Step 1: Settings store
Create `src/store/settings-store.ts` with:
- Active AI provider config (provider name, model, encrypted API key)
- Per-phase model routing (optional)
- UI preferences

### Step 2: Settings route
Replace `settings.tsx` ModulePlaceholder with real UI:
- AI Providers section: add/remove/test providers
- Model Routing section: assign models to tasks
- Appearance section: theme, sidebar state

This unblocks all real AI functionality.

---

## Phase 2D: Migrate Stores to Platform

### Migration order (by risk, lowest first)

1. **`project-store.ts`**
   - Remove `seed()` function — replace with guided empty state
   - Add `useProjectStore` integration with Project Graph on all mutations
   - Add event emission on create/update/delete/archive

2. **`universe-store.ts`**
   - Remove `seed()` function
   - Add Project Graph integration
   - Add event emission

3. **`blueprint-store.ts`**
   - Remove `buildBlueprint()`, `synthesizeBeats()`, `directorReplyForStep()`, `ackPhrases`
   - Replace `generateBlueprint()` with Director Agent call
   - Replace hardcoded director turns with real streaming LLM responses
   - Add Blueprint to Project Graph as first-class entity
   - Add event emission on blueprint:generated

4. **`story-store.ts`** — Add events and Project Graph integration

5. **`asset-store.ts`** — Add Asset Graph integration

**Migration safety:** Each store migration is done in a separate commit with a separate test run. The application must be runnable after every commit.

---

## Phase 2E: Remove Placeholders

In order:

1. **`settings.tsx`** — Already covered in Phase 2C.
2. **`analytics.tsx`** — Hide from navigation. Build real analytics in a later phase.
3. **`publish.tsx`** — Hide from navigation. Build real publishing in a later phase.
4. **`module-placeholder.tsx`** — Delete after all usage sites are resolved.
5. **`app-sidebar.tsx`** — Remove navigation items for hidden modules.

---

## Data Migration

### Existing IndexedDB Data

Users on the current branch who have real data in IndexedDB must not lose it during migration.

**Strategy:** Versioned migration system in each store.

```typescript
// src/lib/platform/migrations.ts
const MIGRATIONS: Record<string, Migration[]> = {
  'hooke:projects': [
    {
      version: 2,
      migrate: (data: unknown) => {
        // Add any new fields with defaults
        // Remove seed data entries (identifiable by matching seed() output)
        return migratedData;
      }
    }
  ],
  // etc.
};
```

Migration runs automatically on `onRehydrateStorage`. The version is stored alongside the data.

### Identifying Seed Data

Seed data entries can be identified because they match the exact output of the `seed()` functions (known names: "Coastal Highway B-Roll", "The Dream Chasers", etc.). On migration, if a user's project list contains only these exact entries, it's treated as seed data and cleared in favor of an empty state. If the user has added any real projects alongside the seed data, the seed entries are removed and real data is preserved.

---

## Risk Management

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| IndexedDB migration breaks existing data | Medium | High | Migration test with production-like data before deploying |
| LLM client refactor breaks provider integration | Low | High | Integration tests for each provider before removing old code |
| Store event emission causes infinite loops | Medium | Medium | Event Bus implements loop detection (same event cannot trigger itself within the same tick) |
| Blueprint Engine changes break existing blueprints | Low | Medium | Blueprint schema is versioned; old blueprints load in read-only compatibility mode |
| Settings implementation is incomplete at AI cutover | High | High | Do not remove local heuristic fallback until Settings + real LLM are verified working |

---

## Definition of Migration Complete

The migration is complete when:
1. All items in the Technical Debt Register are resolved.
2. All platform systems in `ARCHITECTURE.md` are implemented.
3. No `ModulePlaceholder` components are rendered in production.
4. No seed data is shown to users.
5. `generateBlueprint()` calls a real LLM.
6. All stores emit events on mutations.
7. All entities are registered in the Project Graph.
8. The Feature Acceptance Gate passes for all migrated modules.
