# When the package isn't at the repo root

The template assumes a spin-out **is** its repository: `npm install`, `check:all`, the
workflows under `.github/workflows/` all run from the directory that holds `.git`.

Sometimes the package shares a repository with something else — the type case is a
client library beside the service it talks to (`packages/client-node/` beside
`packages/service/` in `snackbyte-auth`), kept together because the contract and its
implementation must not drift. The template still works there; a fixed, knowable set
of adjustments is required, because GitHub Actions, npm and git tags each have a
root-relative assumption baked in.

This is the library sibling of `snackbyte-base`'s `SUBDIR-LAYOUT.md`. The general
two-releasables recipe — `tag-prefix`, the `paths:` trade-off, why the prefixes are
mutually blind — is owned by the release-flow action's `CONSUMING.md`, section **"Two
releasables in one repository"**. This file is only what is _specific to a package spun
from this template_. snackbyte-auth's root `ci.yml` and `release-client-node.yml` are
the worked example.

> Throughout, `<name>` is the package's unscoped name (`client-node`) and `<dir>` is
> where it lives (`packages/client-node`).

## Why root-level is assumed, and what breaks otherwise

1. **GitHub only reads workflows from the repo root** `.github/workflows/`. The
   `release.yml` and `ci.yml` the resolver puts _inside_ the package are inert there.
2. **A `uses:` step ignores `defaults.run.working-directory`**, so the release-flow
   action reads `./environments.json` and `./package.json` from the checkout root unless
   told otherwise (its `manifest:` and `package-json:` inputs).
3. **Git tags are repo-global.** Two releasables both starting at `v0.1.0` collide, and
   the app's "highest `vMM.*`" scan counts the library's tags. The action's `tag-prefix`
   gives the library its own namespace.
4. **npm resolves `package.json` and the lockfile from the current directory**, so CI
   has to `cd` in, and `setup-node`'s cache has to be pointed at the package's lockfile.
5. **A required check that does not run never reports.** Branch protection waits for it,
   and the pull request cannot merge. So a merge gate never carries a `paths:` filter;
   only a release does.

Everything below resolves those five facts.

## The layout

Spin out straight into place — the resolver is out-of-tree, so there is no throwaway
step:

```bash
node scripts/init.mjs --name=<name> --repo=<url> --out=<repo>/packages/<name> [--source=ts|js] [--cli]
cd <repo>/packages/<name> && npm install    # creates the package's own lockfile — commit it
```

Then, because GitHub reads workflows only at the root:

- **Move and rename** `packages/<name>/.github/workflows/release.yml` →
  `.github/workflows/release-<name>.yml`.
- **Delete** `packages/<name>/.github/workflows/ci.yml`. Its two steps join the
  repository's one root `ci.yml` (below), and the now-empty `packages/<name>/.github/`
  goes too.
- **Do not** put `.specify/`, `.claude/`, `specs/` under the package: Spec Kit and agent
  context are one set per repository, at the root.

## The merge gate: one root `ci.yml`, one job, no `paths:`

A repository with several releasables has **one** pull-request workflow at the root,
with **one** job named `validate (merge gate)`: the single check branch protection
requires. Each releasable's checks are steps of that job, each with its own
`working-directory:`. GitHub bills every job as at least a whole minute, so a job per
releasable, or a job that only collects other jobs' results, costs minutes and checks
nothing more.

```yaml
name: ci
on:
  pull_request: # no paths: a required check must report on every pull request
permissions:
  contents: read
concurrency:
  group: ci-${{ github.ref }}
  cancel-in-progress: true
jobs:
  validate:
    name: validate (merge gate)
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@3d3c42e5aac5ba805825da76410c181273ba90b1 # v7.0.1
      - uses: actions/setup-node@949feb2413d6458794dcd2491c4babbbce0c15c1 # v7.1.0
        with:
          node-version: '24'
          cache: npm
          cache-dependency-path: |
            packages/service/package-lock.json
            packages/<name>/package-lock.json
      # the sibling releasable's install and checks, then this package's
      - run: npm ci
        working-directory: packages/service
      - run: npm run check:all
        working-directory: packages/service
      - run: npm ci
        working-directory: packages/<name>
      - run: npm run check:all
        working-directory: packages/<name>
```

If the repository already has a root `ci.yml` for the sibling, add this package's
lockfile to its `cache-dependency-path` and its two steps to the existing job, under the
name it already has. Don't add a second workflow or job.

## The release: `release-<name>.yml`

Start from the template's `release.yml`. It already looks up whether the version is
released, runs the checks before the tag, publishes from its own job by trusted
publishing, and gates publishing on `private`. Then make these edits:

```yaml
name: release-<name>
on:
  push:
    branches: [main]
    paths: ['packages/<name>/**', '.github/workflows/release-<name>.yml'] # 1
concurrency:
  group: release-<name> # 2
  cancel-in-progress: false
  queue: max
defaults:
  run:
    working-directory: packages/<name> # 3
jobs:
  release:
    # … as in release.yml, with:
    steps:
      - uses: actions/checkout@3d3c42e5aac5ba805825da76410c181273ba90b1 # v7.0.1
        with:
          fetch-depth: 0
      - id: pkg
        run: | # as in release.yml, with the tag carrying the prefix:
          tag="<name>-v${version}" # 6
      - if: steps.pkg.outputs.released != 'true'
        uses: actions/setup-node@949feb2413d6458794dcd2491c4babbbce0c15c1 # v7.1.0
        with:
          node-version: '24'
          cache: npm
          cache-dependency-path: packages/<name>/package-lock.json # 4
      - if: steps.pkg.outputs.released != 'true'
        run: npm ci && npm run check:all # 7
      - id: release
        if: steps.pkg.outputs.released != 'true'
        uses: jeff-fichtner/snackbyte-release-flow-action@01d5fa53356ad4b04b2388a43eda867cc947b670 # v1.2.7
        with:
          version-strategy: package-json
          manifest: packages/<name>/environments.json # 5
          package-json: packages/<name>/package.json # 5
          tag-prefix: <name>- # 6
  publish:
    # … as in release.yml, with:
    steps:
      - uses: actions/setup-node@949feb2413d6458794dcd2491c4babbbce0c15c1 # v7.1.0
        with:
          node-version: '24'
          registry-url: 'https://registry.npmjs.org'
          cache: npm
          cache-dependency-path: packages/<name>/package-lock.json # 4
```

1. `paths:` — a change elsewhere in the repo must not cut a release of this package.
   The trade-off (a shared root file triggers neither release unless listed) is
   explained in the action's recipe. A filter belongs here, on the release, and never on
   the merge gate.
2. One concurrency group per releasable, never per branch.
3. `working-directory` reaches every `run:` step — the look-up, `npm ci`, the checks,
   `npm publish` — but **not** the `uses:` steps, which is why 4 and 5 exist.
4. The cache key is the package's own lockfile, in both jobs.
5. Both paths are resolved from the checkout root. Omit `package-json:` and the action
   reads the root file and publishes the wrong version.
6. Tags become `<name>-v<version>`; the app beside it keeps the bare `v…` namespace. The
   look-up reads the same prefixed tag, or it never finds the release and every merge
   without a bump fails on the action's exists-guard.
7. **The checks run again before the tag.** The merge's required check ran against the
   base the pull request had then; a sibling merged since can break this package on
   `main` with every check green. `npm ci && npm run check:all` in the tagging job,
   before the action, means a failure leaves no tag and publishes nothing.

## The trusted publisher names the root workflow

When configuring the trusted publisher on npmjs.com (`RELEASING.md` step 2), the
workflow filename is **`release-<name>.yml`** — the file at the repo root — not
`release.yml`. npm matches the workflow that ran, by its path in the repository.

## What does not change

- **The resolver, the allowlist, the smoke tests, the contract check.** They run from
  the package directory and know nothing about the repo above it. `smoke:registry` and
  `smoke:pack` work unchanged.
- **`environments.json`** stays inside the package; the action is pointed at it.
- **`.template.json`** stays inside the package too. It records the npm-base version the
  package matches. If the repository root carries a stamp of its own (the sibling came
  from another template), leave that one alone; the two describe different things.
- **`RELEASING.md`'s ritual.** Bump `version` in `packages/<name>/package.json`, merge to
  `main`; the action tags `<name>-v<version>`; the publish job publishes.

## Checklist

- [ ] Spun out with `--out=<repo>/packages/<name>`; `npm install` run there; lockfile committed.
- [ ] `release.yml` moved to the repo root as `release-<name>.yml`; the package's `ci.yml`
      and its own `.github/` removed.
- [ ] One root `ci.yml`, one job named `validate (merge gate)`, no `paths:`, with this
      package's `npm ci` and `npm run check:all` as steps (`working-directory:`) and its
      lockfile in `cache-dependency-path`.
- [ ] Branch protection requires `validate (merge gate)` and nothing per-releasable.
- [ ] The release edits made: `paths:`, concurrency group, `working-directory`,
      `cache-dependency-path` in both jobs, `manifest:` + `package-json:`, `tag-prefix:`
      and the prefixed tag in the look-up; the checks still run before the action.
- [ ] No `.specify/`, `.claude/`, `specs/` under the package.
- [ ] The trusted publisher on npmjs.com names `release-<name>.yml`.
- [ ] The sibling releasable's release workflow has its own `paths:` and, if it is also a
      library, its own `tag-prefix`.
