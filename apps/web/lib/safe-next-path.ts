export function safeNextPath(value: unknown): string {
  if (typeof value !== 'string' || !value || !value.startsWith('/') || value.startsWith('//') || value.includes('\\')) {
    return '/';
  }

  return value;
}
