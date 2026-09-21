# Tasks: Phase 1 — Ship one package to prod, today

**Input**: Design documents from `/specs/001-phase-1-ship-one-package/`

**Prerequisites**: plan.md, spec.md (amended 2026-09-20), research.md, data-model.md, quickstart.md; Phase 0 on `main` (0.3.0).

**Tests**: the spec's SC-004 requires the contract check be tested against known-bad
shapes, and Constitution VI makes the smoke tests the definition of shippable; both
are tasks here.

**Organization**: by user story — US1 contract (+ the check), US2 files allowlist
(covered by US1's check + US4), US3 build gate, US4 smoke tests, US5 bootstrap docs +
the dormant workflows — then polish.

## Format: `[ID] [P?] [Story] Description`

---

## Phase 1: Setup

- [x] T001 Bump `package.json` version to `0.4.0`; add scripts `check:contract`, `smoke:pack`, `smoke:registry`; put `check:contract` into `check:all` before `test`; make `prepublishOnly` = `npm run build && npm run check:all && node scripts/check-publish-contract.mjs --exists`.
- [x] T002 In `scripts/init.mjs`, extend `ALLOWLIST` with the eight Phase 1 rows from `data-model.md` (`CLAUDE.md` from `CLAUDE.pkg.md`, substitute); in `generatePackageJson` make the `js` `prepublishOnly` = `npm run check:all && node scripts/check-publish-contract.mjs --exists`.
- [x] T003 [P] Add `.claude/worktrees/` to `.gitignore` (apparatus; harmless in a product).

---

## Phase 2: User Story 1 — Correct package.json publish contract (Priority: P1) 🎯 MVP

- [x] T004 [US1] Create `scripts/check-publish-contract.mjs`: read `package.json` from `--cwd` (default `process.cwd()`); assert the shape rows in `data-model.md`; with `--exists` also assert every `files` entry and `bin` path exists; print every failure with the field and the rule it breaks (including "a library must install on the next Node — a bound is a recorded deviation"); exit 1 on any failure, 0 silently otherwise; no dependencies.
- [x] T005 [P] [US1] Create `tests/machinery/contract.test.ts`: for each known-bad shape (prefixed `bin`, missing `./package.json` export, `engines.node: ">=24 <25"`, `type` missing, `files` missing, `prepublishOnly` missing) write a temp `package.json` and assert exit 1 + the field named; assert exit 0 on the template root and on both spin-out outputs; assert `--exists` fails when a `files` entry is absent.

---

## Phase 3: User Story 3 — Build gate on publish (Priority: P2)

- [x] T006 [US3] Verify `prepublishOnly` in the `ts` spin-out runs build → `check:all` → `--exists` by `npm publish --dry-run` in the machinery `ts` test (dry-run still runs `prepublishOnly`); assert `dist/` exists afterwards and the dry-run's file list has no `.env`.

---

## Phase 4: User Story 4 — npm pack smoke test (Priority: P1)

- [x] T007 [US4] Create `scripts/smoke-pack.mjs` per `data-model.md`'s sequence: plant/restore the decoy `.env`, `npm pack --json`, assert `.env` absent and `package.json`/README/LICENSE present, throwaway consumer install by tarball, import by name, run `bin` via `node_modules/.bin/<key>` when present; always clean up; clear one-line progress output; exit 1 with the reason on any failure.
- [x] T008 [US4] Create `scripts/smoke-registry.mjs` per `data-model.md`'s sequence: free port, Verdaccio config with `publish: $anonymous` on `@snackbyte/*`, `npx --yes verdaccio@6`, poll `/-/ping`, project-local `.npmrc` (registry + dummy token), `npm publish --access public`, consumer install by name from the local registry, import + `bin`; `finally`: delete `.npmrc`, kill Verdaccio, remove temp; refuse to start if a `.npmrc` already exists in the package root.
- [x] T009 [US4] Extend `tests/machinery/resolver-ts.test.ts` and `resolver-js.test.ts`: after `check:all` (and `build` in ts), run `npm run smoke:pack` in the spin-out and assert exit 0 and that no `.env` remains.
- [x] T010 [US4] Add `tests/machinery/registry.test.ts`: skipped unless `SMOKE_REGISTRY=1`; spins out `ts` + `--cli`, installs, runs `npm run smoke:registry`, asserts exit 0 and no `.npmrc` left.

---

## Phase 5: User Story 5 — Bootstrap publish + docs, and the dormant workflows (Priority: P2)

- [x] T011 [P] [US5] Create `RELEASING.md`: (1) bootstrap publish — `npm run smoke:pack`, `npm run smoke:registry`, then `npm publish --access public` with 2FA, once; (2) configure the trusted publisher on npmjs.com (org/user, repo, `release.yml`); (3) the ritual — bump `version`, merge to `main`, the action tags, CI publishes; a forgotten bump fails loudly; (4) deprecate, never unpublish (`npm deprecate <pkg>@<v> "<why>"`), roll forward; (5) dist-tags — a `next` channel is a row in `environments.json` with `tagSuffix: "-next"` + `npm publish --tag next`; (6) when a run fails after tagging.
- [x] T012 [P] [US5] Create `CLAUDE.pkg.md` (→ product `CLAUDE.md`): this is a published package; the contract is load-bearing and checked (`check:contract`); `check:all` green at every step; `smoke:pack` before any publish, `smoke:registry` before the bootstrap; never unpublish; `.npmrc` is never committed; releases are bump-and-merge, never `npm publish` from a machine after the bootstrap.
- [x] T013 [P] [US5] Create the template's own `CLAUDE.md`: a template guard ("spin out; don't edit this repo to build a package"), the layout (root = ts product, `variants/js/`, `scripts/init.mjs` owns the allowlist, `tests/machinery/`), every-merge-is-a-version, the Spec Kit workflow, and that the product's agent file is `CLAUDE.pkg.md`.
- [x] T014 [US5] Rewrite `.github/workflows/release.yml`: Recipe B + `permissions: id-token: write`; `setup-node@v5` Node 24 + `registry-url`; `npm install -g npm@latest`; a `pkg` step exporting `private` from `package.json`; `npm ci`; the release-flow action (`package-json`); publish step `if: steps.release.outputs.is-env == 'true' && steps.pkg.outputs.private != 'true'` running `npm publish --access public` with no `NODE_AUTH_TOKEN`; an else-step that prints "private package: tagged, not published".
- [x] T015 [P] [US5] Create `.github/workflows/ci.yml`: on `pull_request` and on `push` to non-`main` branches; `setup-node@v5` Node 24 with npm cache; `npm ci`; `npm run check:all`.
- [x] T016 [US5] `README.pkg.md`: add a "Releasing" pointer to `RELEASING.md`. Template `README.md`: status → Phase 1 built; list the smoke scripts and the runbook.

---

## Phase 6: Polish

- [x] T017 Update Phase 0's `data-model.md` note ("Phase 1 extends this table with …") to match the final list; keep `scripts/init.d.mts` in step if `ALLOWLIST`'s type changes (it doesn't).
- [x] T018 `npm run check:all` green at the root; `SMOKE_REGISTRY=1 npx vitest run tests/machinery/registry.test.ts` green once by hand; quickstart §3–§4 walked by hand; outputs into the PR.
- [x] T019 Commit, push, PR (unit 3 of 3, → 0.4.0).

## Dependencies

T001–T003 → T004 → T005 ∥ T007 → T008 → T009/T010 → T011–T016 → polish. T006 folds into T009's ts test.
