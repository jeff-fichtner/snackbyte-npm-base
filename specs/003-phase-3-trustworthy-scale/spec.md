# Feature Specification: Phase 3 — Trustworthy at scale

**Feature Branch**: `003-phase-3-trustworthy-scale`

**Created**: 2026-07-05

**Status**: Draft

**Input**: Converted from `PHASES.md` → Phase 3 (public, "a million people"). Goal: the
supply-chain and trust bar for a package strangers depend on.

> **Stub note:** Phase stub converted from `PHASES.md`. Refine with `/speckit-clarify`
> and `/speckit-plan` before implementing. Builds on Phase 2's CI-on-tag publish path.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Provenance-signed publishes (Priority: P1)

Every release is published with `npm publish --provenance` — a signed attestation of
what built the package and from which commit — so consumers get the modern trust
baseline.

**Why this priority**: Constitution IV — provenance is the trust baseline for a package
strangers depend on. It is the defining capability of Phase 3.

**Independent Test**: Publish through CI; confirm the published version carries a
provenance attestation on the registry.

**Acceptance Scenarios**:

1. **Given** a CI release, **When** published, **Then** the version carries a
   `--provenance` attestation tied to the source commit.
2. **Given** the registry page, **When** viewed, **Then** the provenance signal is
   present.

---

### User Story 2 - 2FA-required, per-package scoped, rotated tokens (Priority: P1)

Publishes require 2FA, automation tokens are scoped per-package where possible, and
tokens are rotated on a schedule — minimizing blast radius if a token leaks.

**Why this priority**: Supply-chain hardening. A per-package token limits damage; 2FA
and rotation are baseline hygiene for a widely-depended-on package.

**Independent Test**: Confirm publish fails without 2FA; confirm each package's CI uses
its own scoped token; confirm a rotation runbook exists and has been exercised.

**Acceptance Scenarios**:

1. **Given** a publish attempt without 2FA, **When** run, **Then** it is rejected.
2. **Given** two packages, **When** inspected, **Then** each uses its own per-package
   scoped automation token where the registry allows it.

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

If the package exposes a library API, it ships types (`types` / `exports.types`) or a
`// @ts-check`'d JS surface — so consumers get editor support out of the box.

**Why this priority**: Consumers of a public library expect type support; its absence is
a visible quality gap. Load-bearing for a library API.

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
- What happens when a scoped per-package token is unavailable on the registry tier?

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: Releases MUST be published with `--provenance` tied to the source commit.
- **FR-002**: Publishes MUST require 2FA; automation tokens MUST be scoped per-package
  where possible and rotated on a schedule.
- **FR-003**: The package MUST have automated dependency updates (Dependabot/Renovate)
  and MUST keep its dependency surface minimal and justified.
- **FR-004**: A library-API package MUST ship types via `types` / `exports.types` (or a
  `// @ts-check`'d JS surface).
- **FR-005**: Dual ESM/CJS MUST be adopted only on real CJS demand; the package MUST be
  pack-and-install tested across every `engines` Node version and every advertised
  import path.
- **FR-006**: The repo MUST include `SECURITY.md`, issue templates, and a contribution
  note.

### Key Entities

- **Provenance attestation**: the signed record of build + commit on the registry.
- **Install matrix**: the Node-version × import-path grid the package is tested against.
- **Per-package token**: the narrowly-scoped automation credential.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: The package is `--provenance`-published, type-complete, and audited.
- **SC-002**: An outside consumer on any supported Node version installs and uses the
  package with no surprises across every advertised import path.
- **SC-003**: A publish without 2FA is rejected, and each package's CI uses its own
  scoped token where the registry allows.

## Assumptions

- Phase 2's CI-on-tag publish path is in place.
- ESM-only remains the default; dual is a deliberate, demand-driven exception.
- Node floor and supported range come from the constitution's pinned defaults.
