import { createFileRoute } from "@tanstack/react-router";
import { BarChart3 } from "lucide-react";

export const Route = createFileRoute("/analytics")({
  head: () => ({
    meta: [{ title: "Analytics — Hooke" }],
  }),
  component: AnalyticsPage,
});

/**
 * Analytics — not yet implemented.
 *
 * This route exists so deep links don't 404. The sidebar does not link here
 * until a real analytics implementation exists. Per the No Placeholder Policy,
 * no fake data, fake charts, or simulated metrics are shown.
 */
function AnalyticsPage() {
  return (
    <div className="flex h-full min-h-[60vh] flex-col items-center justify-center gap-4 text-center">
      <div className="rounded-full border border-white/10 bg-surface p-4">
        <BarChart3 className="h-8 w-8 text-text-tertiary" />
      </div>
      <div>
        <h2 className="text-base font-semibold text-text-primary">
          Analytics — not yet available
        </h2>
        <p className="mt-1 max-w-sm text-sm text-text-tertiary">
          Real analytics require completed productions. Finish a project and
          publish it — analytics will appear here once there is real data to show.
        </p>
      </div>
    </div>
  );
}
