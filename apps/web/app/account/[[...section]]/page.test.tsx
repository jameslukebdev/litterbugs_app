import { beforeEach, expect, it, vi } from 'vitest';
const auth=vi.hoisted(()=>({signedIn:false}));
vi.mock('next/navigation',()=>({notFound:()=>{throw new Error('not found')},redirect:(url:string)=>{throw new Error(url)}}));
vi.mock('@/components/account-page',()=>({AccountPage:()=>null}));
vi.mock('@/lib/supabase/server',()=>({createClient:async()=>({auth:{getClaims:async()=>({data:{claims:auth.signedIn?{sub:'member',is_anonymous:false}:null}})}})}));
import Page from './page';
const id='11111111-1111-4111-8111-111111111111';
beforeEach(()=>{auth.signedIn=false});
it('preserves the exact renewal destination through sign-in',async()=>{
 await expect(Page({params:Promise.resolve({section:['reports']}),searchParams:Promise.resolve({renewal:id})})).rejects.toThrow(`/sign-in?next=${encodeURIComponent('/account/reports?renewal='+id)}`);
});
it('does not reflect an invalid renewal identifier in the redirect',async()=>{
 await expect(Page({params:Promise.resolve({section:['reports']}),searchParams:Promise.resolve({renewal:'https://other.example'})})).rejects.toThrow(`/sign-in?next=${encodeURIComponent('/account/reports')}`);
});
