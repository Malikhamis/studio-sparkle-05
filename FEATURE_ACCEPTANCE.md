# Feature Acceptance Gate

This checklist must pass completely before any feature is merged. Every item is binary: pass or fail. Partial credit does not exist.

A pull request that fails any item on this checklist is not mergeable, regardless of how much work was done, how long it took, or how urgent the feature is.

---

## Pre-Submission Requirements

Before opening a pull request, the author must verify every item below. The PR description must include this checklist with each item explicitly checked or noted as N/A with justification.

---

## 1. Functionality

- [ ] The feature solves a real, documented user problem
- [ ] Every user-facing element performs its described function
- [ ] No buttons, links, or controls exist that do nothing
- [ ] No "coming soon" text or placeholder UI is visible
- [ ] No hardcoded data is presented as real user data
- [ ] No mock API responses are used in production code paths
- [ ] Error states are handled gracefully and informatively
- [ ] Loading states are handled and do not produce blank screens
- [ ] Edge cases are handled (empty state, large data, network failure, AI failure)

## 2. Platform Integration

- [ ] The feature integrates with the Project Graph
- [ ] New entities are registered in the Project Graph with correct ownership
- [ ] The feature reads from and writes to the correct single source of truth
- [ ] No duplicate entity ownership is introduced
- [ ] The Blueprint is updated or read where appropriate

## 3. Event Bus

- [ ] All state-changing actions emit the correct platform events
- [ ] The feature responds to relevant platform events from other modules
- [ ] No module calls another module directly (all cross-module communication uses events)
- [ ] Event types are defined in the central event registry

## 4. Memory & Context

- [ ] AI interactions read from the project Memory System
- [ ] Significant AI outputs are written back to the Memory System
- [ ] The feature preserves project context for future AI operations
- [ ] No AI prompt is context-free (every prompt is informed by project state)

## 5. Data Persistence

- [ ] All user data is persisted to the correct storage layer
- [ ] Data survives browser refresh
- [ ] Data is associated with the correct project
- [ ] No data is lost on component unmount or route change
- [ ] Migrations are handled for schema changes

## 6. Asset Lineage

- [ ] Every generated asset is registered in the Asset Graph
- [ ] Asset ownership is correctly attributed
- [ ] Asset versioning is applied where applicable
- [ ] Assets are reusable across the platform

## 7. Security

- [ ] No credentials, tokens, or secrets appear in client-side code
- [ ] All user inputs are validated and sanitized
- [ ] AI prompts are protected against injection
- [ ] File uploads are validated (type, size, content)
- [ ] Authorization is checked before any sensitive operation
- [ ] No sensitive data is logged

## 8. Testing

- [ ] Unit tests cover all business logic
- [ ] Integration tests cover all platform interactions (Event Bus, Project Graph)
- [ ] End-to-end tests cover the primary user workflow
- [ ] Failure paths are tested (AI failure, network error, invalid input)
- [ ] All existing tests still pass

## 9. Accessibility

- [ ] All interactive elements are keyboard accessible
- [ ] All images have descriptive alt text
- [ ] Color is not the only means of conveying information
- [ ] ARIA labels are applied to complex interactive components
- [ ] Focus management is correct for dialogs and modals

## 10. Performance

- [ ] No unnecessary re-renders on state changes
- [ ] Large lists are virtualized
- [ ] Assets are not loaded unnecessarily
- [ ] AI calls are not duplicated
- [ ] Bundle size impact has been reviewed

## 11. Documentation

- [ ] The feature is documented in the relevant module documentation
- [ ] Platform events emitted/consumed are listed
- [ ] Entities owned are described
- [ ] Error handling strategy is documented
- [ ] Monitoring approach is described

## 12. Production Readiness

- [ ] The feature works correctly in a deployed environment (not just locally)
- [ ] Environment-specific configuration uses environment variables
- [ ] No console.log statements remain in production code paths
- [ ] The feature degrades gracefully when optional services are unavailable
- [ ] The feature has been reviewed by at least one other person

---

## Reviewer Checklist

The reviewer (not the author) must independently verify:

- [ ] The feature was tested against real data, not just development fixtures
- [ ] The platform integrations described in the PR actually work
- [ ] The acceptance criteria from the originating issue/task are fully met
- [ ] No items above were marked N/A without valid justification

---

## Automatic Failures

The following conditions result in automatic rejection regardless of other checklist items:

- Mock or fake implementations presented as real
- Hardcoded data presented as user data
- Credentials or secrets in code
- Missing error handling on AI calls
- Missing error handling on network calls
- UI that appears functional but does nothing
- Missing tests
- Feature that bypasses the platform architecture

---

*This gate exists to ensure Hooke remains production-grade. It is not a bureaucratic process. It is how we keep our word to users.*
