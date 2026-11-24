// @vitest-environment jsdom
import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
const fixture=vi.hoisted(()=>({resource:{data:null},user:{id:'member',is_anonymous:false},save:vi.fn(),refresh:vi.fn()}));
vi.mock('react-native',()=>({View:({children})=><div>{children}</div>,ScrollView:({children})=><div>{children}</div>,Text:({children,accessibilityRole})=><span role={accessibilityRole}>{children}</span>,Switch:({value,onValueChange,disabled,accessibilityLabel})=><input type="checkbox" role="switch" aria-label={accessibilityLabel} checked={value} disabled={disabled} onChange={e=>onValueChange(e.target.checked)}/>,StyleSheet:{create:v=>v,hairlineWidth:1}}));
vi.mock('@expo/vector-icons',()=>({Ionicons:()=>null}));
vi.mock('react-native-safe-area-context',()=>({useSafeAreaInsets:()=>({bottom:0})}));
vi.mock('./components/LoadingBee',()=>({default:()=> <span>Loading</span>}));
vi.mock('./components/ui',()=>({PrimaryButton:({label,onPress,busy,disabled})=><button onClick={onPress} disabled={busy||disabled}>{label}</button>,LoadFailure:({onRetry})=><button onClick={onRetry}>Try again</button>}));
vi.mock('./lib/session',()=>({useSession:()=>({user:fixture.user})}));
vi.mock('./lib/useFocusedResource',()=>({default:()=>({...fixture.resource,refresh:fixture.refresh})}));
vi.mock('./lib/weeklyEmail',()=>({loadWeeklyEmailPreference:vi.fn(),saveWeeklyEmailPreference:fixture.save}));
import EmailPreferencesScreen from './EmailPreferencesScreen';
const preference={email:'alex@example.com',subscribed:true,source:'existing_default',updated_at:null};
let root,container;
beforeEach(()=>{globalThis.IS_REACT_ACT_ENVIRONMENT=true;fixture.resource={data:preference,updatedAt:1};fixture.user={id:'member',is_anonymous:false};fixture.save.mockReset();fixture.refresh.mockReset();container=document.createElement('div');document.body.append(container);root=createRoot(container);});
afterEach(async()=>{await act(async()=>root.unmount());container.remove();});
const render=()=>act(async()=>root.render(<EmailPreferencesScreen/>));
it('starts on, saves off to the shared server, refreshes, and confirms it',async()=>{
 fixture.save.mockResolvedValue({...preference,subscribed:false});fixture.refresh.mockImplementation(async()=>{fixture.resource={data:{...preference,subscribed:false},updatedAt:2};});
 await render();expect(container.querySelector('input').checked).toBe(true);expect(container.querySelector('button').disabled).toBe(true);
 await act(async()=>container.querySelector('input').click());await act(async()=>container.querySelector('button').click());
 expect(fixture.save).toHaveBeenCalledWith('member',false);expect(fixture.refresh).toHaveBeenCalledOnce();
 expect(container.textContent).toContain('Saved');expect(container.querySelector('input').checked).toBe(false);
});
it('never reports a failed save as saved',async()=>{
 fixture.save.mockRejectedValue(Error('offline'));await render();await act(async()=>container.querySelector('input').click());await act(async()=>container.querySelector('button').click());
 expect(container.textContent).toContain('not saved');expect(container.textContent).not.toContain('Saved');
});
it('hides stale controls on a failed refresh and shows the website withdrawal when reloaded',async()=>{
 fixture.resource={data:preference,error:Error('offline')};await render();expect(container.querySelector('input')).toBeNull();
 fixture.resource={data:{...preference,subscribed:false},updatedAt:2};await render();expect(container.querySelector('input').checked).toBe(false);
});
