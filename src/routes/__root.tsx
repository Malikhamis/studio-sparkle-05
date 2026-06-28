import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";
import { useEffect, type ReactNode } from "react";

import "@fontsource/inter/300.css";
import "@fontsource/inter/400.css";
import "@fontsource/inter/500.css";
import "@fontsource/inter/600.css";
import "@fontsource/inter/700.css";
import "@fontsource/space-grotesk/400.css";
import "@fontsource/space-grotesk/500.css";
import "@fontsource/space-grotesk/600.css";
import "@fontsource/space-grotesk/700.css";
import "@fontsource/jetbrains-mono/400.css";
import "@fontsource/jetbrains-mono/500.css";

import appCss from "../styles.css?url";
import { reportLovableError } from "../lib/lovable-error-reporting";
import { AppSidebar } from "@/components/app-sidebar";
import { AppTopbar } from "@/components/app-topbar";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-void px-4">
      <div className="max-w-md text-center">
        <h1 className="hk-text-display text-7xl font-bold text-text-primary">404</h1>
        <h2 className="mt-4 text-xl font-semibold text-text-primary">Scene not found</h2>
        <p className="mt-2 text-sm text-text-secondary">
          That route isn't on the call sheet. Head back to the dashboard.
        </p>
        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-md px-4 py-2 text-sm font-medium text-white transition-opacity hover:opacity-90"
            style={{ background: "var(--gradient-brand)" }}
          >
            Go to Dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  console.error(error);
  const router = useRouter();
  useEffect(() => {
    reportLovableError(error, { boundary: "tanstack_root_error_component" });
  }, [error]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-void px-4">
      <div className="max-w-md text-center">
        <h1 className="hk-text-display text-xl font-semibold text-text-primary">
          This page didn't load
        </h1>
        <p className="mt-2 text-sm text-text-secondary">
          Something went wrong. Try again or head back home.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <button
            onClick={() => {
              router.invalidate();
              reset();
            }}
            className="inline-flex items-center justify-center rounded-md px-4 py-2 text-sm font-medium text-white transition-opacity hover:opacity-90"
            style={{ background: "var(--gradient-brand)" }}
          >
            Try again
          </button>
          <a
            href="/"
            className="inline-flex items-center justify-center rounded-md border border-white/15 bg-surface px-4 py-2 text-sm font-medium text-text-primary transition-colors hover:bg-elevated"
          >
            Go home
          </a>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "Hooke — Autonomous AI Video Director" },
      {
        name: "description",
        content:
          "Hooke is a local-first creative production suite for AI-directed video — capture, diffusion, audio, editing, and publishing in one workspace.",
      },
      { property: "og:title", content: "Hooke — Autonomous AI Video Director" },
      {
        property: "og:description",
        content:
          "Local-first creative production suite for AI-directed video.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
    links: [{ rel: "stylesheet", href: appCss }],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();

  return (
    <QueryClientProvider client={queryClient}>
      <div className="grid h-screen w-screen grid-cols-[220px_1fr] grid-rows-[56px_1fr] overflow-hidden bg-void">
        <div className="row-span-2">
          <AppSidebar />
        </div>
        <AppTopbar />
        <main className="hk-scrollbar overflow-y-auto overflow-x-hidden bg-void p-6">
          {/* Required: nested routes render here. Removing <Outlet /> breaks all child routes. */}
          <Outlet />
        </main>
      </div>
    </QueryClientProvider>
  );
}
