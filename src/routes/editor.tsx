import { createFileRoute } from "@tanstack/react-router";
import { Scissors } from "lucide-react";
import { ModulePlaceholder } from "@/components/module-placeholder";

export const Route = createFileRoute("/editor")({
  head: () => ({
    meta: [
      { title: "Editor Engine — Hooke" },
      { name: "description", content: "Multi-track timeline editor with clips, trims, transitions, captions, and export." },
      { property: "og:title", content: "Editor Engine — Hooke" },
      { property: "og:description", content: "Multi-track timeline editor with clips, trims, transitions, captions, and export." },
    ],
  }),
  component: () => (
    <ModulePlaceholder
      icon={Scissors}
      title="Editor Engine"
      description="Real timeline interface: clips, trim, reorder, transitions, captions, and export settings."
      phase="Phase 4"
    />
  ),
});
