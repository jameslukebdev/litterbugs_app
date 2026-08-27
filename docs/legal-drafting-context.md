# Litterbugs legal drafting context

This packet is for a high-reasoning legal-document drafting pass. It is not a
request to invent product behavior. The attached production source files and
this context are the source of truth.

## Company and product

- Litterbugs is operated by Burrow Base LLC, a North Carolina limited liability
  company. Use North Carolina and United States law as the recommended drafting
  assumption, but clearly flag governing-law, venue, arbitration, class-action
  waiver, liability-cap, and business-address choices for founder confirmation.
- Public contact currently used in the drafts: `jameslukeb.evj@gmail.com`.
- Litterbugs is a community litter-reporting and real-world cleanup marketplace.
  It is not a charity, donation platform, employer, waste-removal contractor,
  emergency service, environmental regulator, or hazardous-material service.
- A permanent Litterbugs account is required to report litter, contribute,
  claim a cleanup, dispute a cleanup, or receive a funded reward.
- Every cleanup claimant must be at least 18. Funded cleaners must also be in
  the United States and satisfy Stripe identity, eligibility, tax-information,
  and payout requirements.
- A reporter may clean their own report and receive its reward. The same photo,
  Gemini, dispute-window, first-paid-cleanup, and administrator rules apply.

## Reports and contribution pools

- A report is active for 30 days. The reporter may actively renew it for another
  30 days, with unlimited active renewals. Funding may continue for as long as
  the report remains active.
- When a report expires, it leaves the active map. The reporter has seven days
  to renew it, carrying the entire contribution pool forward, or close it for
  refunds. No response within seven days closes it and starts refunds.
- Any logged-in member may contribute to an active eligible report; the reporter
  does not need to contribute. Contributors cannot withdraw or opt out merely
  because they changed their mind.
- Each contribution adds $5.00 to $5,000.00 of principal to the cleanup reward.
  Litterbugs charges a separate 10% platform fee, shown before confirmation.
  Example: a $20 principal contribution has a $2 platform fee and a $22 total.
- The displayed cleaner reward is the total contribution principal, not the
  total charged. The cleaner receives that exact frozen principal after an
  approved cleanup. Litterbugs retains the 10% fee and absorbs Stripe processing
  costs, standard payout costs, refund costs, and chargebacks.
- Contributions are not charitable donations and are not represented as tax
  deductible.
- Successful principal remains assigned to the report until paid to an approved
  cleaner or refunded under the defined rules. Platform funds backing active
  report pools remain in the Stripe payments balance under a manual platform
  payout schedule.

## Refunds, disputes, and payment failures

- Refunds return the complete original charge, including principal and the 10%
  fee, when the reporter closes an expired report, fails to decide during the
  seven-day expiration window, or a contribution remains unused for 23 months.
- Refunds return to the original payment method and can take provider-dependent
  time to appear. Failed refunds enter the administrator inbox for bounded retry.
- A successful contribution cannot be refunded solely at a contributor's
  request while its report remains active.
- When a funded cleanup is claimed, contributions stop and the pool is frozen.
- After Gemini accepts the evidence, the reporter has 48 hours to dispute. The
  reporter does not have to approve, and there is no early funded payout.
- An open dispute blocks payout. An authorized administrator reviews the full
  before/after evidence, Gemini findings, cleaner description/history, report,
  payment state, and reporter reason. Denying the dispute lets the normal reward
  process continue. Upholding it rejects that attempt and reopens the report;
  closing the report additionally starts the defined refunds.
- Payment, refund, or payout inconsistencies are blocked and escalated rather
  than guessed. Administrator decisions require a recorded reason and audit log.

## Cleanup and reward workflow

- Claiming and performing a cleanup is voluntary. A cleaner supplies their own
  transportation, tools, protective equipment, and disposal arrangements.
- A claimed cleanup has a 24-hour completion window.
- The cleaner submits one to three clear after photos. Original report photos,
  reused evidence, unrelated locations, manipulation, and fraud are prohibited.
- Google Gemini performs initial structured review of report and cleanup photos.
  It can pass, request better photos, flag possible hazards or manipulation, or
  send ambiguity to a human administrator. Gemini never independently releases
  money or makes a final legal, safety, employment, or fraud determination.
- A funded cleaner may receive two requests for better photos. A third
  inconclusive result escalates to an administrator instead of adding unlimited
  retries.
- The cleaner's first paid cleanup receives a lightweight administrator check.
- After the 48-hour window and all required reviews, Litterbugs transfers the
  frozen principal to the cleaner through Stripe Connect standard payouts.
- Stripe hosts identity, tax-information, bank, and payout onboarding. Litterbugs
  does not store full card or bank-account numbers. Stripe and Litterbugs may
  delay or withhold payouts when required by law, sanctions, fraud controls,
  identity requirements, provider rules, disputes, or financial reconciliation.
- Cleaners are independent participants, not employees or agents. They choose
  whether, when, and how to attempt available cleanups, subject to the claim
  window, evidence rules, safety rules, and applicable law. They are responsible
  for determining and reporting taxes; Stripe or Litterbugs may collect tax
  information and issue required forms.

## Safety and assumption of risk

- A cleaner must assess traffic, parking, weather, terrain, property access,
  physical ability, waste type, tools, protective equipment, disposal options,
  animals, other people, and any other site condition before and during cleanup.
- Stop or decline when a condition is unsafe or beyond the cleaner's ability.
- Park lawfully before using the app. Do not use the app while driving.
- Do not enter a roadway, railroad, waterway, unstable terrain, construction or
  restricted area, or private property without permission.
- Do not handle needles, syringes, chemicals, batteries that appear damaged,
  biological or medical waste, human or animal remains, weapons, explosives,
  pressurized containers, unknown liquids or powders, or other hazardous or
  unidentified materials.
- Do not confront people, disturb encampments, move suspicious property, or
  undertake work requiring a permit, specialized training, or licensed disposal.
- Follow local laws and disposal rules. Contact emergency services or the proper
  public authority for immediate danger or hazardous waste.
- Draft an enforceable, conspicuous pre-cleanup waiver/assumption-of-risk and
  release structure appropriate for voluntary real-world activity. Do not hide
  the safety terms in general Terms. Clearly flag provisions whose enforceability
  varies by state, including negligence releases, indemnity, minors, public
  policy, gross negligence, and conspicuous-format requirements.

## Gemini photo processing and privacy

- Account, authentication, profile, report, location, photo, cleanup evidence,
  notification, support, moderation, payment-state, Stripe identifier, dispute,
  administrator-decision, and audit information may be processed.
- Approximate and precise report locations and user-supplied photos may contain
  personal information. Users should avoid photographing faces, license plates,
  private documents, homes beyond what is necessary, or other unnecessary data.
- Supabase provides authentication, database, private cleanup-photo storage, and
  server functions. Stripe provides payments, wallets, identity/payout accounts,
  refunds, disputes, transfers, and related compliance. Google provides maps and
  paid Gemini photo review. Hosting and notification providers support delivery.
- Eligible photos are made available to a dedicated Google Cloud relay through
  short-lived signed references. The relay restricts accepted Litterbugs storage
  origins, does not log request bodies, and returns structured findings. The
  production configuration uses Google's paid service and does not opt into
  voluntary model-data sharing. Draft precise language that does not promise
  more than the applicable Google terms, DPA, retention controls, or law support.
- Authorized administrators can view case evidence and review reasons. AI output
  is validated by Litterbugs and can be overridden or escalated by a human.
- Litterbugs does not sell personal information or use it for third-party ads.
- Retention must cover operating reports, evidence review, payments, refunds,
  disputes, fraud prevention, audits, tax and financial recordkeeping, legal
  obligations, backups, and provider retention. Avoid unsupported exact periods;
  identify any period the founder must select or verify.
- Account deletion removes the account and identity-linked uploaded photos where
  permitted. Community report facts may remain after de-identification. Financial,
  dispute, safety, fraud, tax, and legal records may be retained as required.
- Address U.S. state privacy rights in a proportionate MVP policy, and flag any
  state-specific thresholds or notices that depend on actual user volume or data
  practices. The service is not directed to children under 13; funded cleaners
  must be 18 or older.

## Required output

Produce a coordinated, plain-English production draft set:

1. Terms of Service / Terms of Use.
2. Privacy Policy.
3. Cleanup, Contribution, Reward, Dispute, and Refund Policy.
4. In-app "Cleanup Safety and Funded Reward Acknowledgment."
5. Separate concise in-app cleanup safety guidelines.
6. The pre-cleanup waiver, assumption-of-risk, release, and acknowledgment text
   that must be accepted before each cleanup claim, with a recommended checkbox
   label and button copy.
7. A short acceptance/recordkeeping specification stating which version IDs,
   timestamps, user/account IDs, report IDs, IP/device facts if appropriate, and
   reacceptance events should be recorded.
8. A founder decision list and a limited attorney-review checklist focused only
   on provisions that genuinely require jurisdiction-specific legal judgment.

The documents must agree with each other and explicitly cover the 10% fee,
non-charitable contributions, $5-$5,000 contribution range, report renewal,
full-charge refunds, 23-month limit, no contributor opt-out, disputes, paid
self-cleanups, independent status, cleaner safety/liability, taxes, Stripe
payouts, Gemini photo processing, human escalation, prohibited evidence, account
enforcement, governing law, dispute resolution, liability limitations, and
changes to the documents.

Do not describe the drafts as attorney-approved, guaranteed enforceable, or a
substitute for legal advice. Do not invent insurance, licenses, response times,
data-deletion guarantees, exact provider retention periods, addresses, phone
numbers, or product behavior. Use clearly marked founder-confirmation brackets
only where a real business or legal choice is missing; otherwise provide complete
recommended language rather than an outline.
