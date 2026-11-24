import { expect, it, vi } from 'vitest';
const access=vi.hoisted(()=>vi.fn());
vi.mock('@/lib/admin-access',()=>({getAdminAccessState:access}));
vi.mock('./weekly-email-list',()=>({WeeklyEmailList:()=>null}));
vi.mock('@/app/admin/admin-access',()=>({AdminAccess:()=>null}));
import Page from './page';
import { WeeklyEmailList } from './weekly-email-list';
import { AdminAccess } from '../admin-access';
it('does not render recipient access for signed-out, ordinary or non-MFA sessions',async()=>{
 for(const state of ['signed_out','not_authorized','mfa_required']) {
  access.mockResolvedValue(state);const page=await Page();const panel=page.props.children[1];
  expect(panel.type).toBe(AdminAccess);expect(panel.props.destination).toBe('email');
 }
 access.mockResolvedValue('authorized');const page=await Page();expect(page.props.children[1].type).toBe(WeeklyEmailList);
});
