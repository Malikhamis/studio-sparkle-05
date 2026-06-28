import { useRouterState } from "@tanstack/react-router";
import { Bell, Search, Command, Menu } from "lucide-react";
import { findNavItem } from "@/lib/nav";
import { useUIStore } from "@/store/ui-store";

export function AppTopbar() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const item = findNavItem(pathname);
  const title = item?.label ?? "Hooke";
  const toggleMobileNav = useUIStore((s) => s.toggleMobileNav);

  return (
    <header className="hk-panel flex h-14 items-center gap-3 border-b border-white/[0.06] px-4 md:px-6">
      <button
        onClick={toggleMobileNav}
        aria-label="Open navigation"
        className="flex h-9 w-9 items-center justify-center rounded-md border border-white/10 text-text-secondary transition-colors hover:bg-surface hover:text-text-primary md:hidden"
      >
        <Menu className="h-4 w-4" />
      </button>

      <h1 className="hk-text-display truncate text-[15px] font-semibold text-text-primary">
        {title}
      </h1>
      <div className="hidden items-center gap-1.5 text-[12.5px] text-text-dim sm:flex">
        <span className="text-text-dim">/</span>
        <span className="text-text-secondary">Workspace</span>
      </div>

      <div className="ml-auto flex items-center gap-2.5">
        <button className="hidden items-center gap-1.5 rounded-full border border-white/10 bg-surface px-3 py-[5px] text-[12px] text-text-secondary transition-colors hover:border-iris hover:text-text-primary sm:flex">
          <span className="h-1.5 w-1.5 rounded-full bg-mint shadow-[0_0_6px_var(--accent-mint)]" />
          qwen2.5:7b
        </button>
        <IconBtn>
          <Search className="h-4 w-4" />
        </IconBtn>
        <IconBtn className="hidden sm:flex">
          <Command className="h-4 w-4" />
        </IconBtn>
        <IconBtn>
          <Bell className="h-4 w-4" />
        </IconBtn>
      </div>
    </header>
  );
}

function IconBtn({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <button
      className={`flex h-[34px] w-[34px] items-center justify-center rounded-md border border-white/10 bg-transparent text-text-secondary transition-colors hover:border-white/20 hover:bg-surface hover:text-text-primary ${className}`}
    >
      {children}
    </button>
  );
}
