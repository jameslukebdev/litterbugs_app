// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import type { StripeConnectInstance } from '@stripe/connect-js';
import PayoutEmbedded from './payout-embedded';

vi.mock('@/lib/payout-connect', () => ({ payoutConnectAppearance: { variables: { colorPrimary: '#5146ed' } } }));
vi.mock('@stripe/react-connect-js', () => ({
  ConnectComponentsProvider: ({ children }: { children: React.ReactNode }) => children,
  ConnectAccountOnboarding: ({ onExit, onLoadError, onLoaderStart, collectionOptions }: {
    onExit: () => void; onLoadError: () => void; onLoaderStart: () => void; collectionOptions: unknown;
  }) => <div><span>{JSON.stringify(collectionOptions)}</span><button onClick={onExit}>Exit Stripe form</button><button onClick={onLoadError}>Fail Stripe form</button><button onClick={onLoaderStart}>Stripe starts loading</button></div>,
}));
afterEach(cleanup);
function open(message = '') {
  const update = vi.fn(); const onExit = vi.fn(); const onFallback = vi.fn(); const onBack = vi.fn();
  render(<PayoutEmbedded instance={{ update } as unknown as StripeConnectInstance} busy={false} message={message} onExit={onExit} onFallback={onFallback} onBack={onBack} />);
  return { update, onExit, onFallback, onBack };
}
it('uses site appearance and Stripe-managed current requirements without bypassing terms', () => {
  const f = open();
  expect(f.update).toHaveBeenCalledWith({ appearance: { variables: { colorPrimary: '#5146ed' } } });
  expect(screen.getByText('{"fields":"currently_due","futureRequirements":"omit","requirements":{"exclude":["business_profile.product_description","defaults.profile.product_description","business_type","identity.entity_type"]}}')).toBeTruthy();
  expect(screen.queryByRole('button', { name: 'Continue on Stripe' })).toBeNull();
  expect(screen.queryByRole('button', { name: 'Back' })).toBeNull();
  fireEvent.click(screen.getByRole('button', { name: 'Exit Stripe form' }));
  expect(f.onExit).toHaveBeenCalledOnce();
});
it('provides manual hosted recovery on a component failure without automatically redirecting', () => {
  const f = open();
  fireEvent.click(screen.getByRole('button', { name: 'Fail Stripe form' }));
  expect(screen.queryByRole('button', { name: 'Exit Stripe form' })).toBeNull();
  expect(screen.getByRole('alert').textContent).toContain('couldn’t load');
  expect(f.onFallback).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole('button', { name: 'Continue on Stripe' }));
  expect(f.onFallback).toHaveBeenCalledOnce();
});
it('lets a failed status refresh be retried and keeps a way back', () => {
  const f = open('We couldn’t refresh your payout status.');
  fireEvent.click(screen.getByRole('button', { name: 'Check payout status' }));
  expect(f.onExit).toHaveBeenCalledOnce();
  fireEvent.click(screen.getByRole('button', { name: 'Back' }));
  expect(f.onBack).toHaveBeenCalledOnce();
});
