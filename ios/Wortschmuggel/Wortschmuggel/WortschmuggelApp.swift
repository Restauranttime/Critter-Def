import AVFoundation
import SwiftUI
import WebKit

/// Wortschmuggel als iOS-App: zeigt das Spiel aus wortschmuggel.html im Vollbild an.
/// Alles liegt in der App selbst (Spiel und Schriften), sie braucht also kein Internet.
@main
struct WortschmuggelApp: App {
    init() {
        // Trillerpfeife und Gong auch bei stummgeschaltetem Gerät; laufende Musik spielt weiter.
        try? AVAudioSession.sharedInstance().setCategory(.playback, options: [.mixWithOthers])
        try? AVAudioSession.sharedInstance().setActive(true)
    }

    var body: some Scene {
        WindowGroup {
            GameView()
                .ignoresSafeArea()
                .background(Color("LaunchBackground").ignoresSafeArea())
                .persistentSystemOverlays(.hidden)
                .onAppear {
                    // Der Bildschirm bleibt während des Spiels an.
                    UIApplication.shared.isIdleTimerDisabled = true
                }
        }
    }
}

struct GameView: UIViewRepresentable {
    func makeCoordinator() -> Coordinator { Coordinator() }

    func makeUIView(context: Context) -> WKWebView {
        let config = WKWebViewConfiguration()
        config.allowsInlineMediaPlayback = true
        config.mediaTypesRequiringUserActionForPlayback = []
        config.websiteDataStore = .default()

        let webView = WKWebView(frame: .zero, configuration: config)
        let background = UIColor(named: "LaunchBackground") ?? .black
        webView.isOpaque = false
        webView.backgroundColor = background
        webView.scrollView.backgroundColor = background
        // Die Seite kümmert sich selbst um Notch und Home-Balken (viewport-fit=cover).
        webView.scrollView.contentInsetAdjustmentBehavior = .never
        webView.scrollView.bounces = false
        webView.allowsLinkPreview = false
        webView.navigationDelegate = context.coordinator
        if #available(iOS 16.4, *) {
            webView.isInspectable = true
        }

        if let page = Bundle.main.url(forResource: "wortschmuggel", withExtension: "html") {
            webView.loadFileURL(page, allowingReadAccessTo: Bundle.main.bundleURL)
        }
        return webView
    }

    func updateUIView(_ uiView: WKWebView, context: Context) {}

    final class Coordinator: NSObject, WKNavigationDelegate {
        // Falls iOS den Web-Prozess beendet (zu wenig Speicher), Seite neu laden.
        // Der Spielstand liegt im Speicher der Seite und bleibt erhalten.
        func webViewWebContentProcessDidTerminate(_ webView: WKWebView) {
            webView.reload()
        }
    }
}
