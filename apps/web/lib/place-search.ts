import { boundsForGeometry, type BoundaryGeometry, type SearchPlace } from './place-geography';
export type TownResult = { id: string; layer: number; geoid: string; latitude: number; longitude: number; label: string; subtitle: string };
type CensusResponse = { error?: unknown; features?: Array<{ attributes?: Record<string, string>; properties?: Record<string, string>; geometry?: BoundaryGeometry }> };
function regionForGeometry(geometry: BoundaryGeometry | undefined) {
  if (!geometry) throw new Error('Boundary unavailable');
  const bounds = boundsForGeometry(geometry);
  return { bounds, latitude: (bounds.south + bounds.north) / 2, longitude: (bounds.west + bounds.east) / 2, latitudeDelta: bounds.north - bounds.south, longitudeDelta: bounds.east - bounds.west };
}
const BASE = 'https://tigerweb.geo.census.gov/arcgis/rest/services/TIGERweb/Places_CouSub_ConCity_SubMCD/MapServer';
const STATES = Object.fromEntries('01:AL 02:AK 04:AZ 05:AR 06:CA 08:CO 09:CT 10:DE 11:DC 12:FL 13:GA 15:HI 16:ID 17:IL 18:IN 19:IA 20:KS 21:KY 22:LA 23:ME 24:MD 25:MA 26:MI 27:MN 28:MS 29:MO 30:MT 31:NE 32:NV 33:NH 34:NJ 35:NM 36:NY 37:NC 38:ND 39:OH 40:OK 41:OR 42:PA 44:RI 45:SC 46:SD 47:TN 48:TX 49:UT 50:VT 51:VA 53:WA 54:WV 55:WI 56:WY 72:PR'.split(' ').map(v => v.split(':')));
const STATE_NAMES = 'Alabama|Alaska|Arizona|Arkansas|California|Colorado|Connecticut|Delaware|District of Columbia|Florida|Georgia|Hawaii|Idaho|Illinois|Indiana|Iowa|Kansas|Kentucky|Louisiana|Maine|Maryland|Massachusetts|Michigan|Minnesota|Mississippi|Missouri|Montana|Nebraska|Nevada|New Hampshire|New Jersey|New Mexico|New York|North Carolina|North Dakota|Ohio|Oklahoma|Oregon|Pennsylvania|Rhode Island|South Carolina|South Dakota|Tennessee|Texas|Utah|Vermont|Virginia|Washington|West Virginia|Wisconsin|Wyoming|Puerto Rico'.split('|');
// Keep explicit FIPS order: integer-like object keys do not preserve the leading-zero sequence.
const STATE_CODES = '01 02 04 05 06 08 09 10 11 12 13 15 16 17 18 19 20 21 22 23 24 25 26 27 28 29 30 31 32 33 34 35 36 37 38 39 40 41 42 44 45 46 47 48 49 50 51 53 54 55 56 72'.split(' ');
const STATE_REGIONS = STATE_CODES.flatMap((id, index) => [
  { name: STATES[id], id }, { name: STATE_NAMES[index].toUpperCase(), id },
]).sort((a, b) => b.name.length - a.name.length);
export function townSearchParts(text: string): { name: string; stateId?: string } | null {
  const parts = text.trim().split(',').map(part => part.trim());
  let name = parts[0];
  let stateId: string | undefined;
  if (parts.length > 1) {
    const region = STATE_REGIONS.find(region => region.name === parts[1].toUpperCase());
    // An unrecognized region must never silently broaden the search to all states.
    if (!region || parts.slice(2).some(part => !/^(US|USA|United States|United States of America)$/i.test(part))) return null;
    stateId = region.id;
  } else {
    const region = STATE_REGIONS.find(region => name.toUpperCase().endsWith(` ${region.name}`));
    if (region) { name = name.slice(0, -region.name.length).trim(); stateId = region.id; }
  }
  if (name.length < 2 || /^\d/.test(name)) return null;
  return { name, stateId };
}
async function query(layer: number, params: Record<string, string>, signal?: AbortSignal, base = BASE): Promise<CensusResponse> {
  const response = await fetch(`${base}/${layer}/query?${new URLSearchParams({ f: 'json', ...params })}`, { signal });
  if (!response.ok) throw new Error('Location search unavailable');
  const body = await response.json();
  if (body.error) throw new Error('Location search unavailable');
  return body;
}
export async function searchPlaces(text: string, { signal }: { signal?: AbortSignal } = {}): Promise<TownResult[]> {
  const parsed = townSearchParts(text);
  if (!parsed) return [];
  const { name, stateId } = parsed;
  const safeName = name.replace(/[%_]/g, '').replace(/'/g, "''").toUpperCase();
  const where = `UPPER(BASENAME) LIKE '${safeName}%'${stateId ? ` AND STATE = '${stateId}'` : ''}`;
  const results = await Promise.all([4, 5].map(async layer => {
    const body = await query(layer, { where, outFields: 'GEOID,NAME,BASENAME,STATE,INTPTLAT,INTPTLON', returnGeometry: 'false', orderByFields: 'BASENAME,STATE', resultRecordCount: '20' }, signal);
    return (body.features || []).filter(feature => feature.attributes).map(({ attributes }) => { const a = attributes!; return { id: `${layer}:${a.GEOID}`, layer, geoid: a.GEOID,
      latitude: Number(a.INTPTLAT), longitude: Number(a.INTPTLON),
      label: `${a.BASENAME}, ${STATES[a.STATE] || a.STATE}`, subtitle: 'U.S. town and surrounding area' }; });
  }));
  return results.flat().sort((a, b) => Number(b.label.split(',')[0].toLowerCase() === name.toLowerCase()) - Number(a.label.split(',')[0].toLowerCase() === name.toLowerCase()) || a.label.localeCompare(b.label));
}
const cache = new Map<string, SearchPlace>();
export async function resolvePlace(place: TownResult, { signal }: { signal?: AbortSignal } = {}): Promise<SearchPlace> {
  if (cache.has(place.id)) return cache.get(place.id)!;
  const body = await query(place.layer, { where: `GEOID = '${place.geoid}'`, outFields: 'NAME', returnGeometry: 'true', outSR: '4326', f: 'geojson', maxAllowableOffset: '0.0005' }, signal);
  let geometry = body.features?.[0]?.geometry;
  const townRegion = regionForGeometry(geometry);
  // Use the surrounding postal area for everyday town discovery, rather than
  // fragmented annexation limits. Retain the town extent for larger cities.
  const latitude = Number.isFinite(place.latitude) ? place.latitude : townRegion.latitude;
  const longitude = Number.isFinite(place.longitude) ? place.longitude : townRegion.longitude;
  const postal = await query(1, { geometry: `${longitude},${latitude}`, geometryType: 'esriGeometryPoint', inSR: '4326', spatialRel: 'esriSpatialRelIntersects', outFields: 'GEOID', returnGeometry: 'true', outSR: '4326', f: 'geojson', maxAllowableOffset: '0.0005' }, signal, 'https://tigerweb.geo.census.gov/arcgis/rest/services/TIGERweb/PUMA_TAD_TAZ_UGA_ZCTA/MapServer').catch(() => ({ features: [] }));
  const area = postal.features?.[0];

  if (area?.geometry) {
    const postalRegion = regionForGeometry(area.geometry);
    if (postalRegion.latitudeDelta * postalRegion.longitudeDelta > townRegion.latitudeDelta * townRegion.longitudeDelta) {
      geometry = area.geometry;

    }
  }
  const region = regionForGeometry(geometry);
  const result: SearchPlace = { ...place, geometry, subtitle: 'U.S. town and surrounding area', latitude: region.latitude, longitude: region.longitude, bounds: region.bounds };
  cache.set(place.id, result);
  return result;
}

/** Restore the same town search from its stable Census identity, including its original center. */
export async function resolvePlaceId(id: string, signal?: AbortSignal) {
  const match = /^([45]):(\d{5,12})$/.exec(id);
  if (!match) throw new Error('Invalid town');
  const layer = Number(match[1]), geoid = match[2];
  const body = await query(layer, { where: `GEOID = '${geoid}'`, outFields: 'GEOID,BASENAME,STATE,INTPTLAT,INTPTLON', returnGeometry: 'false' }, signal);
  const a = body.features?.[0]?.attributes;
  if (!a) throw new Error('Town unavailable');
  return resolvePlace({ id, layer, geoid, latitude: Number(a.INTPTLAT), longitude: Number(a.INTPTLON), label: `${a.BASENAME}, ${STATES[a.STATE] || a.STATE}`, subtitle: 'U.S. town and surrounding area' }, { signal });
}
