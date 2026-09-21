# When the package isn't at the repo root

The template assumes a spin-out **is** its repository: `npm install`, `check:all`, the
workflows under `.github/workflows/` all run from the directory that holds `.git`.

Sometimes the package shares a repository with something else — the type case is a
client library beside the service it talks to (`packages/client-node/` beside
`packages/service/` in `snackbyte-auth`), kept together because the contract and its
implementation must not drift. The template still works there; a fixed, knowable set
of adjustments is required, because GitHub Actions, npm and git tags each have a
root-relative assumption baked in.

This is the library sibling of `snackbyte-base`'s `SUBDIR-LAYOUT.md`. The full
two-releasables recipe — both workflows, the `paths:` trade-off, why the prefix is
mutually blind — is owned by the release-flow action's `CONSUMING.md`, section **"Two
releasables in one repository"**. This file is only what is _specific to a package spun
from this template_. Read that section first; it is the source if the two ever differ.

> Throughout, `<name>` is the package's unscoped name (`client-node`) and `<dir>` is
> where it lives (`packages/client-node`).

## Why root-level is assumed, and what breaks otherwise

1. **GitHub only reads workflows from the repo root** `.github/workflows/`. The
   `release.yml` and `ci.yml` the resolver puts _inside_ the package are inert there.
2. **A `uses:` step ignores `defaults.run.working-directory`**, so the release-flow
   action reads `./environments.json` and `./package.json` from the checkout root unless
   told otherwise. Before the action's 1.1.0 it could not be told; a subdirectory
   library would have tagged and published the root's version.
3. **Git tags are repo-global.** Two releasables both starting at `v0.1.0` collide, and
   the app's "highest `vMM.*`" scan counts the library's tags. The action's `tag-prefix`
   gives the library its own namespace.
4. **npm resolves `package.json` and the lockfile from the current directory**, so CI
   has to `cd` in, and `setup-node`'s cache has to be pointed at the package's lockfile.

Everything below resolves those four facts.

## The layout

Spin out straight into place — the resolver is out-of-tree, so there is no throwaway
step:

```bash
node scripts/init.mjs --name=<name> --repo=<url> --out=<repo>/packages/<name> [--source=ts|js] [--cli]
cd <repo>/packages/<name> && npm install    # creates the package's own lockfile — commit it
```

Then, because GitHub reads workflows only at the root:

- **Move and rename** `packages/<name>/.github/workflows/release.yml` →
  `.github/workflows/release-<name>.yml` and `ci.yml` → `.github/workflows/ci-<name>.yml`.
  Delete the now-empty `packages/<name>/.github/`.
- **Do not** put `.specify/`, `.claude/`, `specs/` under the package: Spec Kit and agent
  context are one set per repository, at the root.

## The workflow edits — six lines per workflow

Starting from the template's `release.yml` (already trusted publishing, already gated on
`private`), make it `release-<name>.yml`:

```yaml
name: release-<name>
on:
  push:
    branches: [main]
    paths: ['packages/<name>/**', '.github/workflows/release-<name>.yml']   # 1
concurrency:
  group: release-<name>-${{ github.ref_name }}                              # 2
defaults:
  run:
    working-directory: packages/<name>                                      # 3
# … steps as in release.yml, with:
      - uses: actions/setup-node@v5
        with:
          node-version: '24'
          registry-url: 'https://registry.npmjs.org'
          cache: npm
          cache-dependency-path: packages/<name>/package-lock.json          # 4
      - id: pkg
        run: echo "private=$(node -p "require('./package.json').private === true")" >> "$GITHUB_OUTPUT"
        # runs in packages/<name> — working-directory applies to run: steps
      - id: release
        uses: jeff-fichtner/snackbyte-release-flow-action@v1
        with:
          version-strategy: package-json
          manifest: packages/<name>/environments.json                       # 5
          package-json: packages/<name>/package.json                        # 5
          tag-prefix: <name>-                                               # 6
```

1. `paths:` — a change elsewhere in the repo must not cut a release of this package.
   The trade-off (a shared root file triggers neither workflow unless listed) is
   explained in the action's recipe; it is part of the design, not optional.
2. One concurrency group per releasable.
3. `working-directory` reaches every `run:` step — `npm ci`, `npm publish`, the
   `private` read — but **not** the `uses:` step, which is why 5 exists.
4. The cache key is the package's own lockfile.
5. Both paths are resolved from the checkout root. Omit `package-json:` and the action
   reads the root file and publishes the wrong version.
6. Tags become `<name>-v<version>`; the app beside it keeps the bare `v…` namespace.

`ci-<name>.yml`: `paths:` and `defaults.run.working-directory` as above, plus
`cache-dependency-path`; the steps stay `npm ci` and `npm run check:all`.

## The trusted publisher names the root workflow

When configuring the trusted publisher on npmjs.com (`RELEASING.md` step 2), the
workflow filename is **`release-<name>.yml`** — the file at the repo root — not
`release.yml`. npm matches the workflow that ran, by its path in the repository.

## What does not change

- **The resolver, the allowlist, the smoke tests, the contract check.** They run from
  the package directory and know nothing about the repo above it. `smoke:registry` and
  `smoke:pack` work unchanged.
- **`environments.json`** stays inside the package; the action is pointed at it.
- **`RELEASING.md`'s ritual.** Bump `version` in `packages/<name>/package.json`, merge to
  `main`; the action tags `<name>-v<version>`; the workflow publishes.

## Checklist

- [ ] Spun out with `--out=<repo>/packages/<name>`; `npm install` run there; lockfile committed.
- [ ] Both workflows moved to the repo root, renamed `release-<name>.yml` / `ci-<name>.yml`;
      the package's own `.github/` removed.
- [ ] The six edits made in each: `paths:`, concurrency group, `working-directory`,
      `cache-dependency-path`, `manifest:` + `package-json:`, `tag-prefix:`.
- [ ] No `.specify/`, `.claude/`, `specs/` under the package.
- [ ] The trusted publisher on npmjs.com names `release-<name>.yml`.
- [ ] The sibling releasable's workflow has its own `paths:` and, if it is also a
      library, its own `tag-prefix`.
