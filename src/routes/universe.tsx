import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import {
  Plus, Trash2, Globe2, Sparkles, X, Tag, Pencil, Save,
} from "lucide-react";
import {
  useUniverseStore,
  ENTITY_KINDS,
  type EntityKind,
  type Universe,
} from "@/store/universe-store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter,
} from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export const Route = createFileRoute("/universe")({
  head: () => ({
    meta: [
      { title: "miUniverse — Hooke" },
      { name: "description", content: "Persistent creative universes: characters, locations, lore, brand identity that stay consistent across every project." },
      { property: "og:title", content: "miUniverse — Hooke" },
      { property: "og:description", content: "Persistent creative universes for coherent long-form storytelling." },
    ],
  }),
  component: UniversePage,
});

function UniversePage() {
  const {
    universes, activeId, setActive, createUniverse, deleteUniverse,
    updateUniverse, updateBrand, addEntity, updateEntity, removeEntity,
  } = useUniverseStore();

  const active = useMemo(
    () => universes.find((u) => u.id === activeId) ?? universes[0],
    [universes, activeId],
  );

  return (
    <div className="grid h-full grid-cols-1 lg:grid-cols-[260px_minmax(0,1fr)] gap-4">
      {/* Universe rail */}
      <aside className="rounded-xl border border-border/40 bg-card/40 backdrop-blur p-3 flex flex-col min-h-0">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-medium tracking-wide text-muted-foreground">Universes</h2>
          <NewUniverseButton onCreate={(n, l) => createUniverse({ name: n, logline: l })} />
        </div>
        <div className="flex-1 overflow-y-auto space-y-1">
          {universes.map((u) => (
            <button
              key={u.id}
              onClick={() => setActive(u.id)}
              className={`w-full text-left rounded-lg px-3 py-2 text-sm transition-colors ${
                u.id === active?.id
                  ? "bg-primary/15 text-foreground ring-1 ring-primary/30"
                  : "hover:bg-accent/40 text-muted-foreground"
              }`}
            >
              <div className="flex items-center gap-2">
                <Globe2 className="size-3.5 shrink-0" />
                <span className="truncate">{u.name}</span>
              </div>
              <p className="text-xs text-muted-foreground/70 mt-0.5 truncate">
                {u.entities.length} entities
              </p>
            </button>
          ))}
          {universes.length === 0 && (
            <p className="text-xs text-muted-foreground px-3 py-6 text-center">
              No universes yet.
            </p>
          )}
        </div>
      </aside>

      {/* Detail */}
      <section className="min-w-0 min-h-0 flex flex-col gap-4">
        {active ? (
          <UniverseDetail
            key={active.id}
            universe={active}
            onUpdate={(patch) => updateUniverse(active.id, patch)}
            onDelete={() => {
              if (confirm(`Delete "${active.name}"?`)) deleteUniverse(active.id);
            }}
            onBrand={(patch) => updateBrand(active.id, patch)}
            onAddEntity={(input) => addEntity(active.id, input)}
            onUpdateEntity={(eid, patch) => updateEntity(active.id, eid, patch)}
            onRemoveEntity={(eid) => removeEntity(active.id, eid)}
          />
        ) : (
          <div className="rounded-xl border border-dashed border-border/40 p-12 text-center text-muted-foreground">
            <Globe2 className="size-8 mx-auto mb-3 opacity-50" />
            <p>Create your first universe to begin.</p>
          </div>
        )}
      </section>
    </div>
  );
}

function NewUniverseButton({ onCreate }: { onCreate: (name: string, logline: string) => void }) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [logline, setLogline] = useState("");
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="icon" variant="ghost" className="size-7">
          <Plus className="size-4" />
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>New universe</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label>Name</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="The Dream Chasers" />
          </div>
          <div className="space-y-1.5">
            <Label>Logline</Label>
            <Textarea value={logline} onChange={(e) => setLogline(e.target.value)} placeholder="A crew of misfits chase a vanished signal…" />
          </div>
        </div>
        <DialogFooter>
          <Button
            disabled={!name.trim()}
            onClick={() => {
              onCreate(name, logline);
              setName(""); setLogline(""); setOpen(false);
            }}
          >
            Create
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

type UniverseDetailProps = {
  universe: Universe;
  onUpdate: (patch: Partial<Pick<Universe, "name" | "logline" | "genre" | "era">>) => void;
  onDelete: () => void;
  onBrand: (patch: Partial<Universe["brand"]>) => void;
  onAddEntity: (input: { kind: EntityKind; name: string; summary?: string; details?: Record<string, string>; tags?: string[] }) => void;
  onUpdateEntity: (eid: string, patch: Partial<Omit<Universe["entities"][number], "id" | "createdAt">>) => void;
  onRemoveEntity: (eid: string) => void;
};

function UniverseDetail({
  universe, onUpdate, onDelete, onBrand, onAddEntity, onUpdateEntity, onRemoveEntity,
}: UniverseDetailProps) {
  return (
    <>
      {/* Header */}
      <div className="rounded-xl border border-border/40 bg-card/40 backdrop-blur p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <Input
              value={universe.name}
              onChange={(e) => onUpdate({ name: e.target.value })}
              className="text-xl font-medium bg-transparent border-0 px-0 h-auto focus-visible:ring-0"
            />
            <Textarea
              value={universe.logline}
              onChange={(e) => onUpdate({ logline: e.target.value })}
              placeholder="Logline…"
              className="bg-transparent border-0 px-0 resize-none text-sm text-muted-foreground focus-visible:ring-0"
              rows={2}
            />
            <div className="grid grid-cols-2 gap-3 mt-2 max-w-md">
              <div>
                <Label className="text-xs text-muted-foreground">Genre</Label>
                <Input value={universe.genre} onChange={(e) => onUpdate({ genre: e.target.value })} className="h-8 mt-1" />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Era</Label>
                <Input value={universe.era} onChange={(e) => onUpdate({ era: e.target.value })} className="h-8 mt-1" />
              </div>
            </div>
          </div>
          <Button variant="ghost" size="icon" onClick={onDelete} title="Delete universe">
            <Trash2 className="size-4 text-destructive" />
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="entities" className="flex-1 flex flex-col min-h-0">
        <TabsList>
          <TabsTrigger value="entities">Entities</TabsTrigger>
          <TabsTrigger value="brand">Brand kit</TabsTrigger>
          <TabsTrigger value="projects">Projects ({universe.linkedProjectIds.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="entities" className="flex-1 min-h-0 mt-3">
          <EntitiesPane
            universe={universe}
            onAdd={onAddEntity}
            onUpdate={onUpdateEntity}
            onRemove={onRemoveEntity}
          />
        </TabsContent>

        <TabsContent value="brand" className="mt-3">
          <BrandPane brand={universe.brand} onChange={onBrand} />
        </TabsContent>

        <TabsContent value="projects" className="mt-3">
          <div className="rounded-xl border border-border/40 bg-card/40 p-6 text-sm text-muted-foreground">
            Project linking arrives in Phase 5 — once miDirector writes new
            blueprints, they'll auto-tag with this universe.
          </div>
        </TabsContent>
      </Tabs>
    </>
  );
}

function EntitiesPane({
  universe, onAdd, onUpdate, onRemove,
}: {
  universe: Universe;
  onAdd: UniverseDetailProps["onAddEntity"];
  onUpdate: UniverseDetailProps["onUpdateEntity"];
  onRemove: UniverseDetailProps["onRemoveEntity"];
}) {
  const [activeKind, setActiveKind] = useState<EntityKind>("character");
  const list = universe.entities.filter((e) => e.kind === activeKind);

  return (
    <div className="grid grid-cols-1 md:grid-cols-[180px_minmax(0,1fr)] gap-3 h-full">
      <aside className="rounded-xl border border-border/40 bg-card/40 backdrop-blur p-2 space-y-1">
        {ENTITY_KINDS.map((k) => {
          const count = universe.entities.filter((e) => e.kind === k.kind).length;
          return (
            <button
              key={k.kind}
              onClick={() => setActiveKind(k.kind)}
              className={`w-full flex items-center justify-between rounded-md px-3 py-2 text-sm transition-colors ${
                activeKind === k.kind
                  ? "bg-primary/15 text-foreground"
                  : "hover:bg-accent/40 text-muted-foreground"
              }`}
            >
              <span>{k.plural}</span>
              <span className="text-xs text-muted-foreground/70">{count}</span>
            </button>
          );
        })}
      </aside>

      <div className="min-w-0 flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-medium">
            {ENTITY_KINDS.find((k) => k.kind === activeKind)?.plural}
          </h3>
          <NewEntityButton kind={activeKind} onCreate={onAdd} />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3 overflow-y-auto">
          {list.map((e) => (
            <EntityCard
              key={e.id}
              entity={e}
              onSave={(patch) => onUpdate(e.id, patch)}
              onRemove={() => onRemove(e.id)}
            />
          ))}
          {list.length === 0 && (
            <div className="col-span-full rounded-xl border border-dashed border-border/40 p-10 text-center text-sm text-muted-foreground">
              <Sparkles className="size-5 mx-auto mb-2 opacity-50" />
              No {activeKind}s yet.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function NewEntityButton({
  kind, onCreate,
}: {
  kind: EntityKind;
  onCreate: UniverseDetailProps["onAddEntity"];
}) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [summary, setSummary] = useState("");
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline">
          <Plus className="size-3.5" />
          Add {kind}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>New {kind}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label>Name</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} autoFocus />
          </div>
          <div className="space-y-1.5">
            <Label>Summary</Label>
            <Textarea value={summary} onChange={(e) => setSummary(e.target.value)} rows={3} />
          </div>
        </div>
        <DialogFooter>
          <Button
            disabled={!name.trim()}
            onClick={() => {
              onCreate({ kind, name, summary });
              setName(""); setSummary(""); setOpen(false);
            }}
          >
            Create
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function EntityCard({
  entity, onSave, onRemove,
}: {
  entity: Universe["entities"][number];
  onSave: (patch: Partial<Omit<Universe["entities"][number], "id" | "createdAt">>) => void;
  onRemove: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(entity.name);
  const [summary, setSummary] = useState(entity.summary);
  const [details, setDetails] = useState(entity.details);
  const [tagInput, setTagInput] = useState("");

  const addDetail = () => setDetails({ ...details, "": "" });
  const setDetailKey = (oldKey: string, newKey: string) => {
    if (newKey === oldKey) return;
    const next: Record<string, string> = {};
    Object.entries(details).forEach(([k, v]) => { next[k === oldKey ? newKey : k] = v; });
    setDetails(next);
  };

  return (
    <article className="rounded-xl border border-border/40 bg-card/40 backdrop-blur p-4 flex flex-col gap-2">
      <div className="flex items-start justify-between gap-2">
        {editing ? (
          <Input value={name} onChange={(e) => setName(e.target.value)} className="h-8" />
        ) : (
          <h4 className="font-medium truncate">{entity.name}</h4>
        )}
        <div className="flex gap-1 shrink-0">
          {editing ? (
            <Button
              size="icon" variant="ghost" className="size-7"
              onClick={() => { onSave({ name, summary, details }); setEditing(false); }}
              title="Save"
            >
              <Save className="size-3.5" />
            </Button>
          ) : (
            <Button size="icon" variant="ghost" className="size-7" onClick={() => setEditing(true)} title="Edit">
              <Pencil className="size-3.5" />
            </Button>
          )}
          <Button size="icon" variant="ghost" className="size-7" onClick={onRemove} title="Remove">
            <Trash2 className="size-3.5 text-destructive" />
          </Button>
        </div>
      </div>

      {editing ? (
        <Textarea value={summary} onChange={(e) => setSummary(e.target.value)} rows={2} className="text-sm" />
      ) : (
        <p className="text-sm text-muted-foreground line-clamp-3">{entity.summary || "—"}</p>
      )}

      {/* Details */}
      <div className="space-y-1 mt-1">
        {Object.entries(editing ? details : entity.details).map(([k, v]) => (
          <div key={`${k}`} className="flex gap-2 items-center text-xs">
            {editing ? (
              <>
                <Input
                  value={k}
                  onChange={(e) => setDetailKey(k, e.target.value)}
                  className="h-7 text-xs flex-1"
                  placeholder="key"
                />
                <Input
                  value={v}
                  onChange={(e) => setDetails({ ...details, [k]: e.target.value })}
                  className="h-7 text-xs flex-[2]"
                  placeholder="value"
                />
                <button
                  onClick={() => {
                    const next = { ...details };
                    delete next[k];
                    setDetails(next);
                  }}
                  className="text-muted-foreground hover:text-destructive"
                >
                  <X className="size-3" />
                </button>
              </>
            ) : (
              <>
                <span className="text-muted-foreground/70 min-w-[80px]">{k}</span>
                <span className="text-foreground truncate">{v}</span>
              </>
            )}
          </div>
        ))}
        {editing && (
          <Button variant="ghost" size="sm" onClick={addDetail} className="h-7 text-xs">
            <Plus className="size-3" /> Detail
          </Button>
        )}
      </div>

      {/* Tags */}
      {entity.tags.length > 0 && (
        <div className="flex flex-wrap gap-1 mt-1">
          {entity.tags.map((t) => (
            <Badge key={t} variant="secondary" className="text-[10px] gap-1">
              <Tag className="size-2.5" /> {t}
            </Badge>
          ))}
        </div>
      )}

      {editing && (
        <div className="flex gap-1 mt-1">
          <Input
            value={tagInput}
            onChange={(e) => setTagInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && tagInput.trim()) {
                onSave({ tags: [...entity.tags, tagInput.trim()] });
                setTagInput("");
              }
            }}
            placeholder="Add tag, Enter"
            className="h-7 text-xs"
          />
        </div>
      )}
    </article>
  );
}

function BrandPane({
  brand, onChange,
}: {
  brand: Universe["brand"];
  onChange: (patch: Partial<Universe["brand"]>) => void;
}) {
  return (
    <div className="rounded-xl border border-border/40 bg-card/40 backdrop-blur p-5 grid grid-cols-1 md:grid-cols-2 gap-5">
      <div>
        <Label className="text-xs text-muted-foreground">Palette</Label>
        <div className="flex gap-2 mt-2 flex-wrap">
          {brand.colors.map((c, i) => (
            <div key={i} className="flex flex-col items-center gap-1">
              <input
                type="color"
                value={c}
                onChange={(e) => {
                  const next = [...brand.colors];
                  next[i] = e.target.value;
                  onChange({ colors: next });
                }}
                className="size-12 rounded-lg border border-border/60 bg-transparent cursor-pointer"
              />
              <button
                onClick={() => onChange({ colors: brand.colors.filter((_, j) => j !== i) })}
                className="text-[10px] text-muted-foreground hover:text-destructive"
              >
                Remove
              </button>
            </div>
          ))}
          <Button
            variant="outline" size="sm"
            onClick={() => onChange({ colors: [...brand.colors, "#888888"] })}
          >
            <Plus className="size-3.5" /> Color
          </Button>
        </div>
      </div>

      <div className="space-y-3">
        <div>
          <Label className="text-xs text-muted-foreground">Heading font</Label>
          <Select value={brand.fontHeading} onValueChange={(v) => onChange({ fontHeading: v })}>
            <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
            <SelectContent>
              {["Space Grotesk", "Inter", "JetBrains Mono", "Serif"].map((f) => (
                <SelectItem key={f} value={f}>{f}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label className="text-xs text-muted-foreground">Body font</Label>
          <Select value={brand.fontBody} onValueChange={(v) => onChange({ fontBody: v })}>
            <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
            <SelectContent>
              {["Inter", "Space Grotesk", "JetBrains Mono", "Serif"].map((f) => (
                <SelectItem key={f} value={f}>{f}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-3">
        <div>
          <Label className="text-xs text-muted-foreground">Default CTA</Label>
          <Input value={brand.cta} onChange={(e) => onChange({ cta: e.target.value })} className="mt-1" />
        </div>
        <div>
          <Label className="text-xs text-muted-foreground">Music theme</Label>
          <Input value={brand.musicTheme} onChange={(e) => onChange({ musicTheme: e.target.value })} className="mt-1" />
        </div>
      </div>
    </div>
  );
}
