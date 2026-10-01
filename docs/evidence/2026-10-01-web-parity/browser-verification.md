# Isolated browser verification — October 1, 2026

Current work-in-progress source; not a production release claim. Next development server on localhost:3001 uses a loopback-only API facade and the isolated, migrated PostgreSQL fixture on port 62422. Existing-account login is synthetic. Storage operations use a fixture transport backed by real Storage metadata RLS. No production customer data or payments were changed.

- Existing email sign-in returned to `/account/reports`, preserving the requested destination.
- Account report history and four fixture notifications appeared for the signed-in owner.
- At 320×800, the notification text overlapped the logo; replaced it with a compact bell/count and compact map account button. The corrected header fits.
- An API-created account draft restored into an empty browser draft store with its title, fields, chosen location, and private photo.
- Browser title edit reached PostgreSQL. A separate Chrome storage/session context restored that same edited title and photo.
- Editing the second browser, then the stale first browser, displayed explicit “Use account draft” and “Keep this device’s draft” choices. Choosing the account draft restored the newer title.
- Strict Mode exposed a revoked-object-URL photo preview; object URLs now follow effect lifetime and have a regression test. Actual image natural dimensions confirm successful decoding.
- A synthetic 14,594,615-byte JPEG (4000×3000) became a 2,785,545-byte JPEG (2400×1800). An 800×600 HEIC became a 3,610-byte JPEG. Both were selected through the actual file chooser, rendered, and synced with the existing photo. The database held one draft with three photo paths.
- Evidence screenshot: `draft-photos-320.jpg`.

Limits: the production Google Maps referrer restriction rejects localhost:3001; map interactions still need verification on an allowed deployed host. This fixture does not test provider OAuth, real payment settlement, the live Storage service, or a native device binary. Those are separate checks.

Additional checks:

- Marking the four displayed unread notifications read removed their buttons and badge; the authenticated owner's shared database unread count became zero.
- The native cloud-draft adapter passed an isolated integration test against the same API/database: downloaded a browser-format draft and identical photo bytes into native-shaped local storage; uploaded a native title edit using the shared payload; reused the existing photo path; discarded the account draft. Expo filesystem/crypto/storage are Node shims in this test, so this is adapter integration evidence, not an iPhone UI claim. See `native-draft-integration.txt`.
