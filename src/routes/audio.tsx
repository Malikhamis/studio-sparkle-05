import { createFileRoute } from "@tanstack/react-router";
import { Mic } from "lucide-react";
import { ModulePlaceholder } from "@/components/module-placeholder";

export const Route = createFileRoute("/audio")({
  head: () => ({
    meta: [
      { title: "Audio Synth — Hooke" },
      { name: "description", content: "Script editor, voice selection, waveform timeline, and playback for narration and dialogue." },
      { property: "og:title", content: "Audio Synth — Hooke" },
      { property: "og:description", content: "Script editor, voice selection, waveform timeline, and playback for narration and dialogue." },
    ],
  }),
  component: () => (
    <ModulePlaceholder
      icon={Mic}
      title="Audio Synth"
      description="Script editor, voice selection, timeline, waveform, and playback. Optional adapters for Piper, Kokoro, and XTTS."
      phase="Phase 4"
    />
  ),
});
