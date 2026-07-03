/**
 * Hooke Project Graph
 *
 * The central knowledge model. Every entity in Hooke is a node.
 * Relationships between entities are typed edges.
 *
 * Persisted to IndexedDB under the key 'hooke:graph'.
 * Emits events via the Event Bus on mutations.
 */

import { get as idbGet, set as idbSet } from 'idb-keyval';
import { eventBus } from './event-bus';

// ─── Node Types ────────────────────────────────────────────────────────────

export type NodeKind =
  | 'project'
  | 'blueprint'
  | 'character'
  | 'location'
  | 'prop'
  | 'vehicle'
  | 'lore'
  | 'timeline-event'
  | 'voice'
  | 'music'
  | 'story'
  | 'episode'
  | 'scene'
  | 'asset'
  | 'timeline'
  | 'universe';

export interface GraphNode {
  id: string;
  kind: NodeKind;
  label: string;
  /** Arbitrary metadata — modules add their own fields here */
  meta: Record<string, unknown>;
  createdAt: number;
  updatedAt: number;
}

// ─── Edge Types ────────────────────────────────────────────────────────────

export type EdgeKind =
  | 'blueprint:belongs-to'      // blueprint → project
  | 'character:appears-in'      // character → scene | episode
  | 'asset:generated-from'      // asset → scene | blueprint
  | 'asset:used-in'             // asset → timeline | scene
  | 'story:references-character'// story → character
  | 'story:belongs-to'          // story/episode/scene → project
  | 'universe:includes'         // universe → character | location | etc.
  | 'universe:linked-to'        // universe → project
  | 'timeline:contains'         // timeline → scene clip
  | 'scene:part-of'             // scene → episode | blueprint
  | 'version:supersedes';       // new asset → old asset

export interface GraphEdge {
  id: string;
  kind: EdgeKind;
  fromId: string;
  toId: string;
  meta?: Record<string, unknown>;
  createdAt: number;
}

// ─── Graph State ───────────────────────────────────────────────────────────

interface GraphState {
  version: number;
  nodes: Record<string, GraphNode>;
  edges: Record<string, GraphEdge>;
}

const STORAGE_KEY = 'hooke:graph';
const SCHEMA_VERSION = 1;

function emptyState(): GraphState {
  return { version: SCHEMA_VERSION, nodes: {}, edges: {} };
}

const uid = () =>
  globalThis.crypto?.randomUUID?.() ??
  `g_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;

// ─── Project Graph Implementation ─────────────────────────────────────────

class ProjectGraph {
  private state: GraphState = emptyState();
  private loaded = false;

  /** Load the graph from IndexedDB. Called once on app start. */
  async load(): Promise<void> {
    try {
      const stored = await idbGet<GraphState>(STORAGE_KEY);
      if (stored && stored.version === SCHEMA_VERSION) {
        this.state = stored;
      } else if (stored) {
        // Future: run migrations
        this.state = emptyState();
      }
    } catch {
      this.state = emptyState();
    }
    this.loaded = true;
  }

  /** Persist the current graph state to IndexedDB. */
  private async persist(): Promise<void> {
    try {
      await idbSet(STORAGE_KEY, this.state);
    } catch (err) {
      console.error('[ProjectGraph] Failed to persist graph:', err);
    }
  }

  // ─── Node Operations ─────────────────────────────────────────────────

  addNode(node: Omit<GraphNode, 'createdAt' | 'updatedAt'>): GraphNode {
    const now = Date.now();
    const full: GraphNode = { ...node, createdAt: now, updatedAt: now };
    this.state.nodes[node.id] = full;
    void this.persist();
    return full;
  }

  updateNode(
    id: string,
    patch: Partial<Pick<GraphNode, 'label' | 'meta'>>
  ): GraphNode | undefined {
    const existing = this.state.nodes[id];
    if (!existing) return undefined;
    const updated: GraphNode = {
      ...existing,
      ...patch,
      meta: { ...existing.meta, ...(patch.meta ?? {}) },
      updatedAt: Date.now(),
    };
    this.state.nodes[id] = updated;
    void this.persist();
    return updated;
  }

  removeNode(id: string): void {
    if (!this.state.nodes[id]) return;
    delete this.state.nodes[id];
    // Remove all edges connected to this node
    for (const edgeId of Object.keys(this.state.edges)) {
      const edge = this.state.edges[edgeId];
      if (edge.fromId === id || edge.toId === id) {
        delete this.state.edges[edgeId];
      }
    }
    void this.persist();
  }

  getNode(id: string): GraphNode | undefined {
    return this.state.nodes[id];
  }

  getNodesByKind(kind: NodeKind): GraphNode[] {
    return Object.values(this.state.nodes).filter((n) => n.kind === kind);
  }

  // ─── Edge Operations ─────────────────────────────────────────────────

  addEdge(
    edge: Omit<GraphEdge, 'id' | 'createdAt'>
  ): GraphEdge {
    const id = uid();
    const full: GraphEdge = { ...edge, id, createdAt: Date.now() };
    this.state.edges[id] = full;
    void this.persist();
    return full;
  }

  removeEdge(id: string): void {
    delete this.state.edges[id];
    void this.persist();
  }

  getEdge(id: string): GraphEdge | undefined {
    return this.state.edges[id];
  }

  /** Get all edges of a given kind FROM a node */
  getEdgesFrom(fromId: string, kind?: EdgeKind): GraphEdge[] {
    return Object.values(this.state.edges).filter(
      (e) => e.fromId === fromId && (kind === undefined || e.kind === kind)
    );
  }

  /** Get all edges of a given kind TO a node */
  getEdgesTo(toId: string, kind?: EdgeKind): GraphEdge[] {
    return Object.values(this.state.edges).filter(
      (e) => e.toId === toId && (kind === undefined || e.kind === kind)
    );
  }

  // ─── Convenience Methods ──────────────────────────────────────────────

  /** Register a project node. Called by project-store on createProject. */
  registerProject(projectId: string, name: string): GraphNode {
    const node = this.addNode({
      id: projectId,
      kind: 'project',
      label: name,
      meta: {},
    });
    eventBus.emit('project:created', { projectId, name });
    return node;
  }

  /** Register a blueprint node and link it to its project. */
  registerBlueprint(
    blueprintId: string,
    projectId: string,
    title: string
  ): GraphNode {
    const node = this.addNode({
      id: blueprintId,
      kind: 'blueprint',
      label: title,
      meta: { projectId },
    });
    this.addEdge({
      kind: 'blueprint:belongs-to',
      fromId: blueprintId,
      toId: projectId,
    });
    return node;
  }

  /** Register a character node inside a universe. */
  registerCharacter(
    characterId: string,
    universeId: string,
    name: string
  ): GraphNode {
    const node = this.addNode({
      id: characterId,
      kind: 'character',
      label: name,
      meta: { universeId },
    });
    this.addEdge({
      kind: 'universe:includes',
      fromId: universeId,
      toId: characterId,
    });
    eventBus.emit('character:created', { characterId, universeId, name });
    return node;
  }

  /** Register an asset and its source lineage. */
  registerAsset(
    assetId: string,
    kind: string,
    sourceEntityId?: string,
    projectId?: string
  ): GraphNode {
    const node = this.addNode({
      id: assetId,
      kind: 'asset',
      label: kind,
      meta: { kind, projectId },
    });
    if (sourceEntityId) {
      this.addEdge({
        kind: 'asset:generated-from',
        fromId: assetId,
        toId: sourceEntityId,
      });
    }
    eventBus.emit('asset:added', { assetId, kind, projectId, sourceEntityId });
    return node;
  }

  /** Get all nodes belonging to a project (via edges). */
  getProjectNodes(projectId: string): GraphNode[] {
    const directEdges = this.getEdgesTo(projectId);
    const indirectIds = directEdges.map((e) => e.fromId);
    return indirectIds
      .map((id) => this.state.nodes[id])
      .filter(Boolean) as GraphNode[];
  }

  /** Reset all graph data. For testing only. */
  _reset(): void {
    this.state = emptyState();
  }
}

// ─── Singleton Export ──────────────────────────────────────────────────────

export const projectGraph = new ProjectGraph();
