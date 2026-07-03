# Hooke Engineering Standards

These standards apply to every line of code written for Hooke. They are not aspirational guidelines — they are baseline requirements.

---

## 1. Code Quality

### TypeScript

- Strict mode is always enabled. `any` is not used.
- All function parameters and return types are explicitly typed.
- All data structures have defined interfaces or types.
- Type assertions (`as`) are justified with a comment explaining why.
- `unknown` is used instead of `any` where the type is genuinely unknown.

### Naming

- Functions are named for what they do, not how they do it.
- Variables are named for what they represent.
- Boolean variables begin with `is`, `has`, `can`, or `should`.
- Event names follow the pattern `entity:action` (e.g., `character:updated`, `blueprint:generated`).
- Constants are UPPER_SNAKE_CASE.

### Functions

- A function does one thing.
- Functions are short enough to understand at a glance. If a function requires scrolling to read, it should be decomposed.
- Functions have no side effects unless they are explicitly designed to produce side effects, and that is clear from their name.
- Pure functions are preferred. Side-effecting functions are pushed to the edges of the system.

### Error Handling

- Every async operation has error handling. There are no unhandled promise rejections.
- Every external service call (AI, storage, publishing) has a timeout.
- Every external service call has a retry policy.
- Errors are typed. String error messages are not thrown as errors.
- User-facing error messages are informative and actionable, not technical.
- Errors are logged with sufficient context to diagnose without reproduction.

---

## 2. Architecture Standards

### No Direct Module-to-Module Calls

Modules communicate through the Event Bus. Module A does not import and call Module B directly. If Module A needs to trigger behavior in Module B, Module A emits an event and Module B responds.

Exception: shared utility libraries that have no business logic (e.g., `cn()`, date formatting).

### No Business Logic in Components

React components render UI and handle user interactions. They do not contain business logic. Business logic lives in stores, services, and the platform architecture layer.

### No AI Prompts in Components

AI prompts are not strings defined in React components. They are constructed by the AI agent layer using full project context from the Memory System, Blueprint, and Project Graph.

### No Hardcoded IDs or Values

Configuration values, provider URLs, model names, and feature flags come from environment variables or the settings system. Nothing is hardcoded in application code.

### Single Source of Truth Enforcement

Before creating any new data structure, verify it does not duplicate an existing entity. Every entity has exactly one authoritative owner. If you need data from another module, request it through the platform — do not copy it.

---

## 3. AI Integration Standards

### Every AI Call Uses Project Context

No AI call is context-free. Every prompt includes:
- The current project's Blueprint
- Relevant entities from the Project Graph
- Applicable memory from the Memory System
- User preferences and brand guidelines where applicable

### AI Failures Are Handled

Every AI call can fail. Failure handling includes:
- Retry with exponential backoff (up to 3 attempts by default)
- Graceful degradation if all retries fail
- User notification with actionable recovery options
- Error logging with the prompt context (minus any PII)

### AI Outputs Are Persisted

Every significant AI output is:
- Saved to the Asset Graph with proper lineage
- Written to the Memory System so future AI calls benefit from it
- Versioned so the user can revert to previous generations

### No Mock AI in Production

The mock LLM client (`src/lib/llm/mock.ts`) is a testing tool only. It is never used in production code paths. Production code always routes to a real provider or fails gracefully with a user-visible error.

---

## 4. Storage Standards

### Persistence Layers

| Data Type | Storage Layer |
|---|---|
| User preferences | Local IndexedDB |
| Project data | Local IndexedDB (primary) + Supabase (sync) |
| Generated assets | Supabase Storage |
| AI memory | Local IndexedDB (primary) + Supabase (sync) |
| Credentials/API keys | Environment variables or encrypted local storage |
| Session state | Memory only (not persisted) |

### Data Integrity

- All persisted data has a schema version.
- Schema migrations are handled automatically on load.
- Data that cannot be migrated is preserved in its original form and flagged for review.
- Deletions are soft-deleted by default (with a grace period before permanent removal).

---

## 5. Security Standards

### Credentials

- API keys and tokens are never committed to source control.
- API keys are stored in environment variables.
- When users provide API keys through the settings UI, they are stored encrypted in local storage and never transmitted to a server we control.
- Supabase credentials are environment variables only.

### Input Validation

- All user inputs are validated before use.
- File uploads are validated: type (allowlist), size (maximum enforced), and basic content inspection.
- AI prompts constructed from user input must sanitize the input to prevent prompt injection.

### Authorization

- Every data operation verifies the current user has permission to perform it.
- Cross-project data access is explicitly permitted or denied by project permissions.
- Workspace isolation is enforced at the data layer, not just the UI layer.

---

## 6. Testing Standards

### Coverage Requirements

| Test Type | Minimum Requirement |
|---|---|
| Unit tests | All business logic, all store actions, all utility functions |
| Integration tests | All platform interactions (Event Bus, Project Graph, Memory) |
| End-to-end tests | All primary user workflows (one test per user capability) |

### Test Quality

- Tests test behavior, not implementation details.
- Tests do not rely on component internals.
- Tests use realistic data, not minimal stubs.
- Tests cover failure paths, not just happy paths.
- Tests are deterministic — they produce the same result every run.

### Mocking Policy

- External services (AI providers, storage, publishing APIs) are mocked in tests.
- The platform architecture (Event Bus, Project Graph, Memory) is NOT mocked in integration tests — it is used for real.
- Mock implementations match the interface and behavior of what they replace.

---

## 7. Performance Standards

### Budgets

| Metric | Target |
|---|---|
| Initial load (LCP) | < 2.5s on fast 3G |
| Route transition | < 200ms |
| AI response first token | < 3s |
| IndexedDB read | < 50ms |
| Component render | < 16ms (60fps) |

### Enforcement

- Performance budgets are measured in CI.
- A PR that regresses a budget by more than 10% requires explicit justification.
- Large lists (>100 items) are virtualized.
- Images are lazy-loaded.
- AI calls are debounced when triggered by user input.

---

## 8. Accessibility Standards

All features meet WCAG 2.1 AA. Specifically:

- Every interactive element is operable by keyboard.
- Focus order is logical and visible.
- Color contrast ratios meet minimums (4.5:1 for text, 3:1 for large text).
- All non-decorative images have descriptive alt text.
- Screen readers receive appropriate ARIA roles and labels.
- Time limits can be extended or disabled.

---

*These standards are the floor, not the ceiling. They define the minimum acceptable quality. The goal is always to exceed them.*
