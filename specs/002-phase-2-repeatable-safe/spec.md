# Feature Specification: Phase 2 — Repeatable & safe

**Feature Branch**: `002-phase-2-repeatable-safe`

**Created**: 2026-07-05

**Status**: Draft

**Input**: Converted from `PHASES.md` → Phase 2 (small audience, you + a few projects).
Goal: remove the human from the publish path and the "I forgot to build" class of bugs.
This is where the *standard* starts paying for itself across repos.

> **Stub note:** Phase stub converted from `PHASES.md`. Refine with `/speckit-clarify`
> and `/speckit-plan` before implementing. Builds on Phase 1's correct publish contract.

> **Amended 2026-09-20** under constitution v1.1.0: TypeScript is the default source
> mode; CI publishes by trusted publishing; the first publish of a new package is a
> bootstrap. See the constitution's amendment log for why. Two things this
> stub predated: the release-flow action (adopted after v1.0.0), which makes the trigger
> a version bump merged to `main` rather than a hand-pushed tag; and npm trusted
> publishing, which replaces the automation token entirely.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - CI publish on tag (Priority: P1)

A maintainer releases by bumping `version` in `package.json` and merging to `main`;
the release-flow action tags `v<version>`, and the gated step builds, tests and
publishes — never `npm publish` from a laptop after the bootstrap. There is no token:
CI authenticates by **trusted publishing** — GitHub mints a short-lived OIDC identity
token per run (`permissions: id-token: write`) and npm accepts it. Provenance is
generated automatically.

**Why this priority**: Constitution IV — no laptop publishes. This removes the human and
the local-secret risk from the release path; it is the defining capability of Phase 2.

**Independent Test**: Push a test tag to a scratch package; confirm CI builds, tests,
and publishes with no local credentials involved.

**Acceptance Scenarios**:

1. **Given** a version bump merged to `main`, **When** CI runs, **Then** the action
   tags `v<version>` and the workflow builds, tests, and publishes the package.
2. **Given** the workflow and the repo's secrets, **When** inspected, **Then** no npm
   token exists anywhere: the publish step has `id-token: write` and no
   `NODE_AUTH_TOKEN`.
3. **Given** a merge to `main` without a version bump, **When** the action runs,
   **Then** it fails loudly on the existing tag and nothing is published.

---

### User Story 2 - One reusable org publish workflow + one automation token (Priority: P1)

A single reusable publish workflow (`workflow_call`, hosted in this template's repo) is
inherited by every package through a thin per-package `release.yml`; each package's
trusted publisher on npmjs.com names its own calling workflow. No token is shared
because no token exists — the direct fix for "don't reinvent tokens each time" is that
there is nothing to reinvent.

**Why this priority**: This is the cross-repo leverage the whole template exists for.
Without it, every package carries its own copy of the publish logic and a template fix
has to be applied N times. Depends on US1.

**Independent Test**: Wire a second package to the reusable workflow with only its own
thin caller; confirm it publishes with no publish logic of its own and no secret.

**Acceptance Scenarios**:

1. **Given** a new package, **When** it references the reusable workflow, **Then** it
   can publish without defining its own publish logic.
2. **Given** the package on npmjs.com, **When** its trusted publishers are inspected,
   **Then** exactly one names this repo and the calling workflow file.

**To verify at implementation, not assume**: that npm's trusted-publisher match works
against the *calling* workflow when the publish step lives in a reusable workflow;
which `npm` version the publish job needs (OIDC requires ≥ 11.5; upgrade in the job);
and how callers pin the reusable workflow (this repo's tags are template versions, so a
moving alias like the release-flow action's `v1` would have to be maintained here too).

---

### User Story 3 - Lockfile + audit in CI (Priority: P2)

The lockfile is committed and CI uses `npm ci` plus `npm audit` so installs are
reproducible and known-vulnerable deps surface in the pipeline.

**Why this priority**: Reproducibility and a basic security signal. Important but
supporting; the release still functions without it.

**Independent Test**: Delete `node_modules`, run `npm ci` from the committed lockfile;
confirm a reproducible install and that `npm audit` runs in CI.

**Acceptance Scenarios**:

1. **Given** the committed lockfile, **When** `npm ci` runs, **Then** the install is
   reproducible.
2. **Given** a vulnerable dependency, **When** CI runs, **Then** `npm audit` reports it.

---

### User Story 4 - SemVer discipline (Priority: P1)

Releases follow SemVer with a CHANGELOG (or Changesets), `npm version` bumps, and a git
tag per release — so the version contract consumers depend on is honored.

**Why this priority**: Constitution II — version is a contract; a breaking change in a
non-major bump breaks consumers. This is load-bearing, not cosmetic.

**Independent Test**: Make a breaking change; confirm the process forces a major bump
and a changelog entry before a tag is cut.

**Acceptance Scenarios**:

1. **Given** a breaking change, **When** releasing, **Then** the version bumps MAJOR and
   the changelog records it.
2. **Given** a release, **When** cut, **Then** there is a matching git tag `vX.Y.Z`.

---

### User Story 5 - dist-tag policy + deprecate-not-unpublish runbook (Priority: P2)

A release runbook defines the `dist-tag` policy (`latest` vs `next`/`beta` for
pre-releases) and codifies `npm deprecate` — never `unpublish` — as the way to retire a
bad version.

**Why this priority**: Constitution III made operational. Prevents ad-hoc, irreversible
mistakes, but is a process artifact rather than a code path.

**Independent Test**: Publish a pre-release to `next`; confirm `latest` is unaffected.
Walk the runbook to retire a version via `npm deprecate`.

**Acceptance Scenarios**:

1. **Given** a pre-release, **When** published, **Then** it lands on `next`/`beta`, not
   `latest`.
2. **Given** a bad version, **When** retiring it, **Then** the runbook directs
   `npm deprecate`, not `unpublish`.

### Edge Cases

- What happens when a version bump merges but CI build/test fails — is a partial
  publish possible? (It must not be: the publish step is gated on the gate passing. A
  failed run leaves a tag with no publish behind it; recovery follows the release-flow
  action's own documented path, to be confirmed when this phase is built.)
- What happens when a trusted-publisher configuration must change? (Edit it on
  npmjs.com; nothing to rotate, nothing shared between packages.)
- What happens on a pre-release that should never become `latest`?
- What happens on the very first publish of a new package? (It is the bootstrap —
  Phase 1's FR-005 — and the runbook says so.)

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: Releases MUST publish via a GitHub Action triggered by a `package.json`
  version bump merged to `main` and tagged by the release-flow action; publishing from
  a developer machine MUST NOT be part of the path after the bootstrap.
- **FR-002**: CI MUST authenticate to npm by trusted publishing (OIDC,
  `permissions: id-token: write`); a long-lived npm token MUST NOT exist in secrets or
  on a machine; the publish logic MUST live once in a reusable workflow inherited by
  every package.
- **FR-003**: The lockfile MUST be committed; CI MUST use `npm ci` and run `npm audit`.
- **FR-004**: Releases MUST follow SemVer with a CHANGELOG (or Changesets), `npm version`
  bumps, and a git tag per release.
- **FR-005**: A release runbook MUST define the `dist-tag` policy and mandate
  `npm deprecate` (never `unpublish`) for retiring versions.

### Key Entities

- **Reusable publish workflow**: the shared CI workflow inherited per package.
- **Trusted publisher**: the per-package configuration on npmjs.com naming the repo and
  workflow allowed to publish; replaces the token.
- **Release runbook**: the documented bootstrap, trusted-publisher setup, dist-tag and
  deprecate policy.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A release is "bump `package.json`, merge to `main`" and CI does the rest,
  reproducibly, with no secret anywhere.
- **SC-002**: A second package adopts CI publishing by referencing the reusable workflow,
  with no new publish logic authored.
- **SC-003**: A failed build/test in CI blocks the publish entirely (no partial release).

## Assumptions

- Phase 1's correct publish contract is already in place, and the package has been
  bootstrapped so a trusted publisher can be configured.
- SemVer + Changesets and CI via trusted publishing are the constitution's pinned
  defaults (v1.1.0).
- Provenance comes with trusted publishing and is not a separate deliverable. The wider
  install matrix is deferred to Phase 3. There are no tokens to scope or rotate.
