# Simulator location clarification

The user's Boone location and recenter timeout followed native map testing. The native regression suite explicitly supplies Boone coordinates via XCTest. Those coordinates were test data, not the user's physical location. The map can also retain its last browsed viewport independently of location.

The normal app recenter path uses Expo foreground location permission and OS coordinates; it has no Boone fallback. It requests a cached fix no older than five minutes with at most 2,000m reported uncertainty, then attempts a fresh balanced-accuracy fix with an eight-second timeout. The supplied screenshot matches the timeout when neither a usable cached fix nor a fresh fix is available. Simulator fixes can stop arriving; a real phone's GPS behavior cannot be established from this simulator test.

Reference: Expo SDK 54 location documentation, https://docs.expo.dev/versions/v54.0.0/sdk/location/ — simulator location must be configured, and last-known positions can be stale; current position requests may take time.

Changes:
- Native test teardown clears XCTest's synthetic location override.
- Cleared the simulator's location scenario with simctl.
- Recenter failures in an emulator now explain simulated location and how to configure it. Physical phones retain the regular location error. The app clears its own distance-reference location on recenter failure.
- No user location was inferred or substituted, and no live profile location changed.

Validation: 289 JavaScript tests pass; the actual native marker/location test passes with the new teardown clearing its override. Set Simulator Features → Location → None and restarted the simulator after clearing simctl location. Native MapKit can retain its last known blue-dot location in memory after simulation stops; the saved map viewport is also intentionally preserved. Real-device GPS accuracy and physical-location detection have not been verified here.
