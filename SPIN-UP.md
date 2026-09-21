# Spin-up handoff

How a new `@snackbyte/*` package is born from this template. The resolver writes the
package **out of tree** — into a directory you name — and never touches this checkout,
so you can run it from a clone of this repo as many times as you like.

## 1. Prerequisites

- Node 24 or later (`node --version`).
- A clone of this repo with `npm install` run at its root (the resolver itself needs
  nothing, but the machinery tests do).
- Decided: the package name, where its repository will live, and whether it ships a CLI.

## 2. Decide the source mode

Every package is TypeScript unless it cannot be (constitution v1.1.0, Principle V).

- **`ts` — the default.** `src/*.ts`, compiled by `tsc` to `dist/` with `.d.ts`
  declarations, `exports` with `types` and `import` conditions, full `strict`. Types
  ship by construction. This is what you get when you say nothing.
- **`js` — the explicit opt-out.** `src/*.mjs` shipped as-is, no build, a relaxed
  `checkJs` typecheck. Only for a package that genuinely cannot be TypeScript — a
  verbatim graft of working JavaScript is the one case so far — and the reason is
  recorded in that package's spec or plan. Not chosen by inertia.

> **If you are an agent doing this spin-up:** `ts` needs no confirmation. Choosing
> `js` does — stop and ask, and put the reason on record before you run the resolver.

## 3. Run the resolver

```bash
node scripts/init.mjs --name=<pkg> --repo=<url> --out=<dir> [--source=ts|js] [--cli] [--author=<text>] [--description=<text>]
```

| Flag            | Required | Meaning                                                                                                                                                    |
| --------------- | -------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `--name`        | yes      | `auth-client` becomes `@snackbyte/auth-client`; a scoped name (`@snackbyte/auth-client`) is used verbatim. Also the `bin` name when `--cli`.               |
| `--repo`        | yes      | The repository URL (`https://github.com/<owner>/<repo>`). `repository.url`, `homepage` and `bugs` are derived from it. Required so no guessed owner ships. |
| `--out`         | yes      | Where to write the package. Must not exist, or be an empty directory. A new repo: any path. A monorepo: `packages/<name>` inside it.                       |
| `--source`      | no       | `ts` (default) or `js`.                                                                                                                                    |
| `--cli`         | no       | Include a stub CLI and a `bin` entry.                                                                                                                      |
| `--author`      | no       | Defaults to the template's author.                                                                                                                         |
| `--description` | no       | Defaults to a one-line stub; edit it in `package.json`.                                                                                                    |

The resolver refuses — before writing anything — a missing required flag, an unknown
flag (a typo like `--souce=js` must not silently produce a `ts` package), a bad
`--source`, a non-http(s) `--repo`, an invalid name, a non-empty `--out`, or an `--out`
inside the template checkout.

## 4. What you get

Exactly the **product allowlist** — see
[`specs/000-phase-0-template-exists/data-model.md`](specs/000-phase-0-template-exists/data-model.md)
for the table. In short: a resolved `package.json` with the publish contract for your
mode; a stub export in `src/`; a stub CLI if you asked for one; one passing test;
`README.md`, `LICENSE`; the lint, format and TypeScript configs for the mode; and the
npm-flavour `.gitignore`.

Nothing else. Not this repo's `specs/`, not its Spec Kit install, not the resolver, not
this file. The template's development apparatus never crosses, by construction: the
resolver copies an allowlist, and a test in this repo asserts a spin-out's tree equals
it.

## 5. First run

```bash
cd <dir>
npm install          # creates package-lock.json — commit it
npm run check:all    # format, lint, typecheck, test: green before you write a line
npm run build        # ts mode only: dist/ with declarations
```

Then write the package. Keep `check:all` green at every step; `prepublishOnly` runs it
(and the build, in `ts` mode) so a red tree cannot be published.

One GitHub quirk on the **first** pull request: a workflow file that is new in that PR
(`ci.yml` is, until it reaches `main`) does not run on the PR's _opened_ event. Close
and reopen the PR and it fires; every later push runs it normally. Seen on this
template's own first PRs and on spec-render's.

## 6. Optional last step: Spec Kit and the speckit engine

Neither is inherited from this template. A package that wants spec-driven development
installs the _current_ versions itself, so it never carries a pinned fork of tooling it
did not choose:

```bash
# Spec Kit, once per package repo
specify init --here --integration claude
# the snackbyte speckit engine (lifecycle + ClickUp/git/review plugs)
specify extension catalog add \
  https://raw.githubusercontent.com/jeff-fichtner/snackbyte-speckit-engine/main/catalog.json \
  --name snackbyte --install-allowed
for e in engine clickup git-lifecycle review-loop; do specify extension add "$e"; done
```

Those commands are owned by
[`snackbyte-speckit-engine`](https://github.com/jeff-fichtner/snackbyte-speckit-engine);
its README is the source if they drift from what is written here.

## 7. Publishing

The spin-out carries its own publish path: `RELEASING.md` (bootstrap publish first,
then the trusted publisher on npmjs.com, then bump-and-merge), `npm run smoke:pack` and
`npm run smoke:registry` as the checks before that first publish, and a dormant
`.github/workflows/release.yml` that publishes by trusted publishing once the trusted
publisher exists. `CLAUDE.md` in the spin-out carries the rules for agents.

## 8. When the package shares a repository with something else

`--out=<repo>/packages/<name>` works as-is; the workflows the resolver writes inside the
package then have to move to the repo root and be pointed back in. **`SUBDIR-LAYOUT.md`**
is that playbook — six edits per workflow and a checklist — on top of the release-flow
action's "Two releasables in one repository."

## What is a later phase

Automated bumps and changelogs, a shared reusable publish workflow, dependency
automation and the install matrix. A spin-out's `CLAUDE.md` names them so an agent
reports back instead of building them in the package.
