export const REPORT_CLUSTERING_MIN_LATITUDE_DELTA = 0.04;

export function shouldClusterReports(region) {
  const latitudeDelta = Number(region?.latitudeDelta);

  return Number.isFinite(latitudeDelta)
    && latitudeDelta > REPORT_CLUSTERING_MIN_LATITUDE_DELTA;
}
