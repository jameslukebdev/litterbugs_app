import { expect, it } from 'vitest';
import { reportContext } from './report-context';
it('distinguishes reports with existing metadata without adding location', () => {
 expect(reportContext({id:'abcd1234-rest',created_at:'2026-10-01T23:45:00Z',litter_types:['Bottles','Cans','Bottles']})).toBe('Bottles · Cans · Oct 1, 2026 · Report abcd1234');
 expect(reportContext({id:'efgh1234-rest',created_at:'invalid',types:'Plastic'})).toBe('Plastic · Report efgh1234');
 expect(reportContext(null)).toBe('');
});
