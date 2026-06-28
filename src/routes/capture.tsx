import { createFileRoute } from "@tanstack/react-router";
import { Video } from "lucide-react";
import { ModulePlaceholder } from "@/components/module-placeholder";

export const Route = createFileRoute("/capture")({
  head: () => ({
    meta: [
      { title: "Capture Stream — Hooke" },
      { name: "description", content: "Live webcam and microphone capture with snapshots and a recording timeline." },
      { property: "og:title", content: "Capture Stream — Hooke" },
      { property: "og:description", content: "Live webcam and microphone capture with snapshots and a recording timeline." },
    ],
  }),
  component: () => (
    <ModulePlaceholder
      icon={Video}
      title="Capture Stream"
      description="Webcam preview, microphone selection, recording, snapshots, and timeline — built on browser MediaStream APIs."
      phase="Phase 4"
    />
  ),
});
