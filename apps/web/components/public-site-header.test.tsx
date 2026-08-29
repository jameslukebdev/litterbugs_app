// @vitest-environment jsdom
/* eslint-disable @next/next/no-img-element -- The test mock intentionally renders a native image. */

import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { PublicSiteHeader } from './public-site-header';

vi.mock('next/image', () => ({
  default: ({ src, alt }: { src: string; alt: string }) => <img src={src} alt={alt} />,
}));

vi.mock('@/components/public-account-action', () => ({
  PublicAccountAction: () => <button>Sign in</button>,
}));

afterEach(cleanup);

describe('PublicSiteHeader', () => {
  it('keeps product tasks visible and moves legal links into the Safety menu', () => {
    render(<PublicSiteHeader activePath="/terms" action={<button>Sign in</button>} />);

    expect(screen.getByRole('navigation', { name: 'Main navigation' })).toBeTruthy();
    expect(screen.getByRole('link', { name: 'Search' })).toBeTruthy();
    expect(screen.getByRole('link', { name: 'Field Guide' })).toBeTruthy();
    expect(screen.queryByRole('navigation', { name: 'Information and policies' })).toBeNull();

    fireEvent.click(screen.getByRole('button', { name: 'Safety' }));
    expect(screen.getByRole('navigation', { name: 'Information and policies' })).toBeTruthy();
    expect(screen.getByRole('link', { name: /Terms of use/ }).getAttribute('aria-current')).toBe('page');

    fireEvent.keyDown(document, { key: 'Escape' });
    expect(screen.queryByRole('navigation', { name: 'Information and policies' })).toBeNull();
  });

  it('groups mobile exploration and policy links and closes outside the sheet', () => {
    render(<PublicSiteHeader activePath="/about" />);

    fireEvent.click(screen.getByRole('button', { name: 'Menu' }));
    const mobileNavigation = screen.getByRole('navigation', { name: 'Mobile navigation' });
    expect(mobileNavigation).toBeTruthy();
    expect(screen.getAllByRole('link', { name: 'Search' })).toHaveLength(2);
    expect(screen.getAllByRole('link', { name: 'Field Guide' })).toHaveLength(2);
    expect(screen.getByRole('link', { name: /Safety & waiver/ })).toBeTruthy();

    fireEvent.pointerDown(document.body);
    expect(screen.queryByRole('navigation', { name: 'Mobile navigation' })).toBeNull();
  });
});
