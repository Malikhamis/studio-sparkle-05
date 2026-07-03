import { createFileRoute } from "@tanstack/react-router";
import { BarChart3 } from "lucide-react";
import { ModulePlaceholder } from "@/components/module-placeholder";

export const Route = createFileRoute("/analytics")({
  head: () => ({
    meta: [
      { title: "Analytics — Hooke" },
      { name: "description", content: "Production metrics, publishing history, and render statistics from your local database." },
      { property: "og:title", content: "Analytics — Hooke" },
      { property: "og:description", content: "Production metrics, publishing history, and render statistics from your local database." },
    ],
  }),
  component: () => (
    <ModulePlaceholder
      icon={BarChart3}
      title="Analytics"
      description="Charts for production metrics, publishing history, and render statistics — backed by a local-first database."
      phase="Phase 5"
    />
  ),
});
