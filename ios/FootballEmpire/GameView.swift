import SwiftUI
import UIKit
import WebKit

enum Game {
    /// Hier liegt das Spiel – dieselbe Adresse, die auch im Browser geöffnet wird.
    static let url = URL(string: "https://restauranttime.github.io/Critter-Def/empire.html")!

    static var appVersion: String {
        Bundle.main.object(forInfoDictionaryKey: "CFBundleShortVersionString") as? String ?? "1.0"
    }

    /// Gehört die Adresse zum Spiel? Alles andere öffnet Safari.
    static func isGame(_ url: URL?) -> Bool { url?.host?.lowercased() == Game.url.host?.lowercased() }
}

/// Das Spiel in einer WKWebView, randlos über den ganzen Bildschirm.
struct GameView: UIViewRepresentable {
    func makeCoordinator() -> GameCoordinator { GameCoordinator() }

    func makeUIView(context: Context) -> WKWebView {
        let config = WKWebViewConfiguration()
        config.websiteDataStore = .default() // Spielstände bleiben wie im Browser auf dem Gerät gespeichert
        config.allowsInlineMediaPlayback = true // Kamerabild beim QR-Scannen direkt in der Seite
        config.mediaTypesRequiringUserActionForPlayback = []
        config.applicationNameForUserAgent = "FootballEmpireApp/" + Game.appVersion

        // Daran erkennt die Web-App, dass sie in der iOS-App läuft (z. B. kein Hinweis „Zum Home-Bildschirm“).
        let flag = "window.FE_NATIVE = { platform: 'ios', version: '\(Game.appVersion)' };"
        config.userContentController.addUserScript(
            WKUserScript(source: flag, injectionTime: .atDocumentStart, forMainFrameOnly: true))

        let web = WKWebView(frame: .zero, configuration: config)
        web.isOpaque = false
        web.backgroundColor = .feBackground
        web.scrollView.backgroundColor = .feBackground
        web.scrollView.contentInsetAdjustmentBehavior = .never // Ränder (Notch, Home-Balken) regelt die Seite selbst
        web.scrollView.bounces = false
        web.allowsLinkPreview = false
        web.allowsBackForwardNavigationGestures = false
        #if DEBUG
        if #available(iOS 16.4, *) { web.isInspectable = true } // Fehlersuche über Safari › Entwickler
        #endif
        web.navigationDelegate = context.coordinator
        web.uiDelegate = context.coordinator
        context.coordinator.attach(to: web)
        context.coordinator.loadGame()
        return web
    }

    func updateUIView(_ web: WKWebView, context: Context) {}
}

@MainActor
final class GameCoordinator: NSObject, WKNavigationDelegate, WKUIDelegate {
    private weak var web: WKWebView?
    private let spinner = UIActivityIndicatorView(style: .large)

    func attach(to web: WKWebView) {
        self.web = web
        spinner.color = .feLime
        spinner.hidesWhenStopped = true
        spinner.translatesAutoresizingMaskIntoConstraints = false
        web.addSubview(spinner)
        NSLayoutConstraint.activate([
            spinner.centerXAnchor.constraint(equalTo: web.centerXAnchor),
            spinner.centerYAnchor.constraint(equalTo: web.centerYAnchor),
        ])
    }

    /// Lädt das Spiel frisch vom Server, damit die App immer dieselbe Version hat wie der Browser.
    func loadGame() {
        spinner.startAnimating()
        web?.load(URLRequest(url: Game.url, cachePolicy: .reloadIgnoringLocalCacheData, timeoutInterval: 30))
    }

    // MARK: - Navigation

    func webView(_ webView: WKWebView, decidePolicyFor action: WKNavigationAction,
                 decisionHandler: @escaping (WKNavigationActionPolicy) -> Void) {
        guard let url = action.request.url, let scheme = url.scheme?.lowercased() else {
            decisionHandler(.cancel)
            return
        }
        if scheme == "fe-app" { // „Nochmal versuchen“ auf der Seite „Keine Verbindung“
            decisionHandler(.cancel)
            loadGame()
            return
        }
        let mainFrame = action.targetFrame?.isMainFrame ?? true
        let isHttp = scheme == "http" || scheme == "https"
        if isHttp && mainFrame && !Game.isGame(url) {
            UIApplication.shared.open(url) // fremde Links in Safari öffnen
            decisionHandler(.cancel)
            return
        }
        if !isHttp && !["about", "data", "blob"].contains(scheme) {
            UIApplication.shared.open(url) // z. B. mailto:
            decisionHandler(.cancel)
            return
        }
        decisionHandler(.allow)
    }

    func webView(_ webView: WKWebView, didFinish navigation: WKNavigation!) {
        spinner.stopAnimating()
        #if DEBUG
        // Rückmeldung für den automatischen Test (GitHub Actions): Seite geladen? Startseite da? App erkannt?
        let probe = "[document.title, document.querySelector('#start') ? 'Startseite' : '-', "
            + "window.FE_NATIVE ? 'App erkannt' : 'App nicht erkannt'].join(' | ')"
        webView.evaluateJavaScript(probe) { result, _ in
            let line = "Football Empire geladen: \((result as? String) ?? "?")\n"
            FileHandle.standardError.write(Data(line.utf8))
        }
        #endif
    }

    func webView(_ webView: WKWebView, didFail navigation: WKNavigation!, withError error: Error) {
        spinner.stopAnimating()
    }

    func webView(_ webView: WKWebView, didFailProvisionalNavigation navigation: WKNavigation!, withError error: Error) {
        spinner.stopAnimating()
        let e = error as NSError
        if e.domain == NSURLErrorDomain && e.code == NSURLErrorCancelled { return } // abgebrochen, weil gleich etwas anderes lädt
        if e.domain == "WebKitErrorDomain" && e.code == 102 { return } // von uns selbst umgeleitet (Safari, Neuladen)
        showOffline()
    }

    /// iOS hat die Seite im Hintergrund beendet (wenig Speicher): neu laden.
    /// Der Spielstand liegt auf dem Gerät, das iPad macht mit demselben Code weiter, Handys kommen wieder in ihren Raum.
    func webViewWebContentProcessDidTerminate(_ webView: WKWebView) {
        if Game.isGame(webView.url) {
            spinner.startAnimating()
            webView.reload()
        } else {
            loadGame()
        }
    }

    private func showOffline() {
        let html = """
        <!doctype html><html lang="de"><head><meta charset="utf-8">
        <meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no,viewport-fit=cover">
        <style>
        html,body{height:100%;margin:0;background:#040D1F;color:#fff;font-family:-apple-system,system-ui,sans-serif}
        body{display:flex;align-items:center;justify-content:center;text-align:center;padding:24px;box-sizing:border-box;-webkit-user-select:none}
        h1{font-size:28px;font-style:italic;font-weight:900;margin:0 0 10px}
        p{color:#9FB0CF;margin:0 auto 26px;line-height:1.4;max-width:420px}
        a{display:inline-block;background:#C6F135;color:#040D1F;font-weight:900;font-style:italic;text-decoration:none;padding:15px 30px;letter-spacing:.08em;text-transform:uppercase}
        </style></head><body><div>
        <h1>Keine Verbindung</h1>
        <p>Football Empire braucht Internet, damit iPad und Handys zusammen spielen können. Prüfe WLAN oder mobile Daten.</p>
        <a href="fe-app://retry">Nochmal versuchen</a>
        </div></body></html>
        """
        web?.loadHTMLString(html, baseURL: nil)
    }

    // MARK: - Fenster, Dialoge und Berechtigungen

    /// Links mit target="_blank" oder window.open: im Spiel bleiben bzw. Safari öffnen.
    func webView(_ webView: WKWebView, createWebViewWith configuration: WKWebViewConfiguration,
                 for navigationAction: WKNavigationAction, windowFeatures: WKWindowFeatures) -> WKWebView? {
        if let url = navigationAction.request.url {
            if Game.isGame(url) { webView.load(navigationAction.request) } else { UIApplication.shared.open(url) }
        }
        return nil
    }

    func webView(_ webView: WKWebView, runJavaScriptAlertPanelWithMessage message: String,
                 initiatedByFrame frame: WKFrameInfo, completionHandler: @escaping () -> Void) {
        let alert = UIAlertController(title: nil, message: message, preferredStyle: .alert)
        alert.addAction(UIAlertAction(title: "OK", style: .default) { _ in completionHandler() })
        show(alert, otherwise: completionHandler)
    }

    func webView(_ webView: WKWebView, runJavaScriptConfirmPanelWithMessage message: String,
                 initiatedByFrame frame: WKFrameInfo, completionHandler: @escaping (Bool) -> Void) {
        let alert = UIAlertController(title: nil, message: message, preferredStyle: .alert)
        alert.addAction(UIAlertAction(title: "Abbrechen", style: .cancel) { _ in completionHandler(false) })
        alert.addAction(UIAlertAction(title: "OK", style: .default) { _ in completionHandler(true) })
        show(alert) { completionHandler(false) }
    }

    func webView(_ webView: WKWebView, runJavaScriptTextInputPanelWithPrompt prompt: String, defaultText: String?,
                 initiatedByFrame frame: WKFrameInfo, completionHandler: @escaping (String?) -> Void) {
        let alert = UIAlertController(title: nil, message: prompt, preferredStyle: .alert)
        alert.addTextField { $0.text = defaultText }
        alert.addAction(UIAlertAction(title: "Abbrechen", style: .cancel) { _ in completionHandler(nil) })
        alert.addAction(UIAlertAction(title: "OK", style: .default) { [weak alert] _ in
            completionHandler(alert?.textFields?.first?.text)
        })
        show(alert) { completionHandler(nil) }
    }

    /// Kamera fürs QR-Scannen: für das Spiel ohne Rückfrage pro Seite (iOS fragt beim ersten Mal einmal nach).
    func webView(_ webView: WKWebView, requestMediaCapturePermissionFor origin: WKSecurityOrigin,
                 initiatedByFrame frame: WKFrameInfo, type: WKMediaCaptureType,
                 decisionHandler: @escaping (WKPermissionDecision) -> Void) {
        decisionHandler(origin.host == Game.url.host ? .grant : .prompt)
    }

    /// Bewegungssensor fürs Würfeln durch Schütteln.
    func webView(_ webView: WKWebView, requestDeviceOrientationAndMotionPermissionFor origin: WKSecurityOrigin,
                 initiatedByFrame frame: WKFrameInfo, decisionHandler: @escaping (WKPermissionDecision) -> Void) {
        decisionHandler(origin.host == Game.url.host ? .grant : .prompt)
    }

    private func show(_ alert: UIViewController, otherwise fallback: @escaping () -> Void) {
        guard var top = web?.window?.rootViewController else {
            fallback()
            return
        }
        while let next = top.presentedViewController { top = next }
        top.present(alert, animated: true)
    }
}
