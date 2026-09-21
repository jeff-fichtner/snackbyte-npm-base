# Implementation Plan: Phase 1 — Ship one package to prod, today

**Branch**: `001-phase-1-ship-one-package` (worktree `worktree-001-phase-1`) | **Date**: 2026-09-20 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `/specs/001-phase-1-ship-one-package/spec.md`, as
amended 2026-09-20 under constitution v1.1.0. Builds on Phase 0 (`main` at 0.3.0).

## Summary

Make a spin-out *shippable*: a publish-contract check in `check:all` so the contract
cannot drift silently; two shipped smoke tests — `smoke:pack` (pack → install in a
throwaway → run, decoy `.env` proven absent) and `smoke:registry` (a throwaway local
registry, the real `npm publish` code path, install by name, run); the dormant OIDC
`release.yml` with a gate on `package.json`'s `private` (one file: the template tags,
a product publishes); a PR check workflow; `RELEASING.md` (bootstrap first, then the
trusted publisher, then bump-and-merge); and a package-level `CLAUDE.md`. All of it on
the product allowlist, all of it exercised by the machinery tests in both modes.

## Technical Context

**Language/Version**: Node 24; scripts are dependency-free ESM `.mjs` so they run in
either mode; workflows target `actions/setup-node@v5` with Node 24.

**Primary Dependencies**: none added to `devDependencies`. Verdaccio is invoked with
`npx --yes verdaccio@6` at run time by `smoke:registry` only — it is large and used
rarely, so it must not be an install cost for every spin-out.

**Storage**: N/A.

**Testing**: Vitest. New machinery coverage: the contract check against known-bad
shapes (SC-004); `smoke:pack` run inside both spin-outs; `smoke:registry` run inside
the `ts` spin-out when `SMOKE_REGISTRY=1` (downloads Verdaccio; opt-in for the gate,
run by hand for the PR evidence).

**Target Platform**: any Node 24 machine with registry access; GitHub Actions for the
workflows.

**Project Type**: single project (the template repo).

**Constraints**: the workflows cannot be *proven* here — this repo is `private: true`
and `main`'s release run must keep tagging without publishing; the OIDC publish path is
proven on the first real graduate (spec-render's conformance PR). Everything runnable
locally is run locally.

## Constitution Check

| Principle | How this plan satisfies it | Status |
|---|---|---|
| I. Correct from day one | The contract check runs in every `check:all`; smoke tests are scripts, not procedures. | pass |
| II. Publish contract load-bearing | `check-publish-contract.mjs` asserts the contract; `--exists` at `prepublishOnly` proves every `files`/`bin` path is on disk after the build. | pass |
| III. Deprecate, never unpublish | `RELEASING.md` codifies it; `CLAUDE.md` tells agents. | pass |
| IV. No laptop publishes | `release.yml` is OIDC (`id-token: write`, no token); the bootstrap is named as step one of the runbook. | pass |
| V. Deliberate defaults | Nothing new decided; `ts` default unchanged. | pass |
| VI. Test what users get | `smoke:pack` tests the tarball; `smoke:registry` tests by-name install through the real publish path. | pass |

No violations.

## Project Structure

### Documentation (this feature)

```text
specs/001-phase-1-ship-one-package/
├── spec.md · plan.md · research.md · data-model.md · quickstart.md · tasks.md
```

### Source Code (repository root) — additions to Phase 0

```text
scripts/
├── check-publish-contract.mjs   # product: shape check; --exists adds on-disk checks
├── smoke-pack.mjs               # product
├── smoke-registry.mjs           # product
└── init.mjs                     # ALLOWLIST grows by the eight product paths below
.github/workflows/
├── release.yml                  # product: OIDC publish, gated on package.json private
└── ci.yml                       # product: npm ci + check:all on PRs
environments.json                # product (already exists; one release channel)
RELEASING.md                     # product
CLAUDE.pkg.md                    # → product CLAUDE.md (resolver substitutes the name)
CLAUDE.md                        # apparatus: the template's own guard + layout
tests/machinery/
├── contract.test.ts             # SC-004: known-bad shapes fail, both modes pass
└── resolver-*.test.ts           # + run smoke:pack in each spin-out; smoke:registry opt-in
```

**Structure Decision**: unchanged from Phase 0; this phase is additive.

## Key design points

1. **Contract check, two levels.** Shape (`type`, `exports["./package.json"]`, `files`
   present and an array, every `bin` value bare and relative, `engines.node` set and
   without `<`/upper bound, `prepublishOnly` wired) runs in `check:all`. `--exists`
   additionally asserts every `files` entry and every `bin` path exists on disk; it runs
   in `prepublishOnly` after the build, where `dist/` exists. The template root passes
   the shape check on itself.
2. **`release.yml` gated on `private`, not a marker.** One workflow file, copied
   verbatim, exercised by this repo's own `main`. A step reads `package.json`; the
   publish step runs only when `is-env == 'true'` **and** `private != 'true'`. A
   product accidentally left private skips with a message instead of failing.
3. **npm ≥ 11.5 for OIDC.** The publish job runs `npm install -g npm@latest` before
   publishing. Recorded as a thing to re-verify when spec-render adopts the workflow.
4. **`smoke:registry` is credential-free and offline from npmjs.org.** Verdaccio on a
   free localhost port with `publish: $anonymous` on `@snackbyte/*`; a project-local
   `.npmrc` (git-ignored) carries `registry=` and a dummy `_authToken`; the script
   removes it on exit, success or failure, so it can never redirect a real publish.
5. **The bootstrap is step one of the runbook**, with the trusted-publisher setup as
   step two and the bump-and-merge ritual as the steady state.

## Complexity Tracking

None.
