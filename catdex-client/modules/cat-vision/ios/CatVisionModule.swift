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
    let embedding = imageEmbedding(imageUrl: cutout.url)

    return [
      "hasCat": true,
      "confidence": Double(observation.confidence),
      "boundingBox": normalizedDisplayBoundingBox(observation.boundingBox),
      "cutoutImageUri": cutout.url.absoluteString,
      "featureVector": featureVector(for: observation, image: cgImage),
      "isPreciseCutout": cutout.isPrecise,
      "colorProfile": coatColorProfile(imageUrl: cutout.url, usesAlphaMask: cutout.isPrecise),
      "embedding": embedding?.values ?? [],
      "embeddingVersion": embedding?.version as Any? ?? NSNull()
    ]
  }

  /// 누끼 이미지의 Vision Feature Print(온디바이스 시각 임베딩)를 계산한다.
  /// 개체 확정용이 아니라 후보 정렬의 유사도 신호로만 사용한다.
  /// 리비전/차원이 다른 임베딩은 서로 비교할 수 없으므로 버전 문자열을 함께 반환한다.
  static func imageEmbedding(imageUrl: URL) -> (values: [Double], version: String)? {
    guard let image = UIImage(contentsOfFile: imageUrl.path), let cgImage = image.cgImage else {
      return nil
    }

    let request = VNGenerateImageFeaturePrintRequest()
    let handler = VNImageRequestHandler(cgImage: cgImage, orientation: .up)

    do {
      try handler.perform([request])
    } catch {
      return nil
    }

    guard let observation = request.results?.first,
          observation.elementType == .float,
          observation.elementCount > 0
    else {
      return nil
    }

    var floats = [Float](repeating: 0, count: observation.elementCount)
    observation.data.withUnsafeBytes { rawBuffer in
      guard let baseAddress = rawBuffer.baseAddress else {
        return
      }

      memcpy(&floats, baseAddress, min(rawBuffer.count, observation.elementCount * MemoryLayout<Float>.size))
    }

    return (floats.map(Double.init), "vn-fp-r\(request.revision)-d\(observation.elementCount)")
  }

  /// 누끼 이미지의 픽셀을 색 계열(검정/흰색/회색/주황/갈색)로 분류해 비율을 반환한다.
  /// 개체 식별이 아니라 후보 정렬의 털색 힌트로만 사용한다.
  static func coatColorProfile(imageUrl: URL, usesAlphaMask: Bool) -> [String: Double] {
    guard let image = UIImage(contentsOfFile: imageUrl.path), let cgImage = image.cgImage else {
      return [:]
    }

    let sampleSize = 64
    var pixels = [UInt8](repeating: 0, count: sampleSize * sampleSize * 4)
    guard let context = CGContext(
      data: &pixels,
      width: sampleSize,
      height: sampleSize,
      bitsPerComponent: 8,
      bytesPerRow: sampleSize * 4,
      space: CGColorSpaceCreateDeviceRGB(),
      bitmapInfo: CGImageAlphaInfo.premultipliedLast.rawValue
    ) else {
      return [:]
    }

    context.clear(CGRect(x: 0, y: 0, width: sampleSize, height: sampleSize))
    context.draw(cgImage, in: CGRect(x: 0, y: 0, width: sampleSize, height: sampleSize))

    var counts: [String: Int] = ["black": 0, "white": 0, "gray": 0, "orange": 0, "brown": 0]
    var classified = 0
    var opaque = 0

    for index in stride(from: 0, to: pixels.count, by: 4) {
      let alpha = Double(pixels[index + 3]) / 255
      // 정밀 누끼면 마스크 밖(투명) 픽셀을 제외한다. 사각 크롭이면 배경이
      // 섞이므로 중앙 가중 없이 전체를 대상으로 하되 알파는 그대로 본다.
      if alpha < 0.5 {
        continue
      }

      opaque += 1

      // premultiplied alpha 복원
      let red = min(1, Double(pixels[index]) / 255 / alpha)
      let green = min(1, Double(pixels[index + 1]) / 255 / alpha)
      let blue = min(1, Double(pixels[index + 2]) / 255 / alpha)

      let maxValue = max(red, green, blue)
      let minValue = min(red, green, blue)
      let delta = maxValue - minValue
      let value = maxValue
      let saturation = maxValue <= 0 ? 0 : delta / maxValue

      var hue = 0.0
      if delta > 0 {
        if maxValue == red {
          hue = ((green - blue) / delta).truncatingRemainder(dividingBy: 6)
        } else if maxValue == green {
          hue = (blue - red) / delta + 2
        } else {
          hue = (red - green) / delta + 4
        }
        hue *= 60
        if hue < 0 {
          hue += 360
        }
      }

      let isWarmHue = hue >= 10 && hue <= 55

      if value < 0.2 {
        counts["black"]! += 1
      } else if saturation < 0.16 && value > 0.8 {
        counts["white"]! += 1
      } else if saturation < 0.18 {
        counts["gray"]! += 1
      } else if isWarmHue && (saturation >= 0.32 || value >= 0.65) && value >= 0.45 {
        counts["orange"]! += 1
      } else if isWarmHue {
        counts["brown"]! += 1
      } else {
        // 냉색 계열(배경 잔여물 등)은 분모에서 제외한다.
        continue
      }

      classified += 1
    }

    guard classified > 32 else {
      return [:]
    }

    var profile: [String: Double] = [:]
    for (family, count) in counts {
      profile[family] = Double(count) / Double(classified)
    }
    profile["coverage"] = Double(opaque) / Double(sampleSize * sampleSize)
    profile["maskUsed"] = usesAlphaMask ? 1 : 0

    return profile
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
