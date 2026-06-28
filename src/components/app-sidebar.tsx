import { Link, useRouterState } from "@tanstack/react-router";
import { NAV_SECTIONS } from "@/lib/nav";
import { useUIStore } from "@/store/ui-store";

export function AppSidebar() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const closeMobileNav = useUIStore((s) => s.closeMobileNav);

  const isActive = (to: string) =>
    to === "/" ? pathname === "/" : pathname === to || pathname.startsWith(to + "/");

  return (
    <aside className="hk-panel flex h-full w-[220px] flex-col overflow-hidden">
      {/* Logo */}
      <div className="flex h-14 shrink-0 items-center gap-2.5 border-b border-white/[0.06] px-[18px]">
        <div className="flex h-[30px] w-[30px] items-center justify-center rounded-lg text-[14px] font-bold text-white hk-text-display"
             style={{ background: "var(--gradient-brand)" }}>
          H
        </div>
        <span className="hk-text-display text-[17px] font-bold text-text-primary">Hooke</span>
        <span className="ml-auto rounded border border-mint/25 bg-mint/10 px-1.5 py-[2px] text-[9px] font-medium uppercase tracking-[0.8px] text-mint">
          Local
        </span>
      </div>

      {/* Nav */}
      <nav className="hk-scrollbar flex-1 overflow-y-auto pb-2">
        {NAV_SECTIONS.map((section) => (
          <div key={section.label}>
            <div className="px-3 pt-4 pb-1 text-[10px] font-semibold uppercase tracking-[0.9px] text-text-dim">
              {section.label}
            </div>
            {section.items.map((item) => {
              const active = isActive(item.to);
              const Icon = item.icon;
              return (
                <Link
                  key={item.to}
                  to={item.to}
                  className={`mx-1.5 my-px flex cursor-pointer items-center gap-2.5 rounded-md px-3 py-2 text-[13.5px] font-normal transition-colors ${
                    active
                      ? "bg-iris/15 font-medium text-iris"
                      : "text-text-secondary hover:bg-surface hover:text-text-primary"
                  }`}
                >
                  <Icon className={`h-[18px] w-[18px] shrink-0 ${active ? "opacity-100" : "opacity-70"}`} />
                  <span className="truncate">{item.label}</span>
                  {item.badge !== undefined && (
                    <span className="ml-auto min-w-[18px] rounded-full bg-iris px-1.5 py-px text-center text-[10px] font-semibold text-white">
                      {item.badge}
                    </span>
                  )}
                </Link>
              );
            })}
          </div>
        ))}
      </nav>

      {/* Status */}
      <div className="m-1.5 rounded-[10px] border border-white/[0.06] bg-surface p-3">
        <StatusRow color="green" label="Ollama" value="qwen2.5:7b" />
        <StatusRow color="green" label="ComfyUI" value=":8188" />
        <StatusRow color="yellow" label="GPU" value="68%" />
      </div>
    </aside>
  );
}

function StatusRow({
  color,
  label,
  value,
}: {
  color: "green" | "yellow" | "red";
  label: string;
  value: string;
}) {
  const dot =
    color === "green"
      ? "bg-mint shadow-[0_0_6px_var(--accent-mint)]"
      : color === "yellow"
        ? "bg-gold"
        : "bg-[#FF5370]";
  return (
    <div className="mb-1 flex items-center gap-2 text-[12px] text-text-secondary last:mb-0">
      <span className={`h-[7px] w-[7px] shrink-0 rounded-full ${dot}`} />
      <span className="flex-1">{label}</span>
      <span className="text-[11px] font-medium text-text-primary">{value}</span>
    </div>
  );
}
