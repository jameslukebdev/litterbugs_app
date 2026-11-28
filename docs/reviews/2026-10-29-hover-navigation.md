# Hover navigation — local only

Reference lock: current approved public-site header; remove category chevrons without changing layout or destinations.

Research: Baymard recommends 300–500ms hover entry to avoid flickering (https://baymard.com/research-articles/dropdown-menu-flickering-issue). W3C advises accommodating imprecise mouse movement with closing delay and preserving keyboard operation (https://www.w3.org/WAI/tutorials/menus/flyout/).

Implemented 350ms opening and 300ms closing delays for mouse/fine-pointer desktop navigation. Touch and compact drawer stay click/tap-controlled. Click remains immediate, Escape/outside click dismiss, focused submenu content stays open. Transparent bridge covers the visual gap between trigger and panel. Timers cancel on pointer pass-through, interaction and unmount; stale close timers cannot close a newly selected category.

Removed category chevrons for Report, Donate, Earn and Support. Existing destinations retained. Local browser checked actual mouse movement into/out of Report panel and mobile Donate tap. Eleven header tests pass; TypeScript passes. No deployment.
