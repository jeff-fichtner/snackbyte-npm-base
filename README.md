# snackbyte-npm-base

The **npm-library template** for the snackbyte ecosystem — the sibling of
[`snackbyte-base`](../snackbyte-base) (which is the template for *web apps /
sites*). Spin a package out of this and the basics are **handled**: the
`package.json` publish contract, versioning, dev/build, and a CI publish path —
so you never re-solve `exports`, tokens, or provenance from scratch again.

> **Status: planning.** Only `PHASES.md` exists so far. The template skeleton
> itself is Phase 0 and not yet built.

## The model

- **Web app / site?** → spin out of `snackbyte-base`.
- **Publishable npm library / CLI?** → spin out of `snackbyte-npm-base` (this).

Inherit it, run the resolver, write your code, ship. Adopt only the phase you
need: Phase 1 ships one correct package to prod today; later phases add
automation and supply-chain rigor as a package earns more consumers.

## What to read

- **[`PHASES.md`](./PHASES.md)** — the staged roadmap, from "ship one package
  immediately" to "engineered for a million downloads," plus the recurring
  decisions (scope, module format, license, publish path) with proposed defaults.

## Guiding rule

Assume nobody will ever download it; build every package as if a million people
will. The discipline is cheap up front and prevents the irreversible mistakes
(leaked secrets in a tarball, a wrong `exports`, an unpublishable bad version).

## First intended graduate

`@snackbyte/spec-html` — the Spec Kit → interactive HTML renderer currently in
`snackbyte-base/scripts/`. Already package-shaped; it's the proof-of-concept once
this template reaches Phase 1.
