# Physical iPhone draft verification — October 2, 2026

## Verified

Connected iPhone 6s, iOS 15.8.8, running the existing QA bundle updated in place from source 5386716. Mobile/package source matches TestFlight 17 source 77d4721; this was not an installation of the TestFlight-distributed binary. No new TestFlight submission was made for this fix.

A private synthetic report and checkerboard photo passed website → phone → website → phone, including cold relaunch. The account had no existing report draft before this test. No report was published and no payment or cleanup claim was made.

Concurrent edits exposed a live failure: `private.write_customer_draft` raised `serialization_failure` (`40001`) for an optimistic revision conflict. PostgREST retried repeatedly until the native request aborted. Production logs identified authenticator backends 3288004, 3287360, and 3287359 raising that error. The account version remained unchanged.

Migration `20261002123218_customer_draft_conflict_http_status.sql` changes only that exception to `PT409`, preserving authentication, ownership, idempotency, revision locking, submission cancellation, and function grants. Applied to production October 2 at 12:32 UTC. All three previously looping processes were absent at the subsequent check; no termination or project restart was necessary.

Verification:
- Isolated PostgreSQL 17 / PostgREST 16.4: stale revision returned HTTP 409, code PT409, message draft_conflict in 53 ms.
- Expanded native adapter integration test: real RPC stale revision plus edited-local-copy path, conflict state, newer account revision/title/photo preservation, and account-choice photo restoration passed.
- Physical phone: Sync now displayed both conflict choices. Use account draft restored `PRIVATE QA - account version to keep`, the synthetic photo, and account-synced status.
- Production function definition and existing execution grants verified. Security advisor review did not identify a finding against this private function; existing broader project warnings remain outside this one-line correction.

Evidence screenshots retained locally: `/tmp/litterbugs-oct2-conflict-fixed.png`, `/tmp/litterbugs-oct2-conflict-resolved.png`, `/tmp/litterbugs-oct2-roundtrip-phone.png`.

Supabase documents this exact retry failure: https://supabase.com/docs/guides/troubleshooting/high-cpu-and-infinite-transaction-retries-when-using-custom-error-codes-in-rpc-functions-77326b

## Still unverified / follow-up

- Real TestFlight/APNs notification delivery, native camera/HEIC acceptance, and a physical cleanup-draft handoff are not covered by this report.
- Live Census town selection once displayed Boone while the map stayed in Kansas; address-result selection worked. Correct Census bounds were verified. Root cause and fix remain under investigation.
- Private synthetic test draft is retained for continuing verification.
