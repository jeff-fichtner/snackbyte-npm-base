# Feature Specification: Phase 1 — Ship one package to prod, today

**Feature Branch**: `001-phase-1-ship-one-package`

**Created**: 2026-07-05

**Status**: Draft

**Input**: Converted from `PHASES.md` → Phase 1 (MVP / immediate use). Goal: the floor —
inherit the template, write your code, publish a *correct* package. No CI or provenance
yet, but nothing here is wrong, only minimal. This is the phase that answers "I just
want to package spec-html and use it."

> **Stub note:** Phase stub converted from `PHASES.md`. Refine with `/speckit-clarify`
> and `/speckit-plan` before implementing. First intended graduate: `@snackbyte/spec-html`.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Correct package.json publish contract (Priority: P1)

A package author fills in a `package.json` whose publish surface is correct: scoped
`name`, `version` starting at `0.1.0`, `description`, an `exports` map (not just
`main`), ESM `type`, `engines.node` floor, `bin` if it's a CLI, a `files` allowlist,
and `repository`/`license`/`keywords` — so consumers can import it and nothing silently
breaks.

**Why this priority**: The publish contract is load-bearing (Constitution II). A wrong
`exports` or a missing `files` allowlist breaks consumers with no local error. This is
the irreducible core of Phase 1.

**Independent Test**: Inspect `package.json`; import the package by each advertised
`exports` path from a clean project and confirm resolution.

**Acceptance Scenarios**:

1. **Given** the package, **When** imported via each `exports` entry, **Then** every
   entry resolves to a real module.
2. **Given** `package.json`, **When** inspected, **Then** `name` is scoped, `version`
   is `0.1.0`, `type` is `module`, `engines.node` is set, and `files` is an allowlist.
3. **Given** a CLI package, **When** the `bin` entry is invoked, **Then** it runs.

---

### User Story 2 - files / .npmignore discipline (Priority: P1)

A package author guarantees the published tarball contains only what it should
(`dist/`/`src/` + README + LICENSE) and never `node_modules`, tests, `.env`, or scratch
— so no secret is ever leaked in a publish.

**Why this priority**: A leaked secret in a tarball is the #1 irreversible mistake
(Constitution II) — `unpublish` is blocked after 72h. This must be right on the first
publish.

**Independent Test**: `npm pack --dry-run` (or pack + inspect the tarball) and diff the
contents against the intended allowlist.

**Acceptance Scenarios**:

1. **Given** the package, **When** packed, **Then** the tarball contains exactly the
   allowlisted files and no `node_modules`, tests, `.env`, or scratch.
2. **Given** a stray `.env` in the working tree, **When** packed, **Then** it is NOT in
   the tarball.

---

### User Story 3 - Build gate on publish (Priority: P2)

For a package that compiles, `prepublishOnly` runs build + test so a stale or broken
artifact can never be published.

**Why this priority**: Prevents publishing a broken artifact, but only applies to
compiling packages and only bites at publish time. Depends on the contract (P1).

**Independent Test**: Break a test, attempt a (dry-run) publish, confirm it is blocked.

**Acceptance Scenarios**:

1. **Given** a failing test, **When** publish is attempted, **Then** `prepublishOnly`
   blocks it.
2. **Given** a package needing a build, **When** publish is attempted, **Then** the
   build runs first and the tarball reflects the built output.

---

### User Story 4 - npm pack smoke test (Priority: P1)

A package author packs the tarball, installs it in a *separate* clean project, and runs
it — testing what users actually get rather than the working tree.

**Why this priority**: Constitution VI — correctness is proven against the artifact, not
the source. This is the minimum bar before a package is shippable.

**Independent Test**: Pack → install the tarball in a scratch project → import/run;
confirm success on a clean machine.

**Acceptance Scenarios**:

1. **Given** the packed tarball, **When** installed in a clean project and the export is
   imported/run, **Then** it works with no reference to the source tree.

---

### User Story 5 - Manual publish + docs (Priority: P2)

A package author publishes manually (`npm publish --access public`, or `--access
restricted` for private), with 2FA on the account, and ships a README (install + usage)
and an MIT LICENSE.

**Why this priority**: Manual publish is explicitly acceptable at Phase 1; automation is
deferred to Phase 2. Docs/LICENSE are needed for a real consumer but not for correctness
of the artifact.

**Independent Test**: After publish, `npm install @snackbyte/<pkg>` in a clean project
works; the README's usage example runs as written.

**Acceptance Scenarios**:

1. **Given** a published package, **When** `npm install @snackbyte/<pkg>` runs in a
   clean project, **Then** it installs and the README example works.
2. **Given** the repo, **When** inspected, **Then** an MIT `LICENSE` and a
   install+usage `README` are present.

### Edge Cases

- What happens on a publish where `exports` is set but a referenced file isn't in the
  `files` allowlist? (Consumer import fails though local dev worked.)
- What happens if 2FA is not enabled on the publishing account?
- Public vs restricted: what is the default and how is it chosen deliberately?

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: `package.json` MUST specify scoped `name`, `version` (`0.1.0` start),
  `description`, an `exports` map, ESM `type`, `engines.node`, `bin` (if a CLI), a
  `files` allowlist, and `repository`/`license`/`keywords`.
- **FR-002**: The published tarball MUST contain only allowlisted files and MUST NOT
  contain `node_modules`, tests, `.env`, or scratch.
- **FR-003**: Compiling packages MUST run build + test via `prepublishOnly` before
  publish.
- **FR-004**: The package MUST pass an `npm pack` smoke test: packed, installed in a
  clean project, and run.
- **FR-005**: The package MUST publish via manual `npm publish` with the correct
  `--access` and 2FA on the account, and MUST ship an MIT LICENSE and an install+usage
  README.

### Key Entities

- **Publish contract**: the `package.json` fields consumers depend on (`exports`,
  `files`, `version`, `engines`, `bin`).
- **Tarball**: the packed artifact — the thing correctness is proven against.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: `npm install @snackbyte/<pkg>` in a clean project works with no manual
  fixups.
- **SC-002**: The tarball contains exactly the intended files — verified by the pack
  smoke test — and zero secrets or scratch.
- **SC-003**: Every advertised `exports` path resolves from a clean consumer project.

## Assumptions

- ESM-only, MIT, scoped `@snackbyte/*`, public-by-default per the constitution's Principle V.
- CI, provenance, changelogs, and dual ESM/CJS are explicitly **deferred** to later
  phases — not needed to be *correct*, only to be *automated*.
- `@snackbyte/spec-html` (currently in `snackbyte-base/scripts/`) is the first intended
  graduate and the proof-of-concept for this phase.
