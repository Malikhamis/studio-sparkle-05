/**
 * Hooke Settings Store
 *
 * Manages user settings, AI provider configuration, and preferences.
 *
 * API keys are stored encrypted — the store never holds plain-text keys
 * in its serialized form. Simple XOR obfuscation is used for local storage
 * (keys never leave the device and are user-owned; this is not a security
 * boundary against a server attacker, it's protection against casual inspection).
 *
 * For a production-grade deployment with a server component, keys would be
 * stored using the Web Crypto API with a session-derived key.
 */

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { idbStorage } from '@/lib/idb-storage';
import { eventBus } from '@/lib/platform/event-bus';
import type { ProviderConfig, ProviderName } from '@/lib/ai-providers';

// ─── Types ─────────────────────────────────────────────────────────────────

export interface ProviderEntry {
  id: string;
  provider: ProviderName;
  label: string;
  model: string;
  /** Obfuscated key — do NOT use directly. Use getDecryptedKey(id). */
  _encryptedKey: string;
  temperature?: number;
  maxTokens?: number;
  baseUrl?: string;
  addedAt: number;
}

export interface ModelRouting {
  /** Provider ID to use for blueprint generation (Director agent) */
  blueprintGeneration?: string;
  /** Provider ID to use for story/scene writing (Writer agent) */
  storyGeneration?: string;
  /** Provider ID to use for general chat */
  general?: string;
}

export type AppTheme = 'dark' | 'light' | 'system';

interface SettingsState {
  /** All configured AI provider entries */
  providers: ProviderEntry[];
  /** ID of the default provider */
  defaultProviderId: string | null;
  /** Per-phase routing overrides */
  modelRouting: ModelRouting;
  /** UI theme */
  theme: AppTheme;
  /** Whether the user has completed onboarding */
  onboardingComplete: boolean;
  hydrated: boolean;

  // Actions
  addProvider: (input: {
    provider: ProviderName;
    label: string;
    model: string;
    apiKey: string;
    temperature?: number;
    maxTokens?: number;
    baseUrl?: string;
  }) => ProviderEntry;
  updateProvider: (
    id: string,
    patch: Partial<Omit<ProviderEntry, 'id' | '_encryptedKey' | 'addedAt'>> & { apiKey?: string }
  ) => void;
  removeProvider: (id: string) => void;
  setDefaultProvider: (id: string) => void;
  setModelRouting: (routing: Partial<ModelRouting>) => void;
  setTheme: (theme: AppTheme) => void;
  completeOnboarding: () => void;

  /** Get a resolved ProviderConfig for the given provider ID (decrypts key). */
  getProviderConfig: (id: string) => ProviderConfig | undefined;
  /** Get the active provider config for a given routing role. */
  getActiveConfig: (role?: keyof ModelRouting) => ProviderConfig | undefined;
}

// ─── Key Obfuscation ──────────────────────────────────────────────────────
// Simple obfuscation for local storage. Not cryptographic.

const OBFUSCATION_SEED = 'hooke-v2-local-key-store';

function obfuscate(text: string): string {
  const seed = OBFUSCATION_SEED;
  return btoa(
    text
      .split('')
      .map((c, i) => String.fromCharCode(c.charCodeAt(0) ^ seed.charCodeAt(i % seed.length)))
      .join('')
  );
}

function deobfuscate(encoded: string): string {
  const seed = OBFUSCATION_SEED;
  try {
    const decoded = atob(encoded);
    return decoded
      .split('')
      .map((c, i) => String.fromCharCode(c.charCodeAt(0) ^ seed.charCodeAt(i % seed.length)))
      .join('');
  } catch {
    return '';
  }
}

// ─── Store ─────────────────────────────────────────────────────────────────

const uid = () =>
  globalThis.crypto?.randomUUID?.() ??
  `sp_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set, get) => ({
      providers: [],
      defaultProviderId: null,
      modelRouting: {},
      theme: 'dark',
      onboardingComplete: false,
      hydrated: false,

      addProvider: ({ provider, label, model, apiKey, temperature, maxTokens, baseUrl }) => {
        const entry: ProviderEntry = {
          id: uid(),
          provider,
          label: label.trim() || `${provider} — ${model}`,
          model,
          _encryptedKey: obfuscate(apiKey),
          temperature,
          maxTokens,
          baseUrl,
          addedAt: Date.now(),
        };
        set((s) => ({
          providers: [...s.providers, entry],
          // Auto-set as default if it's the first provider
          defaultProviderId: s.defaultProviderId ?? entry.id,
        }));
        eventBus.emit('settings:provider:updated', {
          provider,
          action: 'added',
        });
        return entry;
      },

      updateProvider: (id, patch) => {
        set((s) => ({
          providers: s.providers.map((p) => {
            if (p.id !== id) return p;
            const { apiKey, ...rest } = patch;
            return {
              ...p,
              ...rest,
              ...(apiKey !== undefined ? { _encryptedKey: obfuscate(apiKey) } : {}),
            };
          }),
        }));
        const p = get().providers.find((x) => x.id === id);
        if (p) {
          eventBus.emit('settings:provider:updated', {
            provider: p.provider,
            action: 'updated',
          });
        }
      },

      removeProvider: (id) => {
        const p = get().providers.find((x) => x.id === id);
        set((s) => ({
          providers: s.providers.filter((x) => x.id !== id),
          defaultProviderId: s.defaultProviderId === id
            ? s.providers.find((x) => x.id !== id)?.id ?? null
            : s.defaultProviderId,
        }));
        if (p) {
          eventBus.emit('settings:provider:updated', {
            provider: p.provider,
            action: 'removed',
          });
        }
      },

      setDefaultProvider: (id) => {
        set({ defaultProviderId: id });
        const p = get().providers.find((x) => x.id === id);
        if (p) {
          eventBus.emit('settings:provider:updated', {
            provider: p.provider,
            action: 'set-default',
          });
        }
      },

      setModelRouting: (routing) => {
        set((s) => ({ modelRouting: { ...s.modelRouting, ...routing } }));
      },

      setTheme: (theme) => set({ theme }),
      completeOnboarding: () => set({ onboardingComplete: true }),

      getProviderConfig: (id): ProviderConfig | undefined => {
        const entry = get().providers.find((p) => p.id === id);
        if (!entry) return undefined;
        return {
          provider: entry.provider,
          apiKey: deobfuscate(entry._encryptedKey),
          model: entry.model,
          temperature: entry.temperature,
          maxTokens: entry.maxTokens,
          baseUrl: entry.baseUrl,
        };
      },

      getActiveConfig: (role): ProviderConfig | undefined => {
        const { modelRouting, defaultProviderId } = get();
        const routedId = role ? modelRouting[role] : undefined;
        const id = routedId ?? defaultProviderId;
        if (!id) return undefined;
        return get().getProviderConfig(id);
      },
    }),
    {
      name: 'hooke:settings',
      storage: createJSONStorage(() => idbStorage),
      partialize: (s) => ({
        providers: s.providers,
        defaultProviderId: s.defaultProviderId,
        modelRouting: s.modelRouting,
        theme: s.theme,
        onboardingComplete: s.onboardingComplete,
      }),
      onRehydrateStorage: () => (state) => {
        if (state) state.hydrated = true;
      },
    }
  )
);
