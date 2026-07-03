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

/**
 * Initialize all platform systems from IndexedDB.
 * Call this once at application startup (in app root or start.ts).
 */
export async function initializePlatform(): Promise<void> {
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
}
