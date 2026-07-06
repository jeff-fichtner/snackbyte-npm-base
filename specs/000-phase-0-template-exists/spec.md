# Feature Specification: Phase 0 — The template exists

**Feature Branch**: `000-phase-0-template-exists`

**Created**: 2026-07-05

**Status**: Draft

**Input**: Converted from `PHASES.md` → Phase 0. Goal: `snackbyte-npm-base` is a real
template you can spin a package out of, the way you spin an app out of `snackbyte-base`.

> **Stub note:** This is a phase stub converted from the original `PHASES.md` roadmap.
> The user stories below are the phase's checklist items reframed as independently
> testable journeys. Refine with `/speckit-clarify` and `/speckit-plan` before
> implementing.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Repo skeleton exists (Priority: P1)

A developer opens `snackbyte-npm-base` and finds the standard layout of a publishable
package — `src/`, `tests/`, `README.md`, `LICENSE`, `package.json` — so the template is
recognizably package-shaped and ready to spin out.

**Why this priority**: Nothing downstream (spin-up, working export, checks) exists
without the skeleton. It is the foundation of the template.

**Independent Test**: Clone the repo; confirm the skeleton files/dirs are present and
`package.json` parses and describes a scoped `@snackbyte/PACKAGE_NAME` placeholder.

**Acceptance Scenarios**:

1. **Given** a fresh clone, **When** listing the tree, **Then** `src/`, `tests/`,
   `README.md`, `LICENSE`, and `package.json` all exist.
2. **Given** `package.json`, **When** inspected, **Then** it uses a `@snackbyte/`
   placeholder name, ESM `type`, and the pinned Node floor from the constitution.

---

### User Story 2 - Spin-up / resolver step (Priority: P1)

A developer spinning out a new package runs a resolver step (mirroring
`snackbyte-base`'s `SPIN-UP.md`) that renames `@snackbyte/PACKAGE_NAME` → the real
package name, strips the "you're in the template" guard, and sets author/repo fields —
so a spin-out is a real package, not a template clone.

**Why this priority**: Without the resolver, every spin-out re-does manual find/replace
and risks shipping template placeholders. This is the core "handles the basics" value.

**Independent Test**: Run the resolver against a throwaway name; confirm no
`PACKAGE_NAME` / template-guard strings remain and author/repo/name fields are set.

**Acceptance Scenarios**:

1. **Given** the template, **When** the resolver runs with a target package name,
   **Then** all `@snackbyte/PACKAGE_NAME` occurrences become the real name.
2. **Given** a resolved package, **When** searched, **Then** the "you're in the
   template" guard is gone and `repository`/`author` fields are populated.

---

### User Story 3 - A trivial working export (Priority: P2)

A fresh spin-out ships a trivial working export (`hello()` or a stub CLI) so it builds,
tests, and runs green immediately — proving the wiring end to end before any real code
is written.

**Why this priority**: Proves the toolchain works before anyone invests in real code;
catches wiring errors at spin-up, not mid-feature. Depends on the skeleton (P1).

**Independent Test**: Spin out, then run build + test + invoke the export; all pass on
a clean machine.

**Acceptance Scenarios**:

1. **Given** a fresh spin-out, **When** `npm run build && npm test` run, **Then** both
   pass with the stub export.
2. **Given** the stub export/CLI, **When** invoked, **Then** it returns/prints the
   expected trivial output.

---

### User Story 4 - Docs explain the inherit model (Priority: P3)

A developer reads a short `README` (and the phase specs that replaced `PHASES.md`) and
understands the inherit-and-it-handles-the-basics model and which phase to adopt.

**Why this priority**: Onboarding clarity. Valuable but not blocking the template from
functioning.

**Independent Test**: A developer unfamiliar with the repo can, from the README alone,
state when to use this template vs `snackbyte-base` and where the phase roadmap lives.

**Acceptance Scenarios**:

1. **Given** the README, **When** read, **Then** it explains the inherit model and
   points to the `specs/` phase stubs as the roadmap.

### Edge Cases

- What happens when the resolver is run twice, or on an already-resolved package?
- What happens if a spin-out forgets to run the resolver and publishes template
  placeholders? (The template guard should make this loud, not silent.)

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The template MUST provide the standard package skeleton: `src/`,
  `tests/`, `README.md`, `LICENSE`, `package.json`.
- **FR-002**: `package.json` MUST use a scoped `@snackbyte/PACKAGE_NAME` placeholder,
  ESM `type`, and the constitution's Node floor.
- **FR-003**: The template MUST provide a spin-up/resolver step that renames the
  package, strips the template guard, and sets author/repo fields.
- **FR-004**: A fresh spin-out MUST include a trivial working export (`hello()` or stub
  CLI) that builds, tests, and runs green with no tooling changes.
- **FR-005**: The template MUST include a short README explaining the inherit model and
  linking the phase specs.

### Key Entities

- **Template placeholder**: the `@snackbyte/PACKAGE_NAME` name + template guard that the
  resolver rewrites.
- **Resolver**: the spin-up step that turns the template into a real package.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Spinning the template out yields a package that passes `npm run check:all`
  with zero tooling changes.
- **SC-002**: The spun-out package can be `npm pack`'d successfully without editing any
  configuration.
- **SC-003**: After the resolver runs, zero `PACKAGE_NAME` / template-guard strings
  remain anywhere in the spin-out.

## Assumptions

- The resolver mirrors the shape of `snackbyte-base`'s `SPIN-UP.md`.
- ESM-only and the app Node floor (`>=24`) are the defaults per the constitution.
- `check:all` (lint + typecheck + test) is the standard check gate for spin-outs.
