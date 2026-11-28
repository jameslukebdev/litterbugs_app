# Local checkout control and report-card menu fixes

No deployment, production database changes or payments.

## Checkout

Reviewed Refero's PayPal Giving Fund donation checkbox example:
https://refero.design/pages/8afb8cae-72b8-4421-9fbf-8d3a256b27a3

The checkbox was inheriting the global text-input width, padding and 48px minimum
height. It now has explicit 20×20px dimensions, with a 44px clickable label row,
“Donate anonymously,” and short status text below. Removed the large selected
mint background. The default-public choice and payment behavior are unchanged.
Verified the actual signed-in Fund dialog in Chrome after hot reload.

## Report card menu

The map card's absolute-positioned button extended below the card, past the
report list's padded bottom. Opening it created scroll overflow, introduced a
15px scrollbar, narrowed the two-column grid and resized the card photo.

The new shared menu panel opens upward inside the card. It contains See full
report and Hide/Unhide on both map results and public report cards. The link
opens the standalone report. Map menu Escape closes it and restores focus.
Outside-click behavior is retained.

Actual single-card measurements at a 1296px viewport:

| Measurement | Before fix, closed → open | After fix, closed → open |
| --- | --- | --- |
| List width | 614 → 599px | 614 → 614px |
| Card width | 278.9375 → 271.4375px | 278.9375 → 278.9375px |
| Card height | 370.828125 → 366.421875px | 370.828125 → 370.828125px |
| List scroll height | 407 → 410px | 407 → 407px |

375px and 900px viewports also retained identical card/list geometry and scroll
height. The See full report link navigated to the correct canonical report page.
Escape closed the desktop menu. Screenshot records the final local menu.

55 focused tests passed for report browsing, public-card menu actions, undo and
checkout privacy. Scoped lint, typecheck and diff checks passed.
