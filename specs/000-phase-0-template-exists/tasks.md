# Tasks: Phase 0 — The template exists

**Input**: Design documents from `/specs/000-phase-0-template-exists/`

**Prerequisites**: plan.md, spec.md (amended 2026-09-20), research.md, data-model.md, quickstart.md

**Tests**: The spec's FR-007 and SC-001–003 require machinery tests that spin the
template out and assert against the result; those tests are tasks here. No other tests
are requested beyond the product's one stub test.

**Organization**: by user story (US1 skeleton → US3 stub export → US2 resolver → US4
docs), then polish. US3 precedes US2 in execution because the resolver copies the
stub; the story numbers are the spec's.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: US1 skeleton · US2 resolver · US3 stub export · US4 docs
- Single project; paths are from the repository root

---

## Phase 1: Setup (shared infrastructure)

**Purpose**: the template root becomes a valid `ts`-mode package with the standard gate.

- [x] T001 Rewrite `package.json`: name `@snackbyte/PACKAGE_NAME`, `private: true`, `version` `0.3.0` (this unit's bump), `type: module`, `engines.node: ">=24"`, `license: MIT`, `author: "Jeff Fichtner"`, ts-mode `exports`/`files`/`scripts` (`build`, `typecheck`, `lint`, `format`, `format:check`, `test`, `check:all`, `prepublishOnly`, plus template-only `init`), devDependencies (`typescript`, `vitest`, `eslint`, `@eslint/js`, `typescript-eslint`, `globals`, `eslint-config-prettier`, `prettier`, `@types/node`) at the versions `snackbyte-base` and `spec-render` use.
- [x] T002 [P] Add `.prettierrc.json` and `.prettierignore` (ignore `dist/`, `node_modules/`, `.specify/`, `.claude/`, `specs/**/*.html`, `package-lock.json`) matching spec-render's settings.
- [x] T003 [P] Add `eslint.config.js` (flat: `@eslint/js` recommended + `typescript-eslint` recommended + node globals + `eslint-config-prettier` last; ignore `dist/`, `variants/`, `.specify/`).
- [x] T004 [P] Add `tsconfig.json` (typecheck: `noEmit`, `strict`, `module`/`moduleResolution` `NodeNext`, `target` `ES2023`, include `src`, `tests`) and `tsconfig.build.json` (extends it; `noEmit: false`, `declaration: true`, `outDir: dist`, `rootDir: src`, include `src` only).
- [x] T005 [P] Extend `.gitignore` with `dist/`, `coverage/`, `.npmrc`, and keep the existing entries.
- [x] T006 Run `npm install` at the root and commit `package-lock.json`.

---

## Phase 2: Foundational

**Purpose**: things every story below copies or asserts against.

- [x] T007 Add `LICENSE` (MIT, 2026, Jeff Fichtner).
- [x] T008 Add `README.pkg.md` — the product README skeleton: `# @snackbyte/PACKAGE_NAME`, install (`npm install @snackbyte/PACKAGE_NAME`), a usage block importing `hello`, a CLI line marked for `--cli` spin-outs, and a one-line "released from CI by trusted publishing" note.

**Checkpoint**: the root has a complete `ts`-mode config set and the two files that are copied verbatim.

---

## Phase 3: User Story 3 — A trivial working export (Priority: P2)

**Goal**: the root package builds, tests and runs green with a stub export and stub CLI, proving the toolchain before any real code. (Done before US2 because the resolver copies these files.)

**Independent test**: at the root, `npm run build && npm test` pass; `node dist/cli.js x` prints the greeting.

- [x] T009 [P] [US3] Create `src/index.ts` exporting `hello(name: string): string` with a JSDoc line.
- [x] T010 [P] [US3] Create `src/cli.ts` with a `#!/usr/bin/env node` shebang that prints `hello(process.argv[2] ?? "world")`.
- [x] T011 [P] [US3] Create `tests/index.test.ts` (vitest) asserting `hello("x")` returns a string containing `x`.
- [x] T012 [US3] Run `npm run build && npm test` at the root; confirm `dist/index.js`, `dist/index.d.ts`, `dist/cli.js` exist and the CLI runs; make `dist/cli.js` executable bits irrelevant by invoking via `node`.

---

## Phase 4: User Story 1 — Repo skeleton exists (Priority: P1)

**Goal**: the `js` overlay exists so both mode shapes are present in the template, and the tree is recognisably package-shaped in each.

**Independent test**: `variants/js/` holds every file the data-model marks js-only; the root holds every ts-only file.

- [x] T013 [P] [US1] Create `variants/js/src/index.mjs` (same `hello`, JSDoc-typed) and `variants/js/src/cli.mjs` (shebang, same behaviour).
- [x] T014 [P] [US1] Create `variants/js/tests/index.test.mjs` (vitest, same assertion).
- [x] T015 [P] [US1] Create `variants/js/tsconfig.json` (`allowJs`, `checkJs`, `noEmit`, `strict: false`, `noImplicitThis`, `alwaysStrict`, `NodeNext`, include `src`, `tests`) per spec-render's DECISIONS §4.
- [x] T016 [P] [US1] Create `variants/js/eslint.config.js` (flat: `@eslint/js` recommended + node globals + `eslint-config-prettier`; no `typescript-eslint`).

---

## Phase 5: User Story 2 — Spin-up / resolver step (Priority: P1) 🎯 MVP

**Goal**: `node scripts/init.mjs --name --repo --out [--source] [--cli] [--author] [--description]` writes a complete spin-out in either mode from an explicit allowlist, refuses bad input before writing, and leaves no placeholder.

**Independent test**: quickstart §2, §3, §5 by hand; `tests/machinery/*` automatically.

- [x] T017 [US2] Create `scripts/init.mjs`: arg parsing (required `--name`, `--repo`, `--out`; `--source` default `ts`, only `ts|js`; `--cli` flag; `--author`, `--description` optional), usage on any violation, exit 1 before any write; scope a bare name to `@snackbyte/`; normalise `--repo` to `git+https://…​.git` and derive `homepage` (`…#readme`) and `bugs` (`…/issues`).
- [x] T018 [US2] In `scripts/init.mjs`, define the `ALLOWLIST` table exactly as `data-model.md` lists it (path, modes, source, substitution) and export it (`export const ALLOWLIST`) so the machinery test imports the same table it asserts against.
- [x] T019 [US2] In `scripts/init.mjs`, generate the product `package.json` from the template's per the mode matrix: drop `private`, `scripts.init`, template name/description; set `name`, `version: "0.1.0"`, `description`, `repository`, `homepage`, `bugs`, `author`; per-mode `exports`, `files`, `bin` (only with `--cli`; key = unscoped name; bare path), `scripts.build` (ts only), `scripts.typecheck`, `scripts.prepublishOnly`; drop `typescript-eslint` from devDependencies in `js`.
- [x] T020 [US2] In `scripts/init.mjs`, copy: build the tree in a temp dir (`fs.mkdtemp`), copy each allowlisted path for the chosen mode/cli from its source (root or `variants/js/`), substitute `@snackbyte/PACKAGE_NAME` then `PACKAGE_NAME` in `README.pkg.md` → `README.md`, write the generated `package.json`, then `fs.rename` the temp dir to `--out` (refusing if `--out` exists non-empty); never touch the template checkout.
- [x] T021 [P] [US2] Create `tests/machinery/resolver-args.test.ts`: spawn `node scripts/init.mjs` with each bad input from quickstart §5 and assert exit code 1, usage on stderr, and that `--out` was not created.
- [x] T022 [P] [US2] Create `tests/machinery/resolver-ts.test.ts`: spin out `--name=demo-ts --cli` into a `mkdtemp` dir; assert the sorted file list equals `ALLOWLIST` filtered for `ts`+cli; grep for `PACKAGE_NAME` finds nothing; `package.json` matches the mode matrix (`exports`, `files`, `bin: { "demo-ts": "dist/cli.js" }`, `name: "@snackbyte/demo-ts"`, `version: "0.1.0"`, `repository.url`); then `npm install --prefer-offline --no-audit --no-fund`, `npm run check:all`, `npm run build`; import `dist/index.js` and run `node dist/cli.js`; clean up.
- [x] T023 [P] [US2] Create `tests/machinery/resolver-js.test.ts`: spin out `--name=@snackbyte/demo-js --source=js` (no cli) into a `mkdtemp` dir; assert tree equals `ALLOWLIST` for `js`, no `PACKAGE_NAME`, `package.json` has no `build`/`bin`, `exports["."] === "./src/index.mjs"`, `files[0] === "src/"`, no `typescript-eslint`; `npm install` + `npm run check:all`; import `src/index.mjs`; clean up.
- [x] T024 [US2] ~~Set vitest `testTimeout` via `vitest.config.ts`~~ Done without a config file: each spin-out test passes its own timeout (`SPIN_OUT_TIMEOUT_MS` in `tests/machinery/helpers.ts`), so there is one less apparatus file and nothing to keep off the allowlist.

---

## Phase 6: User Story 4 — Docs explain the inherit model (Priority: P3)

**Goal**: a developer (or an agent) can spin out from the docs alone and knows Spec Kit / the engine are installed fresh, never inherited.

**Independent test**: a reader of `README.md` + `SPIN-UP.md` can state when to use this template vs base, the one command to spin out, what the flags mean, and how to add Spec Kit afterwards.

- [x] T025 [P] [US4] Create `SPIN-UP.md`: prerequisites; the resolver command with every flag explained; "`--source` defaults to `ts`; `js` only with a reason recorded in the package's spec/plan"; what the spin-out contains (link to `data-model.md`'s allowlist); the first `npm install` (commit the lockfile); an **optional last step** installing Spec Kit (`specify init --here --integration claude`) and the speckit engine (its README's catalog-add + four `extension add` commands), stated as never inherited; a note that the subdirectory/monorepo recipe is a later phase.
- [x] T026 [P] [US4] Rewrite the template `README.md`: status → Phase 0 built; the spin-out command; the two modes with `ts` default; link `SPIN-UP.md`, the constitution (v1.1.0 — mention the *source* default), and the phase specs; replace the stale "CI-on-tag"/"tokens" wording and the "first intended graduate: spec-html" paragraph with: first graduate `@snackbyte/spec-render` (published, re-aligns by conformance PR after Phase 1), second `@snackbyte/auth-client`.

---

## Phase 7: Polish & cross-cutting

- [x] T027 Run `npm run check:all` at the root; fix format/lint/typecheck until green, with the machinery tests passing in both modes.
- [x] T028 Walk `quickstart.md` §2–§5 by hand once and paste the observed output into the PR description; remove `/tmp/demo-*`.
- [x] T029 Restore `specs/000-phase-0-template-exists/spec.md` and `.specify/memory/constitution.md` to `main`'s versions before committing (they belong to unit 1 / PR #1); commit; push; open the PR noting "rebase after #1 merges."

---

## Dependencies & execution order

- Phase 1 (T001–T006) → Phase 2 (T007–T008) → US3 (T009–T012) → US1 (T013–T016) → US2 (T017–T024) → US4 (T025–T026) → Polish.
- US3 before US2: the resolver copies `src/`, `tests/`; US1 before US2: it copies `variants/js/`.
- Within US2: T017–T020 are one file and sequential; T021–T023 are parallel once T018 exports `ALLOWLIST`; T024 any time after T001.

## Parallel opportunities

- T002–T005 together; T009–T011 together; T013–T016 together; T021–T023 together; T025–T026 together.

## Implementation strategy

MVP is US2 with US3 and US1 as its inputs — a resolver that produces a green spin-out in both modes. US4 makes it usable by someone who wasn't here. Nothing ships to npm in this phase.
