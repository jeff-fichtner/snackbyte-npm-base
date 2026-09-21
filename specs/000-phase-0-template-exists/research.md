# Research: Phase 0 — The template exists

No `NEEDS CLARIFICATION` remained in the Technical Context; the research here records
the design choices that are not obvious from the spec and why each was made.

## 1. Out-of-tree resolver, not in-place

- **Decision**: `scripts/init.mjs` writes the spin-out to `--out=<dir>` by copying an
  explicit allowlist of product paths from the template checkout. The template checkout
  is never modified; the resolver does not delete itself; there are no template git tags
  to strip.
- **Rationale**: the spec (FR-007) requires an allowlist that fails closed. An in-place
  resolver — base's shape — is a denylist of things to delete, and speckit-engine's
  `EXPORT-BOUNDARY.md` records exactly how that fails open. Out-of-tree also makes the
  monorepo case (`--out=packages/client-node`) the same command as the new-repo case,
  and it is re-runnable, which the machinery tests rely on.
- **Alternatives considered**: (a) in-place with allowlist *deletion* ("remove
  everything not listed") — works, but requires git-awareness (tag stripping, the
  self-delete) and cannot be re-run; (b) base's in-place denylist — rejected for the
  fail-open reason above.

## 2. The root is the `ts` product; `js` is an overlay

- **Decision**: the repository root is a valid `ts`-mode package (`src/*.ts`,
  `tsconfig.build.json`, `typescript-eslint`). `variants/js/` holds the files that
  differ in `js` mode (`src/*.mjs`, `tests/*.test.mjs`, `tsconfig.json`,
  `eslint.config.js`). The resolver copies the root allowlist, then overlays
  `variants/js/` and rewrites `package.json` for `js`.
- **Rationale**: the template's own `check:all` then proves the *default* shape
  directly, with no spin-out; the `js` shape is proven by the machinery test that spins
  it out. Holding both modes' source files side by side at the root would make one
  `tsconfig` cover `.ts` under `strict` and `.mjs` under `checkJs` at once — two
  profiles in one gate, which is the muddle spec-render's DECISIONS §4 warns about.
- **Alternatives considered**: marker blocks inside shared files (base's device) —
  right for a few lines that differ, wrong when whole files differ by extension and
  config profile.

## 3. `package.json` is generated per mode from one source of truth

- **Decision**: the resolver reads the template's `package.json`, strips template-only
  fields (`private`, the `init`/machinery scripts, the placeholder name/description),
  and writes the product's per mode: `exports`/`files`/`bin`/`scripts` differ between
  `ts` and `js`; everything else (metadata, engines, devDependencies minus
  `typescript-eslint` in `js`) is shared.
- **Rationale**: one place to keep the contract correct (Constitution II). Two
  hand-maintained `package.json` files drift.
- **Alternatives considered**: two full `package.json` variants — rejected for drift.

## 4. `--name` and `--repo` are required; `--author` is a fleet constant

- **Decision**: refuse to run without `--name` and `--repo`. `--author` defaults to the
  template's `package.json` author.
- **Rationale**: a placeholder name or a guessed repository owner in a *published*
  package is the silent-wrong-value failure the house rule forbids; `author` is the same
  for every package in the fleet, so carrying it is a fact, not a guess, and it stays
  overridable.
- **Alternatives considered**: deriving `repository.url` from the name and a hardcoded
  owner — rejected as a hardcoded default that would be wrong for any package outside
  the owner's account.

## 5. The template's `release.yml` and `environments.json` stay off the allowlist this phase

- **Decision**: Phase 0 does not export the publish workflow. The template keeps its
  own (inert) `release.yml` so its version-bump-per-merge flow keeps working.
- **Rationale**: the OIDC workflow, the runbook and the smoke scripts are Phase 1's
  deliverables (spec 001 FR-005/007/008); adding a half-wired workflow to the allowlist
  now would export something a spin-out cannot yet use.
- **Note for Phase 1**: spec 000's edge case describes a `SPINUP:` marker swapping the
  template's inert step for the live publish step. A simpler mechanism achieves the same
  with **one** workflow file exercised by the template's own CI: a step that reads
  `package.json`'s `private` and gates the publish on it being false. The template
  (`private: true`) tags and skips; a product publishes; a product accidentally left
  private skips cleanly instead of failing. Phase 1 owns `release.yml` and should take
  that route and align the spec's edge-case wording when it does.

## 6. Placeholder strategy

- **Decision**: the literal placeholder is `PACKAGE_NAME` (unscoped) and appears in
  `README.pkg.md` and the template `package.json` name (`@snackbyte/PACKAGE_NAME`). The
  resolver substitutes it in the files it copies; the machinery test greps the spin-out
  for `PACKAGE_NAME` and fails on any survivor.
- **Rationale**: one token, greppable, matches the spec's FR-002 wording.

## 7. Machinery tests need the network

- **Decision**: the `ts` and `js` round-trip tests run `npm install` in the spun-out
  temp directory (`--prefer-offline`, `--no-audit`, `--no-fund`) and then the
  spin-out's own `check:all` and, for `ts`, `build`.
- **Rationale**: the only honest proof of "passes `check:all` with zero tooling changes"
  is running it in the spin-out; a mocked install proves nothing. Local development is
  never offline in this fleet.
- **Alternatives considered**: symlinking the template's `node_modules` into the
  spin-out — faster, but hides a missing devDependency, which is exactly the class of
  defect the test exists to catch.
