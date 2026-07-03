/**
 * Hooke Memory System
 *
 * Structured, queryable context that makes AI generations coherent across
 * a project's lifetime. Every AI agent reads from memory before generating,
 * and writes summaries back after generating.
 *
 * Memory layers:
 *   - project  : decisions made, entities created, generations completed (per project)
 *   - ai       : previous prompts/outputs, what worked (per project)
 *   - user     : preferences, provider choices, style (global)
 *   - universe : canon facts, character arcs, world rules (per universe)
 *
 * Persisted to IndexedDB under 'hooke:memory'.
 */

import { get as idbGet, set as idbSet } from 'idb-keyval';
import { eventBus } from '../event-bus';

// ─── Types ─────────────────────────────────────────────────────────────────

export type MemoryLayer = 'project' | 'ai' | 'user' | 'universe';

export type MemoryEntryKind =
  | 'entity-created'
  | 'entity-updated'
  | 'ai-generation'
  | 'user-decision'
  | 'style-preference'
  | 'provider-preference'
  | 'summary';

export interface MemoryEntry {
  id: string;
  kind: MemoryEntryKind;
  /** Short, factual statement for inclusion in AI prompts */
  fact: string;
  /** Optional detail — not included in prompts, used for display/debugging */
  detail?: string;
  /** ISO 8601 timestamp */
  at: string;
  /** Relevance score (0–1). Entries below 0.3 are candidates for summarization. */
  relevance: number;
  /** Optional tag for filtering (e.g. 'character:iris-vale', 'blueprint:intro') */
  tags?: string[];
}

interface MemoryStore {
  version: number;
  /** project memories: { [projectId]: MemoryEntry[] } */
  project: Record<string, MemoryEntry[]>;
  /** ai-context memories: { [projectId]: MemoryEntry[] } */
  ai: Record<string, MemoryEntry[]>;
  /** user-global memories */
  user: MemoryEntry[];
  /** universe memories: { [universeId]: MemoryEntry[] } */
  universe: Record<string, MemoryEntry[]>;
}

const STORAGE_KEY = 'hooke:memory';
const SCHEMA_VERSION = 1;
const MAX_ENTRIES_PER_SCOPE = 100;
const SUMMARIZE_THRESHOLD = 0.3;

function emptyStore(): MemoryStore {
  return { version: SCHEMA_VERSION, project: {}, ai: {}, user: [], universe: {} };
}

const uid = () =>
  globalThis.crypto?.randomUUID?.() ??
  `m_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;

// ─── Memory System Implementation ──────────────────────────────────────────

class MemorySystem {
  private store: MemoryStore = emptyStore();
  private loaded = false;

  async load(): Promise<void> {
    try {
      const stored = await idbGet<MemoryStore>(STORAGE_KEY);
      if (stored && stored.version === SCHEMA_VERSION) {
        this.store = stored;
      }
    } catch {
      this.store = emptyStore();
    }
    this.loaded = true;
  }

  private async persist(): Promise<void> {
    try {
      await idbSet(STORAGE_KEY, this.store);
    } catch (err) {
      console.error('[MemorySystem] Failed to persist memory:', err);
    }
  }

  // ─── Writing Memory ──────────────────────────────────────────────────

  /** Record a project-level memory entry. */
  recordProject(
    projectId: string,
    entry: Omit<MemoryEntry, 'id' | 'at'>
  ): MemoryEntry {
    return this.writeEntry('project', projectId, entry);
  }

  /** Record an AI-context memory entry (previous generation context). */
  recordAI(
    projectId: string,
    entry: Omit<MemoryEntry, 'id' | 'at'>
  ): MemoryEntry {
    return this.writeEntry('ai', projectId, entry);
  }

  /** Record a user preference or global decision. */
  recordUser(entry: Omit<MemoryEntry, 'id' | 'at'>): MemoryEntry {
    const full: MemoryEntry = {
      ...entry,
      id: uid(),
      at: new Date().toISOString(),
    };
    this.store.user.push(full);
    this.pruneIfNeeded('user', undefined);
    void this.persist();
    eventBus.emit('memory:updated', { projectId: '', layer: 'user' });
    return full;
  }

  /** Record a universe-level memory entry. */
  recordUniverse(
    universeId: string,
    entry: Omit<MemoryEntry, 'id' | 'at'>
  ): MemoryEntry {
    return this.writeEntry('universe', universeId, entry);
  }

  private writeEntry(
    layer: 'project' | 'ai' | 'universe',
    scopeId: string,
    entry: Omit<MemoryEntry, 'id' | 'at'>
  ): MemoryEntry {
    const full: MemoryEntry = {
      ...entry,
      id: uid(),
      at: new Date().toISOString(),
    };
    const bucket = this.store[layer] as Record<string, MemoryEntry[]>;
    if (!bucket[scopeId]) bucket[scopeId] = [];
    bucket[scopeId].push(full);
    this.pruneIfNeeded(layer, scopeId);
    void this.persist();
    eventBus.emit('memory:updated', {
      projectId: layer === 'project' || layer === 'ai' ? scopeId : '',
      layer,
    });
    return full;
  }

  // ─── Reading Memory ──────────────────────────────────────────────────

  /** Get project memory entries, sorted by relevance desc then recency desc. */
  getProjectMemory(projectId: string, limit = 30): MemoryEntry[] {
    return this.getScopedMemory('project', projectId, limit);
  }

  /** Get AI context memory for a project. */
  getAIMemory(projectId: string, limit = 20): MemoryEntry[] {
    return this.getScopedMemory('ai', projectId, limit);
  }

  /** Get user global memory. */
  getUserMemory(limit = 20): MemoryEntry[] {
    return [...this.store.user]
      .sort((a, b) => b.relevance - a.relevance || b.at.localeCompare(a.at))
      .slice(0, limit);
  }

  /** Get universe memory. */
  getUniverseMemory(universeId: string, limit = 30): MemoryEntry[] {
    return this.getScopedMemory('universe', universeId, limit);
  }

  /**
   * Build a compact memory string for injection into an AI prompt.
   * Returns only the `fact` fields of the most relevant entries.
   */
  buildPromptContext(
    projectId: string,
    universeId?: string,
    maxTokensApprox = 800
  ): string {
    const project = this.getProjectMemory(projectId, 20);
    const ai = this.getAIMemory(projectId, 10);
    const user = this.getUserMemory(10);
    const universe = universeId ? this.getUniverseMemory(universeId, 10) : [];

    const sections: string[] = [];

    if (project.length) {
      sections.push('Project context:\n' + project.map((e) => `- ${e.fact}`).join('\n'));
    }
    if (universe.length) {
      sections.push('Universe facts:\n' + universe.map((e) => `- ${e.fact}`).join('\n'));
    }
    if (ai.length) {
      sections.push('Previous generation context:\n' + ai.map((e) => `- ${e.fact}`).join('\n'));
    }
    if (user.length) {
      sections.push('User preferences:\n' + user.map((e) => `- ${e.fact}`).join('\n'));
    }

    const full = sections.join('\n\n');
    // Rough truncation to stay within token budget (~4 chars/token)
    return full.slice(0, maxTokensApprox * 4);
  }

  private getScopedMemory(
    layer: 'project' | 'ai' | 'universe',
    scopeId: string,
    limit: number
  ): MemoryEntry[] {
    const bucket = this.store[layer] as Record<string, MemoryEntry[]>;
    const entries = bucket[scopeId] ?? [];
    return [...entries]
      .sort((a, b) => b.relevance - a.relevance || b.at.localeCompare(a.at))
      .slice(0, limit);
  }

  // ─── Pruning ─────────────────────────────────────────────────────────

  /**
   * If a bucket exceeds MAX_ENTRIES_PER_SCOPE, remove the lowest-relevance
   * entries below the summarize threshold. If still over limit, remove oldest.
   */
  private pruneIfNeeded(
    layer: MemoryLayer,
    scopeId: string | undefined
  ): void {
    if (layer === 'user') {
      if (this.store.user.length <= MAX_ENTRIES_PER_SCOPE) return;
      this.store.user = this.pruneEntries(this.store.user);
      return;
    }
    if (!scopeId) return;
    const bucket = this.store[layer] as Record<string, MemoryEntry[]>;
    if ((bucket[scopeId]?.length ?? 0) <= MAX_ENTRIES_PER_SCOPE) return;
    bucket[scopeId] = this.pruneEntries(bucket[scopeId]);
  }

  private pruneEntries(entries: MemoryEntry[]): MemoryEntry[] {
    // Remove low-relevance entries first
    let result = entries.filter((e) => e.relevance >= SUMMARIZE_THRESHOLD);
    // If still over limit, remove oldest
    if (result.length > MAX_ENTRIES_PER_SCOPE) {
      result = result
        .sort((a, b) => b.at.localeCompare(a.at))
        .slice(0, MAX_ENTRIES_PER_SCOPE);
    }
    return result;
  }

  // ─── Mutation ─────────────────────────────────────────────────────────

  /** Update the relevance of an entry (e.g. after user indicates it's stale). */
  downgradeRelevance(
    layer: MemoryLayer,
    scopeId: string | undefined,
    entryId: string,
    newRelevance: number
  ): void {
    if (layer === 'user') {
      this.store.user = this.store.user.map((e) =>
        e.id === entryId ? { ...e, relevance: newRelevance } : e
      );
    } else if (scopeId) {
      const bucket = this.store[layer] as Record<string, MemoryEntry[]>;
      if (bucket[scopeId]) {
        bucket[scopeId] = bucket[scopeId].map((e) =>
          e.id === entryId ? { ...e, relevance: newRelevance } : e
        );
      }
    }
    void this.persist();
  }

  /** Clear all memory for a project (e.g. when project is deleted). */
  clearProjectMemory(projectId: string): void {
    delete this.store.project[projectId];
    delete this.store.ai[projectId];
    void this.persist();
  }

  /** For testing only. */
  _reset(): void {
    this.store = emptyStore();
  }
}

// ─── Singleton Export ──────────────────────────────────────────────────────

export const memorySystem = new MemorySystem();
