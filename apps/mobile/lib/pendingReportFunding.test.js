import { describe, expect, it } from 'vitest';

import {
  clearPendingReportFunding,
  loadPendingReportFunding,
  normalizePendingFundingAmount,
  savePendingReportFunding,
} from './pendingReportFunding';

const memoryStorage = () => {
  const values = new Map();
  return {
    getItem: async (key) => values.get(key) ?? null,
    removeItem: async (key) => values.delete(key),
    setItem: async (key, value) => values.set(key, value),
  };
};

describe('pending report funding', () => {
  it('normalizes valid payment amounts without accepting malformed values', () => {
    expect(normalizePendingFundingAmount(' 5.00 ')).toBe('5.00');
    expect(normalizePendingFundingAmount('1000')).toBe('1000');
    expect(normalizePendingFundingAmount('5.999')).toBeNull();
    expect(normalizePendingFundingAmount('not money')).toBeNull();
  });

  it('persists a report creation amount until payment succeeds', async () => {
    const storage = memoryStorage();

    await savePendingReportFunding('report-1', '5.00', storage);
    expect(await loadPendingReportFunding('report-1', storage)).toBe('5.00');

    await clearPendingReportFunding('report-1', storage);
    expect(await loadPendingReportFunding('report-1', storage)).toBeNull();
  });
});
