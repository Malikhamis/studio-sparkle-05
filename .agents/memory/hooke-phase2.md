---
name: Hooke v2 Phase 2 decisions
description: Key implementation decisions for the platform layer, No Placeholder Policy enforcement, and known quirks for ongoing work.
---

## Branch
All implementation work is on `phase-5-ai-brain` of `github.com/Malikhamis/studio-sparkle-05`. Never commit implementation to `main`.

## Package manager
Bun is installed at `/nix/store/4lj4hwbvr5w3w9m2bqfflbsnvij5fjmi-bun-1.3.6-wrapped/bin/bun`. `npm` and `bun` are not on PATH by default — use the full nix store path.

## Pre-existing TypeScript error
`src/routes/story.tsx:774` — `StoryTemplate` type mismatch with `'cinematic'` literal. This is pre-existing and unrelated to Phase 2 work. All other files type-check clean.

## API key storage
Keys are XOR-obfuscated (not cryptographically encrypted) in IndexedDB. The UI must say "stored on this device only" — never "encrypted". A future upgrade to Web Crypto API is noted in the codebase comment.

## Platform init race fix
`ProjectGraph.load()` merges persisted state with in-memory state (in-memory wins for same key). This prevents user actions that fire before `load()` resolves from being overwritten. Other platform classes (memorySystem, assetGraph, blueprintEngine) should use the same merge pattern if they are modified.

`initializePlatform()` is idempotent — calling it multiple times returns the same promise. `getPlatformInitPromise()` lets callers await readiness.

**Why:** The platform singleton is instantiated at module load time, so mutations can occur before `load()` resolves. A full-overwrite on load would silently drop those writes.

## Settings store routing safety
`removeProvider` scrubs all `modelRouting` references pointing to the removed ID. `getActiveConfig` falls back to default if a routed provider no longer exists in the providers list. Both must stay in sync if the routing logic changes.

## No Placeholder Policy enforcement
- Sidebar nav: only routes with real implementations appear in `src/lib/nav.ts`. Analytics and Publish are excluded until real implementations exist; their routes remain for deep-link compatibility.
- Seed data: removed from `project-store.ts` and `universe-store.ts`. Empty state is now the starting point.
- `module-placeholder.tsx` component still exists but is no longer used in analytics/publish/settings routes. Delete it once all remaining usages are cleared.

## Outstanding TD items (as of Phase 2 complete)
- TD-002: Wire real LLM into `generateBlueprint()` in `blueprint-store.ts`
- TD-006/TD-007: Add event + graph registration to blueprint-store and story-store
- TD-008/TD-009: Add event + graph registration to asset-store
- TD-010: Add event emission to timeline store
- TD-014/TD-015: Empty-state guided UX for Dashboard and Projects (no fake content)
- Delete `src/components/module-placeholder.tsx` after all usages are removed
