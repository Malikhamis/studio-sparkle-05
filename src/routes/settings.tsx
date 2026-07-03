import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import {
  Settings, Key, Plus, Trash2, Check, Star, Search, X, Zap, Shield,
  Brain, MessageSquare, Eye, GitBranch, Wrench, CircleDot,
} from "lucide-react";
import {
  useAIProviderStore,
  PROVIDER_CATALOG,
  type ProviderId,
  type ProviderEntry,
  type PhaseRole,
} from "@/store/ai-provider-store";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export const Route = createFileRoute("/settings")({
  head: () => ({
    meta: [
      { title: "Settings — Hooke" },
      { name: "description", content: "AI providers, model routing, appearance, and workspace configuration." },
      { property: "og:title", content: "Settings — Hooke" },
      { property: "og:description", content: "AI providers, model routing, and workspace configuration." },
    ],
  }),
  component: SettingsPage,
});

const PHASE_META: { id: PhaseRole; label: string; icon: React.ComponentType<{ className?: string }>; desc: string }[] = [
  { id: "default",  label: "Default",  icon: CircleDot,       desc: "Fallback for any phase without explicit routing" },
  { id: "intake",   label: "Intake",   icon: MessageSquare,   desc: "miDirector interview & blueprint generation" },
  { id: "design",   label: "Design",   icon: Brain,           desc: "Story, universe, and character generation" },
  { id: "build",    label: "Build",    icon: Wrench,          desc: "Storyboard, audio, and timeline assembly" },
  { id: "verify",   label: "Verify",   icon: Eye,            desc: "Review, continuity checks, and quality" },
  { id: "security", label: "Security", icon: Shield,         desc: "Content safety and policy checks" },
];

function SettingsPage() {
  return (
    <div className="mx-auto flex w-full max-w-[1400px] flex-col gap-4">
      <header className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl" style={{ background: "var(--gradient-iris)" }}>
          <Settings className="h-5 w-5 text-white" />
        </div>
        <div>
          <h1 className="hk-text-display text-[20px] font-bold text-text-primary">Settings</h1>
          <p className="text-[12px] text-text-secondary">AI providers, model routing, and workspace.</p>
        </div>
      </header>

      <Tabs defaultValue="providers">
        <TabsList className="w-full justify-start">
          <TabsTrigger value="providers"><Key className="h-3.5 w-3.5" />AI Providers</TabsTrigger>
          <TabsTrigger value="routing"><GitBranch className="h-3.5 w-3.5" />Model Routing</TabsTrigger>
          <TabsTrigger value="appearance"><Zap className="h-3.5 w-3.5" />Appearance</TabsTrigger>
        </TabsList>

        <TabsContent value="providers" className="mt-4">
          <ProvidersTab />
        </TabsContent>
        <TabsContent value="routing" className="mt-4">
          <RoutingTab />
        </TabsContent>
        <TabsContent value="appearance" className="mt-4">
          <AppearanceTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}

/* ============ PROVIDERS TAB ============ */

function ProvidersTab() {
  const { connected, removeProvider, setDefault } = useAIProviderStore();
  const [adding, setAdding] = useState(false);
  const [search, setSearch] = useState("");

  const connectedIds = new Set(connected.map((c) => c.providerId));
  const available = PROVIDER_CATALOG.filter((p) => !connectedIds.has(p.id));
  const filtered = available.filter((p) =>
    p.label.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="flex flex-col gap-4">
      {/* Connected providers */}
      <section>
        <div className="mb-2.5 flex items-center justify-between">
          <h2 className="hk-text-display text-[15px] font-semibold text-text-primary">
            Connected providers
            <span className="ml-2 text-[12px] font-normal text-text-dim">{connected.length}</span>
          </h2>
          <Button size="sm" onClick={() => setAdding(true)} style={{ background: "var(--gradient-iris)" }} className="text-white">
            <Plus className="h-3.5 w-3.5" />
            Add provider
          </Button>
        </div>

        {connected.length === 0 ? (
          <div className="hk-card flex flex-col items-center justify-center gap-3 p-10 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-elevated">
              <Key className="h-6 w-6 text-text-dim" />
            </div>
            <div>
              <h3 className="text-[14px] font-semibold text-text-primary">No providers connected</h3>
              <p className="mx-auto mt-1 max-w-sm text-[12.5px] text-text-secondary">
                Add an API key for any provider to give miDirector its brain. Free tiers are available from Groq, Gemini, OpenRouter, and more.
              </p>
            </div>
            <Button size="sm" onClick={() => setAdding(true)} style={{ background: "var(--gradient-iris)" }} className="text-white">
              <Plus className="h-3.5 w-3.5" />
              Add your first provider
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
            {connected.map((c) => {
              const entry = PROVIDER_CATALOG.find((p) => p.id === c.providerId)!;
              return (
                <div
                  key={c.providerId}
                  className="hk-card-hover relative flex flex-col gap-2 p-3.5"
                  style={c.isDefault ? { borderColor: "rgba(108,99,255,0.4)" } : undefined}
                >
                  {c.isDefault && (
                    <div className="absolute -top-px -right-px rounded-bl-lg rounded-tr-[10px] px-2 py-0.5 text-[9px] font-semibold uppercase tracking-wider text-white" style={{ background: "var(--gradient-iris)" }}>
                      Default
                    </div>
                  )}
                  <div className="flex items-center gap-2">
                    <ProviderIcon entry={entry} />
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-[13px] font-semibold text-text-primary">{entry.label}</div>
                      <div className="truncate font-mono text-[10px] text-text-dim">{entry.defaultModel}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5">
                    {entry.free && <Badge variant="secondary" className="text-[9px]">Free tier</Badge>}
                    <Badge variant="outline" className="text-[9px] capitalize">{entry.authKind}</Badge>
                  </div>
                  <div className="mt-1 flex items-center gap-1">
                    {!c.isDefault && (
                      <button
                        onClick={() => setDefault(c.providerId)}
                        className="flex h-7 items-center gap-1 rounded-md border border-white/10 px-2 text-[11px] text-text-secondary hover:bg-elevated hover:text-text-primary"
                      >
                        <Star className="h-3 w-3" />
                        Set default
                      </button>
                    )}
                    <button
                      onClick={() => {
                        if (confirm(`Remove ${entry.label}?`)) removeProvider(c.providerId);
                      }}
                      className="flex h-7 w-7 items-center justify-center rounded-md text-text-dim hover:bg-elevated hover:text-[#FF5370]"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Add provider dialog */}
      <Dialog open={adding} onOpenChange={setAdding}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Add AI provider</DialogTitle>
          </DialogHeader>
          <AddProviderForm
            available={filtered}
            search={search}
            onSearch={setSearch}
            onClose={() => setAdding(false)}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}

function AddProviderForm({
  available, search, onSearch, onClose,
}: {
  available: ProviderEntry[];
  search: string;
  onSearch: (v: string) => void;
  onClose: () => void;
}) {
  const addProvider = useAIProviderStore((s) => s.addProvider);
  const [selected, setSelected] = useState<ProviderId | null>(null);
  const [credential, setCredential] = useState("");
  const [customUrl, setCustomUrl] = useState("");

  const entry = selected ? PROVIDER_CATALOG.find((p) => p.id === selected) : null;

  const submit = () => {
    if (!selected || !credential.trim()) return;
    addProvider(selected, credential.trim(), customUrl.trim() || undefined);
    onClose();
  };

  if (entry) {
    return (
      <div className="flex flex-col gap-4">
        <div className="flex items-center gap-2">
          <button onClick={() => setSelected(null)} className="text-[12px] text-text-secondary hover:text-text-primary">
            ← Back to list
          </button>
        </div>
        <div className="flex items-center gap-3 rounded-lg border border-white/[0.06] bg-base/40 p-3">
          <ProviderIcon entry={entry} />
          <div>
            <div className="text-[14px] font-semibold text-text-primary">{entry.label}</div>
            <div className="font-mono text-[11px] text-text-dim">{entry.defaultModel}</div>
          </div>
          {entry.free && <Badge variant="secondary" className="ml-auto text-[10px]">Free tier</Badge>}
        </div>

        {entry.authKind === "url+key" && (
          <div className="space-y-1.5">
            <Label className="text-[11px] text-text-dim">Base URL</Label>
            <Input
              value={customUrl}
              onChange={(e) => setCustomUrl(e.target.value)}
              placeholder="https://your-endpoint.com/v1"
              className="text-[13px]"
            />
          </div>
        )}

        <div className="space-y-1.5">
          <Label className="text-[11px] text-text-dim">
            {entry.authKind === "login" ? "Access token" : "API key"}
          </Label>
          <Input
            type="password"
            value={credential}
            onChange={(e) => setCredential(e.target.value)}
            placeholder={entry.authKind === "login" ? "Paste access token…" : "Paste API key…"}
            className="font-mono text-[13px]"
            autoFocus
          />
          <p className="text-[10.5px] text-text-dim">
            Stored locally in your browser. Used to authenticate requests to {entry.label}.
          </p>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={submit} disabled={!credential.trim()} style={{ background: "var(--gradient-iris)" }} className="text-white">
            <Check className="h-3.5 w-3.5" />
            Connect
          </Button>
        </DialogFooter>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-dim" />
        <Input
          value={search}
          onChange={(e) => onSearch(e.target.value)}
          placeholder="Search providers…"
          className="pl-9 text-[13px]"
          autoFocus
        />
      </div>
      <div className="grid max-h-[400px] grid-cols-1 gap-2 overflow-y-auto sm:grid-cols-2">
        {available.map((p) => (
          <button
            key={p.id}
            onClick={() => setSelected(p.id)}
            className="hk-card-hover flex items-center gap-2.5 p-3 text-left"
          >
            <ProviderIcon entry={p} />
            <div className="min-w-0 flex-1">
              <div className="truncate text-[12.5px] font-medium text-text-primary">{p.label}</div>
              <div className="truncate font-mono text-[10px] text-text-dim">{p.defaultModel}</div>
            </div>
            {p.free && <Badge variant="secondary" className="text-[9px]">Free</Badge>}
          </button>
        ))}
        {available.length === 0 && (
          <div className="col-span-2 py-6 text-center text-[12px] text-text-dim">No providers match "{search}"</div>
        )}
      </div>
    </div>
  );
}

function ProviderIcon({ entry }: { entry: ProviderEntry }) {
  return (
    <div
      className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-[11px] font-bold text-white"
      style={{ background: providerColor(entry.id) }}
    >
      {entry.label.slice(0, 2).toUpperCase()}
    </div>
  );
}

function providerColor(id: ProviderId): string {
  const colors: Partial<Record<ProviderId, string>> = {
    "anthropic-login": "#D97757",
    "anthropic-key": "#D97757",
    "openai-login": "#10A37F",
    "openai-key": "#10A37F",
    "gemini-login": "#4285F4",
    "gemini-key": "#4285F4",
    "openrouter": "#6366F1",
    "groq": "#F55036",
    "deepseek": "#4D6BFE",
    "mistral": "#FF7000",
    "xai-grok": "#111111",
    "perplexity": "#20808D",
    "together-ai": "#0F6FFF",
    "fireworks": "#FF3D00",
    "cerebras": "#ED1C24",
    "nvidia-nim": "#76B900",
    "hugging-face": "#FFD21E",
  };
  return colors[id] ?? "var(--gradient-iris)";
}

/* ============ ROUTING TAB ============ */

function RoutingTab() {
  const { phaseRouting, connected, setPhaseRouting } = useAIProviderStore();

  if (connected.length === 0) {
    return (
      <div className="hk-card flex flex-col items-center justify-center gap-3 p-10 text-center">
        <GitBranch className="h-10 w-10 text-text-dim" />
        <div>
          <h3 className="text-[14px] font-semibold text-text-primary">Connect a provider first</h3>
          <p className="mx-auto mt-1 max-w-sm text-[12.5px] text-text-secondary">
            Add at least one AI provider in the Providers tab to configure per-phase model routing.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="mb-1">
        <h2 className="hk-text-display text-[15px] font-semibold text-text-primary">Model routing</h2>
        <p className="mt-0.5 text-[12px] text-text-secondary">
          Route different production phases to specific providers and models. Each phase falls back to the default if unset.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-2.5 lg:grid-cols-2">
        {PHASE_META.map((phase) => {
          const routing = phaseRouting.find((r) => r.phase === phase.id);
          const Icon = phase.icon;
          return (
            <div key={phase.id} className="hk-card p-3.5">
              <div className="mb-2.5 flex items-center gap-2">
                <div className="flex h-7 w-7 items-center justify-center rounded-md" style={{ background: "color-mix(in oklab, var(--accent-iris) 15%, transparent)" }}>
                  <Icon className="h-3.5 w-3.5 text-iris" />
                </div>
                <div>
                  <div className="text-[13px] font-semibold text-text-primary">{phase.label}</div>
                  <div className="text-[10.5px] text-text-dim">{phase.desc}</div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Select
                  value={routing?.providerId ?? "__default__"}
                  onValueChange={(val) => {
                    const providerId = val === "__default__" ? null : (val as ProviderId);
                    const entry = providerId ? PROVIDER_CATALOG.find((p) => p.id === providerId) : null;
                    setPhaseRouting(phase.id, providerId, entry?.defaultModel ?? "");
                  }}
                >
                  <SelectTrigger className="h-8 flex-1 text-[12px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__default__">Use default</SelectItem>
                    {connected.map((c) => {
                      const entry = PROVIDER_CATALOG.find((p) => p.id === c.providerId)!;
                      return (
                        <SelectItem key={c.providerId} value={c.providerId}>{entry.label}</SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
                <Input
                  value={routing?.model ?? ""}
                  onChange={(e) => setPhaseRouting(phase.id, routing?.providerId ?? null, e.target.value)}
                  placeholder="model name"
                  className="h-8 w-40 font-mono text-[11px]"
                  disabled={!routing?.providerId}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ============ APPEARANCE TAB ============ */

function AppearanceTab() {
  return (
    <div className="flex flex-col gap-3">
      <div className="hk-card p-4">
        <h3 className="hk-text-display text-[14px] font-semibold text-text-primary">Theme</h3>
        <p className="mt-0.5 text-[12px] text-text-secondary">Hooke uses a cinematic dark theme by default. Light theme is planned for a future phase.</p>
        <div className="mt-3 flex items-center gap-2">
          <div className="flex h-10 w-20 items-center justify-center rounded-lg border border-iris/40 bg-iris/10 text-[11px] font-medium text-iris">Dark</div>
          <div className="flex h-10 w-20 items-center justify-center rounded-lg border border-white/10 bg-base text-[11px] font-medium text-text-dim">Light (soon)</div>
        </div>
      </div>
      <div className="hk-card p-4">
        <h3 className="hk-text-display text-[14px] font-semibold text-text-primary">Workspace</h3>
        <p className="mt-0.5 text-[12px] text-text-secondary">All project data is stored locally in your browser via IndexedDB. No cloud sync required.</p>
      </div>
    </div>
  );
}
