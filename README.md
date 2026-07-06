# snackbyte-npm-base

The **npm-library template** for the snackbyte ecosystem — the sibling of
[`snackbyte-base`](../snackbyte-base) (which is the template for *web apps /
sites*). Spin a package out of this and the basics are **handled**: the
`package.json` publish contract, versioning, dev/build, and a CI publish path —
so you never re-solve `exports`, tokens, or provenance from scratch again.

> **Status: planning.** The template skeleton itself is Phase 0 and not yet built.
> The roadmap now lives as [Spec Kit](https://github.com/github/spec-kit) specs
> under [`specs/`](./specs), governed by the
> [constitution](./.specify/memory/constitution.md).

## The model

- **Web app / site?** → spin out of `snackbyte-base`.
- **Publishable npm library / CLI?** → spin out of `snackbyte-npm-base` (this).

Inherit it, run the resolver, write your code, ship. Adopt only the phase you
need: Phase 1 ships one correct package to prod today; later phases add
automation and supply-chain rigor as a package earns more consumers.

## What to read

- **[Constitution](./.specify/memory/constitution.md)** — the non-negotiable
  principles (correct-from-day-one, the load-bearing publish contract,
  deprecate-never-unpublish, no laptop publishes) and the pinned default
  decisions (scope, module format, license, publish path, Node floor).
- **[`specs/`](./specs)** — the staged roadmap as Spec Kit specs, one per phase,
  from "ship one package immediately" to "engineered for a million downloads":
  - [`000-phase-0-template-exists`](./specs/000-phase-0-template-exists/spec.md) — the template itself
  - [`001-phase-1-ship-one-package`](./specs/001-phase-1-ship-one-package/spec.md) — ship one correct package today
  - [`002-phase-2-repeatable-safe`](./specs/002-phase-2-repeatable-safe/spec.md) — CI-on-tag publish, SemVer discipline
  - [`003-phase-3-trustworthy-scale`](./specs/003-phase-3-trustworthy-scale/spec.md) — provenance, types, audited deps
  - [`004-phase-4-fleet-ecosystem`](./specs/004-phase-4-fleet-ecosystem/spec.md) — shared release tooling across packages

## Working with the specs

This repo is [Spec Kit](https://github.com/github/spec-kit)-driven. Each phase is
a stub spec to be refined and implemented with the Spec Kit skills:

- `/speckit-constitution` — establish/amend the project principles
- `/speckit-specify` — flesh out a spec
- `/speckit-clarify` — de-risk ambiguous areas before planning
- `/speckit-plan` — create the implementation plan (checked against the constitution)
- `/speckit-tasks` — generate actionable tasks
- `/speckit-implement` — execute the implementation

## Guiding rule

Assume nobody will ever download it; build every package as if a million people
will. The discipline is cheap up front and prevents the irreversible mistakes
(leaked secrets in a tarball, a wrong `exports`, an unpublishable bad version).

## First intended graduate

`@snackbyte/spec-html` — the Spec Kit → interactive HTML renderer currently in
`snackbyte-base/scripts/`. Already package-shaped; it's the proof-of-concept once
this template reaches Phase 1 (see [`001-phase-1-ship-one-package`](./specs/001-phase-1-ship-one-package/spec.md)).
