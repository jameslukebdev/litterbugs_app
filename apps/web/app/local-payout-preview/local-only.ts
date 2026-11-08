export function localPreviewAllowed(host: string | null) {
  if (process.env.NODE_ENV !== 'development' || process.env.VERCEL || !host) return false;
  try { return ['localhost', '127.0.0.1', '[::1]'].includes(new URL(`http://${host}`).hostname); }
  catch { return false; }
}
