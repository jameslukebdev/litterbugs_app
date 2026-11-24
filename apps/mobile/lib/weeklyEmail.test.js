import { beforeEach, expect, it, vi } from 'vitest';
const rpc=vi.hoisted(()=>vi.fn());
vi.mock('./supabase',()=>({supabase:{rpc}}));
import { loadWeeklyEmailPreference, saveWeeklyEmailPreference } from './weeklyEmail';
const preference={email:'alex@example.com',subscribed:false,source:'public_unsubscribe',updated_at:null};
beforeEach(()=>{rpc.mockReset();rpc.mockResolvedValue({data:preference,error:null});});
it('uses the server suppression rather than a device default',async()=>{
 expect((await loadWeeklyEmailPreference('member')).subscribed).toBe(false);
 expect(rpc).toHaveBeenCalledWith('get_weekly_email_preferences');
});
it('only confirms a write when the backend actually saves it',async()=>{
 expect(await saveWeeklyEmailPreference('member',false)).toEqual(preference);
 expect(rpc).toHaveBeenCalledWith('set_weekly_email_preference',{target_subscribed:false});
 rpc.mockResolvedValueOnce({error:{code:'PGRST202'}});
 await expect(saveWeeklyEmailPreference('member',false)).rejects.toThrow('not saved');
});
it('never defaults to on when offline, unavailable, malformed, or signed out',async()=>{
 await expect(loadWeeklyEmailPreference(null)).rejects.toThrow('Sign in');expect(rpc).not.toHaveBeenCalled();
 rpc.mockResolvedValueOnce({error:{code:'42P01'}});await expect(loadWeeklyEmailPreference('member')).rejects.toThrow('unavailable');
 rpc.mockResolvedValueOnce({data:null});await expect(loadWeeklyEmailPreference('member')).rejects.toThrow('could not be loaded');
});
