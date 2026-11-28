// @vitest-environment jsdom
import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
const m=vi.hoisted(()=>({load:vi.fn(),focus:null}));
vi.mock('react-native',()=>({View:({children})=><div>{children}</div>,Text:({children,accessibilityRole})=><span role={accessibilityRole==='header'?'heading':undefined}>{children}</span>,Image:({accessibilityLabel})=><img alt={accessibilityLabel}/>,TouchableOpacity:({children,onPress,accessibilityLabel,accessibilityState})=><button onClick={onPress} aria-label={accessibilityLabel} aria-expanded={accessibilityState?.expanded}>{children}</button>,ActivityIndicator:()=> <span>Loading Timeline</span>,StyleSheet:{create:v=>v},AppState:{currentState:'active',addEventListener:(_,fn)=>{m.focus=fn;return{remove:vi.fn()};}}}));
vi.mock('@expo/vector-icons',()=>({Ionicons:()=>null}));
vi.mock('./BrandBug',()=>({default:()=>null}));
vi.mock('./PrivateView',()=>({default:({children})=><div>{children}</div>}));
vi.mock('../lib/reportSites',async original=>({...await original(),loadReportSite:(...args)=>m.load(...args)}));
import ReportSiteActivity from './ReportSiteActivity';
const old={id:'10000000-0000-4000-8000-000000000001',state:'completed',title:'Trail',reporterId:'riley',reporterName:'Riley',reportDate:'2026-11-01',claimedDate:'2026-11-02',completionDate:'2026-11-03',cleanerName:'Morgan',location:{latitude:36.2,longitude:-81.6},beforePhotoUrl:'/reports/10000000-0000-4000-8000-000000000001/photo/before',afterPhotoUrl:'/reports/10000000-0000-4000-8000-000000000001/photo/after',weightPounds:4,cleanupMinutes:30};
let root,container;
const render=async(props={})=>act(async()=>{root.render(<ReportSiteActivity report={{id:old.id,cleanup_state:'completed'}} visible onReportAgain={vi.fn()} onOpenReport={vi.fn()} {...props}/>);});
const button=text=>[...container.querySelectorAll('button')].find(b=>b.textContent.includes(text));
beforeEach(()=>{globalThis.IS_REACT_ACT_ENVIRONMENT=true;m.load.mockReset();m.load.mockResolvedValue({reports:[old],canReportAgain:true,currentReportId:null});container=document.createElement('div');document.body.append(container);root=createRoot(container);});
afterEach(async()=>{await act(async()=>root.unmount());container.remove();});
describe('native site activity',()=>{
 it('offers the existing wizard entry and a single Timeline with expandable evidence',async()=>{
  const again=vi.fn();await render({onReportAgain:again});expect([...container.querySelectorAll('[role=heading]')].map(e=>e.textContent)).toEqual(['Timeline']);
  await act(async()=>button('Needs cleaning again').click());expect(again).toHaveBeenCalledWith(old);
  await act(async()=>button('Cleaned up by Morgan').click());expect(container.querySelectorAll('img')).toHaveLength(2);expect(container.textContent).toContain('4 lb · 30 min');
 });
 it('preserves earlier ownership and opens the current report instead of another form',async()=>{
  const current={...old,id:'10000000-0000-4000-8000-000000000002',state:'available',reporterName:'Jamie',reporterId:'jamie',reportDate:'2026-11-24',completionDate:null};m.load.mockResolvedValue({reports:[old,current],canReportAgain:false,currentReportId:current.id});const open=vi.fn();await render({onOpenReport:open});expect(button('Needs cleaning again')).toBeUndefined();expect(container.textContent).toContain('Reported by Riley');expect(container.textContent).toContain('Reported by Jamie');await act(async()=>button('View latest report').click());expect(open).toHaveBeenCalledWith(current.id);
 });
 it('fails closed on an unavailable history and supports retry',async()=>{
  m.load.mockRejectedValueOnce(Error('offline'));await render();expect(button('Needs cleaning again')).toBeUndefined();await act(async()=>button('Try again').click());expect(button('Needs cleaning again')).toBeTruthy();
 });
 it('excludes blocked reporter history and stops network work when closed',async()=>{
  await render({blockedIds:['riley']});expect(container.textContent).not.toContain('Riley');expect(button('Needs cleaning again')).toBeUndefined();const calls=m.load.mock.calls.length;await render({visible:false});expect(container.innerHTML).toBe('');expect(m.load).toHaveBeenCalledTimes(calls);
 });
 it('refreshes after returning from the background',async()=>{
  await render();m.load.mockResolvedValue({reports:[{...old,state:'available',completionDate:null}],canReportAgain:false,currentReportId:old.id});await act(async()=>m.focus('active'));expect(button('Needs cleaning again')).toBeUndefined();expect(container.textContent).toContain('Current report');
 });
});
