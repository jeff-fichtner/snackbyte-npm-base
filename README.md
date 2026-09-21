# snackbyte-npm-base

The **npm-library template** for the snackbyte ecosystem — the sibling of
[`snackbyte-base`](../snackbyte-base) (which is the template for _web apps / sites_).
Spin a package out of this and the basics are handled: the `package.json` publish
contract, the check gate, TypeScript by default, and — from Phase 1 — the smoke tests
and a CI publish path with no token anywhere. You never re-solve `exports`, `files`, or
provenance from scratch again.

> **Status:** Phases 0 and 1 built — the template spins out in both modes, and a
> spin-out is shippable: a publish-contract check in its gate, `smoke:pack` and
> `smoke:registry`, a dormant OIDC release workflow, a PR check workflow, the runbook,
> and the subdirectory recipe. Phase 2 (the reusable publish workflow, SemVer
> discipline) is next, when a third package exists. The
> roadmap is the [Spec Kit](https://github.com/github/spec-kit) specs under
> [`specs/`](./specs), governed by the [constitution](./.specify/memory/constitution.md).

## Spin out a package

```bash
node scripts/init.mjs --name=<pkg> --repo=<url> --out=<dir> [--source=ts|js] [--cli]
```

Writes a complete package to `<dir>` — a new repo, or `packages/<name>` inside an
existing one — and never touches this checkout. **[`SPIN-UP.md`](./SPIN-UP.md)** is
the handoff: every flag, what a spin-out contains, the first run, and how to add Spec
Kit afterwards.

Two source modes. **`ts` is the default** — everything is TypeScript unless it cannot
be. `js` (source-shipped `.mjs`, no build) is the explicit opt-out, with the reason
recorded in that package's spec or plan.

## The model

- **Web app / site?** → spin out of `snackbyte-base`.
- **Publishable npm library / CLI?** → spin out of `snackbyte-npm-base` (this).

Inherit it, run the resolver, write your code, ship. Adopt only the phase you need:
Phase 1 ships one correct package today; later phases add automation and supply-chain
rigour as a package earns more consumers.

## What to read

- **[Constitution](./.specify/memory/constitution.md)** (v1.1.0) — the non-negotiable
  principles (correct-from-day-one, the load-bearing publish contract,
  deprecate-never-unpublish, no laptop publishes) and the pinned defaults (scope,
  source mode, module format, license, publish path, Node floor).
- **[`SPIN-UP.md`](./SPIN-UP.md)** — the resolver handoff.
- **[`SUBDIR-LAYOUT.md`](./SUBDIR-LAYOUT.md)** — when the package shares a repository
  with another releasable.
- **[`specs/`](./specs)** — the staged roadmap, one spec per phase:
  - [`000-phase-0-template-exists`](./specs/000-phase-0-template-exists/spec.md) — the template itself **(built)**
  - [`001-phase-1-ship-one-package`](./specs/001-phase-1-ship-one-package/spec.md) — ship one correct package today **(built)**
  - [`002-phase-2-repeatable-safe`](./specs/002-phase-2-repeatable-safe/spec.md) — CI publish by trusted publishing, SemVer discipline
  - [`003-phase-3-trustworthy-scale`](./specs/003-phase-3-trustworthy-scale/spec.md) — audited deps, install matrix, hygiene docs
  - [`004-phase-4-fleet-ecosystem`](./specs/004-phase-4-fleet-ecosystem/spec.md) — shared release tooling across packages

## How this repo is laid out

The root **is** a valid `ts`-mode package — `src/`, `tests/`, the configs — so the
template proves its default shape with its own gate. `variants/js/` holds the files that
differ in `js` mode. `scripts/init.mjs` owns the product allowlist and does the spin-out;
`tests/machinery/` spins out into temp directories in both modes and asserts the tree,
the contract, and a green `check:all` + `smoke:pack` in each (`SMOKE_REGISTRY=1` opts
the Verdaccio round-trip in). `CLAUDE.pkg.md` becomes a spin-out's `CLAUDE.md`. Everything under `specs/`, `.specify/`,
`.claude/`, `scripts/`, `variants/` and `tests/machinery/`, plus this file and
`SPIN-UP.md`, is apparatus: it develops the template and never reaches a spin-out.

```bash
npm install
npm run check:all      # format, lint, typecheck, tests — including the spin-out round-trips
```

## Working with the specs

This repo is Spec Kit-driven. Each phase is a spec, refined and implemented with the
Spec Kit skills (`/speckit-clarify`, `/speckit-plan`, `/speckit-tasks`,
`/speckit-implement`); plans are checked against the constitution. Releases of the
template itself: bump `package.json`'s version, merge to `main`; the release-flow
action tags it (it is `private: true`, so a tag is all a release is here).

## Guiding rule

Assume nobody will ever download it; build every package as if a million people will.
The discipline is cheap up front and prevents the irreversible mistakes (a leaked
secret in a tarball, a wrong `exports`, an unpublishable bad version).

## What it does not do yet

Each item is a phase spec, so a package that needs it reports back rather than building
its own. A spin-out's `CLAUDE.md` says the same to the agent working there.

- **Phase 2** — Changesets for the bump + changelog; one reusable publish workflow that
  every package calls (npm matches a trusted publisher by the _calling_ workflow's
  filename, verified); a dist-tag policy. Triggered by a third package, or by the first
  template-wide workflow change.
- **Phase 3** — Dependabot/Renovate, the Node install matrix, `SECURITY.md` and
  contribution notes. Triggered by interest you can attribute to someone you don't know.
- **Phase 4** — fleet-wide policy propagation. Not soon.

Covered, since 0.6.0: a package that shares a repository with another releasable —
[`SUBDIR-LAYOUT.md`](./SUBDIR-LAYOUT.md), on top of the release-flow action's
`tag-prefix` and `package-json` inputs (1.1.0).

## Graduates

- **`@snackbyte/spec-render`** — the first, published by hand before this template
  existed. Its `DECISIONS.md` is the raw material Phase 1 was extracted from; it
  re-aligns to the template by a conformance PR once Phase 1 lands.
- **`@snackbyte/auth-client`** — the second, TypeScript, and the reason `ts` mode is
  the default. It will live in a subdirectory of `snackbyte-auth`, by
  [`SUBDIR-LAYOUT.md`](./SUBDIR-LAYOUT.md).
