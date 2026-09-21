# Feature Specification: Phase 3 — Trustworthy at scale

**Feature Branch**: `003-phase-3-trustworthy-scale`

**Created**: 2026-07-05

**Status**: Draft

**Input**: Converted from `PHASES.md` → Phase 3 (public, "a million people"). Goal: the
supply-chain and trust bar for a package strangers depend on.

> **Stub note:** Phase stub converted from `PHASES.md`. Refine with `/speckit-clarify`
> and `/speckit-plan` before implementing. Builds on Phase 2's trusted-publishing path.

> **Amended 2026-09-20** under constitution v1.1.0: TypeScript is the default source
> mode; CI publishes by trusted publishing; the first publish of a new package is a
> bootstrap. See the constitution's amendment log for why. Two of this
> phase's stories became inherent to earlier phases: provenance (automatic with trusted
> publishing, Phase 2) and shipped types (automatic in `ts` mode, Phase 0). They stay
> below reduced to what remains.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Provenance-signed publishes (Priority: P1)

Every CI release already carries a provenance attestation — trusted publishing (Phase
2) generates it without a flag. What remains here: verify it is present on each release,
and document for consumers how to check it.

**Why this priority**: Constitution IV — provenance is the trust baseline for a package
strangers depend on. Reduced from "add it" to "prove it and explain it" by the v1.1.0
amendment.

**Independent Test**: Publish through CI; confirm the published version carries a
provenance attestation on the registry and that the README's verification note works.

**Acceptance Scenarios**:

1. **Given** a CI release, **When** published, **Then** the version carries a provenance
   attestation tied to the source commit, with no `--provenance` flag in the workflow.
2. **Given** the registry page, **When** viewed, **Then** the provenance signal is
   present, and the README says how a consumer verifies it.

---

### User Story 2 - 2FA-required, per-package scoped, rotated tokens (Priority: P1)

2FA is enforced on the publishing account (it gates the bootstrap publish and any
account-level change), and each package's trusted-publisher configuration is reviewed
so only its own repo and workflow may publish it. There are no automation tokens to
scope or rotate — trusted publishing removed them.

**Why this priority**: Supply-chain hardening. With no token, the blast radius of a
leak is zero; what remains is keeping the account and the per-package publisher
configs tight.

**Independent Test**: Confirm a bootstrap publish fails without 2FA; confirm each
package's trusted-publisher list names exactly its own repo and workflow.

**Acceptance Scenarios**:

1. **Given** a bootstrap publish attempt without 2FA, **When** run, **Then** it is
   rejected.
2. **Given** two packages, **When** their trusted publishers are inspected, **Then**
   each names exactly its own repo and workflow, and no npm token exists for either.

---

### User Story 3 - Dependency hygiene: Dependabot/Renovate + minimal surface (Priority: P2)

Dependabot or Renovate watches the package's own deps, and the dependency surface is
kept minimal — every dep is attack surface and a thing that can break downstream.

**Why this priority**: Reduces ongoing risk, but is a maintenance posture rather than a
release-blocking capability.

**Independent Test**: Confirm an automated dep-update bot is configured and that the dep
count is justified (no gratuitous deps).

**Acceptance Scenarios**:

1. **Given** an outdated dependency, **When** the bot runs, **Then** it opens an update
   PR.
2. **Given** the dependency list, **When** reviewed, **Then** each dep has a reason to
   exist.

---

### User Story 4 - Types shipped (Priority: P1)

A `ts`-mode package ships types by construction (`exports.types` → `dist/*.d.ts`,
Phase 0). This story covers the opt-out: a `js`-mode package with a library API must
ship a `// @ts-check`'d surface or hand-written `.d.ts` so consumers still get editor
support.

**Why this priority**: Consumers of a public library expect type support; its absence is
a visible quality gap. Load-bearing for a library API; already true for the default.

**Independent Test**: Import the package into a TypeScript project; confirm types
resolve and autocomplete works for the public surface.

**Acceptance Scenarios**:

1. **Given** a TS consumer, **When** importing the package, **Then** types resolve via
   `exports.types` and the public API is typed.

---

### User Story 5 - Deliberate dual ESM/CJS + tested install matrix (Priority: P2)

Dual ESM/CJS is offered **only if** real consumers need CJS (otherwise stay ESM-only),
and the package is pack-and-install tested across the Node versions in `engines` and
every advertised import path (ESM, and CJS if dual).

**Why this priority**: Constitution VI at scale. The dual decision must be deliberate,
not defaulted; the matrix proves correctness across the supported surface.

**Independent Test**: Run the pack-and-install matrix across each `engines` Node version
and each import path; all green.

**Acceptance Scenarios**:

1. **Given** the `engines` Node range, **When** the install matrix runs, **Then** every
   supported Node version and every advertised import path installs and runs.
2. **Given** no real CJS demand, **When** deciding module format, **Then** the package
   stays ESM-only (dual is not defaulted).

---

### User Story 6 - Project hygiene docs (Priority: P3)

The repo ships a `SECURITY.md`, issue templates, and a contribution note — even if
you're the only contributor today.

**Why this priority**: Signals trustworthiness and eases outside contribution, but does
not affect the artifact's correctness.

**Independent Test**: Confirm `SECURITY.md`, issue templates, and a contribution note
exist and are accurate.

**Acceptance Scenarios**:

1. **Given** the repo, **When** inspected, **Then** `SECURITY.md`, issue templates, and
   a contribution note are present.

### Edge Cases

- What happens when a consumer on the lowest `engines` Node version imports via a path
  not covered by the install matrix?
- What happens if dual ESM/CJS is added without real demand? (Added footguns for no
  benefit — must be avoided.)
- What happens when a `js`-mode package's hand-written `.d.ts` drifts from its
  runtime surface? (Nothing catches it automatically — a reason the default is `ts`.)

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: Every CI release MUST carry a provenance attestation tied to the source
  commit (inherent to trusted publishing), and the README MUST say how to verify it.
- **FR-002**: The publishing account MUST require 2FA; each package's trusted-publisher
  configuration MUST name only its own repo and workflow; an npm token MUST NOT exist.
- **FR-003**: The package MUST have automated dependency updates (Dependabot/Renovate)
  and MUST keep its dependency surface minimal and justified.
- **FR-004**: A library-API package MUST ship types — inherent in `ts` mode; a
  `js`-mode package MUST ship a `// @ts-check`'d surface or hand-written `.d.ts`.
- **FR-005**: Dual ESM/CJS MUST be adopted only on real CJS demand; the package MUST be
  pack-and-install tested across every `engines` Node version and every advertised
  import path.
- **FR-006**: The repo MUST include `SECURITY.md`, issue templates, and a contribution
  note.

### Key Entities

- **Provenance attestation**: the signed record of build + commit on the registry.
- **Install matrix**: the Node-version × import-path grid the package is tested against.
- **Trusted-publisher configuration**: the per-package allow-list of repo + workflow on
  npmjs.com; the thing that replaced the per-package token.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: The package is provenance-attested, type-complete, and audited.
- **SC-002**: An outside consumer on any supported Node version installs and uses the
  package with no surprises across every advertised import path.
- **SC-003**: A bootstrap publish without 2FA is rejected, and each package's trusted
  publisher names only its own repo and workflow.

## Assumptions

- Phase 2's trusted-publishing path is in place.
- ESM-only and TypeScript remain the defaults; dual and `js` are deliberate,
  recorded exceptions.
- Node floor and supported range come from the constitution's pinned defaults.
