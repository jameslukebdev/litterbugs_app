# Agent handoff log (Codex ⇄ Claude)

Grant uses two AI assistants on this project: **Codex** (ChatGPT desktop, works
directly in this folder) and **Claude** (Cowork, works mostly from a cloud copy).
They cannot talk to each other directly. This file is how they share context.

## Rules for both agents

1. **Read this file before starting work. Add an entry when you finish.** Put
   the newest entry at the top of the log. Keep each entry short: what you
   changed, what you deployed, what's still pending, and anything the other
   agent must not undo.
2. **One editor at a time.** Before you edit code, check the "Current owner"
   line below. If the other agent owns the code, don't edit it; just leave a
   note. Change the line when you take over or hand back.
3. **Commit before handing off.** Don't leave uncommitted work for the other
   agent. The website's git history stopped on Oct 3, 2026 and the last month
   of work exists only as uncommitted changes. Fixing that is the top priority.
4. **Deploy only from committed code**, and record the commit hash in your entry.
5. **Database changes:** note every Supabase migration applied to production,
   with its file name.
6. Follow `AGENTS.md`. That includes the analytics rules: keep visitor
   analytics on, and exclude test browsers.

## Current owner

**Claude** (since 2026-11-03, approved by Grant). Codex: please don't edit code
until Claude hands back. Notes in this file are always welcome.

---

## Log

### 2026-11-04 — Claude (Claude Code desktop on Grant's Mac; local review setup)

- Grant moved Claude work from Cowork to Claude Code running directly in this
  folder. Rules for this session: no pushing and no deploying.
- Committed Codex's four 2026-11-04 log entries on `live-site-2026-11-03`
  (7320793). Then checked out `claude/ui-finish` and merged that branch in
  (c854426) so the handoff log is current. The merge only touched docs:
  `claude/ui-finish` still differs from the live site only in `brand.module.css`
  and `home-cleanup-proof.tsx`.
- Added `.claude/launch.json` ("website" runs `npm run web:dev` on port 3000).
  The site is running at http://localhost:3000 for Grant's review.
  Analytics load only on `litterbugs.app`, so local visits aren't tracked.
- Nothing pushed or deployed. Next: Grant reviews `claude/ui-finish` locally.

### 2026-11-04 — Codex (visitor recording review)

- Reviewed one 2:34 mobile Clarity recording: a completed report, map, Boone
  community and completed results, then the homepage. The replay showed a
  report panel covering the map; whether that reflects the live experience is
  unverified. One session may include testing. No code, database or deployment
  changes; Claude remains the current owner.

### 2026-11-04 — Codex (website behavior review)

- Reviewed recent PostHog page and device breakdowns and a Clarity session;
  reporting may include staff visits. No site, database, code or deployment
  changes. Claude remains the current owner.

### 2026-11-04 — Codex (app activity check)

- Checked Google Play daily active users: the newest displayed row is October
  29, with one Android user. A rolling 24-hour count was unavailable; the
  connected Supabase account still lacks the Litterbugs project. No code,
  database or deployment changes; Claude remains the current owner.

### 2026-11-04 — Codex (website traffic check)

- Read PostHog's rolling 24-hour website overview: 5 visitors, 6 sessions,
  and 10 pageviews, with test-account filtering enabled. No code or deployment
  changes; Claude remains the current owner. No follow-up pending.

### 2026-11-03 — Claude (direction correction)

- Grant rejected `claude/ui-polish`, which flattened the playful style; it is
  **shelved**. The live site's direction stays: playful colors, logo stickers,
  raised buttons, stock photos and the current layout.
- Current candidate: `claude/ui-finish` (9b563ce), based on
  `live-site-2026-11-03`. It is a subtle finishing layer at the end of
  `brand.module.css`: hero copy tone and measure, body copy at 19px instead of
  22px, legible report-card metadata, a "Browse all" link with an arrow,
  quieter captions and footer, and the heading "Most recent cleanup". Not
  deployed or pushed.

### 2026-11-03 — Claude (app screens and owner preferences)

- `claude/ui-polish` is now at 3466cbe. The three "Explore" cards show real app
  screens (`public/app-screens/{report,fund,claim}.webp`, cropped from
  `release-assets/apple-app-store/2026-10-30-prepared/source/iphone/01-03`)
  instead of stock photos. Card copy is shorter.
- **Owner preferences to keep everywhere:** no eyebrows, badges or clutter. No
  technical, meta or instructional language on the site. Show the product
  (real app screens) rather than explaining it with step lists. Reporters,
  donors and cleaners are equal audiences.
- Observation for Grant: the app's brand color is green and the website's is
  purple.

### 2026-11-03 — Claude (visual polish; question for Codex)

- Grant's feedback: no eyebrows, badges or clutter; polish the overall UI first
  and add sections later. **`claude/homepage-polish` is shelved** (it added
  FAQ/how-it-works sections, which Grant had already asked to remove on
  10/29).
- New branch `claude/ui-polish` (commit dcbd83b+, based on
  `live-site-2026-11-03`). It is CSS only: a "Refined finish" layer at the end
  of `components/public-website/brand.module.css`, plus the heading
  "Most recent cleanup" in sentence case. It removes the logo stickers,
  hard offset shadows, colored photo underlines, multi-colored headings and
  buttons, the status and rank badges on report cards, and the reward pill
  background. It adds soft elevation, a single accent color, and consistent
  16px/10px radii. No content or layout changes. Not deployed or pushed.
- **Question for Codex:** Grant says the site has three equal audiences:
  reporters, donors and cleaners. Is the hero's reporter-first message
  ("Get paid to report it") intentional? Are there positioning decisions Claude
  should respect beyond what's in docs/reviews? Please answer here.

### 2026-11-03 — Claude (homepage polish, waiting for Grant's approval)

- Branch `claude/homepage-polish` (commit b2738dd), built on `live-site-2026-11-03`.
  Built and tested in a separate copy; this folder's working tree is untouched.
- Homepage additions, keeping the current design: a trust line under the store
  badges, live impact stats (published reports and completed cleanups, both
  read with anonymous access), a "How you get paid" 3-step section with a $10
  example, an FAQ, and a dark closing call-to-action band. New files are
  `components/public-website/home-{impact,how-it-works,faq,closing}.tsx` and
  `home-sections.module.css`; `app/page.tsx` is edited.
- Screenshots: `~/Desktop/Litterbugs Homepage Preview/`.
- Not deployed. Not pushed (no GitHub login in Claude's sandbox).
- Next: image weight (rank PNGs about 1 MB each, avatar resizing).

### 2026-11-03 — Claude (git rescue; Grant asked Claude to take over)

- Did the steps of the request below myself; Codex didn't need to act.
- New branch `live-site-2026-11-03`, commit `5402a672cd1c3287920723fa50dd863941e77c8a`
  ("Save live website and app work as of 2026-11-03"), parent `12a88a8` (old
  local HEAD on `codex/account-contribution-count`). 813 files. `.env*` excluded
  and checked for secret patterns. Working tree is now clean.
- Added to `.gitignore`: `work/`, `output/`, `.playwright-mcp/`,
  `.codex-attachments/`, `.agents/`, `*.swp`, `release-assets/**/*.zip`,
  `/seelitterad*`. Nothing was deleted; those files are still on disk.
- **Not pushed yet:** Claude's sandbox has no GitHub login. Grant needs to run
  `git push -u origin live-site-2026-11-03` from a signed-in Terminal (his
  Codex or Claude Code can do it).
- This branch is based on the local history, not on GitHub `main` (e00973a).
  Merging the two is still to do.
- Production (dpl_AzEFiuUnqbwFbuMjZKKWmPLJRL92) was a `vercel build --prod`
  from this folder, so it should match this commit apart from today's
  uncommitted edits, which are now included.
- Next: homepage polish and performance on a separate branch
  `claude/homepage-polish`, built in a separate copy so this folder and its
  macOS `node_modules` stay untouched.

### 2026-11-03 — REQUEST FOR CODEX (from Claude, approved by Grant)

Please do these in order, then add a log entry above this one with the results:

1. Commit all current website/app work (the 333 uncommitted changes in this
   folder) to a new branch named `live-site-2026-11-03`, based on the current
   HEAD. Respect `.gitignore` (no `.env*` files). Leave the `work/` release
   copies out of the commit; add `work/` to `.gitignore` if it isn't there.
   A local safety snapshot already exists at `refs/backups/live-2026-11-03`.
2. Push that branch to GitHub (`origin`).
3. Record the commit hash, plus the commit/branch the current production
   deployment was built from, in your log entry.
4. Set "Current owner" to **Claude** so Claude can start the homepage polish
   and performance fixes on a separate branch.

### 2026-11-03 — Codex (Terminal CLI setup)

Installed official standalone Codex CLI 0.166.0 for regular Terminal use at
`~/.local/bin/codex`; installer updated `~/.zprofile`. Verified a fresh login
shell resolves that CLI and existing ChatGPT authentication is available.
Desktop app unchanged. No project code, deployment, or commit changes.

### 2026-11-03 — Codex (authorized Xcode temporary data cleanup)

Deleted only `~/Library/Developer/Xcode/DerivedData` with Grant’s explicit
authorization, freeing 10.73 GiB; 15.01 GiB available afterward. Xcode,
Archives, and Keychains left untouched. Read-only CLI check: desktop-bundled
Codex runs (0.166.0-alpha.5.1), but a regular login shell does not find `codex`.
No application code, deployment, or commit changes; current owner unchanged.

### 2026-11-03 — Codex (computer memory cleanup)

At Grant’s request, inspected Mac memory and storage and closed only two
assistant-controlled Chrome testing browsers (Playwright and DevTools), with
explicit approval. Personal Chrome and Claude left open. No application code,
database, deployment, or commit changes. Storage inspection found approximately
4.2 GB free; no files deleted. Current code owner unchanged.

### 2026-11-03 — Claude (review only, no code or database changes)

**Context:** Grant asked for a full review of litterbugs.app: GitHub, Supabase
and Vercel, plus a more professional homepage that keeps the same overall look.

**Findings that need action:**

- **Source of truth:** production is deployed with `vercel build --prod` from
  this folder (`~/Desktop/Burrow Base/LItterbugs Partner`) and not from GitHub.
  The local branch is `codex/account-contribution-count`; its last commit is
  "Use singular wording for one remaining contribution" (Oct 3). GitHub `main`
  (`jameslukebdev/litterbugs_app`, e00973a, Oct 23) doesn't contain the current
  homepage. Commit the working tree to a new branch and push it.
- **Deploy risk:** on Oct 29 production crashed for about 3 minutes with
  `Could not load the "sharp" module using the linux-arm64 runtime` because the
  build ran on macOS arm64. Prefer Git-connected Vercel builds, or make sure
  sharp's linux binaries are installed before running `vercel build`.
- **Supabase security:**
  - Leaked-password protection is off. Turn it on in Auth settings.
  - Anonymous sign-ins are on: 177 of 230 auth users are anonymous. Policies and
    RPCs that are granted to `authenticated` also apply to anonymous users.
    Admin RPCs call `private.require_cleanup_admin()` and are fine. User RPCs
    such as `claim_cleanup` and `submit_cleanup` still need a check that they
    reject anonymous users.
  - `pg_net` is installed in the `public` schema.
  - `get_rank_points` (SECURITY DEFINER) can be called by `anon`. Fine if
    intended.
- **Supabase performance:**
  - Three foreign keys have no index: `report_preferences.report_id`,
    `reporter_rewards.report_id` and
    `private.cancelled_customer_draft_submissions.user_id`.
  - Four indexes are never used.
- **Web performance (Lighthouse mobile, homepage): performance 74, LCP 3.5s,
  TBT 670ms, 3 MB page.** Accessibility and SEO scored 100.
  - A Supabase profile avatar is served at about 1 MB, unresized.
  - Before/after photos are about 250 KB each at full size.
  - `public/brand/ranks/*.png` are about 0.8–1.1 MB each.
  - The homepage sends `cache-control: no-store` (force-dynamic), which also
    blocks the back/forward cache.
  - Three analytics scripts load: GA, Clarity and PostHog. Keep them per
    AGENTS.md, but consider deferring them.
- **Content and trust:** the hero promises "Get paid to report it", but every
  homepage and /reports card says "Volunteer cleanup" with no dollar amount.
  Show reward amounts and sort funded reports first. Add a "How you get paid"
  section, an impact counter, a founder/local story and an FAQ.
- **Business numbers (Nov 3):** 66 reports (19 in the last 30 days), 23
  contributions, 37 cleanup attempts, 1 reporter reward.

**Planned next by Claude (only after Grant approves and ownership is handed
over):** homepage UI polish in the current style, image and caching fixes,
reward amounts on cards.

**Do not undo:** nothing yet.
