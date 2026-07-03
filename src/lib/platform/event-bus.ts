/**
 * Hooke Platform Event Bus
 *
 * Typed, in-memory event bus for cross-module communication.
 * Modules do not call each other directly — they emit and subscribe to events.
 *
 * Usage:
 *   // Emit
 *   eventBus.emit('blueprint:generated', { projectId, blueprintId });
 *
 *   // Subscribe
 *   const unsub = eventBus.on('blueprint:generated', ({ projectId }) => { ... });
 *   // Always call unsub() in cleanup (useEffect return, store teardown, etc.)
 */

// ─── Event Payload Types ───────────────────────────────────────────────────

export interface ProjectCreatedEvent {
  projectId: string;
  name: string;
}
export interface ProjectUpdatedEvent {
  projectId: string;
  fields: string[];
}
export interface ProjectDeletedEvent {
  projectId: string;
}
export interface ProjectArchivedEvent {
  projectId: string;
}

export interface BlueprintGeneratedEvent {
  projectId: string;
  blueprintId: string;
  conversationId: string;
}
export interface BlueprintUpdatedEvent {
  blueprintId: string;
  projectId: string;
  fields: string[];
}
export interface BlueprintSceneAddedEvent {
  blueprintId: string;
  sceneId: string;
}
export interface BlueprintSceneRemovedEvent {
  blueprintId: string;
  sceneId: string;
}

export interface CharacterCreatedEvent {
  characterId: string;
  universeId: string;
  name: string;
}
export interface CharacterUpdatedEvent {
  characterId: string;
  universeId: string;
  fields: string[];
}
export interface CharacterDeletedEvent {
  characterId: string;
  universeId: string;
}

export interface UniverseCreatedEvent {
  universeId: string;
  name: string;
}
export interface UniverseUpdatedEvent {
  universeId: string;
  fields: string[];
}
export interface UniverseEntityUpdatedEvent {
  universeId: string;
  entityId: string;
  kind: string;
}

export interface StoryCreatedEvent {
  storyId: string;
  projectId?: string;
}
export interface StoryEpisodeCreatedEvent {
  episodeId: string;
  seriesId: string;
  seasonId: string;
}
export interface StorySceneGeneratedEvent {
  sceneId: string;
  episodeId: string;
  assetId: string;
}

export interface AssetAddedEvent {
  assetId: string;
  kind: string;
  projectId?: string;
  sourceEntityId?: string;
}
export interface AssetRemovedEvent {
  assetId: string;
}
export interface AssetVersionCreatedEvent {
  assetId: string;
  version: number;
  parentVersion: number;
}

export interface AiGenerationStartedEvent {
  operationId: string;
  agent: string;
  projectId?: string;
  description: string;
}
export interface AiGenerationCompletedEvent {
  operationId: string;
  agent: string;
  projectId?: string;
  assetId?: string;
  tokensUsed?: { input: number; output: number };
}
export interface AiGenerationFailedEvent {
  operationId: string;
  agent: string;
  projectId?: string;
  error: string;
  retryable: boolean;
}

export interface MemoryUpdatedEvent {
  projectId: string;
  layer: 'project' | 'ai' | 'user' | 'universe';
}

export interface SettingsProviderUpdatedEvent {
  provider: string;
  action: 'added' | 'removed' | 'updated' | 'set-default';
}

// ─── Event Map ─────────────────────────────────────────────────────────────

export interface HookeEventMap {
  'project:created': ProjectCreatedEvent;
  'project:updated': ProjectUpdatedEvent;
  'project:deleted': ProjectDeletedEvent;
  'project:archived': ProjectArchivedEvent;

  'blueprint:generated': BlueprintGeneratedEvent;
  'blueprint:updated': BlueprintUpdatedEvent;
  'blueprint:scene:added': BlueprintSceneAddedEvent;
  'blueprint:scene:removed': BlueprintSceneRemovedEvent;

  'character:created': CharacterCreatedEvent;
  'character:updated': CharacterUpdatedEvent;
  'character:deleted': CharacterDeletedEvent;

  'universe:created': UniverseCreatedEvent;
  'universe:updated': UniverseUpdatedEvent;
  'universe:entity:updated': UniverseEntityUpdatedEvent;

  'story:created': StoryCreatedEvent;
  'story:episode:created': StoryEpisodeCreatedEvent;
  'story:scene:generated': StorySceneGeneratedEvent;

  'asset:added': AssetAddedEvent;
  'asset:removed': AssetRemovedEvent;
  'asset:version:created': AssetVersionCreatedEvent;

  'ai:generation:started': AiGenerationStartedEvent;
  'ai:generation:completed': AiGenerationCompletedEvent;
  'ai:generation:failed': AiGenerationFailedEvent;

  'memory:updated': MemoryUpdatedEvent;

  'settings:provider:updated': SettingsProviderUpdatedEvent;
}

export type HookeEventName = keyof HookeEventMap;
export type HookeEventPayload<T extends HookeEventName> = HookeEventMap[T];

// ─── Handler Types ─────────────────────────────────────────────────────────

type Handler<T> = (payload: T) => void;
type Unsubscribe = () => void;

// ─── Event Bus Implementation ──────────────────────────────────────────────

class EventBus {
  private handlers = new Map<string, Set<Handler<unknown>>>();
  private emitDepth = 0;
  private readonly maxDepth = 10;

  /**
   * Subscribe to an event. Returns an unsubscribe function.
   * Always call the returned function in cleanup (useEffect return, etc.).
   */
  on<T extends HookeEventName>(
    event: T,
    handler: Handler<HookeEventPayload<T>>
  ): Unsubscribe {
    if (!this.handlers.has(event)) {
      this.handlers.set(event, new Set());
    }
    const set = this.handlers.get(event)!;
    set.add(handler as Handler<unknown>);
    return () => set.delete(handler as Handler<unknown>);
  }

  /**
   * Subscribe to an event, auto-unsubscribing after the first emission.
   */
  once<T extends HookeEventName>(
    event: T,
    handler: Handler<HookeEventPayload<T>>
  ): Unsubscribe {
    const unsub = this.on(event, (payload) => {
      unsub();
      handler(payload);
    });
    return unsub;
  }

  /**
   * Emit an event. All handlers are called synchronously.
   * Guards against infinite loops (max depth 10).
   */
  emit<T extends HookeEventName>(event: T, payload: HookeEventPayload<T>): void {
    if (this.emitDepth >= this.maxDepth) {
      console.error(
        `[EventBus] Emit depth limit reached for event "${event}". ` +
          'Possible infinite event loop. Aborting emission.'
      );
      return;
    }

    const set = this.handlers.get(event);
    if (!set || set.size === 0) return;

    this.emitDepth++;
    try {
      for (const handler of set) {
        try {
          handler(payload as unknown);
        } catch (err) {
          console.error(
            `[EventBus] Handler for "${event}" threw an error:`,
            err
          );
          // Continue calling remaining handlers even if one fails
        }
      }
    } finally {
      this.emitDepth--;
    }
  }

  /** Remove all handlers for an event. Use sparingly. */
  off(event: HookeEventName): void {
    this.handlers.delete(event);
  }

  /** Remove all handlers from all events. Use only in tests. */
  clear(): void {
    this.handlers.clear();
  }

  /** Returns the number of registered handlers for a given event. */
  listenerCount(event: HookeEventName): number {
    return this.handlers.get(event)?.size ?? 0;
  }
}

// ─── Singleton Export ──────────────────────────────────────────────────────

/** The global platform event bus. Import this directly where needed. */
export const eventBus = new EventBus();
