let counter = 0;

export function generateId(): string {
  counter++;
  return `p${Date.now().toString(36)}-${counter.toString(36)}`;
}
