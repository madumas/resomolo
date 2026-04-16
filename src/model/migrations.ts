import type { UndoManager } from './types';

export const STORAGE_VERSION = 2;

export interface MigrationError extends Error {
  kind: 'future-version' | 'invalid-shape';
  foundVersion?: number;
}

export type Migrator = (data: unknown) => unknown;

// v1 → v2 : baseline installation of the versioning infrastructure.
// No payload transformation required ; piece shape migrations continue to be
// handled by `migratePieces` in persistence.ts.
const migrations: Record<number, Migrator> = {
  1: (data) => data,
};

export function migrate(from: number, to: number, data: unknown): unknown {
  if (from === to) return data;
  if (from > to) {
    const err = new Error(`Cannot downgrade payload from v${from} to v${to}`) as MigrationError;
    err.kind = 'future-version';
    err.foundVersion = from;
    throw err;
  }
  let current = data;
  for (let v = from; v < to; v++) {
    const step = migrations[v];
    if (!step) {
      throw new Error(`Missing migration from v${v} to v${v + 1}`);
    }
    current = step(current);
  }
  return current;
}

export function isFutureVersion(version: number): boolean {
  return version > STORAGE_VERSION;
}

export function extractVersion(parsed: unknown): number {
  if (parsed && typeof parsed === 'object' && 'version' in parsed) {
    const v = (parsed as { version?: unknown }).version;
    if (typeof v === 'number' && Number.isFinite(v)) return v;
  }
  return 1; // legacy unversioned = treat as v1
}

export function wrapWithVersion<T>(data: T, extra: Record<string, unknown> = {}): {
  version: number;
  data: T;
} & Record<string, unknown> {
  return { version: STORAGE_VERSION, data, ...extra };
}

// Re-export for ergonomics
export type { UndoManager };
