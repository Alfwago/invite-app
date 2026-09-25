import SwiftUI

@main
struct OBHInvitesWatchApp: App {
    /// Background app-refresh tasks — see WatchSync.
    @WKApplicationDelegateAdaptor private var appDelegate: WatchAppDelegate
    @Environment(\.scenePhase) private var scenePhase

    var body: some Scene {
        WindowGroup {
            ContentView()
        }
        .onChange(of: scenePhase) { phase in
            // Opening the watch app always pulls fresh data from the server,
            // phone app running or not.
            if phase == .active {
                Task { await WatchSync.refresh() }
            }
        }
    }
}
