import { processCleanupPayout } from './cleanup-payout.ts';
const assert = (value: unknown, message = 'Assertion failed') => { if (!value) throw new Error(message); };
function fixture() {
  const attempt = { id:'c89b35f2-df7b-4d24-8d57-932badce3416', cleaner_id:'b1000000-0000-4000-8000-000000000002', report_id:'68256b51-06ad-4bf1-8e9f-a7a42e2e4631', reward_amount_cents:2500, payout_attempts:2, payout_attempt_started_at:new Date().toISOString(), recovering:false };
  const calls: Array<{name:string; args?:Record<string,unknown>}> = [];
  const transfers: Array<{params:any; options:any}> = [];
  let available=1193, stripeError:unknown=null, dbError=false, accountEnabled=true;
  let contributions=[{stripe_charge_id:'ch_five',principal_amount_cents:500},{stripe_charge_id:'ch_twenty',principal_amount_cents:2000}];
  const admin={
    rpc:async(name:string,args?:Record<string,unknown>)=>{calls.push({name,args});return name==='claim_cleanup_payout_operation_v2'?{data:attempt,error:null}:{error:dbError?new Error('DB unavailable'):null};},
    from:(table:string)=>({select:()=>({eq:()=> table==='cleaner_payout_accounts'?{single:async()=>({data:{stripe_account_id:'acct_cleaner',payouts_enabled:accountEnabled},error:null})}:{eq:async()=>({data:contributions,error:null})}})}),
  } as unknown as Parameters<typeof processCleanupPayout>[0];
  const stripe={balance:{retrieve:async()=>({available:[{currency:'usd',amount:available}]})},transfers:{create:async(params:any,options:any)=>{transfers.push({params,options});if(stripeError)throw stripeError;return{id:'tr_once'};}}} as unknown as Parameters<typeof processCleanupPayout>[1];
  return {attempt,calls,transfers,admin,stripe,set available(v:number){available=v;},set stripeError(v:unknown){stripeError=v;},set dbError(v:boolean){dbError=v;},set accountEnabled(v:boolean){accountEnabled=v;},set contributions(v:typeof contributions){contributions=v;}};
}
Deno.test('two contributions wait without sending a transfer or creating a failure',async()=>{
 const f=fixture();const result=await processCleanupPayout(f.admin,f.stripe);
 assert(result?.status==='waiting_funds');assert(f.transfers.length===0);
 assert(f.calls[1].name==='defer_cleanup_payout_for_funds');assert(f.calls[1].args?.expected_attempt===2);
});
Deno.test('settled funds send the full reward once and record the transfer',async()=>{
 const f=fixture();f.available=3493;await processCleanupPayout(f.admin,f.stripe);
 assert(f.transfers.length===1&&f.transfers[0].params.amount===2500);
 assert(f.transfers[0].params.source_transaction===undefined);
 assert(f.calls[1].args?.transfer_succeeded===true);
});
Deno.test('single charge retains charge-linked settlement handling',async()=>{
 const f=fixture();f.contributions=[{stripe_charge_id:'ch_whole',principal_amount_cents:2500}];await processCleanupPayout(f.admin,f.stripe);
 assert(f.transfers[0].params.source_transaction==='ch_whole');
});
Deno.test('balance race waits automatically after a definite Stripe rejection',async()=>{
 const f=fixture();f.available=3493;f.stripeError={type:'StripeInvalidRequestError',code:'balance_insufficient'};
 assert((await processCleanupPayout(f.admin,f.stripe))?.status==='waiting_funds');
 assert(f.calls[1].name==='defer_cleanup_payout_for_funds');
});
Deno.test('recovery replays the same key even when the earlier transfer drained the balance',async()=>{
 const f=fixture();f.attempt.recovering=true;f.dbError=true;
 try{await processCleanupPayout(f.admin,f.stripe);}catch{/* ledger write interrupted */}
 f.dbError=false;await processCleanupPayout(f.admin,f.stripe);
 assert(f.transfers.length===2);assert(new Set(f.transfers.map(t=>t.options.idempotencyKey)).size===1);
 assert(f.calls.every(c=>c.name!=='defer_cleanup_payout_for_funds'));
});
Deno.test('uncertain Stripe response keeps operation processing instead of issuing a new key',async()=>{
 const original=fixture();original.available=3493;original.stripeError={type:'StripeConnectionError'};
 const baseFrom=original.admin.from.bind(original.admin);
 (original.admin as any).from=(table:string)=>table==='cleanup_attempts'?{update:()=>({eq:()=>({eq:async()=>({error:null})})})}:baseFrom(table);
 try{await processCleanupPayout(original.admin,original.stripe);}catch{/* expected */}
 assert(original.calls.length===1);
});
Deno.test('expired uncertain outcome never creates another transfer',async()=>{
 const f=fixture();f.attempt.recovering=true;f.attempt.payout_attempt_started_at=new Date(Date.now()-24*3600000).toISOString();
 assert((await processCleanupPayout(f.admin,f.stripe))?.status==='needs_review');assert(f.transfers.length===0);
});
Deno.test('disabled recipient still requires attention',async()=>{
 const f=fixture();f.accountEnabled=false;try{await processCleanupPayout(f.admin,f.stripe);}catch{/* expected */}
 assert(f.calls[1].name==='mark_cleanup_payout_result'&&f.calls[1].args?.transfer_succeeded===false);
 assert(f.transfers.length===0);
});
