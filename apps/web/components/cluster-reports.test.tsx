// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import type { MappableReport } from '@litterbugs/report-contract';
import { ClusterReports } from './cluster-reports';
afterEach(cleanup);
it('bounds a coincident cluster list, preserves status labels, and selects the intended report', () => {
  const reports = Array.from({ length: 120 }, (_, i) => ({ id: String(i), title: `Report ${i}`, cleanup_state: i === 0 ? 'changes_requested' : 'available' } as MappableReport));
  const choose = vi.fn();
  render(<ClusterReports reports={reports} truncated onClose={vi.fn()} onChoose={choose} />);
  expect(screen.getAllByRole('listitem')).toHaveLength(50);
  expect(screen.getByText('Cleanup in progress')).toBeTruthy();
  expect(screen.getByText(/Counts include the loaded matches/)).toBeTruthy();
  fireEvent.click(screen.getByRole('button', { name: 'Show more reports (50 of 120)' }));
  expect(screen.getAllByRole('listitem')).toHaveLength(100);
  fireEvent.click(screen.getByRole('button', { name: /Report 83.*Available to clean/ }));
  expect(choose).toHaveBeenCalledWith(reports[83]);
});
