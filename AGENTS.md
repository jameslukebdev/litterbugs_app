# Litterbugs project instructions

## Owner-confirmed access limitations — September 11, 2026

Grant cannot access Luke's Apple developer account and has no separate Facebook
login available. These are unavailable resources, not pending owner actions.

- Apple authorization-revocation credential setup/integration testing and
  separate-user Facebook login testing are removed from the current debugging
  pass's requirements and completion gates at the owner's explicit request.
- Do not request these resources again, reopen these items as blockers, or run
  automatic retries for them unless the owner explicitly changes this scope.
- Preserve the distinction between excluded and passed: automatic Apple grant
  revocation is not configured; separate-user Facebook login is unverified.
- Do not change Grant's Apple developer settings as a substitute for Luke's
  account. Protect Grant's only Apple sign-in account from deletion/revocation
  testing.
- Store ownership, access, disclosures and submission are separate release work;
  this debugging pass does not authorize store publication.

See `docs/user-testing-known-issues.md` for the current testing limitations and
`docs/reviews/2026-09-11-deletion-moderation-financial-audit.md` for evidence.

## App Store Connect access clarification — November 13, 2026

Grant confirmed admin access and successfully signed into the existing Litterbugs
App Store Connect listing under James Luke Barber. Authorized release preparation
initially included store privacy/metadata work without upload/submission. The
owner subsequently authorized uploading and submitting the refreshed2.1.0 builds
for Apple/Google review, with public release kept manual. This includes the pin
fix: iOS28 / Android25 from frozen source7e4275b; earlier27/24 are superseded.
Do not publicly release either store version without a later explicit instruction.
Luke accepted the updated Apple Developer Program License Agreement on
November13; the block is cleared. Apple2.1.0(28) is uploaded, attached and
Waiting for Review (submission2abda04e-5782-41bf-99ed-d2005198cc12). Manual
release is selected. Release notes, review login and privacy-policy URL are saved.
At the owner’s explicit follow-up request, all19 privacy categories for2.1.0
were completed and published on November13, including diagnostics, embedded
Stripe verification details and Coarse Location Analytics. Reload verified no
unfinished setup; manual app release remains selected. Privacy details are
published, not a saved draft. See the current store privacy handoff.

This scoped access update does not reopen the excluded Apple authorization
revocation or separate-user Facebook tests, permit changes to Grant's personal
Apple developer settings, or authorize account deletion/revocation testing.

## Website analytics and internal testing

- Keep normal visitor analytics enabled by default without an automatic
  analytics-permission pop-up, as the owner requested.
- Avoid counting staff and assistant testing as visitor traffic. Before routine
  production-site testing, use an already excluded browser or the site's
  existing Analytics choices to turn off analytics for that test browser.
- When verifying analytics itself requires a tracked test visit, record that
  it is test traffic and restore the test browser's exclusion afterward.

## Visual style preferences — November 12, 2026

- When creating or restyling UI, use the existing mint-green family whenever
  green is needed: mint fills (`#b9e9dd`) and borders (`#8ed7c5`) with readable
  dark text. Avoid the legacy forest-green styling.
- Apply this to the work in scope; preserve unrelated screens and bug artwork.

## Working alongside Claude

Grant also uses Claude (Cowork) on this project. Before starting work, read
`docs/agent-handoff.md`. Add a short entry to its log when you finish (what
changed, what was deployed with which commit, what's pending).

Do not add agent-specific editing reservations or require another agent to
release editing access before carrying out authorized work. Preserve existing
changes and coordinate through the handoff log.
