// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { DraftComparison } from './draft-comparison';
const { read } = vi.hoisted(() => ({ read: vi.fn() }));
vi.mock('@/lib/draft-summary', () => ({ readDraftComparison: read }));
afterEach(() => { cleanup(); vi.resetAllMocks(); });
const choices = (ready: boolean) => <button disabled={!ready}>Replace account version</button>;
it('prevents replacement before comparison loads and after a failed comparison', async () => {
  let reject!: (error: Error) => void;
  read.mockImplementationOnce(() => new Promise((_resolve, failure) => { reject = failure; }));
  render(<DraftComparison userId="a" draftKey="report" actions={choices} />);
  expect((screen.getByRole('button', { name: 'Replace account version' }) as HTMLButtonElement).disabled).toBe(true);
  await act(async () => reject(new Error('network')));
  expect((screen.getByRole('button', { name: 'Replace account version' }) as HTMLButtonElement).disabled).toBe(true);
  read.mockResolvedValueOnce({ device: { title: 'Local title', photos: 1, detail: 'Local notes', fields: ['Severity: High'] }, account: { title: 'Account title', photos: 2, detail: 'Account notes', fields: ['Severity: Low'] } });
  fireEvent.click(screen.getByRole('button', { name: 'Retry comparison' }));
  await screen.findByText('Account title');
  expect(screen.getByText('Severity: High')).toBeTruthy();
  expect((screen.getByRole('button', { name: 'Replace account version' }) as HTMLButtonElement).disabled).toBe(false);
});
it('does not enable choices with another account’s previously loaded summary', async () => {
  read.mockResolvedValueOnce({ device: null, account: null }).mockImplementationOnce(() => new Promise(() => {}));
  const view = render(<DraftComparison userId="a" draftKey="report" actions={choices} />);
  await screen.findByText(/same photo count/);
  view.rerender(<DraftComparison userId="b" draftKey="report" actions={choices} />);
  expect((screen.getByRole('button', { name: 'Replace account version' }) as HTMLButtonElement).disabled).toBe(true);
});
