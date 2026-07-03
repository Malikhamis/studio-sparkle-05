/**
 * Hooke Asset Graph
 *
 * Tracks the origin, ownership, and lineage of every asset in the platform.
 * Every generated or uploaded asset has an entry here with full provenance.
 *
 * Persisted to IndexedDB under 'hooke:asset-graph'.
 */

import { get as idbGet, set as idbSet } from 'idb-keyval';
import { eventBus } from './event-bus';

// ─── Types ─────────────────────────────────────────────────────────────────

export type AssetKind =
  | 'image'
  | 'video'
  | 'audio'
  | 'caption'
  | 'export'
  | 'upload'
  | 'document';

export type AssetSource = 'ai-generated' | 'user-uploaded' | 'derived';

export interface AssetRecord {
  id: string;
  kind: AssetKind;
  source: AssetSource;
  /** Human-readable label */
  label: string;
  /** Which entity (scene, blueprint, character, etc.) produced this asset */
  sourceEntityId?: string;
  /** Which project this asset belongs to */
  projectId?: string;
  /** Version number — starts at 1, increments on regeneration */
  version: number;
  /** ID of the asset this version supersedes (undefined for v1) */
  parentId?: string;
  /** Where the binary data lives */
  storageLocation: 'indexeddb' | 'supabase';
  /** URL or IndexedDB key for retrieving the binary */
  storageRef: string;
  /** AI prompt used to generate this asset (if ai-generated) */
  prompt?: string;
  /** Provider + model used (if ai-generated) */
  generatedWith?: { provider: string; model: string };
  /** Projects and scenes that reference this asset */
  usedIn: string[];
  /** Whether this record is soft-deleted */
  deletedAt?: number;
  createdAt: number;
  updatedAt: number;
}

interface AssetGraphState {
  version: number;
  assets: Record<string, AssetRecord>;
}

const STORAGE_KEY = 'hooke:asset-graph';
const SCHEMA_VERSION = 1;

function emptyState(): AssetGraphState {
  return { version: SCHEMA_VERSION, assets: {} };
}

const uid = () =>
  globalThis.crypto?.randomUUID?.() ??
  `a_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;

// ─── Asset Graph Implementation ────────────────────────────────────────────

class AssetGraph {
  private state: AssetGraphState = emptyState();
  private loaded = false;

  async load(): Promise<void> {
    try {
      const stored = await idbGet<AssetGraphState>(STORAGE_KEY);
      if (stored && stored.version === SCHEMA_VERSION) {
        this.state = stored;
      }
    } catch {
      this.state = emptyState();
    }
    this.loaded = true;
  }

  private async persist(): Promise<void> {
    try {
      await idbSet(STORAGE_KEY, this.state);
    } catch (err) {
      console.error('[AssetGraph] Failed to persist:', err);
    }
  }

  // ─── Registration ────────────────────────────────────────────────────

  /**
   * Register a new asset. Returns the created AssetRecord.
   * Always call this when creating any asset — uploaded or generated.
   */
  register(input: {
    kind: AssetKind;
    source: AssetSource;
    label: string;
    storageLocation: 'indexeddb' | 'supabase';
    storageRef: string;
    sourceEntityId?: string;
    projectId?: string;
    prompt?: string;
    generatedWith?: { provider: string; model: string };
  }): AssetRecord {
    const now = Date.now();
    const id = uid();
    const record: AssetRecord = {
      id,
      version: 1,
      usedIn: [],
      ...input,
      createdAt: now,
      updatedAt: now,
    };
    this.state.assets[id] = record;
    void this.persist();
    eventBus.emit('asset:added', {
      assetId: id,
      kind: input.kind,
      projectId: input.projectId,
      sourceEntityId: input.sourceEntityId,
    });
    return record;
  }

  /**
   * Create a new version of an existing asset (e.g. after regeneration).
   * The old asset is retained; the new one has parentId pointing to it.
   */
  createVersion(
    parentId: string,
    input: Partial<Pick<AssetRecord, 'storageRef' | 'storageLocation' | 'prompt' | 'generatedWith' | 'label'>>
  ): AssetRecord | undefined {
    const parent = this.state.assets[parentId];
    if (!parent) return undefined;

    const now = Date.now();
    const id = uid();
    const record: AssetRecord = {
      ...parent,
      id,
      version: parent.version + 1,
      parentId,
      usedIn: [],
      ...input,
      createdAt: now,
      updatedAt: now,
      deletedAt: undefined,
    };
    this.state.assets[id] = record;
    void this.persist();

    eventBus.emit('asset:version:created', {
      assetId: id,
      version: record.version,
      parentVersion: parent.version,
    });
    return record;
  }

  // ─── Retrieval ───────────────────────────────────────────────────────

  getAsset(id: string): AssetRecord | undefined {
    return this.state.assets[id];
  }

  getAssetsForProject(projectId: string): AssetRecord[] {
    return Object.values(this.state.assets).filter(
      (a) => a.projectId === projectId && !a.deletedAt
    );
  }

  getAssetsFromSource(sourceEntityId: string): AssetRecord[] {
    return Object.values(this.state.assets).filter(
      (a) => a.sourceEntityId === sourceEntityId && !a.deletedAt
    );
  }

  /** Get the full version history of an asset (including the given ID). */
  getVersionHistory(assetId: string): AssetRecord[] {
    const target = this.state.assets[assetId];
    if (!target) return [];

    const history: AssetRecord[] = [target];
    let current = target;

    // Walk backwards through parent chain
    while (current.parentId) {
      const parent = this.state.assets[current.parentId];
      if (!parent) break;
      history.unshift(parent);
      current = parent;
    }

    return history;
  }

  // ─── Mutation ────────────────────────────────────────────────────────

  /** Mark an asset as used by a scene/timeline/etc. */
  markUsedIn(assetId: string, entityId: string): void {
    const asset = this.state.assets[assetId];
    if (!asset || asset.usedIn.includes(entityId)) return;
    asset.usedIn = [...asset.usedIn, entityId];
    asset.updatedAt = Date.now();
    void this.persist();
  }

  /** Soft-delete an asset. It is retained for 30 days before permanent removal. */
  softDelete(assetId: string): void {
    const asset = this.state.assets[assetId];
    if (!asset) return;
    asset.deletedAt = Date.now();
    asset.updatedAt = Date.now();
    void this.persist();
    eventBus.emit('asset:removed', { assetId });
  }

  /** Permanently remove assets soft-deleted more than `graceMs` ago. */
  purgeOldDeleted(graceMs = 30 * 24 * 60 * 60 * 1000): void {
    const cutoff = Date.now() - graceMs;
    for (const id of Object.keys(this.state.assets)) {
      const a = this.state.assets[id];
      if (a.deletedAt && a.deletedAt < cutoff) {
        delete this.state.assets[id];
      }
    }
    void this.persist();
  }

  _reset(): void {
    this.state = emptyState();
  }
}

// ─── Singleton Export ──────────────────────────────────────────────────────

export const assetGraph = new AssetGraph();
