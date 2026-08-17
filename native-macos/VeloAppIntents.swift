import Swift
import AppIntents
import Foundation

/**
 * VeloAppIntents.swift
 * 
 * Native Apple Intelligence & Siri integration for VeloAnalytics.
 * Supports:
 * - Spoken Siri queries
 * - Type to Siri (macOS 15+ / Sequoia)
 * - macOS Spotlight Search (`⌘ + Space`)
 * - macOS Shortcuts.app workflows
 */

// MARK: - 1. State Snapshot Model
public struct VeloSnapshot: Codable {
    public let timestamp: String
    public let readinessScore: Int
    public let readinessStatus: String
    public let readinessModel: String
    public let tsb: Int
    public let sts: Int
    public let lts: Int
    public let sleepScore: Int?
    public let sleepDurationHours: Double?
    public let hrvOvernight: Double?
    public let lastRideName: String?
    public let lastRideNormalizedPower: Int?
    public let lastRideTSS: Int?
}

// MARK: - 2. Local File Loader
public func loadVeloSnapshot() -> VeloSnapshot? {
    // Looks in ~/Library/Application Support/com.veloanalytics.app/siri_snapshot.json
    guard let appSupport = FileManager.default.urls(for: .applicationSupportDirectory, in: .userDomainMask).first else {
        return nil
    }
    let fileURL = appSupport.appendingPathComponent("com.veloanalytics.app").appendingPathComponent("siri_snapshot.json")
    
    guard let data = try? Data(contentsOf: fileURL),
          let snapshot = try? JSONDecoder().decode(VeloSnapshot.self, from: data) else {
        return nil
    }
    return snapshot
}

// MARK: - 3. App Intent: Get Readiness
public struct GetVeloReadinessIntent: AppIntent {
    public static var title: LocalizedStringResource = "Get Velo Readiness"
    public static var description = IntentDescription("Returns current training readiness, status, and sleep recovery.")
    public static var openAppWhenRun: Bool = false

    public init() {}

    @MainActor
    public func perform() async throws -> some ProvidesDialog & ShowsSnippetView {
        guard let snapshot = loadVeloSnapshot() else {
            return .result(
                dialog: IntentDialog("No recent VeloAnalytics data found. Please open VeloAnalytics to sync.")
            )
        }

        let dialogText = "Your Velo Readiness is \(snapshot.readinessScore) out of 100, which is \(snapshot.readinessStatus). Form (TSB) is \(snapshot.tsb > 0 ? "+\(snapshot.tsb)" : "\(snapshot.tsb)")."

        return .result(
            dialog: IntentDialog(stringLiteral: dialogText)
        )
    }
}

// MARK: - 4. App Intent: Open AI Coach
public struct AskVeloCoachIntent: AppIntent {
    public static var title: LocalizedStringResource = "Ask Velo Coach"
    public static var description = IntentDescription("Opens VeloAnalytics directly into the AI Coaching Assistant.")
    public static var openAppWhenRun: Bool = true

    @Parameter(title: "Question / Prompt", description: "Optional question for the coach")
    public var query: String?

    public init() {}

    @MainActor
    public func perform() async throws -> some IntentResult {
        // Deep links into Tauri or browser via custom URL scheme
        if let query = query, let encoded = query.addingPercentEncoding(withAllowedCharacters: .urlQueryAllowed),
           let url = URL(string: "veloanalytics://coach?prompt=\(encoded)") {
            NSWorkspace.shared.open(url)
        } else if let url = URL(string: "veloanalytics://coach") {
            NSWorkspace.shared.open(url)
        }
        return .result()
    }
}

// MARK: - 5. App Shortcuts Provider (Registers Siri / Type to Siri phrases)
public struct VeloShortcutsProvider: AppShortcutsProvider {
    public static var appShortcuts: [AppShortcut] {
        AppShortcut(
            intent: GetVeloReadinessIntent(),
            phrases: [
                "What is my \(.applicationName) readiness?",
                "What's my \(.applicationName) score?",
                "Ask \(.applicationName) for my recovery",
                "Check training status in \(.applicationName)"
            ],
            shortTitle: "Velo Readiness",
            systemImageName: "flame.fill"
        )
        
        AppShortcut(
            intent: AskVeloCoachIntent(),
            phrases: [
                "Ask \(.applicationName) coach",
                "Open \(.applicationName) coach"
            ],
            shortTitle: "Velo Coach",
            systemImageName: "sparkles"
        )
    }
}
