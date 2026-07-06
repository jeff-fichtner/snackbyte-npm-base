# snackbyte-npm-base Constitution

This constitution governs `snackbyte-npm-base` — the **npm-library template** for the
snackbyte ecosystem (the publishable-package sibling of `snackbyte-base`). It also
governs every package spun out of this template, since a spin-out inherits these
principles along with the tooling.

## Core Principles

### I. Correct From Day One, Automated Later

Assume nobody will ever download the package; build every package as if a million
people will. The distinction that matters is **correctness vs. automation**, and they
are earned in that order:

- *Correctness* is non-negotiable at Phase 1 — a right `exports` map, a `files`
  allowlist, no secrets in the tarball, SemVer honored. These cost nothing now and
  prevent irreversible mistakes later.
- *Automation* (CI publish, provenance, changelogs) is added as a package earns more
  consumers. Deferring automation is fine; shipping something *wrong* is not.

A package may stop at any phase and still be correct. Later phases add safety and
scale; they never rewrite the correctness earned earlier.

### II. The Publish Contract Is Load-Bearing

The `package.json` publish surface is the interface strangers depend on, and most of
its failure modes are silent:

- `exports` (not just `main`) defines what is importable — get it wrong and consumers
  break with no error in this repo.
- `files` / `.npmignore` is an allowlist — publish only `dist/`/`src/` + README +
  LICENSE. Never ship `node_modules`, tests, `.env`, or scratch.
- `version` is a contract: a breaking change in a non-major bump breaks consumers.
- **A leaked secret in a published tarball is the #1 irreversible mistake** —
  `unpublish` is blocked after 72h. Treat every publish as permanent.

### III. Deprecate, Never Unpublish

Once published, a version is forever. The supported path to retire a version is
`npm deprecate`, never `unpublish`. Bad releases are superseded by a new version and
deprecated — they are not deleted. This is baked into the release runbook, not left to
in-the-moment judgment.

### IV. No Laptop Publishes (Once Automated)

From Phase 2 onward, packages are never `npm publish`'d from a developer machine.
Releases run through CI on a tag: `git tag vX.Y.Z && git push --tags` → build → test →
publish. Tokens live in CI secrets, not a shell. Granular automation tokens, not
classic tokens; 2FA on the account. At Phase 3, publishes carry `--provenance` — a
signed attestation of what built the package and from which commit.

### V. Deliberate Defaults, Not Per-Repo Re-Litigation

The recurring decisions are pinned once so no package re-argues them. Deviating from a
default is allowed but must be justified in that package's spec/plan, not chosen by
inertia:

| Decision          | snackbyte default            | Why                                     |
|-------------------|------------------------------|-----------------------------------------|
| Scope             | `@snackbyte/*`               | Org namespace; reserve on npm early     |
| Public vs private | Public unless a reason not to| Most tools are shareable                |
| Module format     | ESM-only                     | Simpler; add CJS only on real demand    |
| License           | MIT                          | Permissive, zero-friction               |
| Versioning        | SemVer + Changesets          | Standard, automatable                   |
| Publish path      | CI-on-tag from Phase 2 on    | No laptop publishes                     |
| Node floor        | Match the apps (`>=24`)      | One runtime story across snackbyte      |

### VI. Test What Users Get, Not Your Working Tree

Correctness is proven against the *artifact*, not the source. The `npm pack` smoke test
— pack the tarball, install it in a clean project, run it — is the minimum bar before
any package is considered shippable, because it exercises exactly what a consumer
downloads. `prepublishOnly` runs build + test so a stale or broken artifact cannot be
published. At Phase 3, the install matrix widens to every Node version in `engines` and
every advertised import path (ESM, and CJS if dual).

## Phasing Model

Work in this repo is organized as **independently shippable phases**, each captured as a
Spec Kit spec under `specs/`. A package "graduates" up the phases as it earns the need
(more consumers → more rigor):

- **Phase 0** — the template itself exists and can be spun out.
- **Phase 1** — ship one correct package to prod today (correctness floor, manual publish OK).
- **Phase 2** — repeatable & safe (CI-on-tag publish, lockfile, SemVer discipline).
- **Phase 3** — trustworthy at scale (provenance, types shipped, audited deps, install matrix).
- **Phase 4** — fleet / ecosystem scale (shared release tooling, policy-as-code, private registry option).

Each phase spec is a standalone slice: implement only Phase N and the package is still
correct and usable. Phases are additive, never a rewrite of an earlier one.

## Development Workflow

- **Spec-driven.** Each phase and each spun-out feature starts as a spec under `specs/`,
  authored/refined with the Spec Kit skills (`/speckit-specify`, `/speckit-plan`,
  `/speckit-tasks`, `/speckit-implement`). Plans and tasks derive from the spec.
- **Constitution check.** `/speckit-plan` verifies the plan against these principles
  before implementation; a violation must be justified or the plan changed.
- **Every-step green.** The full check gate (lint / typecheck / tests) stays green at
  each step, not only at the end. A spin-out's Phase 0 bar is: it passes
  `npm run check:all` and can be `npm pack`'d without touching any tooling.

## Governance

This constitution supersedes ad-hoc practice for this template and its spin-outs. When a
principle and a convenience conflict, the principle wins or the principle is amended —
not silently ignored.

- Amendments are made by editing this file with a version bump and a dated entry below,
  and must state what changed and why.
- Any deviation from a Principle V default must be recorded in the affected package's
  spec or plan, with its justification.
- Versioning of this constitution follows SemVer: MAJOR for a removed/redefined
  principle, MINOR for a new principle or materially expanded guidance, PATCH for
  clarifications and wording.

**Version**: 1.0.0 | **Ratified**: 2026-07-05 | **Last Amended**: 2026-07-05
