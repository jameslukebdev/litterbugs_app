// @vitest-environment jsdom
import { useState } from 'react';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { CleanupSafetyPanel } from './cleanup-start-panel';

const waiver = { body: 'Full current agreement', guidelines_body: 'Full current safety guidelines', release_body: 'Full current release', published_at: '2026-10-02T12:00:00Z' };
afterEach(cleanup);
function Panel({ returning = false, busy = false, rewardCents = 100, onClaim = () => {} }: { returning?: boolean; busy?: boolean; rewardCents?: number; onClaim?: () => void }) {
  const [accepted, setAccepted] = useState(false);
  const [site, setSite] = useState(false);
  return <CleanupSafetyPanel agreementSaved={returning} rewardCents={rewardCents} waiver={waiver}
    waiverAccepted={accepted} onWaiverAccepted={setAccepted} siteConfirmed={site} onSiteConfirmed={setSite}
    busy={busy} disabled={false} onClaim={onClaim} />;
}
it('requires opening the complete agreement before affirmative first-time consent, without claiming on open', () => {
  const claim = vi.fn(); render(<Panel onClaim={claim} />);
  const box = screen.getByRole('checkbox') as HTMLInputElement;
  const start = screen.getByRole('button', { name: 'Start my cleanup' }) as HTMLButtonElement;
  expect(box.checked).toBe(false); expect(box.disabled).toBe(true); expect(start.disabled).toBe(true);
  fireEvent.click(screen.getByRole('button', { name: 'Read the cleanup agreement' }));
  for (const text of [waiver.body, waiver.guidelines_body, waiver.release_body]) expect(screen.getByText(text)).toBeTruthy();
  expect(screen.getByRole('heading', { name: 'Assumption of risk and release' })).toBeTruthy();
  expect(box.disabled).toBe(false); expect(start.disabled).toBe(true); expect(claim).not.toHaveBeenCalled();
  fireEvent.click(box); expect(start.disabled).toBe(false);
  fireEvent.click(screen.getByRole('button', { name: 'Read the cleanup agreement' }));
  expect(screen.queryByText(waiver.body)).toBeNull(); expect(start.disabled).toBe(false);
  fireEvent.click(start); expect(claim).toHaveBeenCalledOnce();
});
it('asks returning cleaners to confirm this site again and disables start when unchecked', () => {
  render(<Panel returning />);
  expect(screen.queryByRole('button', { name: 'Read the cleanup agreement' })).toBeNull();
  const box = screen.getByRole('checkbox', { name: /I can legally access/ }) as HTMLInputElement;
  const start = screen.getByRole('button', { name: 'Start my cleanup' }) as HTMLButtonElement;
  expect(box.checked).toBe(false); expect(start.disabled).toBe(true);
  fireEvent.click(box); expect(start.disabled).toBe(false);
  fireEvent.click(box); expect(start.disabled).toBe(true);
});
it('keeps the start label stable and prevents repeated submissions while busy', () => {
  const claim = vi.fn(); const view = render(<Panel returning onClaim={claim} />);
  fireEvent.click(screen.getByRole('checkbox'));
  view.rerender(<Panel returning busy onClaim={claim} />);
  const start = screen.getByRole('button', { name: 'Start my cleanup' }) as HTMLButtonElement;
  expect(start.disabled).toBe(true); expect(start.getAttribute('aria-busy')).toBe('true');
  fireEvent.click(start); expect(claim).not.toHaveBeenCalled();
  expect(screen.queryByText(/Claiming|Opening|Saving/)).toBeNull();
});
it('uses points for volunteer cleanups and the exact dollar amount for funded ones', () => {
  const view = render(<Panel rewardCents={0} />);
  expect(screen.getByText('Earn 3 points once approved')).toBeTruthy();
  expect(screen.queryByText(/Get paid/)).toBeNull();
  view.rerender(<Panel rewardCents={125} />);
  expect(screen.getByText('Get paid $1.25 once approved')).toBeTruthy();
});
