# Feature Preservation Register

**Branch:** `phase-5-ai-brain`  
**Date:** 2026-07-03

This register lists every feature, UI component, and data model in the current codebase that must be preserved through the v2 platform migration. Nothing on this list is deleted without explicit justification and approval.

---

## Data Models (Preserve All)

### Project Model (`src/store/project-store.ts`)
```typescript
type Project = {
  id: string;
  name: string;
  description: string;
  tags: string[];
  status: ProjectStatus; // draft | active | rendering | published | archived
  favorite: boolean;
  createdAt: number;
  updatedAt: number;
};
```
**Why preserve:** Well-designed. Covers all lifecycle states. Compatible with Project Graph node model.  
**Migration:** Add to Project Graph as a `project` node type. Existing IndexedDB data migrates automatically.

---

### Blueprint / Conversation Model (`src/store/blueprint-store.ts`)
```typescript
type Blueprint = {
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

type Scene = {
  id: string;
  number: number;
  heading: string;
  beat: string;
  shot: string;
  duration: number;
  prompt: string;
};
```
**Why preserve:** Scene structure is exactly right for storyboard and timeline integration. Blueprint fields cover all interview data.  
**Migration:** Blueprint becomes a first-class entity (not embedded in Conversation). New version field added.

---

### Strategy Presets (`src/store/blueprint-store.ts`)
The six presets (cinematic, documentary, kinetic, product, narrative, social) with `defaultScenes` and `shotStyle` are well-considered creative choices.  
**Preserve entirely.**

---

### Interview Fields (`src/store/blueprint-store.ts`)
The six interview fields (logline, audience, tone, length, format, references) with their questions, placeholders, and hints represent real production knowledge.  
**Preserve entirely.** The interview flow is the right UX.

---

### Universe / Entity Model (`src/store/universe-store.ts`)
```typescript
type Universe = { id, name, logline, genre, era, entities, brand, linkedProjectIds, ... };
type UniverseEntity = { id, kind, name, summary, details, tags, imageUrl, ... };
type EntityKind = 'character' | 'location' | 'prop' | 'vehicle' | 'lore' | 'timeline' | 'voice' | 'music';
type BrandKit = { colors, fontHeading, fontBody, logoUrl, introUrl, outroUrl, watermarkUrl, cta, musicTheme };
```
**Why preserve:** EntityKind enum covers all the right world-building primitives. BrandKit is comprehensive. `details: Record<string, string>` is a smart flexible schema.  
**Migration:** Universe becomes a Project Graph node. Entities become typed graph nodes linked to Universe.

---

## UI Components (Preserve All)

### Shadcn/UI Component Library (`src/components/ui/`)
The full Shadcn/UI library (Accordion, Alert, Avatar, Button, Dialog, Dropdown, Form, Input, Select, Sheet, Tabs, Toast, etc.) is installed and configured.  
**Preserve entirely.** Do not replace or remove individual components.

### Sidebar Navigation (`src/components/app-sidebar.tsx`)
The visual sidebar with section groupings (Create, Produce, Library, Publish) is a good information architecture.  
**Preserve structure.** Remove navigation items for routes that are hidden (analytics, publish) until those are implemented.

### Topbar (`src/components/app-topbar.tsx`)
Clean breadcrumb + actions topbar.  
**Preserve.**

---

## Infrastructure (Preserve All)

### IndexedDB Storage Adapter (`src/lib/idb-storage.ts`)
Clean, tested adapter for Zustand + idb-keyval.  
**Preserve entirely.**

### Zustand + Persist Pattern
All stores use `create() + persist() + createJSONStorage(() => idbStorage)` with `partialize` and `onRehydrateStorage`.  
**Preserve pattern.** New stores follow this same pattern.

### Error Capture (`src/lib/error-capture.ts`)
Global error listener that captures uncaught errors and unhandled rejections.  
**Preserve.**

### Vite + TanStack Router Setup
The routing setup, route tree generation, and layout structure work correctly.  
**Preserve.** Follow the existing route file pattern for new routes.

---

## LLM Provider Clients (Preserve, Fix)

### `openai.ts`, `anthropic.ts`, `gemini.ts`, `ollama.ts`
The underlying HTTP implementation and streaming logic are correctly implemented.  
**Preserve the implementation.** Fix the missing `ai-providers.ts` interface file (TD-001). Remove `any` types (TD-009).

---

## What Is NOT Preserved

The following items are not preserved because they violate engineering standards:

| Item | Reason |
|---|---|
| `seed()` in `project-store.ts` | Fake data presented as user data |
| `seed()` in `universe-store.ts` | Fake data presented as user data |
| `synthesizeBeats()` in `blueprint-store.ts` | Fake AI in production path |
| `directorReplyForStep()` hardcoded strings | Fake AI responses |
| `module-placeholder.tsx` | Embodies the placeholder antipattern |
| `analytics.tsx` placeholder content | Not a real feature |
| `publish.tsx` placeholder content | Not a real feature |
| `settings.tsx` placeholder content | Not a real feature |
