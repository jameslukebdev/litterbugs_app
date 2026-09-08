# Profile photo, editor, activity, and funding iteration

## Scope and reference lock
Keep the approved white/neutral surfaces and green action foundation. No new marketing layout or extra page chrome. Changes stay on codex/refero-mobile-improvements; no push to main.

| Decision | Reference | Adaptation |
| --- | --- | --- |
| Native photo source choice, crop, large preview, explicit confirmation | [Instagram photo flow](https://refero.design/flows/2868) | Camera/library/remove choices; circular preview; Done stages a change; Cancel keeps the previous photo. Profile Save applies accepted edits. |
| Save always visible | [Train Fitness edit profile](https://refero.design/screens/4c7bacb8-f310-47ea-a8e7-775fd2fd7872) | Save in the navigation header, disabled until the form changes. |
| Protect unsaved edits | [MasterClass discard dialog](https://refero.design/screens/b9bcdf15-d6e9-4b30-a909-42c04913cea3) | Keep editing / Discard changes confirmation. Guarded Back control; swipe-back disabled while dirty or saving. |
| Separate activity contexts | [Nike Training Club](https://refero.design/screens/95e4a1e8-0714-4165-aa90-cf8b59dd4d3e) | Current, History, Reports tabs retain the existing destinations. |
| Practical details before metadata | [Komoot](https://refero.design/screens/18823ab3-84ff-4e6b-b78a-964430f8e9ae) | Compact litter types and reported conditions near directions; condensed dates; existing safety acknowledgement retained. |
| Persistent checkout action | [Kickstarter](https://refero.design/screens/6cbdc774-d9c9-4227-8ae4-b67cff6bcfd5) | Fixed total and Continue footer; navigation header height included in keyboard avoidance. |
| Clear profile divider | User screenshot/request | Removed the edit icon's circular decoration; centered smaller visual icon with expanded touch area. |

## Verification
- 270 tests in 62 files pass, including two new native photo-source menu tests.
- Final Release xcodebuild succeeded. Existing dependency deployment-target/script warnings remain.
- Installed final build on iPhone 17 Pro, iOS 26.5, bundle com.gegibson.litterbugs.qa.
- Simulator: profile edit icon clears divider; Save visible above form; temporary name edit enables Save; Keep editing preserves text; subsequent Back prompts again; Discard restores unchanged profile.
- Simulator: native photo library selection, square crop, large circular preview, and Cancel restoring original photo verified. No image uploaded and no real profile changes saved.
- Simulator: Current, History, Reports activity tabs show their respective sections and empty states.
- Simulator: report details show litter types and conditions before author/dates, retain cleanup and funding actions.
- Simulator: funding amount 0 disables Continue; 25 displays a 27.50 total; final keyboard check shows total and Continue entirely above the number pad.
- git diff --check passes.

## Limits
No payment was submitted, no Continue-to-payment action invoked, and no live cleanup claimed. End-to-end avatar upload/removal, successful remote profile save, camera capture, and real payment execution were not exercised on the user's account. Photo removal is staged and clears profile image references only on Save; this change does not purge old storage objects. Large-text layouts were not reverified in this iteration. Concurrent simulator input limited further scrolling checks.
