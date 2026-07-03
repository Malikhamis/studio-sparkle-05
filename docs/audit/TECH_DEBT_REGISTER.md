# Technical Debt Register

**Branch:** `phase-5-ai-brain`  
**Date:** 2026-07-03

This register catalogs every identified instance of technical debt that must be resolved. Items are ordered by severity.

---

## Critical (Blocking Correctness)

### TD-001: Missing `ai-providers.ts` interface file
**Location:** `src/lib/llm/openai.ts`, `anthropic.ts`, `gemini.ts`, `ollama.ts`  
**Issue:** All four LLM clients import `LLMClient`, `LLMMessage`, `LLMResponse`, `LLMConfig` from `../ai-providers`, but this file does not exist. The LLM clients do not compile.  
**Resolution:** Create `src/lib/ai-providers.ts` with the shared interface definitions. This is a prerequisite for any LLM work.  
**Effort:** Small (30 min)

### TD-002: Blueprint generation uses local heuristics, not real LLM
**Location:** `src/store/blueprint-store.ts` — `generateBlueprint()`, `buildBlueprint()`, `synthesizeBeats()`  
**Issue:** The miDirector's core function — blueprint generation — is entirely local. Hardcoded beat structures ("Cold Open", "Inciting Image", etc.) are assembled from the logline with no AI involvement. Director "responses" are hardcoded strings from `ackPhrases[]`.  
**Resolution:** Wire `generateBlueprint()` to the Director Agent, which calls a real LLM with full interview context.  
**Effort:** Medium (requires Settings + AI provider to be working first)

### TD-003: `settings.tsx` renders ModulePlaceholder
**Location:** `src/routes/settings.tsx`  
**Issue:** Settings is where users configure AI providers. Without working settings, no real AI works. This is the most critically blocked placeholder — everything downstream depends on it.  
**Resolution:** Implement real Settings UI with AI provider management (add key, select model, test connection, set default).  
**Effort:** Medium-Large

### TD-004: Missing Settings store
**Location:** No `src/store/settings-store.ts` exists  
**Issue:** There is nowhere to persist provider configuration, API keys (encrypted), or user preferences.  
**Resolution:** Create settings store with encrypted API key storage.  
**Effort:** Medium

---

## High (Violates Engineering Standards)

### TD-005: Seed data presented as user data
**Location:** `src/store/project-store.ts` — `seed()`, `src/store/universe-store.ts` — `seed()`  
**Issue:** New users see "Coastal Highway B-Roll", "Founder Interview · Ep 03", "The Dream Chasers" universe — fabricated projects and universes presented as if they were the user's own work. Violates the No Placeholder Policy directly.  
**Resolution:** Remove seed functions. Replace with empty-state UX (guided prompts to create a first project/universe). User data starts empty.  
**Effort:** Small-Medium

### TD-006: No event emission from stores
**Location:** All stores — `project-store.ts`, `blueprint-store.ts`, `universe-store.ts`, `story-store.ts`, `asset-store.ts`  
**Issue:** No store action emits platform events. Cross-module reactivity (e.g., character updated → story flagged for review) is impossible without this.  
**Resolution:** After Event Bus is implemented, add event emission to all mutating store actions.  
**Effort:** Medium (systematic, not complex)

### TD-007: No Project Graph registration
**Location:** All stores  
**Issue:** Entities created through stores are not registered in a Project Graph. There is no central knowledge of what belongs to what project.  
**Resolution:** After Project Graph is implemented, add registration calls to all entity-creating store actions.  
**Effort:** Medium

### TD-008: `analytics.tsx` and `publish.tsx` render ModulePlaceholder
**Location:** `src/routes/analytics.tsx`, `src/routes/publish.tsx`  
**Issue:** Two routes are entirely non-functional but appear in navigation.  
**Resolution:** Remove from navigation until real implementations exist. Do not render placeholder UI.  
**Effort:** Small (remove from nav); Large (implement for real)

### TD-009: `any` type in LLM client internals
**Location:** `src/lib/llm/openai.ts` — `request()` return type  
**Issue:** `private async request(...): Promise<any>` violates strict TypeScript standard.  
**Resolution:** Type the return properly or use `unknown` with type narrowing.  
**Effort:** Small

### TD-010: `module-placeholder.tsx` component exists
**Location:** `src/components/module-placeholder.tsx`  
**Issue:** A component whose entire purpose is to display "coming soon" content should not exist in a codebase committed to the No Placeholder Policy.  
**Resolution:** Delete after all usage sites are resolved.  
**Effort:** Depends on TD-003, TD-008

---

## Medium (Reduces Quality)

### TD-011: Hard deletes on all entities
**Location:** `project-store.ts` — `deleteProject()`, similar in other stores  
**Issue:** Entities are immediately and permanently deleted. No soft delete, no undo, no grace period.  
**Resolution:** Implement soft delete with `deletedAt` timestamp. Purge after 30 days or explicit "empty trash" action.  
**Effort:** Medium

### TD-012: `confirm()` used for destructive actions
**Location:** `story.tsx` (per audit notes)  
**Issue:** Browser's `confirm()` dialog is used for delete confirmation. It is inaccessible (no keyboard trap management), unstyled, and blocks the JS thread.  
**Resolution:** Replace with the application's dialog/alert-dialog component.  
**Effort:** Small

### TD-013: Mock client has no production guard
**Location:** `src/lib/llm/mock.ts`  
**Issue:** The mock client can be instantiated in any context, including production. There is no runtime check preventing production use.  
**Resolution:** Add `if (process.env.NODE_ENV === 'production') throw new Error('Mock client cannot be used in production')` to constructor.  
**Effort:** Trivial

### TD-014: `countTokens()` uses character approximation
**Location:** `src/lib/llm/openai.ts`  
**Issue:** Token count is estimated as `length / 4`. This can be 2x off for non-English content or code.  
**Resolution:** Use provider-appropriate tokenization or a local tiktoken implementation.  
**Effort:** Small-Medium

---

## Low (Quality of Life)

### TD-015: No loading states for async store actions
**Location:** Various stores  
**Issue:** Async operations (future LLM calls, Supabase sync) have no loading state in stores.  
**Resolution:** Add `isLoading: boolean` and `error: string | null` fields to stores that perform async work.  
**Effort:** Small per store

### TD-016: Blueprint embedded inside Conversation
**Location:** `src/store/blueprint-store.ts`  
**Issue:** Blueprint is a `blueprint?: Blueprint` field on the Conversation record. This means a blueprint has no independent existence or ID namespace.  
**Resolution:** Move Blueprint to its own top-level entity in the store/graph.  
**Effort:** Medium (data model change, requires migration)

---

## Debt Summary

| Severity | Count | Estimated Total Effort |
|---|---|---|
| Critical | 4 | 2–4 days |
| High | 6 | 4–8 days |
| Medium | 4 | 2–4 days |
| Low | 2 | 1–2 days |
| **Total** | **16** | **9–18 days** |
