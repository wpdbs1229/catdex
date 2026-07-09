import CoreImage
import ExpoModulesCore
import UIKit
import Vision

public class CatVisionModule: Module {
  public func definition() -> ModuleDefinition {
    Name("CatVision")

    AsyncFunction("processCatPhoto") { (imageUri: String) -> [String: Any] in
      try Self.processCatPhoto(imageUri: imageUri)
    }
  }
}

private extension CatVisionModule {
  static func processCatPhoto(imageUri: String) throws -> [String: Any] {
    let imageUrl = try fileUrl(from: imageUri)
    guard let image = UIImage(contentsOfFile: imageUrl.path), let cgImage = image.normalizedCgImage() else {
      throw NSError(domain: "CatVision", code: 1, userInfo: [NSLocalizedDescriptionKey: "이미지를 불러오지 못했어요."])
    }

    let animalObservation = try bestCatObservation(in: cgImage)

    guard let observation = animalObservation else {
      return [
        "hasCat": false,
        "confidence": 0,
        "boundingBox": NSNull(),
        "cutoutImageUri": NSNull(),
        "featureVector": [],
        "isPreciseCutout": false
      ]
    }

    let cutout = try makeCutout(cgImage: cgImage, boundingBox: observation.boundingBox)

    return [
      "hasCat": true,
      "confidence": Double(observation.confidence),
      "boundingBox": normalizedDisplayBoundingBox(observation.boundingBox),
      "cutoutImageUri": cutout.url.absoluteString,
      "featureVector": featureVector(for: observation, image: cgImage),
      "isPreciseCutout": cutout.isPrecise
    ]
  }

  static func fileUrl(from imageUri: String) throws -> URL {
    if imageUri.hasPrefix("file://"), let url = URL(string: imageUri) {
      return url
    }

    if imageUri.hasPrefix("/") {
      return URL(fileURLWithPath: imageUri)
    }

    throw NSError(domain: "CatVision", code: 2, userInfo: [NSLocalizedDescriptionKey: "로컬 파일 이미지만 처리할 수 있어요."])
  }

  static func bestCatObservation(in cgImage: CGImage) throws -> VNRecognizedObjectObservation? {
    let request = VNRecognizeAnimalsRequest()
    let handler = VNImageRequestHandler(cgImage: cgImage, orientation: .up)

    try handler.perform([request])

    let observations = request.results ?? []
    return observations
      .compactMap { observation -> (VNRecognizedObjectObservation, Float)? in
        guard let label = observation.labels.first(where: { $0.identifier.lowercased() == "cat" }) else {
          return nil
        }

        return (observation, label.confidence)
      }
      .sorted { $0.1 > $1.1 }
      .first?
      .0
  }

  static func makeCutout(cgImage: CGImage, boundingBox: CGRect) throws -> (url: URL, isPrecise: Bool) {
    let ciImage = CIImage(cgImage: cgImage)
    let cropRect = pixelCropRect(for: boundingBox, width: cgImage.width, height: cgImage.height)
    let outputUrl = outputUrl(extension: "png")
    let context = CIContext(options: nil)
    let colorSpace = CGColorSpaceCreateDeviceRGB()

    if #available(iOS 17.0, *) {
      do {
        let request = VNGenerateForegroundInstanceMaskRequest()
        let handler = VNImageRequestHandler(cgImage: cgImage, orientation: .up)
        try handler.perform([request])

        if let maskObservation = request.results?.first {
          let maskBuffer = try maskObservation.generateScaledMaskForImage(
            forInstances: maskObservation.allInstances,
            from: handler
          )
          let maskImage = CIImage(cvPixelBuffer: maskBuffer)
          let transparentBackground = CIImage(color: .clear).cropped(to: ciImage.extent)
          let composited = ciImage.applyingFilter("CIBlendWithAlphaMask", parameters: [
            kCIInputBackgroundImageKey: transparentBackground,
            kCIInputMaskImageKey: maskImage
          ])
          let cropped = composited.cropped(to: cropRect)

          guard let pngData = context.pngRepresentation(of: cropped, format: .RGBA8, colorSpace: colorSpace) else {
            throw NSError(domain: "CatVision", code: 3, userInfo: [NSLocalizedDescriptionKey: "누끼 이미지를 만들지 못했어요."])
          }

          try pngData.write(to: outputUrl, options: .atomic)
          return (outputUrl, true)
        }
      } catch {
        // Fall through to a rectangular crop so the capture flow can continue.
      }
    }

    let cropped = ciImage.cropped(to: cropRect)
    guard let pngData = context.pngRepresentation(of: cropped, format: .RGBA8, colorSpace: colorSpace) else {
      throw NSError(domain: "CatVision", code: 4, userInfo: [NSLocalizedDescriptionKey: "고양이 이미지를 잘라내지 못했어요."])
    }

    try pngData.write(to: outputUrl, options: .atomic)
    return (outputUrl, false)
  }

  static func normalizedDisplayBoundingBox(_ boundingBox: CGRect) -> [String: Double] {
    [
      "x": Double(boundingBox.origin.x),
      "y": Double(1 - boundingBox.origin.y - boundingBox.height),
      "width": Double(boundingBox.width),
      "height": Double(boundingBox.height)
    ]
  }

  static func pixelCropRect(for boundingBox: CGRect, width: Int, height: Int) -> CGRect {
    let imageWidth = CGFloat(width)
    let imageHeight = CGFloat(height)
    let raw = CGRect(
      x: boundingBox.origin.x * imageWidth,
      y: boundingBox.origin.y * imageHeight,
      width: boundingBox.width * imageWidth,
      height: boundingBox.height * imageHeight
    )
    let padding = max(raw.width, raw.height) * 0.18
    let padded = raw.insetBy(dx: -padding, dy: -padding)

    return padded.intersection(CGRect(x: 0, y: 0, width: imageWidth, height: imageHeight))
  }

  static func outputUrl(extension fileExtension: String) -> URL {
    let directory = FileManager.default.temporaryDirectory.appendingPathComponent("cat-vision", isDirectory: true)
    try? FileManager.default.createDirectory(at: directory, withIntermediateDirectories: true)

    return directory.appendingPathComponent("cat-cutout-\(UUID().uuidString).\(fileExtension)")
  }

  static func featureVector(for observation: VNRecognizedObjectObservation, image: CGImage) -> [Double] {
    let box = observation.boundingBox
    let aspectRatio = box.width / max(box.height, 0.001)
    let area = box.width * box.height

    return [
      Double(observation.confidence),
      Double(box.width),
      Double(box.height),
      Double(aspectRatio),
      Double(area),
      Double(image.width) / 1000,
      Double(image.height) / 1000
    ]
  }
}

private extension UIImage {
  func normalizedCgImage() -> CGImage? {
    if imageOrientation == .up {
      return cgImage
    }

    UIGraphicsBeginImageContextWithOptions(size, false, scale)
    draw(in: CGRect(origin: .zero, size: size))
    let normalized = UIGraphicsGetImageFromCurrentImageContext()
    UIGraphicsEndImageContext()

    return normalized?.cgImage
  }
}
