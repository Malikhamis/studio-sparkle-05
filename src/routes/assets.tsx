import { createFileRoute } from "@tanstack/react-router";
import { Library } from "lucide-react";
import { ModulePlaceholder } from "@/components/module-placeholder";

export const Route = createFileRoute("/assets")({
  head: () => ({
    meta: [
      { title: "Asset Library — Hooke" },
      { name: "description", content: "Upload, organize, and preview footage, stills, audio, and reference material." },
      { property: "og:title", content: "Asset Library — Hooke" },
      { property: "og:description", content: "Upload, organize, and preview footage, stills, audio, and reference material." },
    ],
  }),
  component: () => (
    <ModulePlaceholder
      icon={Library}
      title="Asset Library"
      description="Drag & drop uploads, folders, metadata, search, filters, and rich previews — stored locally in IndexedDB."
      phase="Phase 2"
    />
  ),
});
