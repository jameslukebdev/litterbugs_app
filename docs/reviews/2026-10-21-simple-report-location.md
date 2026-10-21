# Simple report location selection

Owner requested a compact, non-scrolling location card, concise errors, stable navigation labels and real browser location testing.

Refero MCP was checked and returned NO_SUBSCRIPTION. The reference lock is the existing white/green Litterbugs map UI plus the installed Refero copywriting guide: one job, one sentence, one main action. No new visual system or dependencies.

The card now shows “Where is the litter?”, “Move the map to place the pin.” and “Use this location”. Coordinates and long draft explanations are removed. A secondary “Continue as draft” appears after a location error. The 50-mile and fresh-location checks remain enforced, including at publication. Permission denial, timeout and unavailable readings have distinct short messages.

Navigation no longer changes to Checking or Cancel text while entering reporting. The primary action retains its label and uses a small busy indicator. The temporary saved-draft checking modal is omitted, retaining the current screen until the draft decision is available. Recovery and editor-lock behavior remain.

Validation: 413 website tests passed; 41 targeted tests passed again after the saved-draft transition adjustment. Type checks and lint passed before release. macOS Location Services was off; the owner authenticated the change, and Chrome location access was enabled. The live My location control then successfully recentered the map using the browser's real location.
