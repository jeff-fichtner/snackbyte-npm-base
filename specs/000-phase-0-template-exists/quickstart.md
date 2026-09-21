# Quickstart: proving Phase 0 end to end

Prerequisites: Node 24, network access to the npm registry, a checkout of this repo
with `npm install` done at the root.

## 1. The template's own gate is green

```bash
npm run check:all
```

Expected: format, lint, typecheck and tests all pass. The tests include
`tests/machinery/*`, which spin the template out into temp directories in both modes —
so a green run here already covers steps 2–4 automatically. The steps below are the
same thing done by hand, for a human to see.

## 2. Spin out in `ts` mode (the default) with a CLI

```bash
node scripts/init.mjs --name=demo-ts --repo=https://github.com/example/demo-ts --out=/tmp/demo-ts --cli
cd /tmp/demo-ts
grep -rn PACKAGE_NAME . ; echo "exit $? (1 = no placeholder survived)"
npm install
npm run check:all
npm run build
node -e 'import("./dist/index.js").then(m => console.log(m.hello("world")))'
node dist/cli.js world
```

Expected: no `PACKAGE_NAME` anywhere; `check:all` green; `dist/` contains `index.js`,
`index.d.ts`, `cli.js`; the import prints a greeting; the CLI prints the same.

## 3. Spin out in `js` mode

```bash
node scripts/init.mjs --name=@snackbyte/demo-js --repo=https://github.com/example/demo-js --out=/tmp/demo-js --source=js
cd /tmp/demo-js
ls src            # index.mjs only (no --cli)
npm install
npm run check:all
node -e 'import("./src/index.mjs").then(m => console.log(m.hello("world")))'
```

Expected: `check:all` green with no build step; `package.json` `exports["."]` points
at `./src/index.mjs`; `files` lists `src/`.

## 4. The boundary holds

```bash
cd /tmp/demo-ts && find . -type f | sort
```

Expected: exactly the allowlist for `ts` + `--cli` from `data-model.md`. No `specs/`,
no `.specify/`, no `.claude/`, no `scripts/`, no `variants/`, no `tests/machinery/`,
no `SPIN-UP.md`, no template `README.md`, no `.github/`, no `environments.json`.

## 5. The resolver refuses what it should

```bash
node scripts/init.mjs --repo=x --out=/tmp/x            # no --name    → usage, exit 1
node scripts/init.mjs --name=x --out=/tmp/x            # no --repo    → usage, exit 1
node scripts/init.mjs --name=x --repo=x                # no --out     → usage, exit 1
node scripts/init.mjs --name=x --repo=x --out=/tmp --source=py   # bad mode → usage, exit 1
node scripts/init.mjs --name=x --repo=x --out=/tmp     # non-empty dir → refuse, exit 1
```

Expected: each exits non-zero before writing anything.

## Cleanup

```bash
rm -rf /tmp/demo-ts /tmp/demo-js
```
