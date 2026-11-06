import SwiftUI
import UIKit

/// Football Empire als iOS-App.
///
/// Die App ist eine Hülle um das Web-Spiel: Sie lädt dieselbe Seite wie der Browser
/// (siehe `Game.url`). Dadurch haben App und Web-App immer denselben Stand, und
/// Mitspieler mit App und mit Browser sind zusammen im selben Raum.
///
/// Was die App zusätzlich kann:
/// - Der Bildschirm geht während des Spiels nicht aus (wichtig fürs iPad als Spielbrett).
/// - Vollbild ohne Safari-Leisten, auf dem iPad auch ohne Statusleiste.
/// - Kamera (QR-Code scannen) und Bewegung (Würfeln durch Schütteln) ohne Nachfragen pro Seite.
/// - Rückfragen wie „Liga wirklich verlassen?“ erscheinen als normale iOS-Dialoge.
@main
struct FootballEmpireApp: App {
    var body: some Scene {
        WindowGroup {
            GameView()
                .ignoresSafeArea()
                .background(Color(uiColor: .feBackground).ignoresSafeArea())
                .statusBarHidden(UIDevice.current.userInterfaceIdiom == .pad)
                .persistentSystemOverlays(.hidden)
                .preferredColorScheme(.dark)
                .onAppear { UIApplication.shared.isIdleTimerDisabled = true }
        }
    }
}

extension UIColor {
    /// Hintergrundfarbe des Spiels (#040D1F), damit beim Start nichts weiß aufblitzt.
    static let feBackground = UIColor(red: 4 / 255, green: 13 / 255, blue: 31 / 255, alpha: 1)
    /// Grün der Knöpfe (#C6F135).
    static let feLime = UIColor(red: 198 / 255, green: 241 / 255, blue: 53 / 255, alpha: 1)
}
