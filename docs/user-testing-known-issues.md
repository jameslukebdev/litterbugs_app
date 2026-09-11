# Litterbugs known issues for test facilitators

Updated September 11, 2026. Keep the session supervised and use disposable
accounts for destructive tests.

| Item | Current state | Testing guidance |
| --- | --- | --- |
| Saved drafts after account deletion | Fix on main; disposable-account iPhone saved-report deletion passed; cleanup-draft and interrupted-cleanup storage checks pass | Use the updated build; device walkthrough used a text-only draft |
| Connected sign-in permissions after deletion | Account/session removal passed for a disposable email account; external provider authorization revocation remains unverified | Do not use a personal social account for deletion testing |
| Moderation response | Private intake/access controls passed; no administrator alert or app queue verified | Facilitator must watch the private queue; do not promise automatic review |
| Inappropriate content prevention | Malware scanning and cleanup AI are not a verified offensive-content filter | Use harmless test content; broad unsupervised testing is not ready |
| Payment failures | Existing successful sandbox transactions credited; local recovery checks and fresh Stripe insufficient-funds decline pass; full native decline/retry pending | Test cards only in the verified sandbox; no real charges |
| Store setup | Production Apple access, store disclosures and release are deferred | Test builds are not public store releases |
| Separate-user Facebook login | Deferred by owner; administrator login passed on both phones | Record as unverified coverage, not a confirmed failure |

Already checked: map gestures/clustering, loading transitions, text/keyboard
clearance, native report sharing, iPhone Apple login and sandbox push. Revisit
these only if a tester finds a new problem or a relevant change is made.
