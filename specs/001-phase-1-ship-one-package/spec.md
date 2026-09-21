# Feature Specification: Phase 1 — Ship one package to prod, today

**Feature Branch**: `001-phase-1-ship-one-package`

**Created**: 2026-07-05

**Status**: Draft

**Input**: Converted from `PHASES.md` → Phase 1 (MVP / immediate use). Goal: the floor —
inherit the template, write your code, publish a *correct* package. No CI or provenance
yet, but nothing here is wrong, only minimal. This is the phase that answers "I just
want to package spec-html and use it."

> **Stub note:** Phase stub converted from `PHASES.md`. Refine with `/speckit-clarify`
> and `/speckit-plan` before implementing. First graduate: `@snackbyte/spec-render`
> (published 0.1.0 on 2026-07-06, before this template existed; its `DECISIONS.md` is
> the source of the acceptance criteria below and it re-aligns to the template by a
> conformance PR once this phase lands).

> **Amended 2026-09-20** under constitution v1.1.0: TypeScript is the default source
> mode; CI publishes by trusted publishing; the first publish of a new package is a
> bootstrap. See the constitution's amendment log for why.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Correct package.json publish contract (Priority: P1)

A package author fills in a `package.json` whose publish surface is correct: scoped
`name`, `version` starting at `0.1.0`, `description`, an `exports` map (not just
`main`) that also exports `./package.json`, ESM `type`, `engines.node: ">=24"` with no
upper bound, `bin` if it's a CLI with **bare** paths (no `./` prefix — npm strips a
prefixed path silently on publish and ships a package with no CLI; only the real
registry catches it), a `files` allowlist, and `repository`/`license`/`keywords` — so
consumers can import it and nothing silently breaks.

The template ships a **publish-contract check** that asserts all of this and runs in
`check:all`, so drift from the contract fails in every spin-out's CI instead of on the
registry.

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
4. **Given** a `bin` path with a `./` prefix, or an `exports` map without
   `./package.json`, or an `engines.node` with an upper bound, **When** `check:all`
   runs, **Then** the publish-contract check fails loudly.

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

A package author runs the shipped `smoke:pack` script: pack the tarball, install it in
a *separate* throwaway project, import the export and run the `bin` — testing what
users actually get rather than the working tree. A second shipped script,
`smoke:registry`, goes one step further with no credentials and nothing ever published
to npmjs.org: a throwaway local registry (Verdaccio) with a read-only proxy for
everything outside our scope, the *real* `npm publish` code path (so `prepublishOnly`
fires), then `npm install` **by name** into a fresh project — the package's runtime
dependencies resolving through the proxy — and run. A project-local `.npmrc` carries the local registry's dummy token and is
git-ignored, so it can neither be committed nor redirect a real publish.

**Why this priority**: Constitution VI — correctness is proven against the artifact, not
the source. This is the minimum bar before a package is shippable.

**Independent Test**: Pack → install the tarball in a scratch project → import/run;
confirm success on a clean machine.

**Acceptance Scenarios**:

1. **Given** the packed tarball, **When** installed in a clean project and the export is
   imported/run, **Then** it works with no reference to the source tree.
2. **Given** a decoy `.env` planted in the working tree, **When** packed, **Then** it is
   absent from the tarball.
3. **Given** `smoke:registry`, **When** run, **Then** the package publishes to the local
   registry through `prepublishOnly`, installs by name into a fresh project with its
   runtime dependencies, and runs — and nothing is published to npmjs.org. *(Amended
   2026-09-20: the first version proxied nothing, so a package with dependencies could
   not install by name; caught before the first real graduate used it.)*

---

### User Story 5 - Manual publish + docs (Priority: P2)

A package author performs the **bootstrap publish** — the first publish of a new
package, once, from their machine, `npm publish --access public` (or `--access
restricted` for private) with 2FA on the account — and ships a README (install + usage)
and an MIT LICENSE. This is the one publish that cannot be CI: a trusted publisher
(Phase 2) can only be configured on a package that already exists on npm. The
`RELEASING.md` runbook names it as step one, so no agent treats it as an exception.

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
  `description`, an `exports` map that includes `./package.json`, ESM `type`,
  `engines.node: ">=24"` with no upper bound, `bin` (if a CLI) with bare paths, a
  `files` allowlist, and `repository`/`license`/`keywords`.
- **FR-002**: The published tarball MUST contain only allowlisted files and MUST NOT
  contain `node_modules`, tests, `.env`, or scratch.
- **FR-003**: Compiling packages MUST run build + test via `prepublishOnly` before
  publish.
- **FR-004**: The package MUST pass the shipped `smoke:pack` script: packed, installed in
  a clean project, and run, with a planted decoy `.env` proven absent.
- **FR-005**: The first publish of a new package MUST be the bootstrap: manual
  `npm publish` with the correct `--access` and 2FA on the account, documented as step
  one of `RELEASING.md`; the package MUST ship an MIT LICENSE and an install+usage
  README.
- **FR-006**: `check:all` MUST include a publish-contract check that asserts
  `type: module`, `exports` includes `./package.json`, `files` is present, every `bin`
  path is bare and exists, `engines.node` is set with no upper bound, and
  `prepublishOnly` is wired.
- **FR-007**: The template MUST ship `smoke:registry` — local-registry publish, install
  by name, run — with the local registry's `.npmrc` git-ignored.
- **FR-008**: The template MUST ship a `RELEASING.md` runbook (bootstrap publish,
  trusted-publisher setup, the bump-and-merge ritual, deprecate-never-unpublish,
  dist-tags) and a package-level `CLAUDE.md` carrying the publish-contract,
  smoke-before-publish and never-unpublish rules for agents.

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
- **SC-004**: The publish-contract check fails on each of the known-bad shapes
  (prefixed `bin`, missing `./package.json` export, bounded `engines`) and passes on the
  template's own output in both source modes.

## Assumptions

- ESM-only, MIT, scoped `@snackbyte/*`, public-by-default per the constitution's Principle V.
- CI publishing, changelogs, and dual ESM/CJS are explicitly **deferred** to later
  phases — not needed to be *correct*, only to be *automated*. The OIDC `release.yml`
  and a PR check workflow ship *dormant* with the template so a spin-out is one
  bootstrap publish and one trusted-publisher configuration away from Phase 2.
- `@snackbyte/spec-render` is the first graduate. It was published by hand before this
  template existed; its `DECISIONS.md` (in its repo) is the source of FR-001, FR-004
  and FR-007 and of the `bin` gotcha FR-006 exists to catch, and it adopts the
  template's scripts and workflow by a conformance PR after this phase lands.
- `@snackbyte/auth-client` (TypeScript, in `snackbyte-auth/packages/client-node/`) is
  the second graduate and the reason `ts` mode exists; it will need the subdirectory
  recipe, which is out of scope here.
