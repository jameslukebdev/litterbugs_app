// @vitest-environment jsdom
/* eslint-disable @next/next/no-img-element -- The test mock intentionally renders a native image. */

import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { EMPTY_REPORT_DRAFT } from '@litterbugs/report-contract';

import { AuthDialog } from './auth-dialog';
import { ReportWizard } from './report-wizard';

vi.mock('next/image', () => ({
  default: ({ src, alt }: { src: string; alt: string }) => <img src={src} alt={alt} />,
}));

afterEach(cleanup);

describe('web product boundaries', () => {
  it('offers the current real-account providers and no Apple or Guest mode', () => {
    render(<AuthDialog onClose={vi.fn()} />);

    expect(screen.queryByRole('button', { name: /continue with apple/i })).toBeNull();
    expect(screen.getByRole('button', { name: /continue with google/i })).toBeTruthy();
    expect(screen.getByRole('button', { name: /continue with facebook/i })).toBeTruthy();
    const facebookMark = document.querySelector('.facebook-provider-icon');
    expect(facebookMark?.getAttribute('viewBox')).toBe('0 0 512 512');
    expect(facebookMark?.querySelector('path')?.getAttribute('fill')).toBe('#1877f2');
    expect(facebookMark?.querySelector('path')?.getAttribute('fill-rule')).toBe('evenodd');
    expect(screen.getByRole('button', { name: /^sign in$/i })).toBeTruthy();
    expect(screen.getByLabelText('Email address')).toBeTruthy();
    expect(screen.queryByRole('button', { name: /guest/i })).toBeNull();
  });

  it('keeps the mobile app’s exact six report steps and required gates', () => {
    render(
      <ReportWizard
        initialDraft={{ ...EMPTY_REPORT_DRAFT }}
        isEditing={false}
        onClose={vi.fn()}
        onSubmit={vi.fn(async () => null)}
      />,
    );

    expect(screen.getByText('Step 1 of 6')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: /next/i }));
    expect(screen.getByText('Step 2 of 6')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: /next/i }));
    expect(screen.getByText('Step 3 of 6')).toBeTruthy();

    const litterNext = screen.getByRole('button', { name: /next/i }) as HTMLButtonElement;
    expect(litterNext.disabled).toBe(true);
    fireEvent.click(screen.getByRole('button', { name: 'Bottles' }));
    expect(litterNext.disabled).toBe(false);
    fireEvent.click(litterNext);

    expect(screen.getByText('Step 4 of 6')).toBeTruthy();
    const severityNext = screen.getByRole('button', { name: /next/i }) as HTMLButtonElement;
    expect(severityNext.disabled).toBe(true);
    fireEvent.click(screen.getByRole('button', { name: /Medium/ }));
    fireEvent.click(severityNext);
    expect(screen.getByText('Step 5 of 6')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: /next/i }));
    expect(screen.getByText('Step 6 of 6')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Submit report' })).toBeTruthy();
  });
});
