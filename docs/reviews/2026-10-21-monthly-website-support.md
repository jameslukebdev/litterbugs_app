# Website-only monthly support

## Research and design decisions

- Patreon recommends launching with one simple membership tier and identifies $5 as an accessible starting point: https://support.patreon.com/hc/en-us/articles/8293538677005-Setting-Up-Your-Membership-Program
- Adaptation for Litterbugs: one support purpose, $5/$10/$25 USD monthly amount choices, no tier benefits, app features, badges, or reporter rewards. The larger amounts are a product choice, not a claimed proven optimum.
- Stripe Payment Links supports recurring fixed prices; customer-chosen amounts do not support recurring payments: https://docs.stripe.com/payment-links/create
- Stripe's no-code customer portal supports email login, subscription cancellation, payment-method updates and invoices: https://docs.stripe.com/customer-management/activate-no-code-customer-portal
- Reference lock: existing About/Safety pages own the white background, narrow reading column, font sizes, green action, bold paragraph leads and absence of decorative cards. Native radio controls provide an accessible amount choice; one checkout action reflects the chosen amount.
- No custom billing database, entitlement system, payment form or renewal job. Stripe owns billing. Existing cleanup reconciliation ignores unrelated successful PaymentIntents, keeping support separate from report funding.

## Scope

Website only. No files or payment links in either native app. Existing web Support navigation points to /support; misleading Contact labels changed to Support.

## Configuration

Public live Payment Link and customer portal URLs are recorded in apps/web/lib/monthly-support.ts. No environment variables or API credentials are required. Checkout stays unavailable if the selected link or cancellation portal is missing. No Stripe API secrets are used by this page.

Stripe account confirmed in dashboard: Litterbugs, acct_1U2HZe40KMkUKMFW. The Stripe MCP connector points to a different business and must not be used to create these resources.

## Validation

Amount-selection/correct checkout destination and missing-portal behavior tests pass. Shared header tests pass. Web typecheck and lint passed. Local visual review matches the existing plain white pages. Live Stripe checkout pages verified at $5, $10 and $25 per month, quantity 1, no trial, with the correct support description. Portal cancellation is enabled at period end without a cancellation-reason prompt. Duplicate subscriptions redirect to the portal. No real charge or end-to-end cancellation of a paid subscription was performed.
