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
