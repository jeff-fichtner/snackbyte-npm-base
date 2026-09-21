# CLAUDE.md — snackbyte-npm-base

**This repo is the template, not a package.** If you are here to build or change a
library, you are in the wrong place: spin one out (`SPIN-UP.md`) and work there.
Editing this repo to make it into a package corrupts it for every future spin-out. The
only changes that belong here are improvements to the template itself.

## Read first

`.specify/memory/constitution.md` (v1.1.0) — the principles and the pinned defaults —
then the phase specs under `specs/`. Nothing here is inferred from a consumer; the
graduates are `@snackbyte/spec-render` (first, JS opt-out) and `@snackbyte/auth-client`
(second, TypeScript, the reason `ts` is the default).

## How this repo is laid out

- The **root is a valid `ts`-mode package** — `src/`, `tests/index.test.ts`, the
  configs. `npm run check:all` here proves the default shape directly.
- `variants/js/` is the **`js`-mode overlay**: the files that differ when a package
  ships `.mjs` source with no build.
- `scripts/init.mjs` is the **resolver**. It owns `ALLOWLIST` — the exact set of
  product paths a spin-out is born with — and writes the spin-out _out of tree_. Only
  the allowlist crosses; everything else here is apparatus. Add a product file →
  add its row. `specs/000-…/data-model.md` and `specs/001-…/data-model.md` mirror it.
- `tests/machinery/` spins out into temp directories in both modes and asserts the
  tree equals the allowlist, the publish contract, and a green `check:all` +
  `smoke:pack` inside each spin-out. They run `npm install` for real — the network is
  a requirement, not a mock. `SMOKE_REGISTRY=1` opts the Verdaccio round-trip in.
- `CLAUDE.pkg.md` and `README.pkg.md` become the spin-out's `CLAUDE.md` and
  `README.md`; this file and `README.md` are the template's own and never cross.

## Every merge to `main` is a version

`version-strategy: package-json`: the release-flow action tags `v<version>` and fails
loudly if the tag exists. So every unit of work bumps `package.json`'s minor, in
landing order. `private: true` — a tag is all a release is here; `release.yml`'s
publish step is gated on `private` and skips.

## Working here

Spec-driven: `/speckit-plan` and `/speckit-tasks` against the phase spec before
implementing; artifacts land beside the spec. `check:all` green at every step. Don't
decide a Principle V default here — amend the constitution with a dated entry.
