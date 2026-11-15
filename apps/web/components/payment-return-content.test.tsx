// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { PaymentReturnContent } from './payment-return-content';
const { push } = vi.hoisted(() => ({ push: vi.fn() }));
vi.mock('next/navigation', () => ({ useRouter: () => ({ push }) }));
vi.mock('@/components/payment-detail', () => ({ PaymentDetail: ({ onOpenReport }: { onOpenReport: (id: string) => void }) => <button onClick={() => onOpenReport('closed-report')}>View report</button> }));
afterEach(() => { cleanup(); vi.clearAllMocks(); });
it('opens report history from either receipt action, preserving the payments return destination', () => {
  render(<PaymentReturnContent contribution="receipt" report="closed-report" />);
  fireEvent.click(screen.getByRole('button', { name: 'View report' }));
  expect(push).toHaveBeenCalledWith('/account/reports/closed-report?from=payments');
  expect(screen.getByRole('link', { name: 'Return to report' }).getAttribute('href')).toBe('/account/reports/closed-report?from=payments');
});
it('provides a direct account recovery destination when receipt parameters are missing', () => {
  render(<PaymentReturnContent contribution="" report="" />);
  expect(screen.getByRole('link', { name: 'View payments' }).getAttribute('href')).toBe('/account/payments');
  expect(screen.getByRole('link', { name: 'Return to map' }).getAttribute('href')).toBe('/');
});
