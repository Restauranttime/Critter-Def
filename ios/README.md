# Football Empire als iOS-App

Die App ist eine echte iOS-App mit eigenem Symbol. Das Spiel darin ist dasselbe wie im Browser: Die App lädt `https://restauranttime.github.io/Critter-Def/empire.html`.

- **Die Web-App bleibt unverändert.** Wer will, spielt weiter im Browser oder über „Zum Home-Bildschirm“. App und Browser sind zusammen im selben Raum.
- **Spiel-Updates kommen von selbst.** Jede neue Version der Web-App ist sofort auch in der App. Neu installieren muss man die App nur, wenn sich etwas im Ordner `ios/` ändert, oder wenn sie nach 7 Tagen abläuft (siehe unten).

Was die App zusätzlich kann:

- **Bildschirm bleibt an:** Der Bildschirm geht während des Spiels nicht aus. Das ist wichtig fürs iPad als Spielbrett.
- **Vollbild:** keine Safari-Leisten, auf dem iPad auch ohne Statusleiste.
- **Kamera und Bewegung:** Die Kamera (QR-Code scannen) und der Bewegungssensor (Würfeln durch Schütteln) funktionieren ohne Nachfragen bei jedem Seitenaufruf.
- **iOS-Dialoge:** Rückfragen wie „Liga wirklich verlassen?“ erscheinen als normale iOS-Dialoge.
- **Ohne Internet:** Die App zeigt „Keine Verbindung“ mit einem Knopf „Nochmal versuchen“.

## Aufs eigene iPad oder iPhone (kostenlos, mit Mac)

Du brauchst dafür:

- einen Mac mit aktuellem macOS,
- Xcode (kostenlos im Mac App Store),
- deine Apple-ID,
- ein USB-Kabel fürs iPad.

1. **Xcode installieren:** Xcode aus dem Mac App Store installieren und einmal öffnen. Wenn Xcode nach Plattformen fragt, „iOS“ mit installieren.
2. **Projekt holen:** Auf github.com/Restauranttime/Critter-Def auf den grünen Knopf **Code** und dann **Download ZIP** klicken. Die ZIP-Datei entpacken.
3. **Projekt öffnen:** Im entpackten Ordner `ios/FootballEmpire.xcodeproj` doppelklicken.
4. **Apple-ID eintragen:** In Xcode **Settings › Accounts** öffnen, unten auf **+** klicken, „Apple ID“ wählen und anmelden.
5. **Signieren einstellen:**
   1. Links oben das blaue **FootballEmpire** anklicken.
   2. In der Mitte unter „Targets“ **FootballEmpire** wählen und den Reiter **Signing & Capabilities** öffnen.
   3. Bei **Team** deinen Namen mit „(Personal Team)“ wählen.
   4. Meldet Xcode, dass die Bundle-ID vergeben ist: bei **Bundle Identifier** etwas anhängen, z. B. `com.restauranttime.footballempire.lea`.
6. **iPad anschließen:** Das iPad per Kabel an den Mac anschließen, entsperren und „Vertrauen“ tippen.
7. **App aufspielen:** Oben in der Mitte von Xcode das iPad als Ziel auswählen und auf **▶** klicken.
8. **Beim ersten Mal auf dem iPad freigeben:**
   1. **Einstellungen › Datenschutz & Sicherheit › Entwicklermodus** einschalten. Das iPad startet dann neu.
   2. **Einstellungen › Allgemein › VPN & Geräteverwaltung** öffnen, deine Apple-ID antippen und **Vertrauen** wählen.
   3. In Xcode noch einmal **▶** klicken.

Für ein iPhone geht es genauso.

**Gut zu wissen:**

- **Nach 7 Tagen läuft die App ab.** Das liegt an der kostenlosen Apple-ID. Dann das Gerät anschließen und in Xcode wieder **▶** klicken. Spielstände bleiben dabei erhalten.
- **Ohne Kabel:** Ab dem zweiten Mal geht es auch per WLAN, wenn Mac und iPad im selben Netz sind. Dafür in Xcode unter **Window › Devices and Simulators** beim Gerät „Connect via network“ anhaken.
- **Höchstens 3 Apps:** Mit kostenloser Apple-ID lassen sich auf einem Gerät höchstens 3 eigene Apps gleichzeitig installieren.

## Später: TestFlight oder App Store

Mit einem Apple-Entwicklerkonto (99 € pro Jahr) entfällt die 7-Tage-Grenze, und die App lässt sich über TestFlight an Freunde verteilen:

1. In Xcode beim **Team** das Entwicklerkonto wählen.
2. **Product › Archive** wählen.
3. **Distribute App › App Store Connect** wählen.
4. In App Store Connect unter TestFlight die Tester einladen.

Für den öffentlichen App Store prüft Apple jede App. Reine Hüllen um eine Webseite werden dort oft abgelehnt (Richtlinie 4.2). Dann müsste das Spiel fest in die App eingebaut werden.

## Technik

- SwiftUI und WKWebView, ab iOS 16, für iPhone und iPad.
- Die Adresse des Spiels steht in `FootballEmpire/GameView.swift` (`Game.url`).
- Die Web-App erkennt die App an `window.FE_NATIVE`, das die App vor dem Laden setzt. Unten auf der Startseite steht dann „iOS-App 1.0“.
- `.github/workflows/ios.yml` baut die App bei jeder Änderung im Ordner `ios/` auf einem Mac bei GitHub. Danach startet sie im iPad-Simulator und prüft, ob das Spiel lädt.
