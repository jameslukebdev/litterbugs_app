// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { ErrorBoundary, type ErrorInfo } from 'next/dist/client/components/error-boundary';
import { AppRouterContext } from 'next/dist/shared/lib/app-router-context.shared-runtime';
import ErrorPage from './error';

afterEach(() => { cleanup(); vi.restoreAllMocks(); });

it('fetches fresh page data when retrying a temporary server failure', () => {
  const failure = new Error('Temporary data service outage');
  let freshData = false;
  const refresh = vi.fn(() => { freshData = true; });
  // The prior failed server result remains until the router fetches it again.
  function ServerResult() {
    if (!freshData) throw failure;
    return <h1>Cleanup draft restored</h1>;
  }
  vi.spyOn(console, 'error').mockImplementation(() => {});
  render(
    <AppRouterContext.Provider value={{
      refresh, back: vi.fn(), forward: vi.fn(), push: vi.fn(),
      replace: vi.fn(), prefetch: vi.fn(), bfcacheId: 'test',
    }}>
      <ErrorBoundary errorComponent={(props: ErrorInfo) => <ErrorPage {...props} error={failure} />}>
        <ServerResult />
      </ErrorBoundary>
    </AppRouterContext.Provider>,
  );
  expect(screen.getByRole('heading', { name: 'Something went wrong' })).toBeTruthy();
  fireEvent.click(screen.getByRole('button', { name: 'Try again' }));
  expect(refresh).toHaveBeenCalledTimes(1);
  expect(screen.getByRole('heading', { name: 'Cleanup draft restored' })).toBeTruthy();
});
