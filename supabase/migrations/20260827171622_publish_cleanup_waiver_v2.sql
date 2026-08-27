begin;

alter table public.cleanup_waiver_versions
  add column if not exists guidelines_body text,
  add column if not exists release_body text;

comment on column public.cleanup_waiver_versions.guidelines_body is
  'Versioned concise safety guidance displayed separately from the cleanup acknowledgment.';

comment on column public.cleanup_waiver_versions.release_body is
  'Conspicuous assumption-of-risk and release language displayed before each cleanup claim.';

update public.cleanup_waiver_versions
set
  is_active = false,
  retired_at = coalesce(retired_at, now())
where is_active;

insert into public.cleanup_waiver_versions (
  waiver_version,
  guidelines_version,
  title,
  body,
  guidelines_body,
  release_body,
  is_active,
  published_at,
  retired_at
)
values (
  'cleanup-acknowledgment-v2',
  'cleanup-safety-guidelines-v2',
  'Cleanup Safety, Assumption of Risk, and Funded Reward Acknowledgment',
  $acknowledgment$
PLEASE READ BEFORE CLAIMING THIS CLEANUP

My choice and eligibility
• I am voluntarily choosing whether to claim this cleanup. I am not required to perform it.
• If this is a funded cleanup, I confirm that I am at least 18 years old, am in the United States, and will complete Stripe’s identity, tax-information, and payout requirements.
• I participate independently, not as an employee, agent, contractor, or representative of Litterbugs or Burrow Base LLC. I decide whether, when, and how to attempt the cleanup within the claim rules.

My safety assessment
• Before and during the cleanup, I will assess traffic, parking, weather, terrain, property access, physical ability, waste, tools, protective equipment, disposal options, animals, other people, and changing conditions.
• I will supply my own transportation, tools, protective equipment, and lawful disposal arrangements.
• I will park lawfully before using the app, will not use the app while driving, and will stop or decline the cleanup when a condition is unsafe or beyond my ability.
• I will not enter a roadway, railroad, waterway, unstable terrain, construction or restricted area, or private property without permission.
• I will not handle needles, syringes, chemicals, damaged batteries, biological or medical waste, human or animal remains, weapons, explosives, pressurized containers, unknown liquids or powders, or other hazardous or unidentified materials.
• I will not confront people, disturb encampments, move suspicious property, or perform work requiring a permit, specialized training, or licensed disposal. I will contact emergency services or the proper public authority when appropriate.

Evidence, review, and funded rewards
• I will submit one to three clear, accurate after photos from the reported location. I will not reuse the report photos or submit manipulated, unrelated, misleading, or fraudulent evidence.
• Google Gemini performs an initial structured photo review. It may accept the evidence for the next workflow step, request better photos, flag a possible safety or integrity issue, or send the case to an authorized administrator. Gemini does not independently release money or make a final legal, safety, employment, or fraud decision.
• A funded cleanup has no early payout. After evidence passes, the reporter has 48 hours to dispute. My first paid cleanup and any disputed, ambiguous, unsafe, failed, or suspicious case may require administrator review.
• The displayed reward is the frozen contribution principal. Payment remains subject to completed evidence review, the dispute window, any required administrator review, financial reconciliation, and Stripe eligibility. Litterbugs or Stripe may delay or withhold a payout when required by law, identity or sanctions rules, provider requirements, fraud controls, disputes, or payment reconciliation.
• I am responsible for determining and reporting taxes related to rewards. Stripe or Litterbugs may collect tax information and issue required forms.

My agreement
I have read the current Litterbugs Terms of Use, Privacy Policy, Cleanup and Reward Policy, and the safety rules above. I understand that a reporter may clean their own report but receives no special approval. By checking the box and continuing, I accept this acknowledgment for this cleanup claim and agree to follow it.
$acknowledgment$,
  $guidelines$
• Park safely and lawfully before opening Litterbugs. Never use the app while driving.
• Wear suitable gloves, clothing, footwear, and any other protective equipment the cleanup requires.
• Stay out of traffic, roadways, railroads, waterways, unstable terrain, construction zones, restricted areas, and private property without permission.
• Never handle needles, chemicals, biological or medical waste, damaged batteries, weapons, explosives, pressurized containers, unknown liquids or powders, or anything else hazardous or unidentified.
• Do not confront people, disturb encampments, move suspicious property, or perform work requiring specialized training or licensed disposal.
• Follow local laws and disposal rules. Contact emergency services or the appropriate public authority for immediate danger or hazardous waste.
• Stop or decline the cleanup whenever conditions are unsafe or beyond your ability.
$guidelines$,
  $release$
Outdoor litter cleanup can involve cuts, punctures, falls, strains, traffic, weather, animals, contaminated or sharp materials, property conditions, interactions with other people, and other known or unexpected risks. I knowingly and voluntarily assume the risks of choosing, traveling to, entering, and attempting this cleanup, including risks caused by conditions Litterbugs did not create or control.

To the fullest extent permitted by applicable law, I release and agree not to hold Burrow Base LLC, Litterbugs, and their owners, officers, employees, and agents liable for claims, injuries, losses, or property damage arising from my voluntary cleanup participation or my failure to follow these safety rules, including claims based on ordinary negligence. This release does not apply to gross negligence, willful misconduct, or liability that applicable law does not allow to be waived.
$release$,
  true,
  now(),
  null
);

commit;
