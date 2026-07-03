import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import {
  Settings,
  Plus,
  Trash2,
  CheckCircle,
  AlertCircle,
  Eye,
  EyeOff,
  Loader2,
  Star,
  StarOff,
} from "lucide-react";
import { toast } from "sonner";
import { useSettingsStore } from "@/store/settings-store";
import { createClient } from "@/lib/llm";
import type { ProviderName, ProviderConfig } from "@/lib/ai-providers";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";

export const Route = createFileRoute("/settings")({
  head: () => ({
    meta: [
      { title: "Settings — Hooke" },
      {
        name: "description",
        content: "Configure AI providers, model routing, and appearance.",
      },
    ],
  }),
  component: SettingsPage,
});

// ─── Provider catalog ────────────────────────────────────────────────────

const PROVIDER_CATALOG: {
  id: ProviderName;
  name: string;
  models: { id: string; label: string; contextK: number }[];
  requiresKey: boolean;
  keyPlaceholder: string;
  docsUrl: string;
}[] = [
  {
    id: "openai",
    name: "OpenAI",
    requiresKey: true,
    keyPlaceholder: "sk-...",
    docsUrl: "https://platform.openai.com/api-keys",
    models: [
      { id: "gpt-4o", label: "GPT-4o", contextK: 128 },
      { id: "gpt-4o-mini", label: "GPT-4o Mini", contextK: 128 },
      { id: "gpt-4-turbo", label: "GPT-4 Turbo", contextK: 128 },
      { id: "gpt-3.5-turbo", label: "GPT-3.5 Turbo", contextK: 16 },
    ],
  },
  {
    id: "anthropic",
    name: "Anthropic",
    requiresKey: true,
    keyPlaceholder: "sk-ant-...",
    docsUrl: "https://console.anthropic.com/settings/keys",
    models: [
      { id: "claude-3-5-sonnet-20241022", label: "Claude 3.5 Sonnet", contextK: 200 },
      { id: "claude-3-5-haiku-20241022", label: "Claude 3.5 Haiku", contextK: 200 },
      { id: "claude-3-opus-20240229", label: "Claude 3 Opus", contextK: 200 },
    ],
  },
  {
    id: "gemini",
    name: "Google Gemini",
    requiresKey: true,
    keyPlaceholder: "AIza...",
    docsUrl: "https://aistudio.google.com/app/apikey",
    models: [
      { id: "gemini-1.5-pro", label: "Gemini 1.5 Pro", contextK: 2000 },
      { id: "gemini-1.5-flash", label: "Gemini 1.5 Flash", contextK: 1000 },
      { id: "gemini-2.0-flash-exp", label: "Gemini 2.0 Flash (exp)", contextK: 1000 },
    ],
  },
  {
    id: "ollama",
    name: "Ollama (Local)",
    requiresKey: false,
    keyPlaceholder: "(not required)",
    docsUrl: "https://ollama.com",
    models: [
      { id: "llama3.2", label: "Llama 3.2", contextK: 128 },
      { id: "llama3.1", label: "Llama 3.1", contextK: 128 },
      { id: "mistral", label: "Mistral", contextK: 32 },
      { id: "mixtral", label: "Mixtral", contextK: 32 },
      { id: "qwen2.5", label: "Qwen 2.5", contextK: 128 },
    ],
  },
];

// ─── Add Provider Dialog ─────────────────────────────────────────────────

function AddProviderDialog({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const addProvider = useSettingsStore((s) => s.addProvider);
  const [provider, setProvider] = useState<ProviderName>("openai");
  const [model, setModel] = useState("gpt-4o");
  const [apiKey, setApiKey] = useState("");
  const [label, setLabel] = useState("");
  const [baseUrl, setBaseUrl] = useState("");
  const [showKey, setShowKey] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<"ok" | "fail" | null>(null);
  const [testError, setTestError] = useState("");

  const catalog = PROVIDER_CATALOG.find((p) => p.id === provider)!;

  function resetForm() {
    setProvider("openai");
    setModel("gpt-4o");
    setApiKey("");
    setLabel("");
    setBaseUrl("");
    setShowKey(false);
    setTesting(false);
    setTestResult(null);
    setTestError("");
  }

  async function handleTest() {
    setTesting(true);
    setTestResult(null);
    setTestError("");
    try {
      const config: ProviderConfig = {
        provider,
        apiKey,
        model,
        baseUrl: baseUrl || undefined,
      };
      const client = await createClient(config);
      await client.validateConfig();
      setTestResult("ok");
    } catch (err) {
      setTestResult("fail");
      setTestError(err instanceof Error ? err.message : String(err));
    } finally {
      setTesting(false);
    }
  }

  function handleAdd() {
    addProvider({
      provider,
      label: label || `${catalog.name} — ${model}`,
      model,
      apiKey: catalog.requiresKey ? apiKey : "local",
      baseUrl: baseUrl || undefined,
    });
    toast.success("Provider added successfully.");
    resetForm();
    onClose();
  }

  const canAdd = !catalog.requiresKey || apiKey.trim().length > 0;

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (!v) { resetForm(); onClose(); }
      }}
    >
      <DialogContent className="max-w-lg bg-surface border border-white/10 text-text-primary">
        <DialogHeader>
          <DialogTitle>Add AI Provider</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Provider */}
          <div className="space-y-1.5">
            <Label>Provider</Label>
            <Select
              value={provider}
              onValueChange={(v) => {
                setProvider(v as ProviderName);
                const cat = PROVIDER_CATALOG.find((p) => p.id === v)!;
                setModel(cat.models[0].id);
                setTestResult(null);
              }}
            >
              <SelectTrigger className="bg-elevated border-white/10">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-surface border-white/10">
                {PROVIDER_CATALOG.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Model */}
          <div className="space-y-1.5">
            <Label>Model</Label>
            <Select value={model} onValueChange={setModel}>
              <SelectTrigger className="bg-elevated border-white/10">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-surface border-white/10">
                {catalog.models.map((m) => (
                  <SelectItem key={m.id} value={m.id}>
                    <span>{m.label}</span>
                    <span className="ml-2 text-xs text-text-tertiary">
                      {m.contextK}K ctx
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* API Key */}
          {catalog.requiresKey ? (
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label>API Key</Label>
                <a
                  href={catalog.docsUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-text-tertiary hover:text-text-secondary"
                >
                  Get API key ↗
                </a>
              </div>
              <div className="relative">
                <Input
                  type={showKey ? "text" : "password"}
                  value={apiKey}
                  onChange={(e) => { setApiKey(e.target.value); setTestResult(null); }}
                  placeholder={catalog.keyPlaceholder}
                  className="bg-elevated border-white/10 pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowKey((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-text-tertiary hover:text-text-secondary"
                >
                  {showKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              <p className="text-xs text-text-tertiary">
                Stored encrypted on this device. Never sent to Hooke servers.
              </p>
            </div>
          ) : (
            <div className="space-y-1.5">
              <Label>Ollama URL (optional)</Label>
              <Input
                value={baseUrl}
                onChange={(e) => setBaseUrl(e.target.value)}
                placeholder="http://localhost:11434"
                className="bg-elevated border-white/10"
              />
              <p className="text-xs text-text-tertiary">
                Leave blank to use the default Ollama address.
              </p>
            </div>
          )}

          {/* Label */}
          <div className="space-y-1.5">
            <Label>Label (optional)</Label>
            <Input
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder={`${catalog.name} — ${model}`}
              className="bg-elevated border-white/10"
            />
          </div>

          {/* Test result */}
          {testResult === "ok" && (
            <div className="flex items-center gap-2 rounded-md bg-green-950/40 px-3 py-2 text-sm text-green-400 border border-green-800/30">
              <CheckCircle className="h-4 w-4 shrink-0" />
              Connection successful.
            </div>
          )}
          {testResult === "fail" && (
            <div className="flex items-start gap-2 rounded-md bg-red-950/40 px-3 py-2 text-sm text-red-400 border border-red-800/30">
              <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
              <span>{testError || "Connection failed. Check your API key."}</span>
            </div>
          )}
        </div>

        <DialogFooter className="gap-2">
          <Button
            variant="outline"
            onClick={handleTest}
            disabled={!canAdd || testing}
            className="border-white/10 bg-elevated text-text-primary hover:bg-elevated/80"
          >
            {testing ? (
              <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Testing…</>
            ) : (
              "Test Connection"
            )}
          </Button>
          <Button
            onClick={handleAdd}
            disabled={!canAdd}
            className="bg-white text-black hover:bg-white/90"
          >
            Add Provider
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Main Settings Page ──────────────────────────────────────────────────

function SettingsPage() {
  const providers = useSettingsStore((s) => s.providers);
  const defaultProviderId = useSettingsStore((s) => s.defaultProviderId);
  const modelRouting = useSettingsStore((s) => s.modelRouting);
  const theme = useSettingsStore((s) => s.theme);
  const removeProvider = useSettingsStore((s) => s.removeProvider);
  const setDefaultProvider = useSettingsStore((s) => s.setDefaultProvider);
  const setModelRouting = useSettingsStore((s) => s.setModelRouting);
  const setTheme = useSettingsStore((s) => s.setTheme);

  const [addOpen, setAddOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <div className="flex items-center gap-3">
        <Settings className="h-6 w-6 text-text-secondary" />
        <div>
          <h1 className="text-xl font-semibold text-text-primary">Settings</h1>
          <p className="text-sm text-text-tertiary">
            Configure AI providers, model routing, and appearance.
          </p>
        </div>
      </div>

      <Tabs defaultValue="providers">
        <TabsList className="bg-surface border border-white/10">
          <TabsTrigger value="providers">AI Providers</TabsTrigger>
          <TabsTrigger value="routing">Model Routing</TabsTrigger>
          <TabsTrigger value="appearance">Appearance</TabsTrigger>
        </TabsList>

        {/* ── AI Providers ── */}
        <TabsContent value="providers" className="mt-6 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-medium text-text-primary">AI Providers</h2>
              <p className="text-sm text-text-tertiary">
                Add your API keys to enable AI generation. Keys are encrypted and
                stored only on this device.
              </p>
            </div>
            <Button
              onClick={() => setAddOpen(true)}
              className="bg-white text-black hover:bg-white/90"
            >
              <Plus className="mr-2 h-4 w-4" />
              Add Provider
            </Button>
          </div>

          {providers.length === 0 ? (
            <div className="rounded-lg border border-dashed border-white/15 bg-surface p-8 text-center">
              <p className="text-sm font-medium text-text-primary">
                No providers configured
              </p>
              <p className="mt-1 text-sm text-text-tertiary">
                Add an AI provider to enable blueprint generation, story writing, and
                more.
              </p>
              <Button
                onClick={() => setAddOpen(true)}
                variant="outline"
                className="mt-4 border-white/15 bg-elevated text-text-primary"
              >
                <Plus className="mr-2 h-4 w-4" />
                Add your first provider
              </Button>
            </div>
          ) : (
            <div className="space-y-2">
              {providers.map((p) => {
                const catalog = PROVIDER_CATALOG.find((c) => c.id === p.provider);
                const isDefault = p.id === defaultProviderId;
                return (
                  <div
                    key={p.id}
                    className="flex items-center justify-between rounded-lg border border-white/10 bg-surface px-4 py-3"
                  >
                    <div className="flex items-center gap-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium text-text-primary">
                            {p.label}
                          </span>
                          {isDefault && (
                            <Badge className="bg-amber-500/15 text-amber-400 border-amber-500/20 text-xs">
                              Default
                            </Badge>
                          )}
                        </div>
                        <span className="text-xs text-text-tertiary">
                          {catalog?.name} · {p.model}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      {!isDefault && (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => setDefaultProvider(p.id)}
                          className="h-8 px-2 text-text-tertiary hover:text-text-primary"
                          title="Set as default"
                        >
                          <StarOff className="h-4 w-4" />
                        </Button>
                      )}
                      {isDefault && (
                        <Button
                          size="sm"
                          variant="ghost"
                          disabled
                          className="h-8 px-2 text-amber-400"
                          title="Default provider"
                        >
                          <Star className="h-4 w-4" />
                        </Button>
                      )}
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setDeleteId(p.id)}
                        className="h-8 px-2 text-text-tertiary hover:text-red-400"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </TabsContent>

        {/* ── Model Routing ── */}
        <TabsContent value="routing" className="mt-6 space-y-6">
          <div>
            <h2 className="font-medium text-text-primary">Model Routing</h2>
            <p className="text-sm text-text-tertiary">
              Assign specific providers to different AI tasks. Leave blank to use
              the default provider.
            </p>
          </div>

          {providers.length === 0 ? (
            <p className="text-sm text-text-tertiary">
              Add at least one provider to configure routing.
            </p>
          ) : (
            <div className="space-y-4">
              {(
                [
                  {
                    key: "blueprintGeneration" as const,
                    label: "Blueprint Generation",
                    description: "Used by the Director agent to synthesize blueprints from interviews.",
                  },
                  {
                    key: "storyGeneration" as const,
                    label: "Story & Scene Writing",
                    description: "Used by the Writer agent to generate story text and scene prose.",
                  },
                  {
                    key: "general" as const,
                    label: "General",
                    description: "Fallback for any task without a specific routing rule.",
                  },
                ] as const
              ).map((route) => (
                <div key={route.key} className="rounded-lg border border-white/10 bg-surface p-4 space-y-2">
                  <div>
                    <p className="text-sm font-medium text-text-primary">{route.label}</p>
                    <p className="text-xs text-text-tertiary">{route.description}</p>
                  </div>
                  <Select
                    value={modelRouting[route.key] ?? "__default__"}
                    onValueChange={(v) =>
                      setModelRouting({
                        [route.key]: v === "__default__" ? undefined : v,
                      })
                    }
                  >
                    <SelectTrigger className="bg-elevated border-white/10">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-surface border-white/10">
                      <SelectItem value="__default__">
                        Use default provider
                      </SelectItem>
                      {providers.map((p) => (
                        <SelectItem key={p.id} value={p.id}>
                          {p.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              ))}
            </div>
          )}
        </TabsContent>

        {/* ── Appearance ── */}
        <TabsContent value="appearance" className="mt-6 space-y-6">
          <div>
            <h2 className="font-medium text-text-primary">Appearance</h2>
            <p className="text-sm text-text-tertiary">
              Customize how Hooke looks.
            </p>
          </div>
          <div className="rounded-lg border border-white/10 bg-surface p-4 space-y-3">
            <div>
              <p className="text-sm font-medium text-text-primary">Theme</p>
              <p className="text-xs text-text-tertiary">
                Choose between dark, light, or system-matched theme.
              </p>
            </div>
            <div className="flex gap-2">
              {(["dark", "light", "system"] as const).map((t) => (
                <button
                  key={t}
                  onClick={() => setTheme(t)}
                  className={`rounded-md border px-4 py-2 text-sm capitalize transition-colors ${
                    theme === t
                      ? "border-white/40 bg-elevated text-text-primary"
                      : "border-white/10 text-text-tertiary hover:border-white/20 hover:text-text-secondary"
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>
            <p className="text-xs text-text-tertiary">
              Note: light and system themes apply the correct class — full light-mode
              styling will be added in a future update.
            </p>
          </div>
        </TabsContent>
      </Tabs>

      {/* Dialogs */}
      <AddProviderDialog open={addOpen} onClose={() => setAddOpen(false)} />

      <AlertDialog open={!!deleteId} onOpenChange={(v) => { if (!v) setDeleteId(null); }}>
        <AlertDialogContent className="bg-surface border-white/10 text-text-primary">
          <AlertDialogHeader>
            <AlertDialogTitle>Remove provider?</AlertDialogTitle>
            <AlertDialogDescription className="text-text-tertiary">
              The API key will be permanently deleted from this device. Any model
              routing rules using this provider will fall back to the default.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-white/10 bg-elevated text-text-primary">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (deleteId) removeProvider(deleteId);
                setDeleteId(null);
                toast.success("Provider removed.");
              }}
              className="bg-red-600 text-white hover:bg-red-700"
            >
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
