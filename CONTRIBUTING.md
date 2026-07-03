# Contributing to Hooke v2

This document describes how to contribute to Hooke. Read it before making any changes to the codebase.

---

## Before You Start

1. Read `PLATFORM_CONSTITUTION.md` — it defines what Hooke is and the rules that govern every decision.
2. Read `ENGINEERING_STANDARDS.md` — it defines the baseline quality requirements for all code.
3. Read `ARCHITECTURE.md` — it describes the platform systems your feature will participate in.
4. Read `FEATURE_ACCEPTANCE.md` — it defines what "done" means for any feature.

If you are unfamiliar with any of these, read them before writing code. Work that does not comply with these documents will not be merged.

---

## Development Workflow

### Branches

| Branch Pattern | Purpose |
|---|---|
| `main` | Stable, production-ready code only |
| `v2-development` | Primary integration branch for v2 work |
| `feature/<name>` | New features and capabilities |
| `fix/<name>` | Bug fixes |
| `refactor/<name>` | Refactoring without behavior change |
| `docs/<name>` | Documentation-only changes |
| `release/<version>` | Release preparation |
| `hotfix/<name>` | Urgent production fixes |

Never work directly on `main` or `v2-development`. All work happens on a feature branch.

### Starting a Feature

```bash
# Start from v2-development
git checkout v2-development
git pull origin v2-development

# Create your feature branch
git checkout -b feature/your-feature-name
```

### Committing

Commit messages follow Conventional Commits:

```
type(scope): short description

Body explaining what and why (not how). Optional.

Breaking changes noted here if applicable.
```

Types: `feat`, `fix`, `refactor`, `docs`, `test`, `chore`, `perf`, `security`

Examples:
```
feat(blueprint): wire blueprint generation to real LLM with project context
fix(event-bus): prevent duplicate event handlers on hot reload
refactor(project-graph): replace adjacency list with typed edge registry
docs(architecture): add Event Bus interaction contracts
```

### Opening a Pull Request

1. Ensure your branch is up to date with `v2-development`.
2. Run the full test suite locally — it must pass.
3. Complete the Feature Acceptance Gate checklist in `FEATURE_ACCEPTANCE.md`.
4. Open a PR against `v2-development` (not `main`).
5. Fill in the PR template completely — partially completed templates are returned.
6. Request review from at least one other contributor.

### PR Template

```markdown
## What This PR Does
<!-- One paragraph describing the feature or fix -->

## Why
<!-- The user problem this solves -->

## How to Test
<!-- Step-by-step instructions to verify the changes -->

## Feature Acceptance Gate
<!-- Copy the checklist from FEATURE_ACCEPTANCE.md and check each item -->

## Breaking Changes
<!-- List any breaking changes, or "None" -->

## Screenshots / Recordings
<!-- For UI changes, include before/after screenshots -->
```

---

## Local Development

### Prerequisites

- Node.js 20+
- npm or bun
- Git

### Setup

```bash
# Clone the repository
git clone https://github.com/Malikhamis/studio-sparkle-05.git
cd studio-sparkle-05

# Install dependencies
npm install

# Copy environment template
cp .env.example .env.local
# Fill in your values

# Start the development server
npm run dev
```

### Environment Variables

| Variable | Required | Description |
|---|---|---|
| `VITE_SUPABASE_URL` | For Supabase features | Your Supabase project URL |
| `VITE_SUPABASE_ANON_KEY` | For Supabase features | Your Supabase anon key |

AI provider keys are managed through the Settings UI at runtime — they are not environment variables.

### Running Tests

```bash
# Unit and integration tests
npm test

# End-to-end tests
npm run test:e2e

# Type checking
npm run type-check

# Linting
npm run lint
```

All of these must pass before a PR is opened.

---

## Code Organization

```
src/
├── lib/
│   ├── platform/       # Core platform architecture
│   │   ├── event-bus.ts
│   │   ├── project-graph.ts
│   │   ├── blueprint-engine.ts
│   │   ├── memory/
│   │   ├── asset-graph.ts
│   │   └── workflow-engine.ts
│   ├── llm/            # AI provider clients
│   ├── agents/         # AI specialist agents
│   └── utils.ts
├── store/              # Zustand state stores
├── routes/             # TanStack Router route components
├── components/         # Shared UI components
│   └── ui/             # Shadcn/UI primitives
└── hooks/              # Shared React hooks
```

### Where to Put Things

| Thing | Location |
|---|---|
| Platform event types | `src/lib/platform/event-bus.ts` |
| Platform systems | `src/lib/platform/` |
| AI provider clients | `src/lib/llm/` |
| AI agents | `src/lib/agents/` |
| Global state | `src/store/` |
| Route components | `src/routes/` |
| Reusable UI | `src/components/` |
| Shadcn primitives | `src/components/ui/` |
| Shared hooks | `src/hooks/` |

### What Does Not Belong in Components

- Business logic
- AI prompt construction
- Direct platform API calls (use store actions)
- Direct LLM calls (use agents)
- Hardcoded data
- `console.log` statements

---

## Review Standards

### As an Author

- Your PR description explains the feature clearly enough for someone unfamiliar with the code to understand it.
- You have tested every scenario described in "How to Test."
- You have verified the Feature Acceptance Gate items — not just checked them.

### As a Reviewer

- Test the changes against real data, not just fixtures.
- Verify platform integrations actually work — read the code, don't just trust the description.
- Check for the Automatic Failure conditions in `FEATURE_ACCEPTANCE.md`.
- Leave specific, actionable feedback — not vague comments.
- Approve only when you would be comfortable deploying this to production today.

---

## Getting Help

If you are unsure how to implement something within the platform architecture, ask before implementing. Building something wrong and refactoring it is more expensive than asking a question first.

If you believe a platform rule should not apply to your situation, the burden of proof is on you to demonstrate why. The default answer is that the rule applies.
