// Types for the resolver's exported tables, so the machinery tests (TypeScript) can
// import the same ALLOWLIST they assert against without allowJs in the product tsconfig.
export type Mode = 'ts' | 'js';

export interface Entry {
  readonly path: string;
  readonly modes: readonly Mode[];
  readonly cli?: true;
  readonly from?: string;
  readonly substitute?: true;
}

export const ALLOWLIST: readonly Entry[];
export function productPaths(mode: Mode, cli: boolean): string[];
