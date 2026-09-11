# Litterbugs known issues for test facilitators

Updated September 11, 2026. Keep the session supervised and use disposable
accounts for destructive tests.

Owner scope decision: Grant cannot access Luke's Apple developer account and has
no separate Facebook login. Apple revocation setup/integration testing and
separate-user Facebook testing are excluded from this debugging pass, not
pending requests or completion blockers. Do not ask for these again unless
Grant explicitly reopens them. The limitations below remain factual; exclusion
does not mean those checks passed.

| Item | Current state | Testing guidance |
| --- | --- | --- |
| Saved drafts after account deletion | Fix on main; disposable-account iPhone saved-report deletion passed; cleanup-draft and interrupted-cleanup storage checks pass | Use the updated build; device walkthrough used a text-only draft |
| Connected sign-in permissions after deletion | Email/Google test-account deletion passed. Apple revocation code is deployed, but automatic Apple grant revocation is not configured or integration-verified; matching credentials are unavailable | Apple setup/testing excluded by owner from this pass; do not request Luke's access or use Grant's only Apple account for destructive testing |
| Moderation response | Local removal/profile/alert checks passed; server and web UI deployed. Production administrator inbox, evidence, filters and harmless test-case dismissal passed. iPhone received the admin alert; Expo/APNs receipt succeeded; Open admin inbox reached the correct admin sign-in page | Facilitator must review the private queue; mobile browser requires its own administrator sign-in. Background banner appearance was not visually verified |
| Inappropriate content prevention | Malware scanning and cleanup AI are not a verified offensive-content filter | Use harmless test content; broad unsupervised testing is not ready |
| Payment failures | Physical iPhone and Android emulator native decline/retry passed with real sandbox webhook delivery to an isolated backend: same payment, one contribution, correct receipt; physical iPhone force-quit before confirmation also passed with the same payment and one contribution; prior transactions credited | Test cards only in the verified sandbox; no real charges |
| Own-report funding notification | Server suppression passed the Android native own-report checkout and local database checks; deployed. One legacy unread self-funding alert was acknowledged on September 11; verified zero remain unread and no pending/retry deliveries existed | Completed; payment records and other contributors' alerts preserved. Already delivered system notifications cannot be recalled |
| Store setup | Production Apple access, store disclosures and release are deferred | Test builds are not public store releases |
| Separate-user Facebook login | Excluded by owner: no separate login is available; administrator login passed on both phones | Unverified coverage, not a confirmed failure or completion blocker; do not request another login |

Already checked: map gestures/clustering, loading transitions, text/keyboard
clearance, native report sharing, iPhone Apple login and sandbox push. Revisit
these only if a tester finds a new problem or a relevant change is made.
