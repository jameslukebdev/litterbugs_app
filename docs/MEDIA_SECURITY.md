# User-uploaded image security

## Architecture

All report photos, cleanup evidence, and profile avatars use the same guarded
pipeline on mobile and web:

1. The signed-in client uploads the candidate to the private
   `media_quarantine` bucket under `{user-id}/{report|cleanup|avatar}`.
2. The client sends only the quarantine path and required subject identifiers
   to `POST /api/media/process` with its Supabase access token.
3. The Node.js processor revalidates the user, object path, report ownership or
   active cleanup assignment, and a per-user hourly scan quota.
4. The original bytes are sent once to Cloudmersive's fixed Virus Scan API
   endpoint. No user, report, location, object path, or storage URL is sent.
5. Only a strict `CleanResult: true` response permits processing to continue.
   Disabled, timed-out, malformed, non-2xx, or infected results fail closed.
6. The processor verifies the actual file signature instead of trusting the
   client MIME type, decodes under dimension/pixel/page limits, rotates it, and
   reconstructs a metadata-free JPEG.
7. The service-role client writes that sanitized JPEG to the existing final
   bucket and removes the quarantined original. Legacy direct-write policies
   remain only for the documented App Store compatibility window, then the
   final rollout step removes them.

The database stores paths and bounded scan audit state, not image bytes or
provider detection details. Report and cleanup buckets remain private. Public
read access to report photos is limited to photos referenced by a current,
non-sample report or an approved completed-cleanup story.

## Required server-only configuration

The route refuses every candidate until all required secrets are configured:

```dotenv
SUPABASE_SECRET_KEY=<modern server-only Supabase secret key>
REPORT_MEDIA_MALWARE_SCANNER_ENABLED=true
REPORT_MEDIA_MALWARE_SCANNER_PROVIDER=cloudmersive
REPORT_MEDIA_MALWARE_SCANNER_API_KEY=<server-only Cloudmersive key>
REPORT_MEDIA_MALWARE_SCANNER_TIMEOUT_MS=8000
```

`SUPABASE_SERVICE_ROLE_KEY` is accepted only as a legacy fallback. None of
these values may use a `NEXT_PUBLIC_` or `EXPO_PUBLIC_` prefix.

## Activation order

Do not deploy only one layer: clients correctly fail closed if either the
quarantine bucket, server credentials, or scanner is missing.

1. Approve Cloudmersive terms, privacy/DPA posture, account owner, plan/quota,
   credential rotation owner, and incident contact.
2. Add the Supabase server key and Cloudmersive configuration to Vercel Preview.
3. Deploy the web processor to Preview without changing production clients.
4. Apply `20260903121536_secure_media_quarantine_pipeline.sql` to a Supabase
   branch or staging project. This adds quarantine while preserving old-client
   uploads during the rollout window.
5. Run one provider-approved clean-image test and one provider-approved EICAR
   test. Confirm clean promotion, infected rejection, timeout rejection and
   quarantine deletion, rate limiting, and account-deletion cleanup.
6. Add the same secrets to Production, deploy the processor, apply the first
   production migration, and release the mobile/web clients that use quarantine.
7. Inspect scan/storage logs and run the full report, cleanup, and avatar user
   journeys. Roll back the clients and first migration together if the provider
   is not healthy.
8. After all supported installed clients use quarantine, deliberately apply
   `supabase/rollout/enforce_sanitized_media_outputs.sql`. This narrows final
   buckets to JPEG and removes every direct client insert/update policy. It is
   intentionally outside `supabase/migrations` so a routine database push
   cannot break older App Store builds during the compatibility window.

Never use real user images for provider acceptance testing and never place an
EICAR fixture in source control.
