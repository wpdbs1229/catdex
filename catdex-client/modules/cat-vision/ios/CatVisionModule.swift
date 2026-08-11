import CoreImage
import ExpoModulesCore
import UIKit
import Vision

// 촬영 사진 한 장에서 고양이 탐지와 누끼(배경 제거)를 수행한다.
// 시각 임베딩은 이 모듈에서 만들지 않는다. iOS 전용 VNGenerateImageFeaturePrint를
// 쓰면 Android와 값을 비교할 수 없어서, 크로스플랫폼 공용 모델을 붙이기 전까지
// embedding 필드를 비워 둔다.
public class CatVisionModule: Module {
  public func definition() -> ModuleDefinition {
    Name("CatVision")

    AsyncFunction("processCatPhoto") { (imageUri: String) -> [String: Any] in
      try CatVisionProcessor.process(imageUri: imageUri)
    }

    // Android는 Play 서비스에서 세그멘테이션 모델을 내려받아야 한다.
    // iOS는 OS 내장이라 준비 과정이 없으므로 즉시 준비 완료로 답한다.
    AsyncFunction("prepare") { () -> [String: Any] in
      ["ready": true, "message": NSNull()]
    }

    AsyncFunction("clearCache") { () -> Void in
      CatVisionProcessor.clearCache()
    }
  }
}

private enum CatVisionProcessor {
  static let maxProcessingDimension: CGFloat = 2048
  /// 잘라낼 때 경계 상자 바깥으로 남기는 여백 비율. 수염과 귀 끝이 잘리지 않게 한다.
  static let cropPaddingRatio: CGFloat = 0.18
  /// 털색·무늬 판정용 피사체 샘플 해상도. 태비 줄무늬를 잡으려면 이 정도는 필요하다.
  static let subjectSampleSize = 128
  /// 조명 추정용 장면 샘플 해상도. 배경 평균만 보므로 거칠어도 된다.
  static let sceneSampleSize = 64

  static func process(imageUri: String) throws -> [String: Any] {
    let startedAt = Date()
    let imageUrl = try fileUrl(from: imageUri)

    guard
      let image = UIImage(contentsOfFile: imageUrl.path),
      let fullSizeImage = image.normalizedCgImage()
    else {
      throw CatVisionError.imageLoadFailed
    }

    let cgImage = downscaled(fullSizeImage, maxDimension: maxProcessingDimension)
    let handler = VNImageRequestHandler(cgImage: cgImage, orientation: .up)

    let catObservation = bestCatObservation(handler: handler)
    let maskedImage = foregroundMaskedImage(cgImage: cgImage, handler: handler)

    // 탐지 상자가 있으면 그 상자를, 없으면 누끼 마스크가 덮은 영역을 기준으로 잘라낸다.
    let visionBox = catObservation?.boundingBox ?? maskedImage.flatMap { visionExtent(of: $0) }

    guard let visionBox else {
      return [
        "hasCat": false,
        "confidence": 0,
        "boundingBox": NSNull(),
        "cutoutImageUri": NSNull(),
        "cutoutWidth": 0,
        "cutoutHeight": 0,
        "isPreciseCutout": false,
        "subjectSamples": NSNull(),
        "sceneSamples": NSNull(),
        "embedding": [Double](),
        "embeddingVersion": NSNull(),
        "processingMs": elapsedMs(since: startedAt)
      ]
    }

    let cropRect = pixelCropRect(for: visionBox, width: cgImage.width, height: cgImage.height)
    let cutout = try writeCutout(maskedImage: maskedImage, originalImage: cgImage, cropRect: cropRect)

    return [
      "hasCat": catObservation != nil,
      "confidence": Double(catObservation?.confidence ?? 0),
      "boundingBox": normalizedDisplayBoundingBox(visionBox),
      "cutoutImageUri": cutout.url.absoluteString,
      "cutoutWidth": cutout.width,
      "cutoutHeight": cutout.height,
      "isPreciseCutout": cutout.isPrecise,
      // 털색·무늬 판정은 JS(coat-analysis.ts)에서 한다. 여기서는 픽셀만 넘긴다.
      "subjectSamples": encodedSamples(from: cutout.image, size: subjectSampleSize) ?? NSNull(),
      "sceneSamples": encodedSceneSamples(original: cgImage, masked: maskedImage, size: sceneSampleSize) ?? NSNull(),
      // 크로스플랫폼 공용 임베딩 모델을 붙이기 전까지 비워 둔다.
      "embedding": [Double](),
      "embeddingVersion": NSNull(),
      "processingMs": elapsedMs(since: startedAt)
    ]
  }

  static func clearCache() {
    try? FileManager.default.removeItem(at: cacheDirectory())
  }

  // MARK: - Vision

  static func bestCatObservation(handler: VNImageRequestHandler) -> VNRecognizedObjectObservation? {
    let request = VNRecognizeAnimalsRequest()

    do {
      try handler.perform([request])
    } catch {
      return nil
    }

    return (request.results ?? [])
      .compactMap { observation -> (VNRecognizedObjectObservation, Float)? in
        guard let label = observation.labels.first(where: { $0.identifier.lowercased() == "cat" }) else {
          return nil
        }

        return (observation, label.confidence)
      }
      .max { $0.1 < $1.1 }?
      .0
  }

  /// 주 피사체 마스크를 적용해 배경이 투명해진 전체 크기 이미지를 만든다.
  /// iOS 17 미만이거나 마스크를 못 만들면 nil을 돌려주고 호출부가 사각 크롭으로 넘어간다.
  static func foregroundMaskedImage(cgImage: CGImage, handler: VNImageRequestHandler) -> CIImage? {
    guard #available(iOS 17.0, *) else {
      return nil
    }

    let request = VNGenerateForegroundInstanceMaskRequest()

    do {
      try handler.perform([request])

      guard let observation = request.results?.first, !observation.allInstances.isEmpty else {
        return nil
      }

      let maskBuffer = try observation.generateScaledMaskForImage(
        forInstances: observation.allInstances,
        from: handler
      )
      let sourceImage = CIImage(cgImage: cgImage)
      let maskImage = CIImage(cvPixelBuffer: maskBuffer)
      let transparentBackground = CIImage(color: .clear).cropped(to: sourceImage.extent)

      // CIBlendWithAlphaMask가 아니라 CIBlendWithMask를 써야 한다. Vision이 주는
      // 마스크는 단일 채널 버퍼라 알파가 전부 1이고, 알파 기준 필터로는 "전부 전경"이
      // 되어 배경이 하나도 지워지지 않는다. CIBlendWithMask는 밝기값을 본다.
      return sourceImage.applyingFilter("CIBlendWithMask", parameters: [
        kCIInputBackgroundImageKey: transparentBackground,
        kCIInputMaskImageKey: maskImage
      ])
    } catch {
      return nil
    }
  }

  /// 마스크가 실제로 덮은 영역을 Vision 좌표계(좌하단 원점, 0~1)로 환산한다.
  static func visionExtent(of maskedImage: CIImage) -> CGRect? {
    let sampleSize = 64

    guard let pixels = rgbaSamples(from: maskedImage, size: sampleSize) else {
      return nil
    }

    var minX = sampleSize
    var minY = sampleSize
    var maxX = -1
    var maxY = -1

    for y in 0..<sampleSize {
      for x in 0..<sampleSize where pixels[(y * sampleSize + x) * 4 + 3] > 127 {
        minX = min(minX, x)
        minY = min(minY, y)
        maxX = max(maxX, x)
        maxY = max(maxY, y)
      }
    }

    guard maxX >= minX, maxY >= minY else {
      return nil
    }

    // 샘플 격자는 첫 행이 이미지 위쪽(좌상단 원점)이다. Vision/CIImage는 좌하단
    // 원점을 쓰므로 y를 뒤집어서 돌려준다.
    let step = 1.0 / CGFloat(sampleSize)
    return CGRect(
      x: CGFloat(minX) * step,
      y: 1 - CGFloat(maxY + 1) * step,
      width: CGFloat(maxX - minX + 1) * step,
      height: CGFloat(maxY - minY + 1) * step
    )
  }

  // MARK: - 누끼 파일 쓰기

  static func writeCutout(
    maskedImage: CIImage?,
    originalImage: CGImage,
    cropRect: CGRect
  ) throws -> (url: URL, width: Int, height: Int, isPrecise: Bool, image: CIImage) {
    let context = CIContext(options: nil)
    let colorSpace = CGColorSpaceCreateDeviceRGB()
    let outputUrl = outputUrl(extension: "png")

    if let maskedImage {
      let cropped = maskedImage.cropped(to: cropRect)

      if let pngData = context.pngRepresentation(of: cropped, format: .RGBA8, colorSpace: colorSpace) {
        try pngData.write(to: outputUrl, options: .atomic)
        return (outputUrl, Int(cropped.extent.width), Int(cropped.extent.height), true, cropped)
      }
    }

    let cropped = CIImage(cgImage: originalImage).cropped(to: cropRect)

    guard let pngData = context.pngRepresentation(of: cropped, format: .RGBA8, colorSpace: colorSpace) else {
      throw CatVisionError.cutoutFailed
    }

    try pngData.write(to: outputUrl, options: .atomic)
    return (outputUrl, Int(cropped.extent.width), Int(cropped.extent.height), false, cropped)
  }

  // MARK: - 픽셀 샘플

  /// 털색·무늬 판정은 JS에서 한다(coat-analysis.ts). 여기서는 마스크가 적용된
  /// 픽셀 격자를 base64로 넘기기만 한다. 판정 로직을 한 곳에 두면 iOS와 Android
  /// 결과가 어긋날 수 없고, 임계값 조정을 네이티브 재빌드 없이 할 수 있다.
  static func encodedSamples(from image: CIImage, size: Int) -> [String: Any]? {
    guard let pixels = rgbaSamples(from: image, size: size) else {
      return nil
    }

    return ["base64": Data(pixels).base64EncodedString(), "size": size]
  }

  /// 원본 색 + 피사체 마스크를 알파로 합친 장면 샘플. JS가 알파 없는 픽셀을
  /// 배경으로 보고 조명 색온도를 추정한다.
  static func encodedSceneSamples(original: CGImage, masked: CIImage?, size: Int) -> [String: Any]? {
    guard var pixels = rgbaSamples(from: CIImage(cgImage: original), size: size) else {
      return nil
    }

    if let masked, let maskPixels = rgbaSamples(from: masked, size: size) {
      for index in stride(from: 0, to: pixels.count, by: 4) {
        pixels[index + 3] = maskPixels[index + 3]
      }
    } else {
      // 마스크가 없으면 배경을 가려낼 수 없다. 전부 피사체로 표시해 보정을 건너뛰게 한다.
      for index in stride(from: 0, to: pixels.count, by: 4) {
        pixels[index + 3] = 255
      }
    }

    return ["base64": Data(pixels).base64EncodedString(), "size": size]
  }

  // MARK: - 유틸

  /// 이미지를 size×size RGBA 격자로 축소해 픽셀 배열로 돌려준다.
  /// 알파는 미리 나눠 두어(un-premultiply) Android와 같은 형식으로 맞춘다.
  static func rgbaSamples(from image: CIImage, size sampleSize: Int) -> [UInt8]? {
    var pixels = [UInt8](repeating: 0, count: sampleSize * sampleSize * 4)
    let targetRect = CGRect(x: 0, y: 0, width: sampleSize, height: sampleSize)

    guard let cgImage = CIContext(options: nil).createCGImage(image, from: image.extent) else {
      return nil
    }

    guard let context = CGContext(
      data: &pixels,
      width: sampleSize,
      height: sampleSize,
      bitsPerComponent: 8,
      bytesPerRow: sampleSize * 4,
      space: CGColorSpaceCreateDeviceRGB(),
      bitmapInfo: CGImageAlphaInfo.premultipliedLast.rawValue
    ) else {
      return nil
    }

    context.clear(targetRect)
    context.draw(cgImage, in: targetRect)

    for index in stride(from: 0, to: pixels.count, by: 4) {
      let alpha = Double(pixels[index + 3]) / 255
      guard alpha > 0, alpha < 1 else {
        continue
      }

      pixels[index] = UInt8(min(255, Double(pixels[index]) / alpha))
      pixels[index + 1] = UInt8(min(255, Double(pixels[index + 1]) / alpha))
      pixels[index + 2] = UInt8(min(255, Double(pixels[index + 2]) / alpha))
    }

    return pixels
  }

  static func downscaled(_ cgImage: CGImage, maxDimension: CGFloat) -> CGImage {
    let width = CGFloat(cgImage.width)
    let height = CGFloat(cgImage.height)
    let longest = max(width, height)

    guard longest > maxDimension else {
      return cgImage
    }

    let scale = maxDimension / longest
    let targetWidth = Int((width * scale).rounded())
    let targetHeight = Int((height * scale).rounded())

    guard let context = CGContext(
      data: nil,
      width: targetWidth,
      height: targetHeight,
      bitsPerComponent: 8,
      bytesPerRow: 0,
      space: CGColorSpaceCreateDeviceRGB(),
      bitmapInfo: CGImageAlphaInfo.premultipliedLast.rawValue
    ) else {
      return cgImage
    }

    context.interpolationQuality = .high
    context.draw(cgImage, in: CGRect(x: 0, y: 0, width: targetWidth, height: targetHeight))

    return context.makeImage() ?? cgImage
  }

  static func fileUrl(from imageUri: String) throws -> URL {
    if imageUri.hasPrefix("file://"), let url = URL(string: imageUri) {
      return url
    }

    if imageUri.hasPrefix("/") {
      return URL(fileURLWithPath: imageUri)
    }

    throw CatVisionError.unsupportedUri
  }

  static func normalizedDisplayBoundingBox(_ boundingBox: CGRect) -> [String: Double] {
    // Vision은 좌하단 원점이라 화면 좌표계(좌상단 원점)로 뒤집어서 넘긴다.
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
    let padding = max(raw.width, raw.height) * cropPaddingRatio
    let padded = raw.insetBy(dx: -padding, dy: -padding)

    return padded.intersection(CGRect(x: 0, y: 0, width: imageWidth, height: imageHeight))
  }

  static func cacheDirectory() -> URL {
    FileManager.default.temporaryDirectory.appendingPathComponent("cat-vision", isDirectory: true)
  }

  static func outputUrl(extension fileExtension: String) -> URL {
    let directory = cacheDirectory()
    try? FileManager.default.createDirectory(at: directory, withIntermediateDirectories: true)

    return directory.appendingPathComponent("cat-cutout-\(UUID().uuidString).\(fileExtension)")
  }

  static func elapsedMs(since startedAt: Date) -> Int {
    Int(Date().timeIntervalSince(startedAt) * 1000)
  }
}

private enum CatVisionError: Error, LocalizedError {
  case imageLoadFailed
  case unsupportedUri
  case cutoutFailed

  var errorDescription: String? {
    switch self {
    case .imageLoadFailed:
      return "이미지를 불러오지 못했어요."
    case .unsupportedUri:
      return "로컬 파일 이미지만 처리할 수 있어요."
    case .cutoutFailed:
      return "고양이 이미지를 잘라내지 못했어요."
    }
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
