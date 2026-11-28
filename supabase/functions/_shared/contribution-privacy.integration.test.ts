import { PGlite } from 'npm:@electric-sql/pglite@0.5.17';
import { fileURLToPath } from 'node:url';
import { contributionPrivacyDatabase } from '../../tests/fixtures/contribution-privacy.mjs';
import { createContributionResponse } from './create-contribution.ts';

const assert = (condition: unknown, message: string) => { if (!condition) throw new Error(message); };
const root = fileURLToPath(new URL('../../../', import.meta.url));
const donor = '91000000-0000-4000-8000-000000000021';
const report = '92000000-0000-4000-8000-000000000021';
const requestId = '93000000-0000-4000-8000-000000000021';

Deno.test('actual checkout handler → persisted choice → public donors → owner hide/show, with unchanged payment totals', async () => {
  const db: PGlite = await contributionPrivacyDatabase(PGlite, root);
  try {
    await db.exec(await Deno.readTextFile(`${root}/supabase/tests/cleanup_contributor_visibility.sql`));
    await db.exec(`
      insert into auth.users(id) values ('${donor}');
      insert into public.profiles(id,display_name) values ('${donor}','Integration Donor');
      insert into public.reports(id,user_id,title,photo_paths,expires_at,funding_eligibility)
        values ('${report}','${donor}','Integration report',array['photo.jpg'],now()+interval '30 days','eligible');
      update public.cleanup_feature_flags set enabled=true;
      update public.cleanup_pricing_config set pricing_version=2;
      insert into private.report_communities values ('${report}','94000000-0000-4000-8000-000000000021');
    `);
    // Only the external payment provider is substituted. All reservations and
    // privacy reads/updates execute the migration's real PostgreSQL functions.
    let charges = 0;
    let intent: Record<string, unknown> | undefined;
    const dependencies = {
      authenticatedUser: async () => ({ id: donor, email: 'donor@example.test', is_anonymous: false }),
      requiredEnv: () => 'pk_test_integration',
      serviceClient: () => ({
        from: () => ({ select: () => ({ eq: () => ({ single: async () => ({ data: { pricing_version: 2 }, error: null }) }) }) }),
        rpc: async (name: string, args: Record<string, unknown>) => {
          if (name === 'attach_cleanup_payment_intent') {
            await db.query('select * from public.attach_cleanup_payment_intent($1::uuid,$2::text)', [args.target_contribution_id,args.payment_intent_id]);
            return { data: true, error: null };
          }
          assert(name === 'reserve_named_cleanup_contribution', 'the website must reserve a privacy choice');
          const result = await db.query('select * from public.reserve_named_cleanup_contribution($1::uuid,$2::uuid,$3::uuid,$4::bigint,$5::integer,$6::text,$7::boolean)',
            [args.target_report_id,args.target_contributor_id,args.target_client_request_id,args.principal_cents,args.expected_pricing_version,args.receipt_email,args.show_name]);
          // Supabase's JSON wire format uses numeric amounts, unlike local bigint decoding.
          const row = result.rows[0] as Record<string, unknown>;
          for (const key of ['principal_amount_cents','platform_fee_cents','total_amount_cents']) row[key] = Number(row[key]);
          return { data: row, error: null };
        },
      }),
      stripeClient: () => ({ paymentIntents: {
        create: async (params: Record<string, unknown>) => { charges++; intent = { ...params, id: 'pi_integration', client_secret: 'pi_integration_secret', status: 'requires_payment_method' }; return intent; },
        retrieve: async () => intent,
      } }),
    } as unknown as NonNullable<Parameters<typeof createContributionResponse>[1]>;
    const call = (body: Record<string, unknown>) => createContributionResponse(new Request('http://localhost/checkout', {
      method: 'POST', body: JSON.stringify({ reportId: report, clientRequestId: requestId, principalAmountCents: 500, pricingVersion: 2, ...body }),
    }), dependencies);
    const quote = await (await call({ mode: 'quote' })).json();
    assert(quote.supportsContributorVisibility && quote.totalAmountCents === 600, 'the quote advertises privacy support and the right total');
    const response = await call({ showContributorName: false });
    const receipt = await response.json();
    assert(response.status === 200 && receipt.showContributorName === false, 'anonymous checkout persisted the choice');
    const retry = await (await call({ showContributorName: true })).json();
    assert(retry.contributionId === receipt.contributionId && retry.showContributorName === false && charges === 1, 'a retry cannot overwrite the choice or double-charge');
    await db.query(`update public.cleanup_contributions set status='succeeded',succeeded_at=now(),auto_refund_due_at=now()+interval '23 months' where id=$1`, [receipt.contributionId]);
    const credit = async () => (await db.query('select * from public.cleanup_contributor_credits(array[$1::uuid])',[report])).rows[0] as { names: string[]; donations: { name: string | null; amountCents: number }[] };
    const hidden = await credit();
    assert(hidden.names.length === 0 && hidden.donations[0].name === null && hidden.donations[0].amountCents === 500, 'public donor data includes amount and omits the private name');
    const change = async (userId: string, shown: boolean) => db.transaction(async tx => {
      await tx.exec('set local role authenticated');
      await tx.query("select set_config('request.jwt.claims',$1,true)",[JSON.stringify({ sub:userId, role:'authenticated', is_anonymous:false })]);
      return (await tx.query('select public.set_cleanup_contributor_visibility($1::uuid,$2::boolean) as changed',[receipt.contributionId,shown])).rows[0] as { changed: boolean };
    });
    assert(!(await change('91000000-0000-4000-8000-000000000022',true)).changed, 'another donor cannot reveal the name');
    assert((await change(donor,true)).changed && (await credit()).names[0] === 'Integration Donor', 'the donor can show the saved name');
    assert((await change(donor,false)).changed && (await credit()).names.length === 0, 'the donor can hide it again');
    const board = await db.query("select * from private.leaderboard_items('fund') where profile_id=$1",[donor]);
    assert(board.rows.length === 0, 'an anonymous donation is excluded from public funder rankings');
    assert((await change(donor,true)).changed, 'restore the public name');
    assert((await db.query("select * from private.leaderboard_items('fund') where profile_id=$1",[donor])).rows.length === 1, 'public donation counts on the funder board');
    const stored = (await db.query('select total_amount_cents,status from public.cleanup_contributions where id=$1',[receipt.contributionId])).rows[0] as {total_amount_cents: number;status: string};
    assert(Number(stored.total_amount_cents) === 600 && stored.status === 'succeeded' && charges === 1, 'privacy changes leave the payment intact');
  } finally { await db.close(); }
});
