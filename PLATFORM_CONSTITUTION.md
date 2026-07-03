# Hooke Platform Constitution

This document is the supreme governing reference for all Hooke v2 development decisions. It cannot be overridden by any feature request, deadline, or convenience argument.

---

## Article I — Purpose

Hooke is an AI Creative Operating System. Its purpose is to help people produce professional creative work — not to demonstrate AI capabilities, not to showcase UI, and not to simulate workflows.

Every decision made about this platform is evaluated against one question:

> Does this help a real person complete real creative work in a way they can depend on professionally?

If the answer is no, the decision is wrong regardless of how elegant the implementation is.

---

## Article II — What Hooke Is

- A platform where ideas become productions
- A system that connects every creative decision into a coherent whole
- Software that learns from and adapts to each project's unique context
- A production environment, not a prototype or a demo

---

## Article III — What Hooke Is Not

- A showcase of AI capabilities
- A collection of loosely related tools
- A prototype to be "finished later"
- A demonstration environment
- Software that tells users features are "coming soon"

---

## Article IV — The Inviolable Rules

These rules cannot be suspended, deferred, or overridden:

### IV.1 — No Placeholder Policy

If a feature appears in the UI, it must be fully implemented. If it is not fully implemented, it must not appear in the UI.

There is no middle ground. There is no "phase 2 of this feature." Either it works completely or it does not exist in the interface.

### IV.2 — One Source of Truth

Every entity — project, character, scene, asset, timeline, voice, blueprint — exists exactly once in the platform. There is no duplication of ownership. There is no "local copy" that diverges from the platform record.

### IV.3 — Architecture First

No feature is implemented before the architecture it depends on exists. If a feature requires the Event Bus and the Event Bus does not exist, the Event Bus is built first.

### IV.4 — Real Services Only

Every external connection (AI providers, storage, publishing platforms, analytics) uses real services. No mock services are presented to users as real. No hardcoded responses substitute for real API calls.

### IV.5 — Security Is Non-Negotiable

No feature ships without passing security review. No credentials are stored in code. No user data is transmitted without appropriate protection. No AI prompt can be injected to bypass application logic.

---

## Article V — The Platform Architecture Is The Law

The Project Graph, Event Bus, Blueprint Engine, Memory System, and Asset Graph are the operating system of Hooke. Every module is a participant in these systems, not an isolated application.

A module that does not integrate with the platform architecture is not a Hooke module. It is a disconnected tool, and disconnected tools are not shipped.

---

## Article VI — The Definition of Done Is Final

A feature is complete when and only when it satisfies every item in the Definition of Done defined in `FEATURE_ACCEPTANCE.md`. Partial satisfaction is not completion. UI completion is not feature completion. Demo-ability is not production-readiness.

---

## Article VII — Documentation Is Part of the Feature

A feature without documentation is not complete. Documentation means:

- What the feature does
- How it integrates with the platform
- What events it emits and consumes
- What entities it owns
- How it handles errors
- How it is monitored

Documentation written after the fact is not acceptable. It is written as part of implementation.

---

## Article VIII — Amendments

This constitution may be amended only through explicit, deliberate revision with full understanding of the consequences. Amendments are not made under deadline pressure. They are not made to accommodate shortcuts. They are made when the platform genuinely evolves in a direction that requires updated governing principles.

---

*This document defines what Hooke is. Everything else is an implementation detail.*
