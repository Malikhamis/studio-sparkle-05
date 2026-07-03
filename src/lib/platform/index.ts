/**
 * Hooke Platform Layer — Barrel Export
 *
 * Import platform systems from here:
 *   import { eventBus, projectGraph, memorySystem, assetGraph, blueprintEngine } from '@/lib/platform';
 */

export { eventBus } from './event-bus';
export type {
  HookeEventMap,
  HookeEventName,
  HookeEventPayload,
} from './event-bus';

export { projectGraph } from './project-graph';
export type { GraphNode, GraphEdge, NodeKind, EdgeKind } from './project-graph';

export { memorySystem } from './memory';
export type { MemoryEntry, MemoryLayer, MemoryEntryKind } from './memory';

export { assetGraph } from './asset-graph';
export type { AssetRecord, AssetKind, AssetSource } from './asset-graph';

export { blueprintEngine, validateBlueprint } from './blueprint-engine';
export type { Blueprint, BlueprintScene, StrategyPreset } from './blueprint-engine';

// ─── Platform Initialization ─────────────────────────────────────────────────

let _initPromise: Promise<void> | null = null;

/**
 * Initialize all platform systems from IndexedDB.
 * Safe to call multiple times — subsequent calls return the same promise.
 * Callers can await this promise to ensure the platform is ready before
 * performing any operations that depend on persisted state.
 */
export async function initializePlatform(): Promise<void> {
  if (_initPromise) return _initPromise;

  _initPromise = (async () => {
    const { projectGraph } = await import('./project-graph');
    const { memorySystem } = await import('./memory');
    const { assetGraph } = await import('./asset-graph');
    const { blueprintEngine } = await import('./blueprint-engine');

    await Promise.all([
      projectGraph.load(),
      memorySystem.load(),
      assetGraph.load(),
      blueprintEngine.load(),
    ]);
  })();

  return _initPromise;
}

/**
 * Returns the in-flight or completed initialization promise.
 * Returns null if initializePlatform() has never been called.
 */
export function getPlatformInitPromise(): Promise<void> | null {
  return _initPromise;
}
