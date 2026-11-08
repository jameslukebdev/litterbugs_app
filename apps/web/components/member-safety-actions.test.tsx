// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { MemberSafetyActions } from '@/components/member-safety-actions';

const insert = vi.fn();
const from = vi.fn(() => ({ insert }));
const state = { viewer: 'viewer-1' as string | null };
vi.mock('@/lib/supabase/client', () => ({
  createClient: () => ({
    from,
    auth: { getUser: () => Promise.resolve({ data: { user: state.viewer ? { id: state.viewer, is_anonymous: false } : null } }) },
  }),
}));

beforeEach(() => {
  state.viewer = 'viewer-1';
  insert.mockReset().mockResolvedValue({ error: null });
  from.mockClear();
});
afterEach(cleanup);

describe('MemberSafetyActions', () => {
  it('stays hidden on your own profile', async () => {
    render(<MemberSafetyActions profileId="viewer-1" memberName="Me" onBlocked={vi.fn()} />);
    await waitFor(() => expect(from).not.toHaveBeenCalled());
    expect(screen.queryByRole('button', { name: /Report/ })).toBeNull();
  });

  it('confirms on the page before blocking, then blocks', async () => {
    const onBlocked = vi.fn();
    const confirm = vi.spyOn(window, 'confirm');
    render(<MemberSafetyActions profileId="member-2" memberName="Jordan Price" onBlocked={onBlocked} />);
    fireEvent.click(await screen.findByRole('button', { name: 'Block' }));

    expect(screen.getByRole('heading', { name: 'Block Jordan Price?' })).toBeTruthy();
    expect(screen.getByText('They won’t be told.')).toBeTruthy();
    expect(insert).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(screen.getByRole('button', { name: 'Block' })).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: 'Block' }));
    fireEvent.click(screen.getByRole('button', { name: 'Yes, block' }));
    await waitFor(() => expect(onBlocked).toHaveBeenCalledTimes(1));
    expect(from).toHaveBeenCalledWith('user_blocks');
    expect(insert).toHaveBeenCalledWith({ blocker_id: 'viewer-1', blocked_id: 'member-2' });
    expect(confirm).not.toHaveBeenCalled();
  });

  it('treats an existing block as done and shows a plain error otherwise', async () => {
    const onBlocked = vi.fn();
    insert.mockResolvedValueOnce({ error: { code: '42501' } });
    render(<MemberSafetyActions profileId="member-2" memberName="Jordan" onBlocked={onBlocked} />);
    fireEvent.click(await screen.findByRole('button', { name: 'Block' }));
    fireEvent.click(screen.getByRole('button', { name: 'Yes, block' }));
    expect((await screen.findByRole('alert')).textContent).toMatch(/Couldn’t block them/);
    expect(onBlocked).not.toHaveBeenCalled();

    insert.mockResolvedValueOnce({ error: { code: '23505' } });
    fireEvent.click(screen.getByRole('button', { name: 'Yes, block' }));
    await waitFor(() => expect(onBlocked).toHaveBeenCalledTimes(1));
  });

  it('needs a reason, and details for Something else, before sending a report', async () => {
    render(<MemberSafetyActions profileId="member-2" memberName="Jordan" sourceReportId="report-9" onBlocked={vi.fn()} />);
    fireEvent.click(await screen.findByRole('button', { name: 'Report' }));
    const send = screen.getByRole('button', { name: 'Send report' }) as HTMLButtonElement;
    expect(screen.getByRole('heading', { name: 'Why are you reporting Jordan?' })).toBeTruthy();
    expect(send.disabled).toBe(true);

    fireEvent.click(screen.getByRole('radio', { name: 'Something else' }));
    expect(send.disabled).toBe(true);
    fireEvent.change(screen.getByRole('textbox', { name: 'What happened?' }), { target: { value: '  Posting fake reports  ' } });
    expect(send.disabled).toBe(false);
    fireEvent.click(send);

    expect(await screen.findByText('Report sent')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Block them too' }));
    expect(screen.getByRole('heading', { name: 'Block Jordan?' })).toBeTruthy();
    expect(from).toHaveBeenCalledWith('user_moderation_reports');
    expect(insert).toHaveBeenCalledWith({ reporter_id: 'viewer-1', reported_user_id: 'member-2', source_report_id: 'report-9', reason: 'other', details: 'Posting fake reports' });
  });

  it('points to emergency services for a safety concern', async () => {
    render(<MemberSafetyActions profileId="member-2" onBlocked={vi.fn()} />);
    fireEvent.click(await screen.findByRole('button', { name: 'Report' }));
    expect(screen.getByRole('heading', { name: 'Why are you reporting this member?' })).toBeTruthy();
    fireEvent.click(screen.getByRole('radio', { name: 'Safety concern' }));
    expect(screen.getByText(/call 911 first/)).toBeTruthy();
  });
});
