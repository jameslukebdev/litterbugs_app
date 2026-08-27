# Web replacement implementation

The new website lives in `apps/web` and connects only to Supabase project
`mvaygkflcjswtwchflrk`. It does not import or depend on the archived website.

## Implemented product surface

- Public browsing of active, unexpired reports with exact coordinates.
- Google Maps JavaScript API with location centering and roadmap, satellite,
  hybrid, and terrain controls.
- Mobile-style report details with signed private photo URLs, types, severity,
  notes, reported date, and expiration date. Mobile-created HEIC/HEIF objects
  are converted to cached JPEG responses by a web-only endpoint after it proves
  the object belongs to an active, unexpired report; stored objects and mobile
  behavior remain unchanged.
- A signed-out prompt before report creation; there is no web Guest mode.
- Email/password, Google, and Facebook authentication. Apple remains absent
  until the production App ID transfer and provider setup are complete.
- The same Title, Photos, Litter Types, Severity, Notes, and Review report steps.
- The same ten-mile creation boundary and maximum of three photos.
- Owner-only editing and deletion.
- Account status, sign-out, password recovery, and the existing account-deletion
  Edge Function.
- A separately protected `/admin` cleanup-review inbox. Every read and decision
  is reauthorized against a private membership record and MFA assurance level 2.

There is deliberately no report list, search, profile UI, My Reports page,
realtime feed, funding, donations, Stripe, claims, evidence, cleanup review,
payout, moderation, operations, or placeholder future-feature UI in the public
web experience. `/admin` is the only operational exception and never contains
public checkout or client-side financial credentials.

The shared contract has an automated parity gate that reads the mechanically
moved `apps/mobile/MapScreen.js` source. It fails if the web contract drifts
from mobile's exact step order, preset labels, severity levels, limits,
ten-mile boundary, or current edit-photo behavior. Anonymous Supabase claims
are rejected on both the server-rendered and browser write boundaries.

## Environment

Copy `apps/web/.env.example` to an ignored `.env.local` and provide:

- `NEXT_PUBLIC_SUPABASE_URL` — must resolve to project
  `mvaygkflcjswtwchflrk`; the app refuses any other project reference.
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` — the correct project's public key.
- `NEXT_PUBLIC_GOOGLE_MAPS_BROWSER_KEY` — a new browser key restricted by HTTP
  referrer. Do not use the Android Maps key.
- `NEXT_PUBLIC_GOOGLE_MAPS_MAP_ID` — the web-only JavaScript map ID used by
  Google's accessible Advanced Marker API.
- `NEXT_PUBLIC_SITE_URL` — the current local, preview, beta, or production URL.

No secret or service-role key belongs in the website environment.

## Required provider configuration

Preserve every existing `litterbugs://` mobile redirect and add these web URLs
to the correct Supabase Auth project:

- `https://litterbugs.app/auth/callback`
- `https://litterbugs.app/auth/reset-password`
- Equivalent Vercel preview and `https://beta.litterbugs.app` callback URLs
  during QA.

The correct hosted project now contains all original mobile/Expo and
account-deletion URLs plus production, beta, preview-wildcard, and localhost
web URLs. Its fallback Site URL is `https://litterbugs.app`; mobile signup,
recovery, and OAuth continue to provide their unchanged explicit
`litterbugs://` destinations.

Apple sign-in is not exposed in the current mobile or web UI. After the
production `com.litterbugs.app` App ID transfers to Grant's Apple team, Apple
web login will require a separate Service ID with the production domain and
Supabase callback registered. That later project must be explicitly tested
before exposing the provider and must not change mobile behavior incidentally.

Enable the Google Maps JavaScript API on the intended Google Cloud project and
create a JavaScript map ID plus a browser-only key restricted to:

- `https://litterbugs.app/*`
- `https://www.litterbugs.app/*`
- `https://beta.litterbugs.app/*`
- Approved Vercel preview origins while testing.

The existing Android key remains restricted to the Android package and signing
certificate. Places API is not required or authorized.

## Local verification

```sh
npm install
npm run typecheck
npm test
npm run web:lint
npm run web:build
npm run web:boundaries
npm run web:test:cross-browser
npm run supabase:functions:check
npm run auth-bridge:check
npm run mobile:doctor
```

`apps/web/e2e/hosted-account-flow.spec.ts` is an opt-in live test. Supply only
disposable, administrator-confirmed credentials as `WEB_QA_EMAIL` and
`WEB_QA_PASSWORD`, run it against beta, and remove the identity and any report
rows immediately afterward. The test signs in through the actual website,
uses the real photo picker, verifies signed photo display and edit preservation,
creates, edits, deletes, and signs out without storing credentials in Git. The
live Playwright configuration uses one worker when disposable credentials are
present because Supabase sign-out intentionally revokes the other sessions for
that same test identity. Public signed-out checks remain parallel. The
August 21, 2026 run passed in desktop Chrome, Firefox, and Safari/WebKit plus
mobile Chrome and Safari/WebKit. The pre-migration run confirmed that the old
delete policy left the uploaded object after the row was removed. After the two
hardening/cleanup migrations were applied, the same five-profile flow passed
again and fresh Storage signing probes confirmed each object was removed
asynchronously. Exact cleanup retained zero report rows, Storage objects, or
test identities.

The public acceptance spec also opens the live mobile-created `High example`
report and requires all three HEIC photos to decode with nonzero browser image
dimensions. That regression passed sequentially on beta and production in
desktop Chrome, Firefox, Safari/WebKit, mobile Chrome, and mobile
Safari/WebKit. The compatibility endpoint loads only the selected photo, keeps
browser-compatible formats on their existing signed-URL path, rejects unknown
or invalid paths, and returns no secret or service-role credential to clients.

For future hosted cleanup regression runs, set
`WEB_QA_EXPECT_ASYNC_PHOTO_CLEANUP=1` for the same hosted test. It will poll the
real Storage signing endpoint after report deletion and fail unless the
asynchronous cleanup removes the object within 30 seconds. A fresh sign probe is
used because a previously signed image URL may remain briefly available from a
CDN cache after the underlying object is gone.

The web build uses the separate Vercel project rooted at `apps/web`. Production
domains were attached only after the acceptance gates in
`docs/cutover-checklist.md` passed.

The root `check` command scans both the web runtime source and compiled output
for the archived Supabase project, excluded map/marketplace systems, Places API,
and public secret-key mistakes. It type-checks both Edge Functions with pinned
Deno and runs a pinned Wrangler dry-run for the moved `services/auth-bridge`
Worker. Its source diff changes only the logo import path; the deployed
`auth.litterbugs.app` domain and routes remain unchanged.

## Backend baseline status

The Supabase CLI was linked read-only to the correct project. The hosted public
schema, functions, report RLS policies, and custom Storage policies are recorded
under `supabase/baseline`, and the database types were generated directly from
that project.

The baseline confirms that existing mobile-created reports use a null status;
the website therefore treats null or `active` status as active while still
requiring an unexpired date. It also confirms public report reads, owner-only
row writes, public photo reads, and authenticated photo uploads.

The hosted migration history and committed filenames are aligned. The two new
migrations restrict uploads to the existing user-ID-first folder convention,
add owner deletion, fix function search paths, optimize unchanged report
ownership checks, and queue asynchronous photo cleanup after report deletion.
Both were applied to `mvaygkflcjswtwchflrk` on August 21, 2026 after explicit
owner authorization. Post-apply two-user API testing and the five-browser
hosted flow passed, including owner/cross-owner enforcement, expiration, exact
public coordinates, photo upload/sign/edit/delete, and asynchronous orphan
cleanup. The exact fixtures created by those runs were removed.

The final hosted-data reconciliation on August 21, 2026 also found and removed
four older anonymous, email-less QA identities, five test reports, and three
matching Storage objects left by earlier acceptance work. Post-cleanup checks
confirmed zero matching users, identities, sessions, profiles, reports,
objects, or `QA`/`test`-titled reports remain in the live project.

A live disposable Guest test also verified the deployed account-deletion
function on the correct project: its only uploaded object was removed, its Auth
identity stopped resolving, and no report fixture was created or retained.

The deleted legacy Supabase project `syvgqzfbhkczkwozvola` is read-only
historical context, not a possible target. Before its owner-authorized permanent
deletion, a schema-only dump was verified at
`/Users/grantgibson/Downloads/Litterbugs-US-East-syvgqzfbhkczkwozvola-schema-2026-08-21.sql`
(1,854,591 bytes; SHA-256
`863f11ff194d721fd02c30cdad83d5aa07cfa87f74a260d9cb36539162bf9a20`;
no table data). The surviving project `mvaygkflcjswtwchflrk` is the only live
Litterbugs Supabase target. Further changes in jameslukebdev's organization
require explicit owner authorization.

The isolated Vercel project is `litterbugs-web`, rooted at `apps/web`. Its
preview and production builds pass and `beta.litterbugs.app` is attached to the
new project. Cloudflare's DNS-only beta record points to Vercel, TLS is active,
and the beta URL passes browser acceptance. After the final gate passed on
August 21, 2026, `litterbugs.app` and `www.litterbugs.app` were moved to the
same accepted deployment. The apex response matched beta byte-for-byte, `www`
retained its redirect, and all five desktop/mobile browser profiles passed
against the production apex with one worker. `auth.litterbugs.app` remained
unchanged and healthy. The detached old deployment is preserved temporarily at
`https://litterbugs-1q6eqqaia-grant-9890s-projects.vercel.app`.
The later HEIC compatibility correction was deployed from clean `main` commit
`2941a44` as `dpl_Goy21KScnTdcbrNpmdrjAxqE8ZnE`; beta and apex each passed the
same five-profile photo regression before and after their aliases moved.
The app-style sign-in correction was deployed from clean `main` commit
`30cec23` as `dpl_8734Dr7WWjqbxfBDn4NuG1MticqF`. On August 21, 2026,
`litterbugs.app` and `www.litterbugs.app` were explicitly moved from the prior
deployment to that artifact. Direct apex verification confirmed the app-style
provider screen, the correct Google map, and a decoded live report photo with
no browser errors. The apex is the canonical live website; beta remains the
pre-release acceptance alias.
The narrowly scoped provider-mark correction was then deployed from clean
`main` commit `b8e9a2f` as `dpl_4ib36QWYS2QwMKt6hDebUxVrYau3`. It uses the
same Google image asset as mobile and a vector Facebook mark, while restoring
the original inline email/password form below the provider buttons. Beta and
the production apex both passed browser verification before their aliases
moved to the corrected artifact.
The old Vercel project's Git connection was removed and all 94 of its
production/preview environment records were deleted, while the new project's
14 scoped records remained intact. The private `gegibson-oss/litterbugs`
repository was archived; the canonical Partner repository was not archived or
disconnected.
Use Vercel's current deployment record rather than treating a deployment ID as
configuration.
