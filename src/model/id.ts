let counter = 0;

export function generateId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return `p${crypto.randomUUID()}`;
  }
  counter++;
  return `p${Date.now().toString(36)}-${counter.toString(36)}`;
}
