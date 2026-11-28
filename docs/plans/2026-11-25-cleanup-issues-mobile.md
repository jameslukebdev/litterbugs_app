# Cleanup issues mobile — local build and test only

Owner authorized native iOS/Android implementation and simulator/emulator testing,
not publication. Website/backend c60db6d is already live. Do not change hosted data,
submit/store/release/OTA or overwrite the crash-fix release candidate.

Baseline: frozen iOS2.1.2 source aa836cc, including published OTA2797676/63bc12bc,
email preferences, donation privacy, tutorial35, site history and location/draft
recovery. Preserve both native map/React Native patches and dependency/config files.
Coordinate with Investigate app crash before native test setup. Shared checkout is
dirty; all implementation is isolated in codex/cleanup-issues-mobile-20261125.

## Reference lock and decision ledger

Direct build against approved website flow and existing mobile design system.
Primary: Litterbugs white canvas, Nunito headings/system body, 16/24 spacing,
existing gold funds/blue reporting/lilac cleanup roles. Mint b9e9dd/8ed7c5 for
positive resolved states. No new hero, duplicated report summary or ornamental lines.

| Decision | Source | Role and adaptation |
| --- | --- | --- |
| Labeled compact Cleanup options utility | Owner feedback + approved website; komoot f877fa0e-47cb-4a81-b734-80bfdc84f13a | Discoverable flag/words, never a giant CTA or lonely ellipsis |
| Short reason/details form | Approved website + Tally style dbd841f2-12e7-4b5c-b5b8-94ded944643b | Single column, restrained labels; preserve Litterbugs typography/colors |
| One private conversation | Owner + Airbnb support screen12e5ef44-939b-4d6d-983e-7d62e6257d02 (live Refero reviewed) | Clear sender/time, readable messages, visible reply input, one Back path |
| Latest reply and public correction visible together | Approved website flow | Clear Resume cleanup / Still an issue; retain paused clock until confirmed |
| Editable public report, locked fund/location | Approved website / server revision RPC | Photos, description, additional information; preserve prior evidence |
| Participant-only shortcut on existing report | Owner consolidation request | No duplicate report detail page; RLS authoritative |

## Implementation and verification

Native issue request/reply/resume; authenticated private photos; optional checked
photo attachments; reporter content editor using versioned RPC; existing inbox and
push destinations; issue status on report and cleanup form; paused claim checks.
Unsafe/missing/moved retain staff review using existing website admin, no new
native financial/admin controls. Private content is excluded from session replay.

Test RPC/retry/access and navigation, then real local Auth/Storage/DB against the
already migrated isolated local backend. Exercise cleaner -> reporter -> cleaner
on both platforms, funded edits/evidence, response shortcut, staff safety hold,
outsider isolation, cold navigation and prior map/history/settings regressions.
Serial single-worker exports/tests, heap cap, one booted device at a time. Reuse
verified native shells only where compatible; record source/runtime distinctions.
