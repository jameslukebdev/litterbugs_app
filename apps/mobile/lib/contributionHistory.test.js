import { describe, expect, it, vi } from 'vitest';
const mocks = vi.hoisted(() => ({ query: {}, from: vi.fn() }));
vi.mock('./supabase', () => ({ supabase: { from: mocks.from } }));
import { loadMyContributions } from './funding';
describe('payment activity', () => {
  it('keeps pending payments, refunds, failures and completed impact visible', async () => {
    const rows = ['payment_pending','failed','succeeded','refund_pending','refund_processing','refunded','paid_out'].map((status) => ({id:status,status,report:status==='refunded'?null:{cleanup_state:'available'}}));
    const query = { select:vi.fn().mockReturnThis(), order:vi.fn().mockReturnThis(), limit:vi.fn().mockResolvedValue({data:rows,error:null}) };
    mocks.from.mockReturnValue(query);
    expect(await loadMyContributions()).toEqual(rows);
    expect(query.select.mock.calls[0][0]).not.toContain('!inner');
  });
  it('does not turn an unavailable ledger into an empty successful result', async () => {
    mocks.from.mockReturnValue({ select(){return this;},order(){return this;},limit:async()=>({error:new Error('offline')}) });
    await expect(loadMyContributions()).rejects.toThrow('offline');
  });
});
