# Litterbugs Ahrefs Free setup and backlink review — November 15, 2026

Ahrefs Free is active in Grant Gibson’s workspace. Project **10711029**, Litterbugs,
covers `litterbugs.app` and its subdomains over HTTP and HTTPS. Ownership was
verified by the public homepage meta tag. No Google Search Console/Analytics
OAuth access was granted, no additional analytics script was installed, and no
paid plan or trial was selected.

## Findings

Source: signed-in Ahrefs Site Explorer, November 15, 2026, subdomains scope.
[Referring domains](https://app.ahrefs.com/site-explorer/refdomains?mode=subdomains&projectId=10711029&target=litterbugs.app%2F).

- All-links view: **641 referring domains**.
- The first 50 domains, sorted by DR descending, were each labeled **SPAM**, with
  zero estimated domain search traffic and zero estimated ranking keywords.
- Dofollow view: **12 domains**, all labeled SPAM and showing zero estimated search
  traffic: `bitproperty.online`, `orplio.shop`, `crinto.shop`, `nimbra.shop`,
  `flenro.shop`, `cripio.shop`, `orvelo.shop`, `cinto.shop`, `drumio.shop`,
  `murvix.shop`, `nokvio.shop`, and `plenko.shop`.
- All link types with **Non-spammy links** selected: **0 domains**. This is Ahrefs’
  classification of its indexed links, not an independent review of every link
  or proof that the site has no legitimate mentions elsewhere.
- Expanded `strongboosthub.shop` example: unrelated SEO marketing article,
  nofollow link to `https://litterbugs.app/`, zero estimated traffic, 6,241 linked
  domains and 7,269 external links. Anchor copy inaccurately describes Litterbugs
  as covering internal linking/link reclamation.
- Expanded `bitproperty.online` example: SEO backlink-selling listing, followed
  homepage link, zero estimated traffic, 5,113 linked domains and 5,602 external
  links. Anchor promotes manual-outreach backlinks for litterbugs.app. First and
  last seen September 11, 2026 in this report.
- These patterns support the interpretation that much of the measured profile
  consists of spam-network/directory noise. They do not establish who created
  the links, a paid-link arrangement, a ranking loss, or a Google penalty.
- Ahrefs’ 641 domains and the previous limited Semrush count of 184 text backlinks
  use different indexes and units; their difference is not a measured increase.

## Google and recommended response

Opened the existing Google Search Console domain property for litterbugs.app.
[Manual actions](https://search.google.com/search-console/manual-actions?resource_id=sc-domain%3Alitterbugs.app)
explicitly returned **No issues detected**. This excludes a current reported
manual action, not every possible algorithmic ranking effect.

Do not bulk-disavow based only on vendor spam labels. Google says most sites do
not need disavow, and recommends it when a substantial artificial-link problem
has caused, or is likely to cause, a manual action:
[Google guidance](https://support.google.com/webmasters/answer/2648487?hl=en).
No disavow, removal request, outreach, or paid link service was performed.
Prioritize relevant earned links from local cleanup partners, community groups,
municipal/community resource pages and news coverage. If an existing provider
is buying these links, stop that activity and investigate its placements.

## Audit and Bing status

Selected a **one-time** Site Audit on the free plan, with default 30 requests/min,
5,000-page cap, robots respected, no authentication and no IndexNow automation.
The project’s Site Audit showed **Now Crawling** with no completed URL results
at the last check. Its placeholder zero health score is not a usable finding.
The backlink report above uses Ahrefs’ existing index and does not depend on
that crawl finishing. No recurring schedule or completion watcher was created.

Bing Google sign-in initially returned a temporary service error, then succeeded.
The current account’s website selector listed only `retirecityfinder.com` and
`retirementlists.com`; **Litterbugs was absent**. No Litterbugs property was added.
Local SEO CLI likewise has no configured Bing connection. This does not rule out
registration under another account.

## Website delivery and coordination

Website code commit **7e244c9**, branch `codex/ahrefs-free-20261115`, adds only the
Ahrefs verification metadata in `apps/web/app/layout.tsx` to the previously
approved live website source. Built/typechecked successfully, staged response
confirmed the exact tag inside the HTML head, then promoted to production:

- Deployment: `dpl_5175Z5xjx4AxjJdFBunt3BLEqUMx`.
- URL: https://litterbugs-4w0z6ph3m-grant-9890s-projects.vercel.app.
- Verified `https://litterbugs.app/` returned HTTP 200 with the marker in its head;
  Ahrefs then explicitly confirmed Ownership verified.
- Rollback: `dpl_Fym5dwuZjccVLABfPDT62TkEb7Mv`.

All code and documentation changes were made in the isolated release checkout.
Claude’s shared checkout, staged work, database migrations and native app work
were untouched. **Preserve the Ahrefs verification meta tag in future website
deployments.** The dashboard tab was retained for the owner.
