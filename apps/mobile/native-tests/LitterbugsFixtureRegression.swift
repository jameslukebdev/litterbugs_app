import XCTest

// Runs the separate fixture bundle, never the signed-in app or its backend.
final class LitterbugsFixtureRegression: XCTestCase {
    let app = XCUIApplication(bundleIdentifier: "com.gegibson.litterbugs.fixtures")
    override func setUpWithError() throws {
        continueAfterFailure = false
        app.launch()
        XCTAssertTrue(app.buttons["Scenario All states"].waitForExistence(timeout: 20))
        app.buttons["Scenario All states"].tap()
        waitForCount(10)
    }
    func countLabel() -> XCUIElement { app.staticTexts["fixture-count"] }
    func waitForCount(_ count: Int) {
        let ready = XCTNSPredicateExpectation(predicate: NSPredicate(format: "label BEGINSWITH %@", "\(count) fixture reports,"), object: countLabel())
        XCTAssertEqual(XCTWaiter.wait(for: [ready], timeout: 10), .completed)
    }
    func marker(_ text: String) -> XCUIElement {
        app.descendants(matching: .any).matching(NSPredicate(format: "label CONTAINS %@", text)).firstMatch
    }
    func shot(_ name: String) {
        let attachment = XCTAttachment(screenshot: app.screenshot())
        attachment.name = name; attachment.lifetime = .keepAlways; add(attachment)
    }
    func testEveryStatusAndFundingFilter() {
        XCTAssertTrue(marker("$6, available: Available funded").exists)
        XCTAssertTrue(marker("$25, active: In progress funded").exists)
        XCTAssertTrue(marker("$125.50, active: Awaiting review funded").exists)
        XCTAssertTrue(marker("$1,000, active: Changes requested funded").exists)
        XCTAssertTrue(marker("$48, completed: Completed funded").exists)
        XCTAssertTrue(marker("$0, completed: Completed volunteer").exists)
        XCTAssertTrue(marker("$0, available: Available volunteer").exists)
        XCTAssertTrue(marker("$0, active: In progress volunteer").exists)
        shot("all-status-and-funding-combinations")
        let zero = marker("$0, available: Available volunteer")
        let original = zero.frame
        zero.tap()
        XCTAssertTrue(app.buttons["Close fixture preview"].waitForExistence(timeout: 5))
        XCTAssertEqual(zero.frame.midX, original.midX, accuracy: 2)
        XCTAssertEqual(zero.frame.midY, original.midY, accuracy: 2)
        shot("selected-zero-funding-enlargement")
        app.buttons["Close fixture preview"].tap()
        app.buttons["Status In progress"].tap(); waitForCount(6)
        app.buttons["Funding Funded"].tap(); waitForCount(3)
        app.buttons["Toggle fixture reports"].tap()
        XCTAssertEqual(app.buttons.matching(NSPredicate(format: "label BEGINSWITH 'Open fixture '")).count, 3)
        shot("filtered-fixture-reports")
        app.buttons["Toggle fixture reports"].tap()
        app.buttons["Status Completed"].tap(); waitForCount(1)
        XCTAssertTrue(marker("$48, completed: Completed funded").exists)
        app.buttons["Funding Volunteer"].tap(); waitForCount(1)
        XCTAssertTrue(marker("$0, completed: Completed volunteer").exists)
        XCTAssertFalse(marker("$48, completed: Completed funded").exists)
    }
    func testDensityZoomAndOverlappingSelection() {
        app.buttons["Scenario Crowded"].tap(); waitForCount(80)
        let before = amountLabelCount()
        shot("crowded-wide")
        app.buttons["Zoom in"].tap(); app.buttons["Zoom in"].tap()
        let changed = XCTNSPredicateExpectation(predicate: NSPredicate { _, _ in self.amountLabelCount() > before }, object: nil)
        XCTAssertEqual(XCTWaiter.wait(for: [changed], timeout: 10), .completed)
        shot("crowded-zoomed")
        app.buttons["Scenario Same location"].tap(); waitForCount(10)
        let expectedCenter = marker("$6, available: Available funded").frame
        marker("$6, available: Available funded").tap()
        XCTAssertTrue(app.staticTexts["10 reports here"].waitForExistence(timeout: 5))
        app.buttons["Choose overlapping fixture-overlap-8"].tap()
        XCTAssertTrue(app.buttons["Close fixture preview"].waitForExistence(timeout: 5))
        shot("overlapping-completed-selection")
        XCTAssertTrue(marker("$48, completed: Completed funded").waitForExistence(timeout: 5), app.debugDescription)
        let selectedCenter = marker("$48, completed: Completed funded").frame
        XCTAssertEqual(selectedCenter.midX, expectedCenter.midX, accuracy: 2)
        XCTAssertEqual(selectedCenter.midY, expectedCenter.midY, accuracy: 2)
    }
    func amountLabelCount() -> Int {
        let parts = countLabel().label.split(separator: ",")
        return parts.count == 2 ? Int(parts[1].trimmingCharacters(in: .whitespaces).split(separator: " ")[0]) ?? 0 : 0
    }
}
