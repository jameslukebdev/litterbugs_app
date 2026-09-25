# Report radius confirmation — September 25, 2026

The owner reported that Luke found the radius limit was not working in TestFlight 2.0.0 (11), then clarified that rejection should happen immediately instead of at final submission. The specific original report and reproduction steps were unavailable.

The signed build-11 bundle was checked against its recorded SHA256 (114f30bba07cc6d0f2fc18885b2f9f62d384f80d4ebd04df5212ed93454207a3). Its source includes the final publication distance checks. This investigation did not reproduce successful publication beyond 50 miles. Read-only inspection of the linked Litterbugs backend confirmed the publication RPC has the distance check and the legacy publication permission remains enabled, as required until compatible clients are distributed.

## Change

Use This Location now requires fresh GPS and checks the 50-mile radius before opening a new report form or accepting a replacement draft location. A rejected location keeps the pin available for correction. The control shows Checking Distance and prevents duplicate requests; cancel or navigation away invalidates a pending result. Final publication checks remain in place. Resuming an existing draft remains possible; publishing still rechecks GPS.

## Verification

- 452 mobile tests pass; mobile source check passes.
- A separate, network-disabled iOS simulator harness ran the unchanged build-11 location-check module with native Expo Location. Nearby and 48.4-mile north coordinates passed; 51.8-mile north/south and 55.9-mile east/west coordinates were rejected. This is native-runtime verification of the module, not execution of the TestFlight-signed app.
- In the actual updated QA app on iPhone 17 Pro simulator, a nearby pin opened Add photos. An out-of-range pin displayed Choose a nearby report location / Reports must be within 50 miles before opening the form.
- No public report, photo upload, payment, cleanup claim, or agreement acceptance was made.
- No production enforcement switch, Apple upload, or store submission is part of this change.
