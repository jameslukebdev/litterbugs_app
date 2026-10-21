# Simple report location selection

Owner requested a compact, non-scrolling location card, concise errors, stable navigation labels and real browser location testing.

Refero MCP was checked and returned NO_SUBSCRIPTION. The reference lock is the existing white/green Litterbugs map UI plus the installed Refero copywriting guide: one job, one sentence, one main action. No new visual system or dependencies.

The card now shows “Where is the litter?”, “Move the map to place the pin.” and “Use this location”. Coordinates and long draft explanations are removed. A secondary “Continue as draft” appears after a location error. The 50-mile and fresh-location checks remain enforced, including at publication. Permission denial, timeout and unavailable readings have distinct short messages.

Navigation no longer changes to Checking or Cancel text while entering reporting. The primary action retains its label and uses a small busy indicator. The temporary saved-draft checking modal is omitted, retaining the current screen until the draft decision is available. Recovery and editor-lock behavior remain.

Validation: 413 website tests passed; 41 targeted tests passed again after the saved-draft transition adjustment. Type checks and lint passed before release. macOS Location Services was off; the owner authenticated the change, and Chrome location access was enabled. The live My location control then successfully recentered the map using the browser's real location.

Draft dialogs: resume, save/discard, unavailable draft and another-tab notices now share a content-sized 460px shell instead of the full wizard's 360px minimum body height and doubled padding. Resume shows the draft name and progress; coordinates and zero-photo metadata are omitted. Start-new replacement is explained in one line. Save/discard copy is one sentence; discard has a quieter red action. Existing keyboard dismissal, recovery, cancellation and save-failure behavior remain. Eight draft recovery tests, typecheck and lint passed.

Reference: https://v10.carbondesignsystem.com/components/modal/usage/ — size short dialogs to their content, keep copy relevant to the immediate task and label actions explicitly. Refero's live library was unavailable due to its subscription requirement.

Follow-up: added a visible close icon to location selection plus Escape dismissal. Map clicks remain selection actions, avoiding accidental cancellation. Closing a draft location edit retains its original pin; closing new placement returns to browsing without discarding a saved draft. In-flight location results are invalidated on close. Reference: https://www.w3.org/WAI/ARIA/apg/patterns/dialog-modal/ (visible close control and Escape convention, adapted to this non-modal map card). Validation: 29 map publication tests, typecheck and lint passed.
