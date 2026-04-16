import { describe, test, expect } from 'vitest';
import { migrate, isFutureVersion, extractVersion, STORAGE_VERSION, wrapWithVersion } from '../migrations';

describe('migrations', () => {
  test('STORAGE_VERSION is 2 (baseline after infra installation)', () => {
    expect(STORAGE_VERSION).toBe(2);
  });

  test('migrate v1 → v2 is a no-op for existing shapes', () => {
    const payload = { current: { pieces: [] }, past: [], future: [] };
    const out = migrate(1, 2, payload);
    expect(out).toEqual(payload);
  });

  test('migrate from===to returns data unchanged', () => {
    const payload = { any: 'value' };
    expect(migrate(STORAGE_VERSION, STORAGE_VERSION, payload)).toBe(payload);
  });

  test('migrate rejects downgrade (future version)', () => {
    expect(() => migrate(STORAGE_VERSION + 5, STORAGE_VERSION, {})).toThrow(/Cannot downgrade/);
  });

  test('isFutureVersion detects versions beyond STORAGE_VERSION', () => {
    expect(isFutureVersion(STORAGE_VERSION - 1)).toBe(false);
    expect(isFutureVersion(STORAGE_VERSION)).toBe(false);
    expect(isFutureVersion(STORAGE_VERSION + 1)).toBe(true);
  });

  test('extractVersion returns 1 for unversioned payloads (legacy)', () => {
    expect(extractVersion({ current: {} })).toBe(1);
    expect(extractVersion(null)).toBe(1);
  });

  test('extractVersion reads numeric version', () => {
    expect(extractVersion({ version: 2, data: {} })).toBe(2);
  });

  test('extractVersion ignores non-numeric version', () => {
    expect(extractVersion({ version: 'banana' })).toBe(1);
    expect(extractVersion({ version: NaN })).toBe(1);
  });

  test('wrapWithVersion stamps current STORAGE_VERSION', () => {
    const wrapped = wrapWithVersion({ foo: 1 });
    expect(wrapped.version).toBe(STORAGE_VERSION);
    expect(wrapped.data).toEqual({ foo: 1 });
  });

  test('wrapWithVersion accepts extra top-level fields', () => {
    const wrapped = wrapWithVersion({ foo: 1 }, { savedAt: 12345 });
    expect(wrapped.savedAt).toBe(12345);
  });
});
