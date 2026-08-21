# Litterbugs web cutover checklist

Nothing in this document authorizes a production cutover before every required
gate passes.

## Backend and authentication

- [x] Verify the mechanically moved Cloudflare auth bridge bundles with the
      pinned Wrangler version and retains its custom domain, routes, security
      responses, privacy page, health check, and logo asset behavior.
- [x] Link CLI access to Supabase `mvaygkflcjswtwchflrk`.
- [x] Pull and commit the application schema, functions, report RLS, and custom
      Storage policy baseline.
- [x] Regenerate database types from the hosted schema.
- [x] Align the three older local migration filenames with hosted history.
- [x] Pass the two-user report/Storage RLS regression test inside a rolled-back
      transaction on the correct hosted project.
- [x] Repeat two-user ownership testing after applying the hosted migrations.
      The live API run proved signed-out writes, cross-owner row changes, and
      cross-owner Storage uploads fail while owner operations, exact-coordinate
      reads, expiration, and cleanup still work.
- [x] Verify signed-out writes fail and two disposable hosted Guests can only
      insert, update, and delete their own report rows.
- [x] Verify the current owner path uploads, signs, explicitly removes, and
      deletes cleanly through the hosted APIs, retaining zero test fixtures.
- [x] Verify asynchronous orphan cleanup after applying both migrations by
      rerunning the hosted account flow with
      `WEB_QA_EXPECT_ASYNC_PHOTO_CLEANUP=1`. All five desktop/mobile browser
      profiles passed with fresh Storage signing probes, and exact cleanup
      confirmed zero rows, objects, or test identities remained.
- [x] Verify account deletion removes the Auth identity and every object under
      its Storage folder. A disposable hosted Guest test removed one object,
      invalidated the identity, and left no report fixture.
- [x] Verify the account-deletion function preserves the current anonymized
      report fields in the rolled-back hosted SQL test and committed function
      source.
- [x] Add web callback/reset URLs without removing mobile callbacks.
- [x] Keep Apple disabled until the separately authorized post-transfer project.
      The final live dashboard reload and public Auth authorize probe confirmed
      Apple disabled while Google and Facebook remained enabled and redirected
      to their provider hosts.
- [x] Verify Google and Facebook OAuth begin at the correct project and redirect
      to their providers with the beta callback.
- [x] Test a confirmed disposable email user through live web sign-in, report
      create/edit/delete, and sign-out; verify hosted recovery acceptance via
      the existing Resend SMTP configuration; retain the existing Google,
      Facebook, and account-deletion integration evidence. Apple is
      intentionally absent until its later project.
- [x] Test the real hosted web photo picker, upload, signed detail image, edit
      preservation, deletion, and sign-out in desktop Chrome, Firefox, and
      Safari/WebKit plus mobile Chrome and Safari/WebKit with a confirmed
      disposable user. All five report rows were deleted and all five expected
      pre-migration Storage orphans were removed during exact-user fixture
      cleanup. The post-migration rerun passed asynchronous deletion in all five
      profiles.
- [x] Reconcile older hosted QA data after all acceptance runs. Remove the four
      anonymous, email-less QA identities, five test reports, and three matching
      Storage objects found by the final audit. Verify zero remaining target
      users, identities, sessions, profiles, reports, objects, or report titles
      containing `QA` or `test`.

## Maps and cross-client behavior

- [x] Create `Litterbugs Web Maps`, enable Maps JavaScript API, restrict the key
      to that API only, and allow only the production, `www`, beta, and stable
      Vercel Litterbugs origins.
- [x] Create a web-only JavaScript map ID and use accessible Advanced Markers;
      do not add a web map ID or marker dependency to the mobile application.
- [x] Store the browser key in the new Vercel project's Production, Preview,
      and Development environments, redeploy, and verify the beta map and live
      report markers load without a Maps API error.
- [x] Verify live location-enabled map behavior plus automated allowed, denied,
      unavailable, and beyond-ten-mile boundary cases.
- [x] Create on web and observe on mobile's next normal data load.
- [x] Create on mobile and observe on web's next normal data load.
- [x] Repeat the shared-backend edit/delete and Storage checks after applying the
      migrations. Hosted web create/edit/delete/photo cleanup passed in all five
      browser profiles; the direct two-user test passed ownership, expiration,
      exact-coordinate, and cleanup assertions; the unchanged iOS simulator and
      Android emulator both loaded the shared live map and report details.
- [x] Prove the shared report contract matches the untouched mobile source for
      all six steps, preset labels, severity levels, title/notes/photo limits,
      ten-mile radius, and edit-photo behavior.
- [x] Verify the live beta map, report detail, map-type controls, provider
      boundaries, and clean runtime console in desktop Chrome, Firefox,
      Safari/WebKit, mobile Chrome, and mobile Safari/WebKit.

## Mobile non-regression

- [x] Build fresh QA iOS simulator and Android device artifacts from the moved
      workspace.
- [x] Add an executable invariant gate for the current Expo/EAS identity,
      schemes, plugins, build profiles, environments, and mobile runtime pins.
- [ ] Optional mobile-release follow-up: build a fresh physical-device iOS
      preview after Grant's Apple team and provisioning are available. The owner
      explicitly accepted the fresh iPhone simulator and Android emulator as the
      web-replacement non-regression gate; this item does not block the website.
- [x] Complete the web-replacement mobile non-regression scope in
      `docs/mobile-non-regression.md` using the iPhone simulator and Android
      emulator, one runtime at a time for memory. The detailed physical-device
      checklist remains a later mobile-release follow-up.
- [x] Save matching before/after iOS simulator screenshots for welcome/sign-in,
      map, and report-wizard surfaces. Physical-device flow testing remains an
      optional separate mobile-release follow-up, not a website gate.
- [x] Install the fresh current-source Android APK on the API 36 emulator and
      save matching before/after onboarding, sign-in, map, and report-wizard
      evidence. Keep Apple absent and mobile behavior unchanged.
- [x] Build and install the final Android QA candidate and pass the real system
      photo-picker lifecycle: valid JPEG upload, signed detail display, cold
      restart, full custom marker display and selection, owner edit/delete,
      asynchronous Storage cleanup, and confirmed Guest-account deletion.
      Verify zero disposable reports, objects, or Auth identities remain.

## Preview and production

- [x] Create a new Vercel project rooted at `apps/web`.
- [x] Add only correct-project public web environment variables.
- [x] Verify no built asset contains `syvgqzfbhkczkwozvola`.
- [x] Test the Vercel preview and deploy the isolated production target.
- [x] Pass production-mode browser smoke testing with no console warnings and
      Lighthouse scores of 100 accessibility, 100 best practices, 100 SEO,
      and 97 performance while the Maps-key fallback is active.
- [x] Redeploy the final anonymous-claims and mobile-fallback boundaries to
      isolated production as `dpl_69A635aFchf2Jh2JZ62S6TBpMd7P` and repeat
      clean-console browser smoke testing at `https://litterbugs-web.vercel.app`.
- [x] Point Cloudflare's DNS-only `beta.litterbugs.app` record at Vercel, issue
      its TLS certificate, and verify the new deployment returns HTTP 200 at
      `https://beta.litterbugs.app`.
- [x] Confirm no MapLibre/OpenFreeMap, Stripe, old-project reference,
      marketplace systems, or Places API usage exists in source, the production
      build, or the isolated deployment's JavaScript assets.
- [x] Enforce those exclusions and public-key-only configuration in the root
      `npm run check` gate for future source and compiled web output.
- [x] After acceptance, attach `litterbugs.app` and `www.litterbugs.app` to
      deployment `dpl_69A635aFchf2Jh2JZ62S6TBpMd7P`. The apex returned the
      same bytes as accepted beta, `www` retained its HTTPS redirect, and the
      five production browser profiles passed sequentially with one worker.
- [x] Keep `auth.litterbugs.app` unchanged and recheck its health endpoint after
      both alias moves.
- [x] Deploy the mobile-HEIC web compatibility fix from clean `main` commit
      `2941a44` as `dpl_Goy21KScnTdcbrNpmdrjAxqE8ZnE`, accept it on beta, and
      move the apex, `www`, beta, and stable Vercel aliases only after all three
      real `High example` photos decoded in five serialized desktop/mobile
      browser profiles. The same five-profile suite then passed on the apex,
      and the deployment recorded zero runtime error logs.

## Deferred Apple follow-up (not a web-replacement launch gate)

- [ ] Complete the `com.litterbugs.app` App Store transfer from Apple team
      `DB39U76V6Q` to Grant Gibson's team `RLXNU225W4` after Grant's Apple
      Developer enrollment is ready.
- [ ] Only after that transfer, scope and authorize a separate Apple sign-in
      project using a new web Service ID/domain association and rotating secret.
      Apple must remain absent from both clients until that project is complete,
      and the work must not change existing mobile behavior.

## Old system retirement after launch

- [x] Detach `litterbugs.app` and `www.litterbugs.app` from the old Vercel
      project. No public alias remains on its last production deployment.
- [x] Archive the private old GitHub repository `gegibson-oss/litterbugs` and
      disconnect it from the detached Vercel project so pushes cannot trigger
      new old-site deployments. Preserve the old deployment temporarily for
      reference at
      `https://litterbugs-1q6eqqaia-grant-9890s-projects.vercel.app`.
- [x] Remove all 94 production/preview environment records from the detached
      old Vercel project and verify its count is zero. Independently verify the
      new `litterbugs-web` project still has all 14 scoped records across its
      five expected public configuration keys.
- [x] The wrong Supabase project `syvgqzfbhkczkwozvola` was permanently deleted
      on August 21, 2026 at the owner's explicit request. It is historical-only
      and must never be reconnected or modified. A verified schema-only dump is
      retained at
      `/Users/grantgibson/Downloads/Litterbugs-US-East-syvgqzfbhkczkwozvola-schema-2026-08-21.sql`
      (1,854,591 bytes; SHA-256
      `863f11ff194d721fd02c30cdad83d5aa07cfa87f74a260d9cb36539162bf9a20`;
      no table data). Deletion supersedes password rotation and project pausing.
