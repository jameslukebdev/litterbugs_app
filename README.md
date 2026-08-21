# Litterbugs

This repository is the canonical home of the Litterbugs product.

```text
apps/mobile              Existing Expo application
apps/web                 Next.js website for litterbugs.app
packages/report-contract Shared report types, constants, and validation
services/auth-bridge     Existing Cloudflare OAuth bridge
supabase                 Correct-project migrations and Edge Functions
docs                     Product and provider documentation
```

## Product boundary

The web app mirrors the current report and account capabilities of the mobile
app. It intentionally has no feed, place search, profiles, funding, payments,
claims, cleanup review, payouts, admin tools, or web guest mode. Public visitors
can browse active reports; a real Supabase account is required for all writes.

The Expo app's behavior, appearance, identifiers, dependency versions, native
plugins, URL scheme, EAS project, and build profiles are not changed by the
monorepo layout.

## Commands

- `npm run mobile:start` — start Expo
- `npm run mobile:ios` / `npm run mobile:android` — open the existing app
- `npm run mobile:doctor` — run Expo Doctor
- `npm run mobile:build:android:qa` / `npm run mobile:build:ios:qa` — build the unchanged `preview` profile
- `npm run mobile:build:ios:simulator` — build the unchanged iOS simulator profile
- `npm run mobile:build:ios:primary` — build Luke's shared production-identity development client
- `npm run mobile:build:android:production` / `npm run mobile:build:ios:production` — build the unchanged production profile when release is authorized
- `npm run web:dev` — start the website locally
- `npm run web:build` — build the production website
- `npm run web:boundaries` — reject archived backend, map, marketplace, Places, or secret-key code in web source/build output
- `npm run supabase:functions:check` — type-check both correct-project Edge Functions with pinned Deno
- `npm run auth-bridge:check` — bundle and validate the moved Worker without deploying
- `npm test` — run workspace tests
- `npm run typecheck` — type-check shared and web code
- `npm run check` — run all type, test, lint, build, product-boundary, Edge Function, and Worker validation gates

See [`docs/web-replacement.md`](docs/web-replacement.md) for environment,
verification, and cutover requirements.
