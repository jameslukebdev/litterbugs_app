# Live mobile/tablet account and navigation check

Checked https://litterbugs.app after account deployment dpl_FWAF46Jw51nPUag8xWZm2SxCLoH1 in a fresh signed-out in-app browser. No changes were needed or deployed during this check.

- Homepage: 320, 390, 600, 768, 816, 840 and 1024 CSS pixels. No document horizontal overflow or intersecting visible header controls. Account button correctly reads Log in / Sign up at compact widths. Burger navigation is visible through 816px; at 840px and 1024px the existing responsive header uses direct navigation menus instead.
- At 768px, all four burger categories expand to their expected destination lists; only one group stays open. No Updates, duplicate Profile or Get the app entry. Escape closes the menu, returns focus to Open menu, and releases scroll lock.
- At 1024px Report, Donate, Earn and Support dropdowns open and close using Escape.
- Mobile signup: email/password immediately visible, no placeholders, Google and Facebook choices present, no Apple. Bee toggles password visibility and its accessible label. Signup/sign-in/recovery switches work. At 320px, modal stays within viewport width and there is no horizontal overflow.
- Standalone /sign-in reached from map menu. Mobile and tablet layouts fit; Google and Facebook choices remain visible. The shared mobile banner retains brand styling.
- Map: 320, 390, 600, 768, 816 and 1024px without horizontal overflow. Search-to-pill gap measures 12px on phones, 10px on tablets. Available filter selects correctly; Filters dialog opens with all expected controls and closes. Map drawer matches public menu and its Log in / Sign up link opens /sign-in.
- A mobile submenu link was exercised: Reporter reward details opens /report-litter and closes the menu.
- Live public authentication configuration: email enabled, signup enabled, verification required. Google authorize returns 302 to accounts.google.com; Facebook returns 302 to www.facebook.com.
- Browser error/warning log check was empty. Temporary viewport override reset.

Limits: This was a responsive browser and form-interaction audit. No live signup, verification email, password reset email, social consent or new account creation was submitted. Completed new-user Facebook testing remains excluded by the owner's existing access limitation. Native authentication and accounts were untouched.

Evidence: output/live-responsive-audit.json; output/live-audit-signup-mobile.png; output/live-audit-signin-page-mobile.png.
