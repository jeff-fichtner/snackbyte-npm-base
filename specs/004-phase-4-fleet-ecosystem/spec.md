# Feature Specification: Phase 4 — Fleet / ecosystem scale

**Feature Branch**: `004-phase-4-fleet-ecosystem`

**Created**: 2026-07-05

**Status**: Draft

**Input**: Converted from `PHASES.md` → Phase 4. Goal: when you have enough libraries
that per-repo management is the bottleneck. Likely a *later* decision — flagged so the
earlier phases don't foreclose it.

> **Stub note:** Phase stub converted from `PHASES.md`. This phase is intentionally a
> later/deferred decision. Refine with `/speckit-clarify` and `/speckit-plan` before
> implementing. Only pursue once the number of packages makes per-repo work the
> bottleneck.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Shared release tooling across packages (Priority: P1)

Release tooling (e.g. Changesets) coordinates versioning across many packages through one
CI pipeline — or, deliberately, one-repo-per-package is kept if isolation matters more
than coordination. The choice is made based on how coupled the libraries are.

**Why this priority**: Coordinated releases are the core relief for fleet-scale
management pain; the monorepo-vs-polyrepo call gates everything else in this phase.

**Independent Test**: Cut a coordinated release touching two packages; confirm versions
and changelogs update together through one pipeline (or confirm the deliberate
polyrepo decision is documented with its rationale).

**Acceptance Scenarios**:

1. **Given** two coupled packages, **When** a coordinated release runs, **Then** their
   versions and changelogs update together via one pipeline.
2. **Given** a decision to stay polyrepo, **When** reviewed, **Then** the isolation
   rationale is documented, not defaulted.

---

### User Story 2 - Org-wide policy as code (Priority: P1)

Shared ESLint / tsconfig / release config is consumed by every package so standards
can't drift per repo, and an org-wide policy change propagates without touching each
repo by hand.

**Why this priority**: This is the anti-drift guarantee that makes a fleet maintainable;
without it, standards diverge as packages multiply.

**Independent Test**: Change a shared policy rule centrally; confirm every consuming
package picks it up without per-repo edits.

**Acceptance Scenarios**:

1. **Given** a central policy change, **When** propagated, **Then** every package adopts
   it with no per-repo hand edits.
2. **Given** a package, **When** inspected, **Then** its lint/tsconfig/release config
   extends the shared org config rather than redefining it.

---

### User Story 3 - Private registry option (Priority: P2)

Internal-only libraries can publish to a private registry (GitHub Packages / Verdaccio)
using the same publish protocol as public packages — so the publish path doesn't fork
for internal libs.

**Why this priority**: Extends the standard to internal libraries, but only matters when
internal-only libs exist; not every fleet needs it.

**Independent Test**: Publish an internal-only package to the private registry using the
same protocol; confirm it installs from there.

**Acceptance Scenarios**:

1. **Given** an internal-only package, **When** published, **Then** it goes to the
   private registry via the same protocol as public packages.

---

### User Story 4 - Automated provenance + SBOM, org-level scanning (Priority: P2)

Provenance and SBOM generation are automated across the fleet, and org-level security
scanning covers every package.

**Why this priority**: Scales Phase 3's supply-chain guarantees to the whole fleet;
valuable but built on capabilities that already exist per-package.

**Independent Test**: Confirm each fleet package emits provenance + an SBOM automatically
and appears in org-level scanning.

**Acceptance Scenarios**:

1. **Given** any fleet package release, **When** published, **Then** provenance and an
   SBOM are emitted automatically.
2. **Given** the org, **When** security scanning runs, **Then** every package is covered.

---

### User Story 5 - Docs site / generated API docs (Priority: P3)

If the surface area justifies it, a docs site or generated API docs is produced across
packages.

**Why this priority**: Nice-to-have that depends on surface area; the fleet functions
without it.

**Independent Test**: Confirm API docs generate for the packages whose surface area
justifies documentation.

**Acceptance Scenarios**:

1. **Given** a package with a justifying surface area, **When** docs are generated,
   **Then** its public API is documented.

### Edge Cases

- What happens when libraries are loosely coupled — does a monorepo add coordination
  cost without benefit? (Then keep polyrepo.)
- What happens when a shared policy change would break one package? (Propagation must
  surface the break, not silently apply.)
- What happens to the private-registry protocol when a package moves from internal-only
  to public?

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The fleet MUST have shared release tooling for coordinated versioning
  across packages, OR a documented, rationale-backed decision to remain
  one-repo-per-package.
- **FR-002**: Org-wide ESLint / tsconfig / release config MUST be consumed by every
  package so standards cannot drift, and a central change MUST propagate without
  per-repo hand edits.
- **FR-003**: Internal-only libraries MUST be publishable to a private registry using
  the same publish protocol as public packages.
- **FR-004**: Provenance and SBOM generation MUST be automated across the fleet, with
  org-level security scanning covering every package.
- **FR-005**: A docs site / generated API docs MUST be produced where surface area
  justifies it.

### Key Entities

- **Shared release tooling**: the cross-package versioning/CI pipeline (or the explicit
  polyrepo decision).
- **Policy-as-code config**: the shared lint/tsconfig/release config every package extends.
- **Private registry**: the internal publish target using the shared protocol.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Adding the Nth package is "spin out of `snackbyte-npm-base`," with no
  bespoke per-repo release setup.
- **SC-002**: An org-wide policy change propagates to every package without touching each
  repo by hand.
- **SC-003**: Both public and internal-only packages release through the same publish
  protocol.

## Assumptions

- Phases 1–3 are in place per package; this phase coordinates across many such packages.
- The monorepo-vs-polyrepo choice is deliberate and coupling-driven, not defaulted.
- This phase is pursued only once per-repo management is genuinely the bottleneck.
