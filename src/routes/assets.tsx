import { useMemo, useRef, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import {
  FileAudio,
  FileText,
  FileVideo,
  Folder,
  FolderPlus,
  Image as ImageIcon,
  Plus,
  Search,
  Trash2,
  Upload,
  X,
} from "lucide-react";
import {
  useAssetStore,
  formatBytes,
  type Asset,
  type AssetKind,
} from "@/store/asset-store";

export const Route = createFileRoute("/assets")({
  head: () => ({
    meta: [
      { title: "Asset Library — Hooke" },
      {
        name: "description",
        content: "Upload, organize, and preview footage, stills, audio, and reference material.",
      },
      { property: "og:title", content: "Asset Library — Hooke" },
      {
        property: "og:description",
        content: "Upload, organize, and preview footage, stills, audio, and reference material.",
      },
    ],
  }),
  component: AssetsPage,
});

function AssetsPage() {
  const assets = useAssetStore((s) => s.assets);
  const folders = useAssetStore((s) => s.folders);
  const activeFolder = useAssetStore((s) => s.activeFolder);
  const query = useAssetStore((s) => s.query);
  const kindFilter = useAssetStore((s) => s.kindFilter);
  const setActiveFolder = useAssetStore((s) => s.setActiveFolder);
  const setQuery = useAssetStore((s) => s.setQuery);
  const setKindFilter = useAssetStore((s) => s.setKindFilter);
  const addFiles = useAssetStore((s) => s.addFiles);
  const createFolder = useAssetStore((s) => s.createFolder);
  const deleteFolder = useAssetStore((s) => s.deleteFolder);
  const deleteAsset = useAssetStore((s) => s.deleteAsset);

  const inputRef = useRef<HTMLInputElement | null>(null);
  const [dragOver, setDragOver] = useState(false);

  const counts = useMemo(() => {
    const map = new Map<string, number>();
    for (const a of assets) map.set(a.folder, (map.get(a.folder) ?? 0) + 1);
    return map;
  }, [assets]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return assets.filter((a) => {
      if (a.folder !== activeFolder) return false;
      if (kindFilter !== "all" && a.kind !== kindFilter) return false;
      if (q && !a.name.toLowerCase().includes(q) && !a.tags.some((t) => t.toLowerCase().includes(q)))
        return false;
      return true;
    });
  }, [assets, activeFolder, kindFilter, query]);

  const handleFiles = async (files: FileList | File[] | null) => {
    if (!files) return;
    const list = Array.from(files);
    if (list.length === 0) return;
    await addFiles(list);
  };

  const onNewFolder = () => {
    const name = prompt("Folder name");
    if (name) createFolder(name);
  };

  return (
    <div className="mx-auto flex w-full max-w-[1480px] flex-col gap-5">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div>
          <h1 className="hk-text-display text-[22px] font-bold text-text-primary">
            Asset Library
          </h1>
          <p className="mt-0.5 text-[12.5px] text-text-secondary">
            {assets.length} items across {folders.length} folders
          </p>
        </div>
        <div className="flex flex-1 flex-wrap items-center gap-2 sm:justify-end">
          <div className="relative min-w-0 flex-1 sm:max-w-xs">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-text-dim" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search this folder…"
              className="h-9 w-full rounded-md border border-white/10 bg-surface pl-9 pr-3 text-[13px] text-text-primary placeholder:text-text-dim focus:border-iris focus:outline-none"
            />
          </div>
          <select
            value={kindFilter}
            onChange={(e) => setKindFilter(e.target.value as AssetKind | "all")}
            className="h-9 rounded-md border border-white/10 bg-surface px-2 text-[12.5px] text-text-primary focus:border-iris focus:outline-none"
          >
            <option value="all">All kinds</option>
            <option value="image">Images</option>
            <option value="video">Video</option>
            <option value="audio">Audio</option>
            <option value="document">Documents</option>
            <option value="other">Other</option>
          </select>
          <button
            onClick={() => inputRef.current?.click()}
            className="inline-flex h-9 items-center gap-1.5 rounded-md px-3 text-[13px] font-semibold text-white"
            style={{ background: "var(--gradient-iris)" }}
          >
            <Upload className="h-3.5 w-3.5" />
            Upload
          </button>
          <input
            ref={inputRef}
            type="file"
            multiple
            hidden
            onChange={(e) => handleFiles(e.target.files)}
          />
        </div>
      </header>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-[220px_1fr]">
        {/* Folders sidebar */}
        <aside className="hk-card flex max-h-[60vh] flex-col overflow-hidden md:max-h-none">
          <div className="flex items-center justify-between border-b border-white/[0.06] px-3 py-2.5">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-text-dim">
              Folders
            </span>
            <button
              onClick={onNewFolder}
              className="flex h-6 w-6 items-center justify-center rounded text-text-secondary hover:bg-elevated hover:text-text-primary"
              aria-label="New folder"
            >
              <FolderPlus className="h-3.5 w-3.5" />
            </button>
          </div>
          <div className="hk-scrollbar flex-1 overflow-y-auto p-1.5">
            {folders.map((f) => {
              const active = f === activeFolder;
              return (
                <div
                  key={f}
                  className={`group flex items-center gap-2 rounded-md px-2.5 py-1.5 text-[13px] ${
                    active
                      ? "bg-iris/15 text-iris"
                      : "text-text-secondary hover:bg-surface hover:text-text-primary"
                  }`}
                >
                  <button
                    onClick={() => setActiveFolder(f)}
                    className="flex flex-1 items-center gap-2 truncate text-left"
                  >
                    <Folder className="h-3.5 w-3.5 shrink-0" />
                    <span className="truncate">{f}</span>
                    <span className="ml-auto text-[10.5px] text-text-dim">
                      {counts.get(f) ?? 0}
                    </span>
                  </button>
                  {f !== "Inbox" && (
                    <button
                      onClick={() => {
                        if (confirm(`Delete folder "${f}"? Assets move to Inbox.`)) {
                          deleteFolder(f);
                        }
                      }}
                      className="hidden h-5 w-5 items-center justify-center rounded text-text-dim opacity-0 transition-opacity hover:text-[#FF5370] group-hover:flex group-hover:opacity-100"
                      aria-label={`Delete folder ${f}`}
                    >
                      <X className="h-3 w-3" />
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </aside>

        {/* Grid */}
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragOver(false);
            handleFiles(e.dataTransfer.files);
          }}
          className={`hk-card relative min-h-[300px] p-4 transition-colors ${
            dragOver ? "border-iris/60 bg-iris/5" : ""
          }`}
        >
          {filtered.length === 0 ? (
            <AssetsEmpty onUpload={() => inputRef.current?.click()} />
          ) : (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
              {filtered.map((a) => (
                <AssetTile key={a.id} asset={a} onDelete={() => deleteAsset(a.id)} />
              ))}
            </div>
          )}
          {dragOver && (
            <div className="pointer-events-none absolute inset-0 flex items-center justify-center rounded-[14px] border-2 border-dashed border-iris/60 bg-iris/10">
              <div className="hk-text-display text-[15px] font-semibold text-iris">
                Drop to upload to {activeFolder}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ---------- Tile ---------- */
function AssetTile({ asset, onDelete }: { asset: Asset; onDelete: () => void }) {
  return (
    <div className="hk-card hk-card-hover group relative overflow-hidden">
      <div
        className="relative flex aspect-square items-center justify-center overflow-hidden"
        style={{
          background:
            "linear-gradient(135deg, var(--bg-elevated) 0%, var(--bg-panel) 100%)",
        }}
      >
        {asset.dataUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={asset.dataUrl} alt={asset.name} className="h-full w-full object-cover" />
        ) : (
          <KindIcon kind={asset.kind} />
        )}
        <button
          onClick={() => {
            if (confirm(`Delete "${asset.name}"?`)) onDelete();
          }}
          className="absolute right-1.5 top-1.5 flex h-7 w-7 items-center justify-center rounded-md bg-black/50 text-text-secondary opacity-0 backdrop-blur transition-opacity hover:text-[#FF5370] group-hover:opacity-100"
          aria-label="Delete asset"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </div>
      <div className="p-2.5">
        <div className="truncate text-[12px] font-medium text-text-primary">{asset.name}</div>
        <div className="mt-0.5 flex items-center justify-between text-[10.5px] text-text-dim">
          <span className="uppercase tracking-wider">{asset.kind}</span>
          <span>{formatBytes(asset.size)}</span>
        </div>
      </div>
    </div>
  );
}

function KindIcon({ kind }: { kind: AssetKind }) {
  const cls = "h-8 w-8 text-text-dim/70";
  if (kind === "image") return <ImageIcon className={cls} />;
  if (kind === "video") return <FileVideo className={cls} />;
  if (kind === "audio") return <FileAudio className={cls} />;
  return <FileText className={cls} />;
}

/* ---------- Empty ---------- */
function AssetsEmpty({ onUpload }: { onUpload: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 px-6 py-12 text-center">
      <div
        className="flex h-12 w-12 items-center justify-center rounded-2xl"
        style={{ background: "var(--gradient-iris)" }}
      >
        <Upload className="h-6 w-6 text-white" />
      </div>
      <div>
        <h3 className="hk-text-display text-[15px] font-semibold text-text-primary">
          This folder is empty
        </h3>
        <p className="mt-1 text-[12.5px] text-text-secondary">
          Drag files anywhere on this panel, or click Upload to add assets.
        </p>
      </div>
      <button
        onClick={onUpload}
        className="mt-1 inline-flex h-9 items-center gap-1.5 rounded-md px-3 text-[13px] font-semibold text-white"
        style={{ background: "var(--gradient-iris)" }}
      >
        <Plus className="h-3.5 w-3.5" />
        Upload files
      </button>
    </div>
  );
}
