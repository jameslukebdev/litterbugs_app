import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_PREFIX = 'litterbugs.pending-report-funding.';

const storageKey = (reportId) => `${STORAGE_PREFIX}${reportId}`;

export function normalizePendingFundingAmount(value) {
  const normalized = String(value ?? '').trim();
  return /^\d{1,4}(\.\d{1,2})?$/.test(normalized) ? normalized : null;
}

export async function savePendingReportFunding(
  reportId,
  amount,
  storage = AsyncStorage,
) {
  const normalized = normalizePendingFundingAmount(amount);
  if (!reportId || !normalized) return false;
  await storage.setItem(storageKey(reportId), normalized);
  return true;
}

export async function loadPendingReportFunding(reportId, storage = AsyncStorage) {
  if (!reportId) return null;
  const stored = await storage.getItem(storageKey(reportId));
  return normalizePendingFundingAmount(stored);
}

export async function clearPendingReportFunding(reportId, storage = AsyncStorage) {
  if (!reportId) return;
  await storage.removeItem(storageKey(reportId));
}
