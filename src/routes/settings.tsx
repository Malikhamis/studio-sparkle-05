import { createFileRoute } from "@tanstack/react-router";
import { Settings } from "lucide-react";
import { ModulePlaceholder } from "@/components/module-placeholder";

export const Route = createFileRoute("/settings")({
  head: () => ({
    meta: [
      { title: "Settings — Hooke" },
      { name: "description", content: "Appearance, workspace, model paths, hardware, API keys, and plugin management." },
      { property: "og:title", content: "Settings — Hooke" },
      { property: "og:description", content: "Appearance, workspace, model paths, hardware, API keys, and plugin management." },
    ],
  }),
  component: () => (
    <ModulePlaceholder
      icon={Settings}
      title="Settings"
      description="Appearance, workspace, model paths, hardware, API keys, and plugin management."
      phase="Phase 5"
    />
  ),
});
