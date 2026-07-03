import { createFileRoute } from "@tanstack/react-router";
import { Rocket } from "lucide-react";
import { ModulePlaceholder } from "@/components/module-placeholder";

export const Route = createFileRoute("/publish")({
  head: () => ({
    meta: [
      { title: "Publish Gate — Hooke" },
      { name: "description", content: "OAuth configuration, upload queue, scheduling, approvals, and export-only mode." },
      { property: "og:title", content: "Publish Gate — Hooke" },
      { property: "og:description", content: "OAuth configuration, upload queue, scheduling, approvals, and export-only mode." },
    ],
  }),
  component: () => (
    <ModulePlaceholder
      icon={Rocket}
      title="Publish Gate"
      description="OAuth configuration, upload queue, scheduled publishing, approval gate, and export-only mode. Optional YouTube, TikTok, and Instagram adapters."
      phase="Phase 5"
    />
  ),
});
