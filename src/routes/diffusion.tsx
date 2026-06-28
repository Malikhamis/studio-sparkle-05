import { createFileRoute } from "@tanstack/react-router";
import { Sparkles } from "lucide-react";
import { ModulePlaceholder } from "@/components/module-placeholder";

export const Route = createFileRoute("/diffusion")({
  head: () => ({
    meta: [
      { title: "Diffusion Layer — Hooke" },
      { name: "description", content: "Workflow editor, generation queue, and history for diffusion-based rendering." },
      { property: "og:title", content: "Diffusion Layer — Hooke" },
      { property: "og:description", content: "Workflow editor, generation queue, and history for diffusion-based rendering." },
    ],
  }),
  component: () => (
    <ModulePlaceholder
      icon={Sparkles}
      title="Diffusion Layer"
      description="Workflow editor, generation queue, and history. Optional adapters for ComfyUI, Automatic1111, and Forge."
      phase="Phase 4"
    />
  ),
});
