import { regionForGeometry } from './searchGeography';
const BASE = 'https://tigerweb.geo.census.gov/arcgis/rest/services/TIGERweb/Places_CouSub_ConCity_SubMCD/MapServer';
const STATES = Object.fromEntries('01:AL 02:AK 04:AZ 05:AR 06:CA 08:CO 09:CT 10:DE 11:DC 12:FL 13:GA 15:HI 16:ID 17:IL 18:IN 19:IA 20:KS 21:KY 22:LA 23:ME 24:MD 25:MA 26:MI 27:MN 28:MS 29:MO 30:MT 31:NE 32:NV 33:NH 34:NJ 35:NM 36:NY 37:NC 38:ND 39:OH 40:OK 41:OR 42:PA 44:RI 45:SC 46:SD 47:TN 48:TX 49:UT 50:VT 51:VA 53:WA 54:WV 55:WI 56:WY 72:PR'.split(' ').map(v => v.split(':')));
async function query(layer, params, signal, base = BASE) {
  const response = await fetch(`${base}/${layer}/query?${new URLSearchParams({ f: 'json', ...params })}`, { signal });
  if (!response.ok) throw new Error('Location search unavailable');
  const body = await response.json();
  if (body.error) throw new Error('Location search unavailable');
  return body;
}
export async function searchPlaces(text, { signal } = {}) {
  let [name, state] = text.trim().split(',').map(v => v.trim());
  const suffix = name.match(/^(.*)\s+([A-Za-z]{2})$/);
  if (!state && suffix && Object.values(STATES).includes(suffix[2].toUpperCase())) { name = suffix[1]; state = suffix[2]; }
  if (name.length < 2) return [];
  const safeName = name.replace(/[%_]/g, '').replace(/'/g, "''").toUpperCase();
  const stateId = Object.keys(STATES).find(key => STATES[key] === state?.toUpperCase());
  const where = `UPPER(BASENAME) LIKE '${safeName}%'${stateId ? ` AND STATE = '${stateId}'` : ''}`;
  const results = await Promise.all([4, 5].map(async layer => {
    const body = await query(layer, { where, outFields: 'GEOID,NAME,BASENAME,STATE,INTPTLAT,INTPTLON', returnGeometry: 'false', orderByFields: 'BASENAME,STATE', resultRecordCount: '20' }, signal);
    return (body.features || []).map(({ attributes: a }) => ({ id: `${layer}:${a.GEOID}`, layer, geoid: a.GEOID,
      latitude: Number(a.INTPTLAT), longitude: Number(a.INTPTLON),
      label: `${a.BASENAME}, ${STATES[a.STATE] || a.STATE}`, subtitle: 'Town and surrounding area' }));
  }));
  return results.flat().sort((a, b) => Number(b.label.split(',')[0].toLowerCase() === name.toLowerCase()) - Number(a.label.split(',')[0].toLowerCase() === name.toLowerCase()) || a.label.localeCompare(b.label));
}
const cache = new Map();
export async function resolvePlace(place, { signal } = {}) {
  if (cache.has(place.id)) return cache.get(place.id);
  const body = await query(place.layer, { where: `GEOID = '${place.geoid}'`, outFields: 'NAME', returnGeometry: 'true', outSR: '4326', f: 'geojson', maxAllowableOffset: '0.0005' }, signal);
  let geometry = body.features?.[0]?.geometry;
  const townRegion = regionForGeometry(geometry);
  // Use the surrounding postal area for everyday town discovery, rather than
  // fragmented annexation limits. Retain the town extent for larger cities.
  const latitude = Number.isFinite(place.latitude) ? place.latitude : townRegion.latitude;
  const longitude = Number.isFinite(place.longitude) ? place.longitude : townRegion.longitude;
  const postal = await query(1, { geometry: `${longitude},${latitude}`, geometryType: 'esriGeometryPoint', inSR: '4326', spatialRel: 'esriSpatialRelIntersects', outFields: 'GEOID', returnGeometry: 'true', outSR: '4326', f: 'geojson', maxAllowableOffset: '0.0005' }, signal, 'https://tigerweb.geo.census.gov/arcgis/rest/services/TIGERweb/PUMA_TAD_TAZ_UGA_ZCTA/MapServer').catch(() => ({ features: [] }));
  const area = postal.features?.[0];
  let postalCode = null;
  if (area?.geometry) {
    const postalRegion = regionForGeometry(area.geometry);
    if (postalRegion.latitudeDelta * postalRegion.longitudeDelta > townRegion.latitudeDelta * townRegion.longitudeDelta) {
      geometry = area.geometry;
      postalCode = area.properties?.GEOID;
    }
  }
  const result = { ...place, geometry, postalCode, subtitle: 'Town and surrounding area', region: regionForGeometry(geometry) };
  cache.set(place.id, result);
  return result;
}
