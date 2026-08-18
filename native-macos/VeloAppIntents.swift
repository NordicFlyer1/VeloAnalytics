import Swift
import AppIntents
import Foundation

/**
 * VeloAppIntents.swift
 * 
 * Native Apple Intelligence & Siri integration for VeloAnalytics.
 * Uses open-source VeloAnalytics & Golden Cheetah metrics:
 * - BikeScore™ (Training Stress Dose)
 * - xPower / IsoPower
 * - Relative Intensity (RI)
 * - Banister Performance Model: Stress Balance (SB), STS, LTS
 */

// MARK: - 1. State Snapshot Model
public struct VeloRideSnapshot: Codable {
    public let date: String
    public let name: String
    public let distanceKm: Double
    public let durationMinutes: Int
    public let xPower: Int?
    public let relativeIntensity: Double?
    public let avgPower: Int?
    public let avgHeartRate: Int?
    public let bikeScore: Int
    public let workKilojoules: Int?
}

public struct VeloTrainingBlock: Codable {
    public let totalRides: Int
    public let totalKm: Double
    public let totalHours: Double
    public let totalBikeScore: Int
}

public struct VeloSnapshot: Codable {
    public let timestamp: String
    public let readinessScore: Int
    public let readinessStatus: String
    public let readinessModel: String
    public let stressBalance: Int
    public let shortTermStress: Int
    public let longTermStress: Int
    public let sleepScore: Int?
    public let sleepDurationHours: Double?
    public let hrvOvernight: Double?
    public let latestRide: VeloRideSnapshot?
    public let trainingBlock7Days: VeloTrainingBlock
    public let trainingBlock28Days: VeloTrainingBlock
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
    public static var description = IntentDescription("Returns current training readiness, status, and Stress Balance (SB).")
    public static var openAppWhenRun: Bool = false

    public init() {}

    @MainActor
    public func perform() async throws -> some ProvidesDialog {
        guard let snapshot = loadVeloSnapshot() else {
            return .result(
                dialog: IntentDialog("No recent VeloAnalytics data found. Please open VeloAnalytics to sync.")
            )
        }

        let dialogText = "Your Velo Readiness is \(snapshot.readinessScore) out of 100 (\(snapshot.readinessStatus)). Stress Balance (SB) is \(snapshot.stressBalance > 0 ? "+\(snapshot.stressBalance)" : "\(snapshot.stressBalance)")."

        return .result(
            dialog: IntentDialog(stringLiteral: dialogText)
        )
    }
}

// MARK: - 4. App Intent: Get Latest Ride
public struct GetVeloLatestRideIntent: AppIntent {
    public static var title: LocalizedStringResource = "Get Latest Velo Ride"
    public static var description = IntentDescription("Returns summary metrics for your most recently logged cycling activity.")
    public static var openAppWhenRun: Bool = false

    public init() {}

    @MainActor
    public func perform() async throws -> some ProvidesDialog {
        guard let snapshot = loadVeloSnapshot() else {
            return .result(dialog: IntentDialog("No VeloAnalytics data found."))
        }

        guard let ride = snapshot.latestRide else {
            return .result(dialog: IntentDialog("You haven't logged any rides in VeloAnalytics yet."))
        }

        var text = "Your last ride was '\(ride.name)' on \(ride.date): \(ride.distanceKm) km, \(ride.durationMinutes) minutes, and \(ride.bikeScore) BikeScore."
        if let xp = ride.xPower {
            text += " xPower was \(xp) watts."
        }

        return .result(dialog: IntentDialog(stringLiteral: text))
    }
}

// MARK: - 5. App Intent: Get 7-Day & 28-Day Training Loads
public struct GetVeloTrainingLoadIntent: AppIntent {
    public static var title: LocalizedStringResource = "Check Velo Training Load"
    public static var description = IntentDescription("Returns your rolling 7-day and 28-day mileage, hours, and BikeScore.")
    public static var openAppWhenRun: Bool = false

    public init() {}

    @MainActor
    public func perform() async throws -> some ProvidesDialog {
        guard let snapshot = loadVeloSnapshot() else {
            return .result(dialog: IntentDialog("No VeloAnalytics data found."))
        }

        let b7 = snapshot.trainingBlock7Days
        let b28 = snapshot.trainingBlock28Days

        let text = "In the last 7 days, you rode \(b7.totalRides) times for \(b7.totalKm) km and \(b7.totalBikeScore) BikeScore. Over the last 28 days, you logged \(b28.totalRides) rides totaling \(b28.totalKm) km and \(b28.totalBikeScore) BikeScore."

        return .result(dialog: IntentDialog(stringLiteral: text))
    }
}

// MARK: - 6. App Intent: Open AI Coach
public struct AskVeloCoachIntent: AppIntent {
    public static var title: LocalizedStringResource = "Ask Velo Coach"
    public static var description = IntentDescription("Opens VeloAnalytics directly into the AI Coaching Assistant.")
    public static var openAppWhenRun: Bool = true

    @Parameter(title: "Question / Prompt", description: "Optional question for the coach")
    public var query: String?

    public init() {}

    @MainActor
    public func perform() async throws -> some IntentResult {
        if let query = query, let encoded = query.addingPercentEncoding(withAllowedCharacters: .urlQueryAllowed),
           let url = URL(string: "veloanalytics://coach?prompt=\(encoded)") {
            NSWorkspace.shared.open(url)
        } else if let url = URL(string: "veloanalytics://coach") {
            NSWorkspace.shared.open(url)
        }
        return .result()
    }
}

// MARK: - 7. App Shortcuts Provider (Registers Siri / Type to Siri phrases)
public struct VeloShortcutsProvider: AppShortcutsProvider {
    public static var appShortcuts: [AppShortcut] {
        AppShortcut(
            intent: GetVeloReadinessIntent(),
            phrases: [
                "What is my \(.applicationName) readiness?",
                "What's my \(.applicationName) score?",
                "Ask \(.applicationName) for my recovery",
                "Check Stress Balance in \(.applicationName)"
            ],
            shortTitle: "Velo Readiness",
            systemImageName: "flame.fill"
        )

        AppShortcut(
            intent: GetVeloLatestRideIntent(),
            phrases: [
                "What was my last ride in \(.applicationName)?",
                "Show my last \(.applicationName) workout",
                "Latest ride in \(.applicationName)"
            ],
            shortTitle: "Latest Ride",
            systemImageName: "bicycle"
        )

        AppShortcut(
            intent: GetVeloTrainingLoadIntent(),
            phrases: [
                "How much did I ride this week in \(.applicationName)?",
                "Check my training load in \(.applicationName)",
                "Check my 28-day load in \(.applicationName)"
            ],
            shortTitle: "Training Load",
            systemImageName: "chart.bar.fill"
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
