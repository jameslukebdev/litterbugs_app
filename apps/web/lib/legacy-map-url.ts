/** Preserve old app links while marketing parameters continue to open the homepage. */
export function legacyMapDestination(
  params: Record<string, string | string[] | undefined>,
): string | null {
  const first = (key: string) =>
    Array.isArray(params[key]) ? params[key][0] : params[key];
  const hasMapIntent =
    Boolean(first('report') || first('area') || first('compose')) ||
    ['map', 'reports'].includes(first('view') ?? '') ||
    first('browse') === '1' ||
    ['lat', 'lng', 'zoom'].every((key) => first(key) !== undefined);
  if (!hasMapIntent) return null;
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (Array.isArray(value)) value.forEach((item) => query.append(key, item));
    else if (value !== undefined) query.set(key, value);
  }
  return `/map?${query}`;
}
