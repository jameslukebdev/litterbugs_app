# Auth Provider Setup

Use only Supabase project `mvaygkflcjswtwchflrk` and provider records belonging to the existing production app, whose permanent iOS bundle ID is `com.litterbugs.app`.

## Supabase redirect allow list

Add these exact mobile routes under Authentication → URL Configuration:

- `litterbugs://auth/callback`
- `litterbugs://auth/reset-password`

The current allow list contains the older `litterbugs://auth-callback` route. Keep it only while an older build still needs it; it does not replace the two routes above.

## Email

Under Authentication → Providers → Email, require email confirmation. Configure custom SMTP separately so verification and recovery messages come from `support@litterbugs.app`. Keep SMTP credentials only in Supabase.

## Google and Facebook

Create new provider applications. Do not reuse the dormant credentials currently visible in the disabled Supabase provider forms. Each provider's OAuth callback is:

`https://mvaygkflcjswtwchflrk.supabase.co/auth/v1/callback`

Copy the new provider IDs and secrets into the matching Supabase Auth provider. Do not place them in `.env`, `app.json`, or source files.

Current isolated development resources (non-secret identifiers only):

- Google Cloud project: `litterbugs-auth` (project number `895118598665`)
- Google OAuth client: `Litterbugs Supabase Web Client`
- Meta app: `Litterbugs Community Cleanup` (app ID `1477683410862512`)
- Supabase project: `mvaygkflcjswtwchflrk`

As of 2026-08-15, the new Google and Facebook credentials are stored only in their provider consoles and the matching Supabase Auth provider forms. Both Supabase providers are enabled. The Google app remains in Testing mode, and the Meta app remains unpublished for role-based development testing.

### Google test configuration

1. Create a new Google Cloud project dedicated to the production Litterbugs app. Do not select an unrelated project or the retired prototype.
2. In Google Auth Platform, configure an External audience in Testing mode.
3. Use only the `openid`, `.../auth/userinfo.email`, and `.../auth/userinfo.profile` scopes required by Supabase Auth.
4. Create an OAuth client with application type **Web application**.
5. Add the exact Supabase callback above under **Authorized redirect URIs**.
6. Add only the two partners and intentional test accounts as test users.
7. Save the new Client ID and Client Secret only in the Google console and the Google provider form in Supabase project `mvaygkflcjswtwchflrk`.

Keep the Google app in Testing mode until the app's public privacy/domain requirements are ready. Google brand verification and public publishing are release work, not prerequisites for partner testing.

### Facebook test configuration

1. Create a new Meta app dedicated to the production Litterbugs app. Keep it separate from every existing Meta app and business portfolio not owned by this project.
2. Add the **Authentication and account creation** use case (Facebook Login).
3. In Facebook Login settings, add the exact Supabase callback above under **Valid OAuth Redirect URIs**.
4. Confirm both `public_profile` and `email` are Ready for testing; Supabase Auth requires the email permission.
5. Add only the two partners and intentional test accounts under App Roles, and have each invited tester accept the role.
6. Save the new App ID and App Secret only in the Meta console and the Facebook provider form in Supabase project `mvaygkflcjswtwchflrk`.

Keep the Meta app in Development mode until its privacy URL, data-deletion instructions, business verification, and any required review are complete. Development mode is sufficient for role-based partner testing.

Authoritative references: [Supabase Google login setup](https://supabase.com/docs/guides/auth/social-login/auth-google) and [Supabase Facebook login setup](https://supabase.com/docs/guides/auth/social-login/auth-facebook).

## Apple

The live App Store app already exists as `Litterbugs: Community Cleanup` (`6757313862`) with bundle ID `com.litterbugs.app`. Use and configure that existing App ID in the partner's production Apple Developer team. Do not register a second App ID or transfer a temporary identifier; Sign in with Apple adds avoidable transfer requirements.

Apple is temporarily deferred while Google and Facebook are configured and tested. The Apple button is hidden, and the Apple capability/plugin is omitted from the current test build. The implementation remains staged in source code.

- Existing bundle ID: `com.litterbugs.app`
- Required capability: Sign in with Apple

Apple requires the Account Holder or an Admin to register an App ID. If the production Apple membership is an organization, its Account Holder can invite the person completing setup as an Admin with access to Certificates, Identifiers & Profiles. If it is an individual membership, the Account Holder must perform the identifier and signing setup directly.

Native iOS login uses that existing App ID. For browser-based Apple login on Android, create a separate Services ID and signing key in the same production team, then configure the Apple provider in Supabase. Apple's browser OAuth secret must be rotated before it expires.

Before an App Store submission that includes Google or Facebook login:

1. Enable Sign in with Apple for the existing `com.litterbugs.app` App ID in the production Apple team.
2. Restore `ios.usesAppleSignIn: true` and the `expo-apple-authentication` config plugin in `app.json`.
3. Set `APPLE_AUTH_ENABLED` to `true` in `AuthScreen.js`.
4. Create a fresh iOS build and complete the physical-iPhone Apple tests.

Apple App Review Guideline 4.8 generally requires an equivalent privacy-preserving login option when a primary account uses a third-party login such as Google or Facebook. Google/Facebook-only builds are suitable for development testing, but should not be submitted to the App Store until Apple login is enabled and verified.

## EAS development client

This repository is linked to the isolated EAS project `@gegibson/litterbugs-partner` (`df0d0855-71d9-4943-b278-d1f083ab6b06`). Do not link the retired prototype's EAS project.

The current rollout is iOS-first. Android setup and Android builds are deferred until a later branch or explicit follow-up; do not start Android Studio, Gradle, or an Android emulator for the current work.

The isolated iOS simulator development build completed successfully on 2026-08-15:

- Build ID: `1371c8b8-4a57-4e73-bfce-10c918b0c4b6`
- Build page: `https://expo.dev/accounts/gegibson/projects/litterbugs-partner/builds/1371c8b8-4a57-4e73-bfce-10c918b0c4b6`
- Profile: `development-simulator`
- Runtime: Expo SDK 54

It was installed and verified in a single iPhone 17 Pro simulator. The native iOS authentication prompt correctly identifies the host app as **Litterbugs**. Google completed a new and returning sign-in and returned to the app; Facebook reached Meta's hosted login page and canceled back to the app cleanly. Provider-hosted pages and the standard iOS authentication confirmation are intentionally not restyled by the app.

Build a new iOS development client only after native dependencies or native configuration change:

```sh
npx eas-cli build --profile development --platform ios
```

For the local iOS simulator, run exactly one Metro server with:

```sh
npx expo start --dev-client --localhost --clear
```

After each partner installs the development build on a physical iPhone, use a single tunnel server when they are not on the same network:

```sh
npx expo start --dev-client --tunnel --clear
```

Stop the existing Metro process before changing connection modes. Rebuild only after native dependencies or native configuration changes.

Before moving the authentication PR out of draft, complete and record the iOS checks in [auth-test-checklist.md](./auth-test-checklist.md).
