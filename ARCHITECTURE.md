# Hooke v2 Platform Architecture

This document describes the core platform systems that every Hooke module participates in. It is the authoritative reference for architectural decisions. Before implementing any feature, read this document.

---

## Overview

Hooke's architecture is organized around a central Platform Layer that all application modules connect to. No module operates in isolation.

```
┌─────────────────────────────────────────────────────┐
│                  APPLICATION MODULES                │
│  Dashboard · miDirector · Story · Universe · ...   │
└──────────────────────┬──────────────────────────────┘
                       │ read / write via stores
┌──────────────────────▼──────────────────────────────┐
│                   PLATFORM LAYER                    │
│                                                     │
│  Project Graph  ←→  Event Bus  ←→  Memory System   │
│       ↕                               ↕            │
│  Blueprint Engine              Asset Graph          │
│       ↕                               ↕            │
│  AI Agent Layer  ←────────────────────┘            │
└──────────────────────┬──────────────────────────────┘
                       │ persist
┌──────────────────────▼──────────────────────────────┐
│                  STORAGE LAYER                      │
│         IndexedDB (local)  ·  Supabase (sync)       │
└─────────────────────────────────────────────────────┘
```

---

## Core Platform Systems

### 1. Project Graph (`src/lib/platform/project-graph.ts`)

The central knowledge model. Every entity in Hooke is a node in the Project Graph. Relationships between entities are typed edges.

**Node types:**
- `project` — top-level container
- `blueprint` — creative intent document
- `character` — persistent character entity
- `location` — persistent location entity
- `story` — story structure container
- `scene` — individual scene
- `asset` — generated or uploaded asset
- `timeline` — production timeline
- `voice` — voice profile
- `music` — music theme
- `universe` — cross-project world

**Edge types:**
- `blueprint:belongs-to` — blueprint → project
- `character:appears-in` — character → scene
- `asset:generated-from` — asset → scene/blueprint
- `story:references-character` — story → character
- `universe:includes` — universe → character/location/etc.
- `timeline:contains` — timeline → scene clip

**Rules:**
- Every entity added to the application must be registered in the Project Graph.
- An entity's owner is the node that created it.
- Deleting a node must cascade correctly to dependent edges.
- Cross-project sharing is done through Universe nodes.

**Implementation:** `src/lib/platform/project-graph.ts`

---

### 2. Event Bus (`src/lib/platform/event-bus.ts`)

The communication system for all cross-module interaction. Modules do not call each other directly. They emit events and subscribe to events.

**Event naming:** `entity:action` — e.g., `character:updated`, `blueprint:generated`

**Core event categories:**

| Category | Events |
|---|---|
| Project | `project:created`, `project:updated`, `project:deleted`, `project:archived` |
| Blueprint | `blueprint:generated`, `blueprint:updated`, `blueprint:scene:added`, `blueprint:scene:removed` |
| Character | `character:created`, `character:updated`, `character:deleted` |
| Story | `story:created`, `story:episode:created`, `story:scene:generated` |
| Asset | `asset:added`, `asset:removed`, `asset:version:created` |
| AI | `ai:generation:started`, `ai:generation:completed`, `ai:generation:failed` |
| Memory | `memory:updated` |
| Settings | `settings:provider:updated` |

**Rules:**
- Every event carries a typed payload.
- Subscribers do not throw — they handle errors internally.
- Events are synchronous within a session (no persistence required for events themselves).

**Implementation:** `src/lib/platform/event-bus.ts`

---

### 3. Blueprint Engine (`src/lib/platform/blueprint-engine.ts`)

The single source of truth for project creative intent. A Blueprint is not just a document — it is the plan that drives every downstream AI generation.

**Blueprint structure:**
- Title, logline, audience, tone, format, references
- Strategy preset (cinematic, documentary, kinetic, product, narrative, social)
- Ordered scene list with headings, beats, shot descriptions, and generation prompts
- Version history (every edit creates a new version, old versions are preserved)

**Blueprint generation:**
- Called after the miDirector interview completes
- Uses the AI Agent Layer (Director agent) with the full interview context
- Returns structured JSON conforming to the Blueprint schema
- Persists to Project Graph and emits `blueprint:generated`

**Blueprint consumption:**
- Story generation reads the Blueprint for scene structure
- Storyboard generation reads the Blueprint for shot descriptions
- Voice generation reads the Blueprint for tone
- Every AI agent that operates on a project reads the Blueprint for context

**Rules:**
- The Blueprint is the project's creative contract.
- No AI generation that contradicts the Blueprint is accepted without explicit user approval.
- Blueprint edits emit events so dependent modules can offer to regenerate.

**Implementation:** `src/lib/platform/blueprint-engine.ts`

---

### 4. Memory System (`src/lib/platform/memory/`)

Persistent context that makes AI generations coherent across a project's lifetime.

**Memory layers:**

| Layer | Contents | Scope |
|---|---|---|
| Project Memory | Decisions made, entities created, generations completed | Per project |
| AI Memory | Previous prompts and outputs, what worked/didn't | Per project |
| User Memory | Style preferences, provider preferences, UX choices | Global |
| Universe Memory | Canon facts, character arcs, world rules | Per universe |

**How it works:**
1. Every significant AI output is summarized and written to Project Memory.
2. The AI Agent Layer reads relevant memory before constructing any prompt.
3. Memory is structured, not a raw log — it is designed to be efficiently queryable.
4. Memory size is bounded — old entries are summarized when the memory exceeds its limit.

**Implementation:** `src/lib/platform/memory/`

---

### 5. Asset Graph (`src/lib/platform/asset-graph.ts`)

Tracks the origin, ownership, and lineage of every asset in the platform.

**Asset record:**
- Unique ID
- Kind: `image`, `video`, `audio`, `caption`, `export`, `upload`
- Source: `ai-generated`, `user-uploaded`, `derived`
- Lineage: which scene/blueprint/character prompt produced this asset
- Version: integer version number, with parent version reference
- Storage location: IndexedDB (small), Supabase Storage (large)
- Reuse record: which projects and scenes reference this asset

**Rules:**
- Every asset created in Hooke has an Asset Graph entry.
- Assets are never deleted immediately — they are soft-deleted and removed after a grace period.
- When the same generation prompt is rerun, a new version is created, not a replacement.

**Implementation:** `src/lib/platform/asset-graph.ts`

---

### 6. AI Agent Layer (`src/lib/agents/`)

Specialized AI agents that perform creative work. Each agent has a defined role, reads from the platform systems, and writes back to them.

**Agent roster:**

| Agent | Responsibility |
|---|---|
| Director | Runs the miDirector interview, generates Blueprints |
| Writer | Generates story and scene text from Blueprint |
| Character Designer | Generates character sheets and descriptions |
| Storyboard Artist | Generates panel descriptions from scenes |
| Voice Director | Selects voices and generates narration |
| Memory Manager | Summarizes and maintains project memory |

**Agent contract:**
- Every agent reads from: Blueprint, relevant Project Graph nodes, Memory System
- Every agent writes to: Asset Graph (outputs), Memory System (summaries)
- Every agent emits: `ai:generation:started`, `ai:generation:completed` or `ai:generation:failed`
- Every agent has: retry logic (3 attempts, exponential backoff), error handling, timeout

**LLM Routing:**
- Agents use `src/lib/llm/` clients, selected by the user's active provider in Settings
- The mock client is never used in production paths

**Implementation:** `src/lib/agents/`

---

## Data Flow: Text → Blueprint

```
User completes interview in miDirector
        ↓
Director agent reads interview answers + user Memory
        ↓
Director constructs context-aware prompt
        ↓
LLM returns structured Blueprint JSON
        ↓
Blueprint Engine validates and stores Blueprint
        ↓
Project Graph registers Blueprint node (linked to project)
        ↓
Memory System records: "Blueprint generated for project X"
        ↓
Event Bus emits: blueprint:generated { projectId, blueprintId }
        ↓
Downstream modules (Story, Storyboard) respond to event
```

---

## Data Flow: Character Updated → Cascade

```
User edits a character in Character Studio
        ↓
character:updated event emitted
        ↓
Story module: offers to regenerate scenes featuring this character
        ↓
Storyboard module: flags panels for re-render
        ↓
Timeline module: marks clips for review
        ↓
Memory System records: "Character X updated — visual consistency may be affected"
```

---

## Storage Architecture

### IndexedDB (via idb-keyval)

Used for all local-first data. Managed through Zustand persist middleware.

| Store key | Contents |
|---|---|
| `hooke:projects` | Project metadata |
| `hooke:blueprints` | Blueprint conversations and blueprints |
| `hooke:universes` | Universe entities and brand kits |
| `hooke:stories` | Story hierarchy |
| `hooke:assets` | Asset metadata (not binary data) |
| `hooke:graph` | Project Graph nodes and edges |
| `hooke:memory` | All memory layers |
| `hooke:settings` | User settings and provider config |

### Supabase

Used for:
- Large asset binary storage (Supabase Storage)
- Cross-device sync (when implemented)
- Edge Functions for AI gateway (server-side provider routing)

---

## Module Independence Rule

A module **must not** import from another module's internal files. Cross-module access is only through:
1. Shared stores in `src/store/`
2. Platform systems in `src/lib/platform/`
3. Events via the Event Bus

Violation of this rule creates tight coupling that breaks when modules are refactored.

---

## Adding a New Module

1. Define the entities it owns in the Project Graph schema.
2. Define the events it emits and consumes in the Event Bus registry.
3. Define how it reads from and writes to the Blueprint and Memory System.
4. Implement the store (`src/store/module-name-store.ts`).
5. Implement any agents it requires (`src/lib/agents/`).
6. Implement the route (`src/routes/module-name.tsx`) — UI last.
7. Pass the Feature Acceptance Gate before merging.

---

*This document is maintained alongside the code. When platform systems change, this document is updated in the same commit.*
