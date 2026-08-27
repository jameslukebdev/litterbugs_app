begin;

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
  is_active,
  published_at,
  retired_at
)
values (
  'cleanup-acknowledgment-v1',
  'cleanup-safety-guidelines-v1',
  'Cleanup Safety and Funded Reward Acknowledgment',
  $acknowledgment$
Cleanup participation is voluntary. Before claiming a cleanup, I will consider the location, traffic, terrain, weather, waste, equipment, disposal options, and any other condition that may affect safety. I will stop or decline the cleanup when conditions are unsafe or beyond my ability.

Safety guidelines:
• Use appropriate gloves, clothing, and protective equipment.
• Park safely and lawfully before using Litterbugs or beginning a cleanup.
• Do not enter roadways, unstable terrain, restricted areas, or private property without permission.
• Do not handle needles, syringes, chemicals, biological waste, weapons, or unidentified hazardous material.
• Follow applicable laws and local disposal requirements.
• Contact the appropriate local authority for hazardous waste or an immediate danger.

For a funded cleanup, I also acknowledge:
• I must be at least 18 years old and eligible for Stripe payouts in the United States.
• I participate independently and am not an employee or agent of Litterbugs or Burrow Base LLC.
• The displayed cleaner reward is the exact contribution principal frozen when the report is claimed.
• I must submit clear, accurate photos of the completed cleanup. Reusing an original report photo or submitting manipulated or unrelated evidence is prohibited.
• Google Gemini performs an initial structured photo review. It may request better photos or send the case to an authorized administrator, but it never releases money.
• After the evidence passes, the reporter has 48 hours to dispute the cleanup. My first paid cleanup and any disputed, ambiguous, unsafe, or failed case may require administrator review.
• I am responsible for determining and reporting taxes associated with cleanup rewards. Stripe or Litterbugs may collect required tax information or issue tax forms.

I have read the Litterbugs Terms of Use, Privacy Policy, and Cleanup and Reward Policy at litterbugs.app. I understand that I am responsible for my safety decisions and agree to follow this acknowledgment and the current safety guidelines each time I claim a cleanup.
$acknowledgment$,
  true,
  now(),
  null
);

commit;
