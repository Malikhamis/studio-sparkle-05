import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { idbStorage } from "@/lib/idb-storage";

export type AssetKind = "image" | "video" | "audio" | "document" | "other";

export type Asset = {
  id: string;
  name: string;
  kind: AssetKind;
  mime: string;
  size: number;
  folder: string;
  tags: string[];
  /** Data URL for previews. Kept inline for simplicity in v1; replace with
   * a blob-store reference once we cross the ~5 MB / asset threshold. */
  dataUrl?: string;
  createdAt: number;
};

const uid = () =>
  globalThis.crypto?.randomUUID?.() ?? `a_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;

export function kindFromMime(mime: string): AssetKind {
  if (mime.startsWith("image/")) return "image";
  if (mime.startsWith("video/")) return "video";
  if (mime.startsWith("audio/")) return "audio";
  if (mime === "application/pdf" || mime.startsWith("text/")) return "document";
  return "other";
}

const readAsDataUrl = (file: File) =>
  new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });

type AssetState = {
  assets: Asset[];
  folders: string[];
  activeFolder: string;
  query: string;
  kindFilter: AssetKind | "all";
  hydrated: boolean;

  setActiveFolder: (f: string) => void;
  setQuery: (q: string) => void;
  setKindFilter: (k: AssetKind | "all") => void;

  createFolder: (name: string) => void;
  deleteFolder: (name: string) => void;

  addFiles: (files: File[], folder?: string) => Promise<Asset[]>;
  renameAsset: (id: string, name: string) => void;
  moveAsset: (id: string, folder: string) => void;
  deleteAsset: (id: string) => void;
};

export const useAssetStore = create<AssetState>()(
  persist(
    (set, get) => ({
      assets: [],
      folders: ["Inbox", "Reference", "Footage", "Audio"],
      activeFolder: "Inbox",
      query: "",
      kindFilter: "all",
      hydrated: false,

      setActiveFolder: (f) => set({ activeFolder: f }),
      setQuery: (q) => set({ query: q }),
      setKindFilter: (k) => set({ kindFilter: k }),

      createFolder: (name) => {
        const trimmed = name.trim();
        if (!trimmed) return;
        if (get().folders.includes(trimmed)) return;
        set({ folders: [...get().folders, trimmed] });
      },

      deleteFolder: (name) => {
        if (name === "Inbox") return;
        set({
          folders: get().folders.filter((f) => f !== name),
          assets: get().assets.map((a) =>
            a.folder === name ? { ...a, folder: "Inbox" } : a,
          ),
          activeFolder: get().activeFolder === name ? "Inbox" : get().activeFolder,
        });
      },

      addFiles: async (files, folder) => {
        const target = folder ?? get().activeFolder;
        const created: Asset[] = [];
        for (const file of files) {
          const mime = file.type || "application/octet-stream";
          const kind = kindFromMime(mime);
          // Only inline previews for small images. Otherwise keep metadata.
          let dataUrl: string | undefined;
          if (kind === "image" && file.size < 2 * 1024 * 1024) {
            try {
              dataUrl = await readAsDataUrl(file);
            } catch {
              /* ignore preview failures */
            }
          }
          created.push({
            id: uid(),
            name: file.name,
            kind,
            mime,
            size: file.size,
            folder: target,
            tags: [],
            dataUrl,
            createdAt: Date.now(),
          });
        }
        set({ assets: [...created, ...get().assets] });
        return created;
      },

      renameAsset: (id, name) =>
        set({
          assets: get().assets.map((a) => (a.id === id ? { ...a, name } : a)),
        }),

      moveAsset: (id, folder) =>
        set({
          assets: get().assets.map((a) => (a.id === id ? { ...a, folder } : a)),
        }),

      deleteAsset: (id) =>
        set({ assets: get().assets.filter((a) => a.id !== id) }),
    }),
    {
      name: "hooke:assets",
      storage: createJSONStorage(() => idbStorage),
      partialize: (s) => ({
        assets: s.assets,
        folders: s.folders,
        activeFolder: s.activeFolder,
      }),
      onRehydrateStorage: () => (state) => {
        if (state) state.hydrated = true;
      },
    },
  ),
);

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}
