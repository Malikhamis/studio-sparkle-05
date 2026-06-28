import type { LucideIcon } from "lucide-react";

export function ModulePlaceholder({
  icon: Icon,
  title,
  description,
  phase,
}: {
  icon: LucideIcon;
  title: string;
  description: string;
  phase: string;
}) {
  return (
    <div className="mx-auto flex w-full max-w-[1480px] flex-col gap-5">
      <div
        className="overflow-hidden rounded-[20px] border p-10"
        style={{
          background: "linear-gradient(135deg, var(--bg-surface) 0%, var(--bg-elevated) 100%)",
          borderColor: "rgba(255,255,255,0.08)",
        }}
      >
        <div className="flex items-start gap-5">
          <div
            className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl"
            style={{ background: "var(--gradient-iris)" }}
          >
            <Icon className="h-7 w-7 text-white" />
          </div>
          <div className="flex-1">
            <div className="mb-1.5 inline-flex items-center gap-2 rounded-full border border-iris/30 bg-iris/10 px-2.5 py-0.5 text-[10.5px] font-medium uppercase tracking-wider text-iris">
              {phase}
            </div>
            <h1 className="hk-text-display text-[26px] font-bold text-text-primary">{title}</h1>
            <p className="mt-2 max-w-2xl text-[14px] leading-relaxed text-text-secondary">
              {description}
            </p>
          </div>
        </div>
      </div>

      <div className="hk-card p-10">
        <div className="text-center">
          <div className="hk-text-display text-[15px] font-semibold text-text-primary">
            Module under construction
          </div>
          <p className="mx-auto mt-2 max-w-md text-[13px] text-text-secondary">
            Routing, layout, and design tokens are wired. The functional surface for this module is
            scheduled in {phase}.
          </p>
        </div>
      </div>
    </div>
  );
}
