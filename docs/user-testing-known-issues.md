# Litterbugs known issues for test facilitators

Updated September 11, 2026. Keep the session supervised and use disposable
accounts for destructive tests.

| Item | Current state | Testing guidance |
| --- | --- | --- |
| Saved drafts after account deletion | Fix on main; disposable-account iPhone saved-report deletion passed; cleanup-draft and interrupted-cleanup storage checks pass | Use the updated build; device walkthrough used a text-only draft |
| Connected sign-in permissions after deletion | Owner-supplied test account with Email and Google passed deletion: both identity records, profile and sessions removed; external grant revocation is separate, and Apple revocation remains unimplemented | Track Apple revocation before release; Google account itself was not deleted |
| Moderation response | Private intake/access controls passed; no administrator alert or app queue verified | Facilitator must watch the private queue; do not promise automatic review |
| Inappropriate content prevention | Malware scanning and cleanup AI are not a verified offensive-content filter | Use harmless test content; broad unsupervised testing is not ready |
| Payment failures | Physical iPhone native decline/retry passed with real sandbox webhook delivery to an isolated backend: same payment, one contribution, correct receipt; focused interruption tests and prior transactions credited | Test cards only in the verified sandbox; no real charges |
| Own-report funding notification | A contribution to your own report can also show a redundant fund-increased alert above the receipt; dismissing it preserves the correct receipt | Minor polish follow-up; no duplicate payment observed |
| Store setup | Production Apple access, store disclosures and release are deferred | Test builds are not public store releases |
| Separate-user Facebook login | Deferred by owner; administrator login passed on both phones | Record as unverified coverage, not a confirmed failure |

Already checked: map gestures/clustering, loading transitions, text/keyboard
clearance, native report sharing, iPhone Apple login and sandbox push. Revisit
these only if a tester finds a new problem or a relevant change is made.
