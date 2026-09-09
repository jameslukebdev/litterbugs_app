# Account history and recovery iteration

Implemented all four recommendations from the preceding account audit.

## Changes

- Public profiles query reports by member, independently of the map, with explicit Active and Completed tabs and older-page navigation. Missing profiles and failed requests have different states. Existing blocking and server visibility rules remain in force.
- Payment history uses stable 25-record pages ordered by timestamp and ID. Completed impact filters the full query before pagination. Older-page failures preserve existing rows and offer retry. Payment details are scoped to the signed-in contributor; status/date presentation now lives in shared modules.
- A shared focused-resource hook prevents late responses from updating a newer account, route, or filter. Payout availability distinguishes loading, disabled, and failure. Cleanup context and saved-draft restoration have separate retry paths; expired/inaccessible claims receive specific guidance. Failed draft restoration cannot silently replace saved evidence with an empty draft.
- The optional How points work sheet explains report and cleanup points, report-credit limits, current progress, and rank milestones. Rules come from the existing ranking implementation and database migration, including eligible report +1 and completed cleanup +3. It does not introduce new awards.

## Design and Supabase scope

Preserved the existing Litterbugs green/white reference and navigation. The preceding audit's visually inspected Refero examples remain the reference lock: [Wise payment details](https://refero.design/screens/fe8616d6-7195-4cf5-8682-8887652de03a) and [Google Maps badge progress](https://refero.design/screens/d239ab8b-4967-4e8b-980e-d852d3f15ea4).

Supabase changes are client read-query changes through the existing authenticated client. No tables, migrations, policies, credentials, paid services, or payment execution were changed. Checked installed PostgREST query-builder behavior and official [filter-builder documentation](https://supabase.github.io/postgrest-js/v2/classes/PostgrestFilterBuilder.html). Pagination retains full timestamp precision and rejects invalid cursor syntax.

## Verification

- 311 JavaScript tests passed across 71 files. Tests cover histories exceeding 50 rows, identical timestamps, completed matches beyond the first page, account scoping, query failures, stale responses, draft restoration failures, and cleanup context recovery. Payment fixtures intercept HTTP locally; no real transactions were created.
- Actual iPhone 17 Pro UI regression passed for My reports remaining independent of map browsing. A separate final native test passed for opening/closing the points sheet and switching payment-history filters. The initial points lookup was skipped; the final run has an explicit accessibility label and passed without skipping.
- Computer-use walkthrough of the normal app confirmed live public-profile queries: Howard's Creek appeared under Active reports; Trash on Castle Ford appeared under Completed reports. Both loaded successfully through existing Supabase permissions.
- Diff whitespace checks passed. No production deployment, real payment, cleanup claim, report publication, profile save, or message was performed. Real-device GPS, a smaller iPhone, and live financial/error scenarios were not tested in this iteration; financial and failure paths use isolated tests.

Evidence: `/tmp/lb-account-final-js.log`, `/tmp/lb-account-iteration-native.xcresult`, `/tmp/lb-account-points-final.xcresult`, `/tmp/lb-public-profile-completed.png`.
