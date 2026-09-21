import { describe, expect, it } from 'vitest';
import { hello } from '../src/index.mjs';

describe('hello', () => {
  it('greets by name', () => {
    expect(hello('x')).toContain('x');
  });
});
