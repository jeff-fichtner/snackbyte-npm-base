# Quickstart: proving Phase 1 end to end

Prerequisites: Phase 0's (Node 24, registry access, `npm install` at the root). The
registry smoke test downloads Verdaccio on first run.

## 1. The template's own gate, including the new contract check

```bash
npm run check:all            # now includes check:contract; machinery tests run smoke:pack in both spin-outs
node scripts/check-publish-contract.mjs   # passes on the template root itself
```

## 2. The contract check refuses the known-bad shapes

```bash
node -e '
const fs=require("fs"); const p=JSON.parse(fs.readFileSync("package.json","utf8"));
p.bin={x:"./dist/cli.js"}; fs.mkdirSync("/tmp/bad",{recursive:true});
fs.writeFileSync("/tmp/bad/package.json", JSON.stringify(p));'
node scripts/check-publish-contract.mjs --cwd /tmp/bad ; echo "exit $?"   # 1, names the bin
```

Expected: exit 1 and a line naming the prefixed `bin`. (The machinery test
`contract.test.ts` does this for each bad shape.)

## 3. `smoke:pack` in a spin-out

```bash
node scripts/init.mjs --name=demo-ts --repo=https://example.com/o/demo-ts --out=/tmp/demo-ts --cli
cd /tmp/demo-ts && npm install && npm run build && npm run smoke:pack
```

Expected: prints the tarball's file list, "decoy .env absent", "installed by tarball",
"import ok", "bin ok"; exit 0; no `.env` left behind.

## 4. `smoke:registry` in a spin-out

```bash
cd /tmp/demo-ts && npm run smoke:registry
```

Expected: Verdaccio starts on a free port; `npm publish` runs `prepublishOnly` (build +
`check:all` + `--exists`) and publishes to localhost; a fresh consumer installs
`@snackbyte/demo-ts` **by name** from that registry and runs it; `.npmrc` is gone
afterwards; npmjs.org was never contacted.

## 5. The workflow gate on `private`

Read `.github/workflows/release.yml`: the publish step's `if` names both
`steps.release.outputs.is-env == 'true'` and `steps.pkg.outputs.private != 'true'`.
On this repo (`private: true`) a merge to `main` tags and prints the skip message — the
run for this unit's merge is the evidence. On a spin-out (`private` absent) the same
file publishes.

## 6. The runbook reads in order

`RELEASING.md`: (1) bootstrap publish from a laptop with 2FA, (2) trusted publisher on
npmjs.com naming this repo + `release.yml`, (3) bump `package.json`, merge to `main`,
(4) never unpublish — deprecate, (5) dist-tags.

## Cleanup

```bash
rm -rf /tmp/demo-ts /tmp/bad
```
