import XCTest
import CoreLocation

// Read-only backend: never submits a report, saves a profile, claims work, or pays.
final class LitterbugsUIRegression: XCTestCase {
    let app = XCUIApplication(bundleIdentifier: "com.gegibson.litterbugs.qa")
    override func setUpWithError() throws {
        continueAfterFailure = false
        simulateLocation()
        app.launch()
        if app.buttons["Explore the Map"].waitForExistence(timeout: 2) { app.buttons["Explore the Map"].tap() }
        waitForHittable(app.buttons["Report litter"])
    }
    func waitForHittable(_ target: XCUIElement) {
        let ready = XCTNSPredicateExpectation(predicate: NSPredicate(format: "exists == true AND hittable == true AND enabled == true"), object: target)
        XCTAssertEqual(XCTWaiter.wait(for: [ready], timeout: 30), .completed)
    }
    func tab(_ name: String) -> XCUIElement { app.descendants(matching: .any)["navigation-" + name] }
    func shot(_ name: String) {
        let attachment = XCTAttachment(screenshot: app.screenshot())
        attachment.name = name; attachment.lifetime = .keepAlways; add(attachment)
    }
    func element(_ label: String) -> XCUIElement {
        app.descendants(matching: .any).matching(NSPredicate(format: "label == %@", label)).firstMatch
    }
    func marker(_ title: String) -> XCUIElement {
        app.descendants(matching: .any).matching(NSPredicate(format: "label CONTAINS %@", title)).firstMatch
    }
    override func tearDown() {
        shot("end-of-test")
        if #available(iOS 16.4, *) { XCUIDevice.shared.location = nil }
    }
    func simulateLocation() {
        if #available(iOS 16.4, *) {
            XCUIDevice.shared.location = XCUILocation(location: CLLocation(coordinate: CLLocationCoordinate2D(latitude: 36.225, longitude: -81.662), altitude: 900, horizontalAccuracy: 5, verticalAccuracy: 5, timestamp: Date()))
        }
    }
    func centerAndZoomOut() {
        simulateLocation()
        app.buttons["Center map on your location"].tap()
        waitForHittable(app.buttons["Center map on your location"])
        // Use native two-finger zoom-out taps within the map's unobstructed center.
        // A full-screen pinch can begin on the floating toolbar or bottom tabs.
        for _ in 0..<4 { app.maps.firstMatch.tap(withNumberOfTaps: 1, numberOfTouches: 2) }
    }
    func testMarkerZoomSelectionAndPan() throws {
        centerAndZoomOut()
        let completed = marker("completed: Trash on Castle Ford")
        guard completed.waitForExistence(timeout: 15) else { throw XCTSkip("Requires the read-only Boone QA report data and simulator location.") }
        let funded = marker("$6, available:")
        XCTAssertTrue(funded.waitForExistence(timeout: 10))
        let before = completed.frame.size
        let separationBefore = hypot(completed.frame.midX - funded.frame.midX, completed.frame.midY - funded.frame.midY)
        let map = app.maps.firstMatch
        XCTAssertTrue(map.exists)
        shot("markers-near")
        for _ in 0..<3 { map.tap(withNumberOfTaps: 1, numberOfTouches: 2) }
        XCTAssertTrue(completed.waitForExistence(timeout: 10))
        shot("markers-wide")
        let separationAfter = hypot(completed.frame.midX - funded.frame.midX, completed.frame.midY - funded.frame.midY)
        XCTAssertLessThan(separationAfter, separationBefore * 0.6, "Zoom gestures must actually change the map scale")
        XCTAssertEqual(completed.frame.width, before.width, accuracy: 2)
        XCTAssertTrue(funded.label.hasPrefix("$6,"))
        for _ in 0..<3 { map.doubleTap() }
        map.swipeLeft(velocity: .slow)
        centerAndZoomOut()
        XCTAssertTrue(funded.waitForExistence(timeout: 10))
        funded.tap()
        XCTAssertTrue(element("View report").waitForExistence(timeout: 5))
        XCTAssertFalse(element("Reports here").exists, "A distinct amount marker must open its card directly")
        shot("marker-selection")
    }
    func testMapReportsFilterSynchronization() throws {
        centerAndZoomOut()
        XCTAssertTrue(marker("$6, available:").waitForExistence(timeout: 15))
        tab("reports").tap()
        XCTAssertTrue(marker("Litter at corner of Howard’s Creek Road near C&T").waitForExistence(timeout: 10))
        app.buttons["Filters"].tap()
        shot("shared-filters")
        // Clear/select is exercised through real controls, never native-map mocks.
        let completed = element("Completed")
        XCTAssertTrue(completed.waitForExistence(timeout: 5)); completed.tap()
        let apply = app.buttons.matching(NSPredicate(format: "label BEGINSWITH 'Show '")).firstMatch
        XCTAssertTrue(apply.exists); apply.tap()
        XCTAssertTrue(marker("Trash on Castle Ford").waitForExistence(timeout: 10))
        XCTAssertFalse(marker("Litter at corner of Howard’s Creek Road near C&T").exists)
        tab("map").tap()
        XCTAssertTrue(marker("completed: Trash on Castle Ford").waitForExistence(timeout: 10))
        XCTAssertFalse(marker("$6, available:").exists)
        shot("completed-filter-map")
        app.buttons["Remove Completed filter"].tap()
        XCTAssertTrue(marker("$6, available:").waitForExistence(timeout: 10))
    }
    func testMyReportsRemainIndependentOfMap() throws {
        tab("profile").tap()
        guard app.buttons["My activity"].waitForExistence(timeout: 8) else { throw XCTSkip("Requires an already signed-in QA account.") }
        app.buttons["My activity"].tap(); element("Reports").tap()
        let rows = app.buttons.matching(NSPredicate(format: "label BEGINSWITH 'Open '"))
        if !rows.firstMatch.waitForExistence(timeout: 2) { XCTAssertTrue(element("No active reports").waitForExistence(timeout: 10)) }
        let before = rows.allElementsBoundByIndex.map { $0.label }.sorted()
        shot("personal-reports-before-pan")
        app.navigationBars.buttons.firstMatch.tap()
        tab("map").tap()
        for _ in 0..<4 { app.maps.firstMatch.swipeLeft(velocity: .slow) }
        tab("profile").tap(); app.buttons["My activity"].tap(); element("Reports").tap()
        if !rows.firstMatch.waitForExistence(timeout: 2) { XCTAssertTrue(element("No active reports").waitForExistence(timeout: 10)) }
        XCTAssertEqual(rows.allElementsBoundByIndex.map { $0.label }.sorted(), before)
        shot("personal-reports-after-pan")
        app.navigationBars.buttons.firstMatch.tap(); tab("map").tap()
    }
    func testProfileSaveVisibilityKeyboardAndBackProtection() throws {
        tab("profile").tap()
        let edit = app.buttons["Edit profile"]
        guard edit.waitForExistence(timeout: 8) else { throw XCTSkip("Profile regression requires an already signed-in QA user; no credentials are created by this suite.") }
        edit.tap()
        let save = app.buttons["Save profile"]
        XCTAssertTrue(save.waitForExistence(timeout: 5)); XCTAssertTrue(save.isHittable)
        let field = app.textFields["Display name"]
        XCTAssertTrue(field.exists); field.tap(); field.typeText(" QA")
        XCTAssertTrue(save.isHittable); XCTAssertTrue(save.isEnabled)
        XCTAssertLessThan(field.frame.maxY, app.keyboards.firstMatch.frame.minY)
        shot("profile-keyboard-save-visible")
        app.buttons["Back"].tap()
        XCTAssertTrue(app.alerts["Discard profile changes?"].waitForExistence(timeout: 5))
        app.alerts.buttons["Keep editing"].tap()
        XCTAssertTrue(save.isHittable)
        app.buttons["Back"].tap(); app.alerts.buttons["Discard changes"].tap()
        XCTAssertTrue(edit.waitForExistence(timeout: 5))
        tab("map").tap()
    }
    func testThreeStageReportReviewWithoutPublishing() throws {
        simulateLocation(); app.buttons["Report litter"].tap()
        if app.alerts["Resume your report?"].waitForExistence(timeout: 2) {
            app.alerts.buttons["Cancel"].tap()
            throw XCTSkip("Preserving an existing user draft.")
        }
        let location = app.buttons["Use this location"]
        guard location.waitForExistence(timeout: 15) else { throw XCTSkip("Requires a signed-in QA account and location.") }
        simulateLocation(); location.tap()
        let choose = app.buttons["Choose up to 3 report photos"]
        XCTAssertTrue(choose.waitForExistence(timeout: 15)); choose.tap()
        let photo = app.images.matching(NSPredicate(format: "label CONTAINS 'Photo' OR label CONTAINS 'photo'")).firstMatch
        XCTAssertTrue(photo.waitForExistence(timeout: 10), app.debugDescription)
        // PHPicker image cells expose a frame but may report isHittable=false.
        photo.coordinate(withNormalizedOffset: CGVector(dx: 0.5, dy: 0.5)).tap()
        let add = app.buttons.matching(NSPredicate(format: "label == 'Add' OR label == 'Done'")).firstMatch
        XCTAssertTrue(add.waitForExistence(timeout: 5), app.debugDescription); add.tap()
        let next = app.buttons["Next report step"]
        waitForHittable(next); next.tap()
        element("Cans litter type").tap()
        let severity = element("Low severity")
        for _ in 0..<5 {
            if severity.isHittable { break }
            app.scrollViews.firstMatch.swipeUp(velocity: .slow)
        }
        XCTAssertTrue(severity.isHittable); severity.tap(); shot("report-details")
        next.tap()
        XCTAssertTrue(element("Step 3 of 3 · Review").waitForExistence(timeout: 5))
        XCTAssertTrue(element("Review your report").isHittable, "Each stage must open at the top, not inherit the previous scroll offset")
        shot("report-review")
        app.buttons["Close report form"].tap(); app.alerts.buttons["Discard"].tap()
    }
    func testLocalDraftRecoveryWithoutPublishing() throws {
        simulateLocation()
        app.buttons["Report litter"].tap()
        if app.alerts["Resume your report?"].waitForExistence(timeout: 2) {
            app.alerts.buttons["Cancel"].tap()
            throw XCTSkip("Preserving an existing user draft. Run on a QA account without a saved draft to exercise recovery.")
        }
        let useLocation = app.buttons["Use this location"]
        guard useLocation.waitForExistence(timeout: 15) else { throw XCTSkip("Report creation requires an already signed-in QA account and location permission.") }
        simulateLocation()
        useLocation.tap()
        let title = app.textFields["Report title (optional)"]
        XCTAssertTrue(title.waitForExistence(timeout: 20))
        if !title.isHittable { app.scrollViews.firstMatch.swipeUp() }
        title.tap(); waitForHittable(app.keyboards.firstMatch)
        for character in "QA123456" { title.typeText(String(character)) }
        XCTAssertLessThan(title.frame.maxY, app.keyboards.firstMatch.frame.minY)
        shot("photos-optional-title-keyboard")
        app.buttons["Close report form"].tap()
        app.alerts.buttons["Save for later"].tap()
        app.terminate(); app.launch()
        waitForHittable(app.buttons["Report litter"])
        app.buttons["Report litter"].tap()
        XCTAssertTrue(app.alerts["Resume your report?"].waitForExistence(timeout: 5))
        app.alerts.buttons["Resume draft"].tap()
        XCTAssertTrue(title.waitForExistence(timeout: 20))
        XCTAssertEqual(title.value as? String, "QA123456")
        shot("recovered-draft")
        app.buttons["Close report form"].tap(); app.alerts.buttons["Discard"].tap()
    }
}
