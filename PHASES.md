# snackbyte-npm-base — the library template, in phases

This repo is the **npm-library sibling of `snackbyte-base`**. Where `snackbyte-base`
is the standard for *web apps / sites*, this is the standard for *publishable npm
packages* — so the next library never re-solves `exports`, tokens, provenance, or
release discipline from scratch.

The design philosophy is the same as `snackbyte-base`: **inherit and it "handles"
the basics** (versioning, dev builds, the publish path). But — like the staged
deploy model in `snackbyte-base` — it does not have to do everything on day one.
The phases below go from *"spin this out and ship one package to prod today"* to
*"engineered as if a million people depend on it."*

> **Guiding rule:** assume nobody will ever download it; build every package as if
> a million people will. Cheap discipline now (correct `exports`, a `files`
> allowlist, no secrets in the tarball) costs nothing and prevents irreversible
> mistakes later.

---

## How to read this

Each phase is **independently shippable** — you can stop at any phase and have a
working, correct package. Later phases add safety, automation, and scale; they
do not rewrite earlier ones. A package "graduates" up the phases as it earns the
need (more consumers → more rigor).

Phase 0 is the template itself. Phases 1→4 are what a *spun-out package* adopts.

- **Status legend:** `[ ]` not built · `[~]` partial · `[x]` done
- This is a planning doc. Nothing here is built yet unless marked.

---

## Phase 0 — The template exists (this repo)

**Goal:** `snackbyte-npm-base` is a real template you can spin a package out of,
the way you spin an app out of `snackbyte-base`.

- [ ] Repo skeleton: `src/`, `tests/`, `README.md`, `LICENSE`, `package.json`
- [ ] A spin-up/resolver step (mirror `snackbyte-base`'s `SPIN-UP.md`): rename
      `@snackbyte/PACKAGE_NAME` → the real package, strip the "you're in the
      template" guard, set author/repo fields.
- [ ] A trivial working export (`hello()` / a stub CLI) so a fresh spin-out
      builds, tests, and runs green immediately — proof the wiring works.
- [ ] This `PHASES.md` + a short `README` explaining the inherit model.

**Done when:** spinning it out yields a package that passes `npm run check:all`
and can be `npm pack`'d without touching any tooling.

---

## Phase 1 — Ship one package to prod, today (MVP / immediate use)

**Goal:** the floor. Inherit the template, write your code, publish a correct
package. No CI, no provenance yet — but nothing here is wrong, only minimal.

This is the phase that answers *"I just want to package spec-html and use it."*

- [ ] **Correct `package.json` publish contract** — the part that silently breaks
      consumers if wrong:
  - `name` (scoped `@snackbyte/x`), `version` (start `0.1.0`), `description`
  - `exports` map (not just `main`) — controls what's importable
  - `type` (ESM by default for snackbyte), `engines.node` floor
  - `bin` if it's a CLI
  - `files` allowlist — publish only `dist/`/`src/` + README + LICENSE
  - `repository`, `license`, `keywords`
- [ ] **`.npmignore` / `files` discipline** — never ship `node_modules`, tests,
      `.env`, scratch. (Leaking a secret in a publish is the #1 irreversible
      mistake — `unpublish` is blocked after 72h.)
- [ ] **Build step** (if compiling): `prepublishOnly` runs build + test so you
      cannot publish a stale/broken artifact.
- [ ] **`npm pack` smoke test** — pack the tarball, install it elsewhere, run it.
      Tests *what users actually get*, not your working tree.
- [ ] **Manual publish** is acceptable here: `npm publish --access public`
      (or `--access restricted` for private). 2FA on the account.
- [ ] README with install + usage; LICENSE (MIT default).

**Done when:** `npm install @snackbyte/<pkg>` in a clean project works and the
tarball contains exactly what it should — verified by the pack smoke test.

**Explicitly deferred:** CI, provenance, changelogs, dual ESM/CJS. Not needed to
be *correct*, only to be *automated*.

---

## Phase 2 — Repeatable & safe (small audience, you + a few projects)

**Goal:** remove the human from the publish path and the "I forgot to build"
class of bugs. This is where the *standard* starts paying for itself across repos.

- [ ] **CI publish via GitHub Action on tag** — never `npm publish` from a laptop.
      Tag → build → test → publish. Tokens live in GitHub secrets, not your shell.
- [ ] **One reusable org publish workflow + one automation token** — wired once,
      inherited by every package. (This is the direct fix for *"don't reinvent
      tokens each time."*) Granular automation token, not a classic token.
- [ ] **Lockfile committed**, `npm audit` / `npm ci` in CI.
- [ ] **SemVer discipline** — a CHANGELOG (or Changesets), `npm version` bumps,
      git tags per release. Once published, a breaking change in a non-major bump
      breaks consumers; treat the version contract as load-bearing.
- [ ] **`dist-tag` policy** — `latest` vs `next`/`beta` for pre-releases.
- [ ] **Deprecate, don't unpublish** — `npm deprecate` is the supported path;
      bake that into the release runbook.

**Done when:** a release is `git tag vX.Y.Z && git push --tags` and CI does the
rest, reproducibly, with no local secrets.

---

## Phase 3 — Trustworthy at scale (public, "a million people")

**Goal:** the supply-chain and trust bar for a package strangers depend on.

- [ ] **Provenance** — `npm publish --provenance` (signed attestation of what
      built the package, from which commit). The modern trust baseline.
- [ ] **2FA-required publishes**, automation tokens scoped per-package where
      possible; rotate on a schedule.
- [ ] **Dependabot / Renovate** on the package's own deps; minimal dep surface
      (every dep is attack surface + a thing that can break downstream).
- [ ] **Types shipped** if it's a library API (`types` / `exports.types`), or a
      `// @ts-check`'d JS surface; consumers expect editor support.
- [ ] **Dual ESM/CJS** *only if* real consumers need CJS — otherwise stay ESM-only
      (simpler, fewer footguns). Decide deliberately, don't default to dual.
- [ ] **Tested install matrix** — pack-and-install on the Node versions in
      `engines`, ESM and (if dual) CJS import paths.
- [ ] **Security policy** (`SECURITY.md`), issue templates, a contribution note
      even if you're the only contributor today.

**Done when:** the package is `--provenance`-published, type-complete, audited,
and an outside consumer on a supported Node version can install + use it with no
surprises.

---

## Phase 4 — Fleet / ecosystem scale (many packages, shared everything)

**Goal:** when you have enough libraries that per-repo management is the
bottleneck. Likely a *later* decision — flagged so the earlier phases don't
foreclose it.

- [ ] **Monorepo or shared release tooling** — Changesets across packages,
      coordinated versioning, one CI pipeline for N packages. (Or keep
      one-repo-per-package if isolation matters more than coordination — decide
      based on how coupled the libraries are.)
- [ ] **Org-wide policy as code** — shared ESLint/tsconfig/release config consumed
      by every package (so standards can't drift per repo).
- [ ] **Private registry option** (GitHub Packages / Verdaccio) for internal-only
      libs, with the same publish protocol.
- [ ] **Automated provenance + SBOM**, org-level security scanning.
- [ ] **Docs site / generated API docs** if the surface area justifies it.

**Done when:** adding the Nth package is "spin out of `snackbyte-npm-base`," and
org-wide policy changes propagate without touching each repo by hand.

---

## Decisions to make (deliberately, not by default)

These recur for every package; the standard should pin a default so you stop
re-litigating them:

| Decision | snackbyte default (proposed) | Why |
|---|---|---|
| Scope | `@snackbyte/*` | Org namespace; reserve on npm early |
| Public vs private | Public unless a reason not to | Most tools are shareable |
| Module format | ESM-only | Simpler; add CJS only on real demand |
| License | MIT | Permissive, zero-friction |
| Versioning | SemVer + Changesets | Standard, automatable |
| Publish path | CI-on-tag from Phase 2 on | No laptop publishes |
| Node floor | match the apps (`>=24`?) | One runtime story across snackbyte |

---

## First graduate: `spec-html`

The `spec-html` tool (the Spec Kit → interactive HTML renderer, currently living
in `snackbyte-base/scripts/`) is the **first intended package** to spin out of
this template — it's already package-shaped (self-contained, 3 deps, a clear CLI
entry, ESM, no coupling to its host repo). When this template reaches Phase 1,
extracting `spec-html` into `@snackbyte/spec-html` is the proof-of-concept run.

See `snackbyte-base` commit `c54e8a6` for the tool as it stands today.
