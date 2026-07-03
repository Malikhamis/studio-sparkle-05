# Hooke v2 Module Audit

**Branch audited:** `phase-5-ai-brain`  
**Audit date:** 2026-07-03  
**Standard applied:** Hooke v2 Engineering Standards + No Placeholder Policy

This document is the output of Phase 1 of the Hooke v2 roadmap. It classifies every current module using the four-category system:

- 🟢 **Keep** — Production-quality, correct architecture, no significant issues
- 🟡 **Refactor** — Functional but does not meet current standards
- 🟠 **Expand** — Good foundation, requires significant new capability
- 🔴 **Rebuild** — Cannot be made production-grade without rewrite

---

## Platform Infrastructure

### IndexedDB Persistence (`src/lib/idb-storage.ts`)
**Classification: 🟢 Keep**

Real implementation using `idb-keyval`. Provides a clean `Storage` adapter for Zustand's `persist` middleware. All stores use this for local persistence. No issues.

### LLM Provider Clients (`src/lib/llm/`)

#### `openai.ts` — 🟡 Refactor
Real implementation with `chat()` and `chatStream()` methods. Uses standard `fetch` against the OpenAI API. Streaming is properly implemented. Issues:
- Imports from `../ai-providers` — this file does not exist in the repository. Code does not compile without it.
- Token counting is approximate (`length / 4`) — acceptable for now, documented.
- `any` return type on internal `request()` method — violates strict TypeScript standard.

#### `anthropic.ts` — 🟡 Refactor
Same issues as `openai.ts` regarding the missing `../ai-providers` import.

#### `gemini.ts` — 🟡 Refactor
Same issues as `openai.ts` regarding the missing `../ai-providers` import.

#### `ollama.ts` — 🟡 Refactor
Real implementation for local Ollama. Same import issue.

#### `mock.ts` — 🔴 Rebuild (in context of production use)
Acceptable for testing. **Must never be reachable from production code paths.** Currently there is no guard preventing it from being used in production. Needs a hard runtime guard.

---

## State Stores

### `project-store.ts` — 🟡 Refactor
**Issues:**
- Seeds fake project data ("Coastal Highway B-Roll", "Founder Interview") for new users. This violates the No Placeholder Policy — hardcoded data presented as user data.
- No integration with Project Graph (which does not yet exist).
- No event emission on mutations.
- `deleteProject` is a hard delete — no soft delete or grace period.

**Preserve:** Project data model (well-typed), all CRUD operations, persist/rehydrate pattern.

### `blueprint-store.ts` — 🟡 Refactor
**Issues:**
- `generateBlueprint()` uses entirely local heuristics (`buildBlueprint()`, `synthesizeBeats()`) — **no real LLM call is made**. This is a mock AI implementation in disguise.
- Director "responses" are hardcoded strings, not real AI responses.
- Blueprint is embedded inside the Conversation record — not a first-class entity with its own ID scope.
- No event emission on blueprint generation.
- No integration with Project Graph.

**Preserve:** Interview data model (well-designed), strategy presets, scene structure, CRUD operations for scenes, persist pattern.

### `universe-store.ts` — 🟡 Refactor
**Issues:**
- Seeds a fake universe ("The Dream Chasers" with "Iris Vale" character) for new users. Violates No Placeholder Policy.
- No event emission on mutations.
- No integration with Project Graph.

**Preserve:** Universe and entity data models (excellent schema), CRUD operations, brand kit structure, entity kinds.

### `story-store.ts` — 🟡 Refactor
**Issues (expected — not yet read):** Likely similar seeding and no-event issues based on pattern from other stores.

**Preserve:** Story hierarchy (Series → Season → Episode → Scene) — well-designed structure.

### `asset-store.ts` — 🟡 Refactor
**Issues (expected):** Likely no event emission, no Asset Graph integration.

**Preserve:** File handling, folder structure, upload logic.

### `ui-store.ts` — 🟢 Keep
Pure UI state (sidebar, theme, workspace). No business logic. No platform integration needed.

---

## Routes / Pages

### `index.tsx` (Dashboard) — 🟠 Expand
Displays stat cards and recent projects. **Issues:** Stat cards show hardcoded/derived-from-seed data, not real platform metrics. Activity feed is not real. Render status is not real.

**Preserve:** Layout structure, stat card UI, recent projects list (if data is real).

### `director.tsx` (miDirector) — 🟠 Expand
Interview UI is well-designed. **Critical issue:** The "Director" responses are hardcoded strings and blueprint generation is local heuristics — there is no real LLM. This is the core module that should be using real AI, and it isn't.

**Preserve:** Interview flow UI, blueprint editor UI, scene list.

### `story.tsx` (miStory) — 🟠 Expand
Story hierarchy management appears functional. **Issues:** AI generation buttons likely call local logic or toast placeholders. Needs real Writer agent integration.

### `universe.tsx` (miUniverse) — 🟠 Expand
World-building UI appears functional. **Issues:** Seeded data, no cross-project linking working through real platform, no AI-assisted entity generation.

### `projects.tsx` — 🟡 Refactor
Project list with CRUD. **Issues:** Seeded fake projects, no Project Graph integration.

### `assets.tsx` — 🟠 Expand
Asset library UI. Needs real Asset Graph integration.

### `analytics.tsx` — 🔴 Rebuild
**Currently renders `ModulePlaceholder`.** Violates No Placeholder Policy. Must remain hidden until real analytics implementation exists.

### `production.tsx` — 🟠 Expand
Has some content (was updated per git log). Needs assessment of what's real vs placeholder.

### `publish.tsx` — 🔴 Rebuild
**Currently renders `ModulePlaceholder`.** Violates No Placeholder Policy.

### `settings.tsx` — 🔴 Rebuild
**Currently renders `ModulePlaceholder`.** This is a critical violation — Settings is where users configure AI providers. Without working settings, no real AI can be used. Must be rebuilt as the first priority.

---

## Layout Components

### `app-sidebar.tsx` — 🟡 Refactor
Navigation structure is sound. Shows navigation items for all routes including placeholder ones — violates the principle that hidden/incomplete features should not appear in navigation.

### `app-topbar.tsx` — 🟢 Keep
Breadcrumb and topbar. No significant issues.

### `module-placeholder.tsx` — 🔴 Remove
This component exists to display "coming soon" content. Per the No Placeholder Policy, it should be deleted. Its usage sites must be replaced with real implementations or the routes must be removed from navigation until they are ready.

---

## Missing Platform Systems

The following platform systems are required by the architecture and do not yet exist:

| System | Status | Priority |
|---|---|---|
| Event Bus | ❌ Missing | Phase 2 — Critical |
| Project Graph | ❌ Missing | Phase 2 — Critical |
| Blueprint Engine | ❌ Missing (local heuristic only) | Phase 2 — Critical |
| Memory System | ❌ Missing | Phase 2 — High |
| Asset Graph | ❌ Missing | Phase 2 — High |
| AI Agent Layer | ❌ Missing (clients exist, agents don't) | Phase 2 — High |
| Provider interface (`ai-providers.ts`) | ❌ Missing (imported but doesn't exist) | Phase 2 — Blocking |
| Settings store | ❌ Missing | Phase 2 — Blocking for AI |
| Generation Queue | ❌ Missing | Phase 5 |

---

## Summary

| Classification | Count | Modules |
|---|---|---|
| 🟢 Keep | 2 | `idb-storage`, `ui-store` |
| 🟡 Refactor | 9 | `openai.ts`, `anthropic.ts`, `gemini.ts`, `ollama.ts`, `project-store`, `blueprint-store`, `universe-store`, `projects.tsx`, `app-sidebar.tsx` |
| 🟠 Expand | 5 | Dashboard, miDirector, miStory, miUniverse, Assets |
| 🔴 Rebuild | 4 | `analytics.tsx`, `publish.tsx`, `settings.tsx`, `module-placeholder.tsx` |
| ❌ Missing | 9 | All platform systems |
