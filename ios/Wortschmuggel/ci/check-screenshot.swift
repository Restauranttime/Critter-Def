// Liest den Text auf dem Simulator-Bildschirmfoto (Texterkennung von macOS)
// und schlägt fehl, wenn der Startbildschirm von Wortschmuggel nicht zu sehen ist.
// Aufruf: xcrun swift ci/check-screenshot.swift out/simulator-ipad.png
import Foundation
import ImageIO
import Vision

let path = CommandLine.arguments.count > 1 ? CommandLine.arguments[1] : "out/simulator-ipad.png"
let url = URL(fileURLWithPath: path)
guard let source = CGImageSourceCreateWithURL(url as CFURL, nil),
      let image = CGImageSourceCreateImageAtIndex(source, 0, nil) else {
    print("Bildschirmfoto nicht lesbar: \(path)")
    exit(1)
}

let request = VNRecognizeTextRequest()
request.recognitionLevel = .accurate
request.recognitionLanguages = ["de-DE"]
request.usesLanguageCorrection = false
try VNImageRequestHandler(cgImage: image).perform([request])

let lines = (request.results ?? []).compactMap { $0.topCandidates(1).first?.string }
print("Erkannter Text (\(image.width)x\(image.height)):")
lines.forEach { print("  \($0)") }

let expected = ["Neues Spiel", "Spielregeln"]
let missing = expected.filter { word in !lines.contains { $0.localizedCaseInsensitiveContains(word) } }
if missing.isEmpty {
    print("Startbildschirm erkannt.")
} else {
    print("Startbildschirm nicht erkannt, es fehlt: \(missing.joined(separator: ", "))")
    exit(1)
}
