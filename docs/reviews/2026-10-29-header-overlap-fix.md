# Public header overlap fix — local only

Root cause: account grid item and its signed-in flex container could shrink below the fixed alert/avatar widths. With the wider map entry and app/menu labels, the account contents could extend into search at intermediate widths.

Scoped fix in public-site-header.module.css, excluding .mapHeader:
- Preserve max-content account width.
- Hide app shortcut through 860px (still in drawer), removing its unused grid track.
- Shorten map label through 760px and hide Menu text through 700px.
- At 520px and below, keep Map as the first drawer destination and reserve dedicated 44px search track.
- Logo sizing, dropdown behavior, account behavior and mobile app/map source untouched.

Browser checks at 18 widths spanning 320–1441 CSS pixels: no header-control intersections or document horizontal overflow in signed-out and temporary signed-in DOM layout fixture (44px alert, 52px avatar, actual classes). Fixture removed by reload; no authentication changes. Search opens/closes after fix. Screenshots /tmp/litterbugs-header-spacing-final.png. No deployment.
