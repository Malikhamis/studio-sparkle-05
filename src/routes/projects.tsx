import { createFileRoute } from "@tanstack/react-router";
import { FolderKanban } from "lucide-react";
import { ModulePlaceholder } from "@/components/module-placeholder";

export const Route = createFileRoute("/projects")({
  head: () => ({
    meta: [
      { title: "Projects — Hooke" },
      { name: "description", content: "Create, duplicate, archive, tag, and search your video productions." },
      { property: "og:title", content: "Projects — Hooke" },
      { property: "og:description", content: "Create, duplicate, archive, tag, and search your video productions." },
    ],
  }),
  component: () => (
    <ModulePlaceholder
      icon={FolderKanban}
      title="Projects"
      description="CRUD for productions: create, duplicate, archive, delete, tag, search, sort, and favorite. Backed by local-first storage."
      phase="Phase 2"
    />
  ),
});
