# Legal acceptance and focused review

This note describes the production evidence kept for cleanup acknowledgments and
the remaining limited legal questions. The published documents and in-app text
are product drafts prepared with ChatGPT Pro; they are not described as
attorney-approved or guaranteed enforceable.

## Acceptance recordkeeping

For the minimum viable launch, keep these records together:

- immutable authenticated user ID;
- acknowledgment version and safety-guidelines version;
- first acceptance timestamp for that exact version pair;
- cleanup-attempt ID, report ID, cleaner ID, claim timestamp, and the exact
  acknowledgment and guidelines versions attached to that attempt;
- publication and retirement timestamps for every version; and
- any later administrator decision and audit record connected to the attempt.

The app presents the current acknowledgment before every claim and requires an
unchecked, affirmative checkbox before the cleaner can continue. The server
rejects a claim unless that user has accepted the exact active version, and it
copies the two active version IDs onto the cleanup attempt. A newly published
version therefore requires a new recorded acceptance. Do not pre-check the box,
bury it in general Terms, or treat ordinary app use as acceptance.

The MVP does not collect a separate IP address or device fingerprint solely for
waiver evidence. The authenticated account, immutable version record, server
timestamps, and claim-specific attempt record provide the initial audit trail
without collecting extra personal data. Revisit this choice only if focused
counsel identifies a specific need.

## Founder choices used in the production drafts

- Burrow Base LLC is the operator and North Carolina law is the governing-law
  assumption.
- The draft uses 30 days of informal dispute resolution and individual North
  Carolina court proceedings; it does not add mandatory consumer arbitration.
- The ordinary-negligence release is conspicuous and expressly excludes gross
  negligence, willful misconduct, and rights that cannot legally be waived.
- Every cleanup claimant must affirm they are at least 18. Funded cleaners must
  also be in the United States and satisfy Stripe's payout requirements.
- The liability cap is the greater of $100 or the Litterbugs platform fees paid
  by the user during the preceding 12 months, where such a cap is lawful.
- Litterbugs does not claim to provide insurance or hazardous-material services.

## Focused attorney review

If legal review is obtained, limit the first pass to these questions:

1. Under North Carolina law and likely launch-state law, is the cleanup
   assumption-of-risk and ordinary-negligence release conspicuous and
   enforceable, and should any state-specific language be added?
2. Do the actual level of platform control, reward rules, and Stripe Connect
   structure support the independent-participant language and tax treatment?
3. Does holding contribution principal for active reports, allowing unlimited
   reporter renewals, and automatically refunding at 23 months create any money
   transmission, unclaimed-property, charitable-solicitation, escrow, or other
   state-law obligation?
4. Are the North Carolina forum, informal-resolution requirement, liability
   cap, indemnity, warranty disclaimer, and class/individual-claim wording
   suitable for a consumer mobile service?
5. Do the Stripe payment, payout, full-charge refund, chargeback, and cleaner-tax
   disclosures match the final live Stripe configuration and applicable
   marketplace obligations?
6. Do the Gemini photo-processing, human-review, retention, deletion, and U.S.
   state privacy disclosures match the final Google, Supabase, and hosting
   contracts and the service's actual data practices?

Record the reviewed document versions, reviewer, date, and required edits before
turning on either production feature flag.
