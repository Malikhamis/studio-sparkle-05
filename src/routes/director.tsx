import { createFileRoute } from "@tanstack/react-router";
import { Clapperboard } from "lucide-react";
import { ModulePlaceholder } from "@/components/module-placeholder";

export const Route = createFileRoute("/director")({
  head: () => ({
    meta: [
      { title: "miDirector — Hooke" },
      { name: "description", content: "Conversational AI director that turns intent into a shootable blueprint." },
      { property: "og:title", content: "miDirector — Hooke" },
      { property: "og:description", content: "Conversational AI director that turns intent into a shootable blueprint." },
    ],
  }),
  component: () => (
    <ModulePlaceholder
      icon={Clapperboard}
      title="miDirector"
      description="Interview workflow, strategy presets, conversation history, blueprint generation, editable scene list, prompt templates, and JSON export."
      phase="Phase 3"
    />
  ),
});
