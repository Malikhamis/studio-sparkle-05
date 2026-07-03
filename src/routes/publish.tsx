import { createFileRoute } from "@tanstack/react-router";
import { Send } from "lucide-react";

export const Route = createFileRoute("/publish")({
  head: () => ({
    meta: [{ title: "Publish — Hooke" }],
  }),
  component: PublishPage,
});

/**
 * Publish — not yet implemented.
 *
 * This route exists so deep links don't 404. The sidebar does not link here
 * until a real publish implementation exists. Per the No Placeholder Policy,
 * no fake publishing flows, fake platform connections, or simulated job queues
 * are shown.
 */
function PublishPage() {
  return (
    <div className="flex h-full min-h-[60vh] flex-col items-center justify-center gap-4 text-center">
      <div className="rounded-full border border-white/10 bg-surface p-4">
        <Send className="h-8 w-8 text-text-tertiary" />
      </div>
      <div>
        <h2 className="text-base font-semibold text-text-primary">
          Publishing — not yet available
        </h2>
        <p className="mt-1 max-w-sm text-sm text-text-tertiary">
          Publishing requires a completed render. Complete your production
          workflow and render your project — publishing will be available here
          once you have a finished export ready to distribute.
        </p>
      </div>
    </div>
  );
}
