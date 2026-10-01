import type { Json } from './database.types';
export type AccountDraftPayload = {
  version: 1; kind: 'report'; coordinates: { latitude: number; longitude: number }; step: number;
  fundingChoice: string; customAmount: string;
  draft: { title: string; types: string; severity: ''|'Low'|'Medium'|'High'; notes: string; selectedTypes: string[]; selectedNotes: string[] };
} | { version: 1; kind: 'cleanup'; description: string; bagsOrItems: string; weightPounds: string; correctionDueAt: string|null };
/** A versioned, platform-neutral wire format. Reject malformed/future drafts
 * before replacing a usable local recovery copy. */
export function accountDraftPayload(value: unknown, key: string): AccountDraftPayload {
  const fail=():never=>{throw new Error('This account draft cannot be opened by this version of Litterbugs.');};
  const object=(v:unknown):Record<string,unknown>=>v&&typeof v==='object'&&!Array.isArray(v)?v as Record<string,unknown>:fail();
  const string=(v:unknown,max:number)=>typeof v==='string'&&v.length<=max?v:fail();
  const list=(v:unknown)=>Array.isArray(v)&&v.length<=32?v.map(item=>string(item,100)):fail();
  const p=object(value);
  if(p.version!==1||p.kind!==(key==='report'?'report':'cleanup'))return fail();
  if(p.kind==='cleanup') {
    const due=p.correctionDueAt??null;
    if(due!==null&&(typeof due!=='string'||!Number.isFinite(Date.parse(due))))return fail();
    return {version:1,kind:'cleanup',description:string(p.description,500),bagsOrItems:string(p.bagsOrItems,20),weightPounds:string(p.weightPounds,20),correctionDueAt:due as string|null};
  }
  const c=object(p.coordinates),d=object(p.draft);
  if(typeof c.latitude!=='number'||!Number.isFinite(c.latitude)||Math.abs(c.latitude)>90||typeof c.longitude!=='number'||!Number.isFinite(c.longitude)||Math.abs(c.longitude)>180||typeof p.step!=='number'||!Number.isInteger(p.step)||p.step<0||p.step>4||!['','Low','Medium','High'].includes(String(d.severity)))return fail();
  return {version:1,kind:'report',coordinates:{latitude:c.latitude,longitude:c.longitude},step:p.step,fundingChoice:string(p.fundingChoice,30),customAmount:string(p.customAmount,30),draft:{title:string(d.title,80),types:string(d.types,500),severity:d.severity as ''|'Low'|'Medium'|'High',notes:string(d.notes,500),selectedTypes:list(d.selectedTypes),selectedNotes:list(d.selectedNotes)}};
}
export const accountDraftJson = (value: unknown,key: string): Json => accountDraftPayload(value,key) as Json;
