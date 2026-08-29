export async function edgeFunctionErrorMessage(data, error, fallback) {
  if (typeof data?.error === 'string') return data.error;

  const context = error?.context;
  if (typeof Response !== 'undefined' && context instanceof Response) {
    try {
      const payload = await context.clone().json();
      if (typeof payload?.error === 'string') return payload.error;
    } catch {
      // Supabase can return a non-JSON response for network or gateway failures.
    }
  }

  return fallback;
}
