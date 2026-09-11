# Processor location clarification — unsent draft

Prepared September 11, 2026. These questions have not been sent to any provider.
They address the specific location fields in the unpublished Meta review; they
do not change the app's infrastructure or add services.

## Stripe support question

Burrow Base's Litterbugs app uses Stripe PaymentSheet for cleanup contributions
and Stripe Connect onboarding for cleanup recipients. Account email and, during
onboarding, profile name may originate from Facebook Login. Meta asks for all
countries in which this data is processed, including remote access.

Please confirm the applicable processing-country scope for our US merchant's
Payments and Connect services, including support access and subprocessors, or
identify the current authoritative document that provides this scope. We have
reviewed your global affiliate/subprocessor list; does its full country list
apply to these services, or is a narrower service-specific list available?

## Supabase support question

Litterbugs uses hosted Supabase Auth, database, storage, and Edge Functions.
Facebook profile name, email and identity identifiers enter Supabase Auth. Meta
asks for every country in which this data is processed, including remote access.

Please identify the applicable processing-country scope for these hosted
services, including support access, and the current authoritative list. We need
to distinguish the project's primary hosting region from processing elsewhere.

## Evidence and limits

[Stripe's Privacy Center](https://stripe.com/legal/privacy-center) identifies
Stripe, LLC as the DPA entity for customers in the Americas and explains that
international processing depends on services and business partners. Its global
statement does not establish a merchant-specific country list. A US business
address is not evidence of US-only processing.

[Supabase's region documentation](https://supabase.com/docs/guides/platform/regions)
describes primary storage location. It does not establish all support-access or
subprocessor locations. Do not populate Meta's country field from hosting region
alone.

The existing Meta review also needs the account holder's controller and
historical government-request answers. Those facts cannot be established from
app source or a vendor policy. Keep the review unpublished and unsubmitted.
