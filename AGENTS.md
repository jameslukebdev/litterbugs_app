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

## Website analytics and internal testing

- Keep normal visitor analytics enabled by default without an automatic
  analytics-permission pop-up, as the owner requested.
- Avoid counting staff and assistant testing as visitor traffic. Before routine
  production-site testing, use an already excluded browser or the site's
  existing Analytics choices to turn off analytics for that test browser.
- When verifying analytics itself requires a tracked test visit, record that
  it is test traffic and restore the test browser's exclusion afterward.

## Working alongside Claude

Grant also uses Claude (Cowork) on this project. Before starting work, read
`docs/agent-handoff.md`. Respect its "Current owner" line, and add a short
entry to its log when you finish (what changed, what was deployed with which
commit, what's pending).
