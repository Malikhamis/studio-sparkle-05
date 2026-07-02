import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import {
  Users, Plus, Trash2, Copy, Pencil, Save, X, Star, Image as ImageIcon,
  Search, Palette, Eye, Sparkles, Upload, Link2,
} from "lucide-react";
import {
  useCharacterStore,
  CHARACTER_STYLES,
  type CharacterSheet,
  type CharacterStyle,
  type ReferenceImage,
} from "@/store/character-store";
import { useUniverseStore } from "@/store/universe-store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";

export const Route = createFileRoute("/characters")({
  head: () => ({
    meta: [
      { title: "Character Studio — Hooke" },
      { name: "description", content: "Build persistent character sheets with reference-image pinning for cross-project visual consistency." },
      { property: "og:title", content: "Character Studio — Hooke" },
      { property: "og:description", content: "Character consistency engine for coherent storytelling." },
    ],
  }),
  component: CharacterStudioPage,
});

const REF_KINDS: { id: ReferenceImage["kind"]; label: string }[] = [
  { id: "face", label: "Face" },
  { id: "hair", label: "Hair" },
  { id: "outfit", label: "Outfit" },
  { id: "body", label: "Body" },
  { id: "expression", label: "Expression" },
  { id: "scene", label: "Scene" },
  { id: "other", label: "Other" },
];

function CharacterStudioPage() {
  const {
    characters, activeId, setActive, createCharacter, updateCharacter,
    deleteCharacter, duplicateCharacter,
  } = useCharacterStore();
  const universes = useUniverseStore((s) => s.universes);

  const [query, setQuery] = useState("");
  const [styleFilter, setStyleFilter] = useState<CharacterStyle | "all">("all");

  const filtered = useMemo(() => {
    return characters.filter((c) => {
      const matchesQuery =
        !query ||
        c.name.toLowerCase().includes(query.toLowerCase()) ||
        c.summary.toLowerCase().includes(query.toLowerCase()) ||
        c.tags.some((t) => t.toLowerCase().includes(query.toLowerCase()));
      const matchesStyle = styleFilter === "all" || c.style === styleFilter;
      return matchesQuery && matchesStyle;
    });
  }, [characters, query, styleFilter]);

  const active = useMemo(
    () => characters.find((c) => c.id === activeId) ?? filtered[0],
    [characters, activeId, filtered],
  );

  return (
    <div className="mx-auto flex w-full max-w-[1600px] flex-col gap-4">
      {/* Header */}
      <header className="flex items-center gap-3">
        <div
          className="flex h-10 w-10 items-center justify-center rounded-xl"
          style={{ background: "var(--gradient-iris)" }}
        >
          <Users className="h-5 w-5 text-white" />
        </div>
        <div>
          <h1 className="hk-text-display text-[20px] font-bold text-text-primary">Character Studio</h1>
          <p className="text-[12px] text-text-secondary">
            Persistent character sheets & consistency engine.
          </p>
        </div>
        <div className="ml-auto">
          <NewCharacterButton
            onCreate={(input) => createCharacter(input)}
            universes={universes.map((u) => ({ id: u.id, name: u.name }))}
          />
        </div>
      </header>

      {characters.length === 0 ? (
        <EmptyState onCreate={() => createCharacter({})} />
      ) : (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-[280px_minmax(0,1fr)]">
          {/* Library rail */}
          <aside className="hk-card flex max-h-[calc(100vh-200px)] min-h-[400px] flex-col overflow-hidden">
            <div className="border-b border-white/[0.06] p-2.5 space-y-2">
              <div className="flex items-center gap-1.5">
                <Search className="h-3.5 w-3.5 text-text-dim" />
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search characters..."
                  className="flex-1 bg-transparent text-[12px] text-text-primary placeholder:text-text-dim/50 focus:outline-none"
                />
              </div>
              <Select value={styleFilter} onValueChange={(v) => setStyleFilter(v as CharacterStyle | "all")}>
                <SelectTrigger className="h-7 text-[11px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All styles</SelectItem>
                  {CHARACTER_STYLES.map((s) => (
                    <SelectItem key={s.id} value={s.id}>{s.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex-1 overflow-y-auto p-1.5">
              {filtered.map((c) => {
                const isActive = c.id === active?.id;
                const primary = c.references.find((r) => r.isPrimary) ?? c.references[0];
                return (
                  <button
                    key={c.id}
                    onClick={() => setActive(c.id)}
                    className={`group flex w-full items-start gap-2.5 rounded-md p-2 text-left transition-colors ${
                      isActive
                        ? "bg-iris/15 text-iris"
                        : "text-text-secondary hover:bg-surface hover:text-text-primary"
                    }`}
                  >
                    <div className="mt-0.5 h-9 w-9 shrink-0 overflow-hidden rounded-md bg-elevated">
                      {primary ? (
                        <img src={primary.url} alt="" className="h-full w-full object-cover" />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center">
                          <Users className="h-4 w-4 text-text-dim/50" />
                        </div>
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-[13px] font-medium">{c.name}</div>
                      <div className="mt-0.5 truncate text-[10.5px] text-text-dim">
                        {c.role} · {CHARACTER_STYLES.find((s) => s.id === c.style)?.label}
                      </div>
                    </div>
                  </button>
                );
              })}
              {filtered.length === 0 && (
                <p className="px-3 py-6 text-center text-[11px] text-text-dim">
                  No characters match.
                </p>
              )}
            </div>
          </aside>

          {/* Detail */}
          {active ? (
            <CharacterDetail
              key={active.id}
              character={active}
              universes={universes.map((u) => ({ id: u.id, name: u.name }))}
              onUpdate={(patch) => updateCharacter(active.id, patch)}
              onDelete={() => {
                if (confirm(`Delete "${active.name}"?`)) deleteCharacter(active.id);
              }}
              onDuplicate={() => duplicateCharacter(active.id)}
            />
          ) : (
            <div className="hk-card flex flex-1 items-center justify-center p-12 text-center">
              <div>
                <Users className="mx-auto h-8 w-8 text-text-dim/50" />
                <p className="mt-2 text-[13px] text-text-secondary">Select a character</p>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function CharacterDetail({
  character, universes, onUpdate, onDelete, onDuplicate,
}: {
  character: CharacterSheet;
  universes: { id: string; name: string }[];
  onUpdate: (patch: Partial<Omit<CharacterSheet, "id" | "createdAt">>) => void;
  onDelete: () => void;
  onDuplicate: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(character);

  const startEdit = () => {
    setDraft(character);
    setEditing(true);
  };
  const save = () => {
    const { id: _id, createdAt: _c, ...patch } = draft;
    onUpdate(patch);
    setEditing(false);
  };

  const linkedUniverse = universes.find((u) => u.id === character.universeId);

  return (
    <div className="hk-card flex max-h-[calc(100vh-200px)] min-h-[400px] flex-col overflow-hidden">
      {/* Header */}
      <div className="border-b border-white/[0.06] px-4 py-3">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            {editing ? (
              <Input
                value={draft.name}
                onChange={(e) => setDraft({ ...draft, name: e.target.value })}
                className="hk-text-display h-8 text-[16px] font-bold"
              />
            ) : (
              <h3 className="hk-text-display text-[16px] font-bold text-text-primary">
                {character.name}
              </h3>
            )}
            <p className="mt-0.5 text-[12px] text-text-secondary line-clamp-2">
              {character.summary || "No summary yet."}
            </p>
          </div>
          <div className="flex items-center gap-1.5">
            {editing ? (
              <>
                <Button size="sm" variant="ghost" onClick={() => setEditing(false)}>
                  Cancel
                </Button>
                <Button size="sm" onClick={save} style={{ background: "var(--gradient-iris)" }} className="text-white">
                  <Save className="h-3 w-3" />
                  Save
                </Button>
              </>
            ) : (
              <>
                <Button size="sm" variant="ghost" onClick={onDuplicate} title="Duplicate">
                  <Copy className="h-3.5 w-3.5" />
                </Button>
                <Button size="sm" variant="ghost" onClick={startEdit} title="Edit">
                  <Pencil className="h-3.5 w-3.5" />
                </Button>
                <Button size="sm" variant="ghost" onClick={onDelete} title="Delete">
                  <Trash2 className="h-3.5 w-3.5 text-[#FF5370]" />
                </Button>
              </>
            )}
          </div>
        </div>
        <div className="mt-2.5 flex flex-wrap items-center gap-2 text-[11px] text-text-dim">
          <Badge variant="secondary" className="text-[10px]">{character.role}</Badge>
          <span>·</span>
          <span>{CHARACTER_STYLES.find((s) => s.id === character.style)?.label}</span>
          {linkedUniverse && (
            <>
              <span>·</span>
              <span className="flex items-center gap-1 text-iris">
                <Link2 className="h-3 w-3" />
                {linkedUniverse.name}
              </span>
            </>
          )}
          {character.tags.map((t) => (
            <Badge key={t} variant="outline" className="text-[10px] gap-1">
              <Sparkles className="h-2.5 w-2.5" /> {t}
            </Badge>
          ))}
        </div>
      </div>

      <Tabs defaultValue="sheet" className="flex-1 flex flex-col min-h-0">
        <TabsList className="mx-4 mt-3">
          <TabsTrigger value="sheet">Character sheet</TabsTrigger>
          <TabsTrigger value="references">
            References ({character.references.length})
          </TabsTrigger>
          <TabsTrigger value="palette">Palette</TabsTrigger>
        </TabsList>

        <TabsContent value="sheet" className="flex-1 overflow-y-auto px-4 pb-4 mt-3">
          <SheetFields character={character} editing={editing} draft={draft} setDraft={setDraft} />
        </TabsContent>

        <TabsContent value="references" className="flex-1 overflow-y-auto px-4 pb-4 mt-3">
          <ReferencesPane character={character} />
        </TabsContent>

        <TabsContent value="palette" className="flex-1 overflow-y-auto px-4 pb-4 mt-3">
          <PalettePane character={character} editing={editing} draft={draft} setDraft={setDraft} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function SheetFields({
  character, editing, draft, setDraft,
}: {
  character: CharacterSheet;
  editing: boolean;
  draft: CharacterSheet;
  setDraft: (c: CharacterSheet) => void;
}) {
  const c = editing ? draft : character;
  const set = (patch: Partial<CharacterSheet>) => editing && setDraft({ ...draft, ...patch });

  const groups: { label: string; fields: { key: keyof CharacterSheet; label: string; area?: boolean }[] }[] = [
    {
      label: "Physical",
      fields: [
        { key: "age", label: "Age" },
        { key: "height", label: "Height" },
        { key: "build", label: "Build" },
        { key: "hair", label: "Hair" },
        { key: "eyes", label: "Eyes" },
        { key: "skin", label: "Skin" },
        { key: "distinguishingFeatures", label: "Distinguishing features", area: true },
      ],
    },
    {
      label: "Costume",
      fields: [
        { key: "outfit", label: "Outfit", area: true },
        { key: "accessories", label: "Accessories", area: true },
      ],
    },
    {
      label: "Voice & personality",
      fields: [
        { key: "voice", label: "Voice" },
        { key: "personality", label: "Personality", area: true },
        { key: "catchphrase", label: "Catchphrase" },
      ],
    },
  ];

  return (
    <div className="space-y-5">
      {/* Summary + role + style + universe */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="space-y-1.5 sm:col-span-2">
          <Label className="text-[11px] text-text-dim">Summary</Label>
          {editing ? (
            <Textarea
              value={draft.summary}
              onChange={(e) => set({ summary: e.target.value })}
              rows={2}
              className="text-[12px]"
            />
          ) : (
            <p className="text-[12px] text-text-secondary">{character.summary || "—"}</p>
          )}
        </div>
        <div className="space-y-1.5">
          <Label className="text-[11px] text-text-dim">Role</Label>
          {editing ? (
            <Input value={draft.role} onChange={(e) => set({ role: e.target.value })} className="h-8 text-[12px]" />
          ) : (
            <p className="text-[12px] text-text-primary">{character.role}</p>
          )}
        </div>
        <div className="space-y-1.5">
          <Label className="text-[11px] text-text-dim">Visual style</Label>
          {editing ? (
            <Select value={draft.style} onValueChange={(v) => set({ style: v as CharacterStyle })}>
              <SelectTrigger className="h-8 text-[12px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                {CHARACTER_STYLES.map((s) => (
                  <SelectItem key={s.id} value={s.id}>{s.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : (
            <p className="text-[12px] text-text-primary">
              {CHARACTER_STYLES.find((s) => s.id === character.style)?.label}
            </p>
          )}
        </div>
      </div>

      {groups.map((g) => (
        <div key={g.label}>
          <h4 className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-text-dim">
            {g.label}
          </h4>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {g.fields.map((f) => (
              <div key={f.key} className={f.area ? "sm:col-span-2" : ""}>
                <Label className="text-[11px] text-text-dim">{f.label}</Label>
                {editing ? (
                  f.area ? (
                    <Textarea
                      value={(draft[f.key] as string) ?? ""}
                      onChange={(e) => set({ [f.key]: e.target.value } as Partial<CharacterSheet>)}
                      rows={2}
                      className="mt-1 text-[12px]"
                    />
                  ) : (
                    <Input
                      value={(draft[f.key] as string) ?? ""}
                      onChange={(e) => set({ [f.key]: e.target.value } as Partial<CharacterSheet>)}
                      className="mt-1 h-8 text-[12px]"
                    />
                  )
                ) : (
                  <p className="mt-1 text-[12px] text-text-primary">
                    {(character[f.key] as string) || "—"}
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      ))}

      {/* Tags */}
      <div>
        <h4 className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-text-dim">Tags</h4>
        {editing ? (
          <TagEditor
            tags={draft.tags}
            onChange={(tags) => set({ tags })}
          />
        ) : (
          <div className="flex flex-wrap gap-1.5">
            {character.tags.length === 0 ? (
              <span className="text-[12px] text-text-dim">—</span>
            ) : (
              character.tags.map((t) => (
                <Badge key={t} variant="secondary" className="text-[10px] gap-1">
                  <Sparkles className="h-2.5 w-2.5" /> {t}
                </Badge>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function TagEditor({ tags, onChange }: { tags: string[]; onChange: (t: string[]) => void }) {
  const [input, setInput] = useState("");
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {tags.map((t) => (
        <span key={t} className="inline-flex items-center gap-1 rounded border border-white/10 bg-base px-2 py-0.5 text-[11px] text-text-secondary">
          {t}
          <button onClick={() => onChange(tags.filter((x) => x !== t))} className="text-text-dim hover:text-[#FF5370]">
            <X className="h-2.5 w-2.5" />
          </button>
        </span>
      ))}
      <input
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && input.trim()) {
            onChange([...tags, input.trim()]);
            setInput("");
          }
        }}
        placeholder="Add tag, Enter"
        className="h-7 w-28 rounded border border-white/10 bg-base px-2 text-[11px] text-text-primary placeholder:text-text-dim/50 focus:border-iris focus:outline-none"
      />
    </div>
  );
}

function ReferencesPane({ character }: { character: CharacterSheet }) {
  const { addReference, removeReference, setPrimaryReference, updateReference } = useCharacterStore();
  const [url, setUrl] = useState("");
  const [label, setLabel] = useState("");
  const [kind, setKind] = useState<ReferenceImage["kind"]>("face");

  const add = () => {
    if (!url.trim()) return;
    addReference(character.id, { url: url.trim(), label: label.trim(), kind });
    setUrl(""); setLabel(""); setKind("face");
  };

  return (
    <div className="space-y-4">
      {/* Add reference */}
      <div className="rounded-lg border border-white/[0.06] bg-base/40 p-3">
        <div className="mb-2 flex items-center gap-1.5">
          <Upload className="h-3.5 w-3.5 text-text-dim" />
          <span className="text-[11px] font-medium uppercase tracking-wider text-text-dim">
            Pin reference image
          </span>
        </div>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-[1fr_140px_120px_auto]">
          <Input
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://image-url..."
            className="h-8 text-[12px]"
          />
          <Input
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            placeholder="Label"
            className="h-8 text-[12px]"
          />
          <Select value={kind} onValueChange={(v) => setKind(v as ReferenceImage["kind"])}>
            <SelectTrigger className="h-8 text-[12px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              {REF_KINDS.map((k) => (
                <SelectItem key={k.id} value={k.id}>{k.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button size="sm" onClick={add} disabled={!url.trim()} style={{ background: "var(--gradient-iris)" }} className="text-white">
            <Plus className="h-3.5 w-3.5" />
            Pin
          </Button>
        </div>
      </div>

      {/* Grid */}
      {character.references.length === 0 ? (
        <div className="rounded-lg border border-dashed border-white/10 p-8 text-center">
          <ImageIcon className="mx-auto h-6 w-6 text-text-dim/50" />
          <p className="mt-2 text-[12px] text-text-secondary">
            No reference images yet. Pin images to lock visual consistency across scenes.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {character.references.map((r) => (
            <div
              key={r.id}
              className="group relative overflow-hidden rounded-lg border border-white/[0.06] bg-base"
            >
              <div className="aspect-[3/4] overflow-hidden bg-elevated">
                <img src={r.url} alt={r.label} className="h-full w-full object-cover" />
              </div>
              {r.isPrimary && (
                <div className="absolute left-1.5 top-1.5 flex items-center gap-1 rounded-full bg-iris/90 px-1.5 py-0.5 text-[9px] font-medium text-white">
                  <Star className="h-2.5 w-2.5 fill-white" />
                  Primary
                </div>
              )}
              <div className="p-2">
                <div className="flex items-center justify-between gap-1">
                  <span className="truncate text-[11px] font-medium text-text-primary">{r.label}</span>
                  <Badge variant="outline" className="text-[9px] capitalize">{r.kind}</Badge>
                </div>
                <div className="mt-1.5 flex items-center gap-1">
                  {!r.isPrimary && (
                    <button
                      onClick={() => setPrimaryReference(character.id, r.id)}
                      className="flex h-6 items-center gap-1 rounded border border-white/10 px-1.5 text-[10px] text-text-dim hover:border-iris/50 hover:text-iris"
                      title="Set as primary"
                    >
                      <Star className="h-2.5 w-2.5" />
                    </button>
                  )}
                  <button
                    onClick={() => removeReference(character.id, r.id)}
                    className="flex h-6 w-6 items-center justify-center rounded text-text-dim hover:bg-elevated hover:text-[#FF5370]"
                    title="Remove"
                  >
                    <Trash2 className="h-3 w-3" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function PalettePane({
  character, editing, draft, setDraft,
}: {
  character: CharacterSheet;
  editing: boolean;
  draft: CharacterSheet;
  setDraft: (c: CharacterSheet) => void;
}) {
  const colors = editing ? draft.colorPalette : character.colorPalette;
  const set = (patch: Partial<CharacterSheet>) => editing && setDraft({ ...draft, ...patch });

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-1.5">
        <Palette className="h-3.5 w-3.5 text-text-dim" />
        <span className="text-[11px] font-medium uppercase tracking-wider text-text-dim">
          Character color palette
        </span>
      </div>

      {colors.length === 0 ? (
        <p className="text-[12px] text-text-dim">
          No palette colors defined. Add colors to keep costume and scene tones consistent.
        </p>
      ) : (
        <div className="flex flex-wrap gap-3">
          {colors.map((c, i) => (
            <div key={i} className="flex flex-col items-center gap-1.5">
              <div
                className="h-14 w-14 rounded-lg border border-white/15"
                style={{ background: c }}
              />
              <span className="font-mono text-[10px] text-text-dim">{c}</span>
              {editing && (
                <button
                  onClick={() => set({ colorPalette: colors.filter((_, j) => j !== i) })}
                  className="text-[10px] text-text-dim hover:text-[#FF5370]"
                >
                  Remove
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {editing && (
        <div className="flex items-center gap-2">
          <input
            type="color"
            onChange={(e) => set({ colorPalette: [...draft.colorPalette, e.target.value] })}
            className="h-9 w-14 cursor-pointer rounded border border-white/15 bg-transparent"
            title="Add color"
          />
          <span className="text-[11px] text-text-dim">Click to add a color</span>
        </div>
      )}

      {!editing && colors.length > 0 && (
        <div className="rounded-lg border border-white/[0.06] bg-base/40 p-3">
          <p className="text-[11px] text-text-secondary">
            These colors guide costume, lighting, and scene tone for {character.name} across all projects.
          </p>
        </div>
      )}
    </div>
  );
}

function NewCharacterButton({
  onCreate,
  universes,
}: {
  onCreate: (input: { name: string; role?: string; style?: CharacterStyle; universeId?: string }) => void;
  universes: { id: string; name: string }[];
}) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [role, setRole] = useState("Supporting");
  const [style, setStyle] = useState<CharacterStyle>("cinematic");
  const [universeId, setUniverseId] = useState("");

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" style={{ background: "var(--gradient-iris)" }} className="text-white">
          <Plus className="h-3.5 w-3.5" />
          New character
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>New character</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label>Name</Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Iris Vale"
              autoFocus
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Role</Label>
              <Input value={role} onChange={(e) => setRole(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Visual style</Label>
              <Select value={style} onValueChange={(v) => setStyle(v as CharacterStyle)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {CHARACTER_STYLES.map((s) => (
                    <SelectItem key={s.id} value={s.id}>{s.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Link to Universe (optional)</Label>
            <Select value={universeId} onValueChange={setUniverseId}>
              <SelectTrigger><SelectValue placeholder="None" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="">None</SelectItem>
                {universes.map((u) => (
                  <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button
            disabled={!name.trim()}
            onClick={() => {
              onCreate({
                name,
                role,
                style,
                universeId: universeId || undefined,
              });
              setName(""); setRole("Supporting"); setStyle("cinematic"); setUniverseId("");
              setOpen(false);
            }}
          >
            Create
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function EmptyState({ onCreate }: { onCreate: () => void }) {
  return (
    <div className="hk-card flex flex-col items-center justify-center gap-4 p-12 text-center">
      <div
        className="flex h-14 w-14 items-center justify-center rounded-2xl"
        style={{ background: "var(--gradient-iris)" }}
      >
        <Users className="h-7 w-7 text-white" />
      </div>
      <div>
        <h2 className="hk-text-display text-[20px] font-bold text-text-primary">
          Build your character library
        </h2>
        <p className="mx-auto mt-1 max-w-md text-[13px] text-text-secondary">
          Create persistent character sheets with reference-image pinning.
          Keep faces, outfits, and voices consistent across every project.
        </p>
      </div>
      <Button onClick={onCreate} style={{ background: "var(--gradient-iris)" }} className="text-white">
        <Plus className="h-4 w-4" />
        Create first character
      </Button>
    </div>
  );
}
