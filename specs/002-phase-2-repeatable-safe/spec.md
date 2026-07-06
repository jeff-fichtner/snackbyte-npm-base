# Feature Specification: Phase 2 — Repeatable & safe

**Feature Branch**: `002-phase-2-repeatable-safe`

**Created**: 2026-07-05

**Status**: Draft

**Input**: Converted from `PHASES.md` → Phase 2 (small audience, you + a few projects).
Goal: remove the human from the publish path and the "I forgot to build" class of bugs.
This is where the *standard* starts paying for itself across repos.

> **Stub note:** Phase stub converted from `PHASES.md`. Refine with `/speckit-clarify`
> and `/speckit-plan` before implementing. Builds on Phase 1's correct publish contract.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - CI publish on tag (Priority: P1)

A maintainer releases by pushing a version tag; a GitHub Action builds, tests, and
publishes — never `npm publish` from a laptop. Tokens live in GitHub secrets, not a
shell.

**Why this priority**: Constitution IV — no laptop publishes. This removes the human and
the local-secret risk from the release path; it is the defining capability of Phase 2.

**Independent Test**: Push a test tag to a scratch package; confirm CI builds, tests,
and publishes with no local credentials involved.

**Acceptance Scenarios**:

1. **Given** a pushed tag `vX.Y.Z`, **When** CI runs, **Then** it builds, tests, and
   publishes the package.
2. **Given** the workflow, **When** inspected, **Then** the npm token comes from CI
   secrets and never from a developer machine.

---

### User Story 2 - One reusable org publish workflow + one automation token (Priority: P1)

A single reusable org-level publish workflow and one granular automation token are wired
once and inherited by every package — the direct fix for "don't reinvent tokens each
time."

**Why this priority**: This is the cross-repo leverage the whole template exists for.
Without it, every package re-solves CI + tokens. Depends on the CI-on-tag flow (US1).

**Independent Test**: Wire a second package to the reusable workflow with only its own
config; confirm it publishes using the shared workflow and shared automation token.

**Acceptance Scenarios**:

1. **Given** a new package, **When** it references the reusable org workflow, **Then** it
   can publish without defining its own publish logic.
2. **Given** the token, **When** inspected, **Then** it is a granular automation token,
   not a classic token.

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

- What happens when a tag is pushed but CI build/test fails — is a partial publish
  possible? (It must not be.)
- What happens when two packages share the automation token and one needs it rotated?
- What happens on a pre-release that should never become `latest`?

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: Releases MUST publish via a GitHub Action triggered by a version tag;
  publishing from a developer machine MUST NOT be part of the path.
- **FR-002**: The npm token MUST be a granular automation token stored in CI secrets,
  wired once via a reusable org publish workflow inherited by every package.
- **FR-003**: The lockfile MUST be committed; CI MUST use `npm ci` and run `npm audit`.
- **FR-004**: Releases MUST follow SemVer with a CHANGELOG (or Changesets), `npm version`
  bumps, and a git tag per release.
- **FR-005**: A release runbook MUST define the `dist-tag` policy and mandate
  `npm deprecate` (never `unpublish`) for retiring versions.

### Key Entities

- **Reusable publish workflow**: the shared org-level CI workflow inherited per package.
- **Automation token**: the single granular token used by CI, stored as a secret.
- **Release runbook**: the documented dist-tag + deprecate policy.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A release is `git tag vX.Y.Z && git push --tags` and CI does the rest,
  reproducibly, with no local secrets.
- **SC-002**: A second package adopts CI publishing by referencing the reusable workflow,
  with no new publish logic authored.
- **SC-003**: A failed build/test in CI blocks the publish entirely (no partial release).

## Assumptions

- Phase 1's correct publish contract is already in place.
- SemVer + Changesets and CI-on-tag are the constitution's pinned defaults.
- Provenance, per-package tokens, and the wider install matrix are deferred to Phase 3.
