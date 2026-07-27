package expo.modules.catvision

import android.graphics.Bitmap
import android.graphics.BitmapFactory
import android.graphics.Matrix
import android.graphics.Rect
import android.net.Uri
import androidx.exifinterface.media.ExifInterface
import com.google.android.gms.common.moduleinstall.ModuleInstall
import com.google.android.gms.common.moduleinstall.ModuleInstallRequest
import com.google.android.gms.tasks.Tasks
import com.google.mlkit.vision.common.InputImage
import com.google.mlkit.vision.label.ImageLabeling
import com.google.mlkit.vision.label.defaults.ImageLabelerOptions
import com.google.mlkit.vision.segmentation.subject.SubjectSegmentation
import com.google.mlkit.vision.segmentation.subject.SubjectSegmenterOptions
import expo.modules.kotlin.exception.CodedException
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import java.io.File
import java.io.FileOutputStream
import java.util.UUID
import java.util.concurrent.TimeUnit
import kotlin.math.max
import kotlin.math.min
import kotlin.math.roundToInt

// 촬영 사진 한 장에서 고양이 탐지와 누끼(배경 제거)를 수행한다.
// iOS CatVisionModule.swift와 반환 계약, 여백 비율, 털색 판정 기준을 동일하게 맞춘다.
// 시각 임베딩은 이 모듈에서 만들지 않는다. 크로스플랫폼 공용 모델을 붙이기 전까지
// embedding 필드를 비워 둔다. 배경은 docs/domain-rules.md 참고.
class CatVisionModule : Module() {
  override fun definition() = ModuleDefinition {
    Name("CatVision")

    AsyncFunction("processCatPhoto") { imageUri: String ->
      process(imageUri)
    }

    // 누끼 모델은 Play 서비스에서 내려받는다. 촬영 화면 진입 시 미리 호출해
    // 첫 촬영에서 수 초씩 기다리는 상황을 피한다.
    AsyncFunction("prepare") {
      prepareSegmentationModel()
    }

    AsyncFunction("clearCache") {
      cacheDirectory().deleteRecursively()
      Unit
    }
  }

  private fun process(imageUri: String): Map<String, Any?> {
    val startedAt = System.currentTimeMillis()
    val source = loadBitmap(imageUri)
    val input = InputImage.fromBitmap(source, 0)

    val catConfidence = detectCatConfidence(input)
    // 마스크가 나왔더라도 남은 픽셀이 없으면 쓸 수 없는 결과다. 사각 크롭으로 넘긴다.
    val segmented = segmentForeground(input)
    val segmentedBounds = segmented?.let { opaqueBounds(it) }
    val foreground = if (segmentedBounds == null) null else segmented
    val bounds = segmentedBounds ?: Rect(0, 0, source.width, source.height)

    if (foreground == null && catConfidence == null) {
      return mapOf(
        "hasCat" to false,
        "confidence" to 0.0,
        "boundingBox" to null,
        "cutoutImageUri" to null,
        "cutoutWidth" to 0,
        "cutoutHeight" to 0,
        "isPreciseCutout" to false,
        "colorProfile" to null,
        "embedding" to emptyList<Double>(),
        "embeddingVersion" to null,
        "processingMs" to (System.currentTimeMillis() - startedAt).toInt()
      )
    }

    val cropRect = paddedCropRect(bounds, source.width, source.height)
    val isPrecise = foreground != null
    val cutout = Bitmap.createBitmap(
      foreground ?: source,
      cropRect.left,
      cropRect.top,
      cropRect.width(),
      cropRect.height()
    )
    val cutoutFile = writePng(cutout)

    return mapOf(
      "hasCat" to (catConfidence != null),
      "confidence" to (catConfidence?.toDouble() ?: 0.0),
      "boundingBox" to normalizedBoundingBox(bounds, source.width, source.height),
      "cutoutImageUri" to Uri.fromFile(cutoutFile).toString(),
      "cutoutWidth" to cutout.width,
      "cutoutHeight" to cutout.height,
      "isPreciseCutout" to isPrecise,
      "colorProfile" to coatColorProfile(cutout, isPrecise),
      // 크로스플랫폼 공용 임베딩 모델을 붙이기 전까지 비워 둔다.
      "embedding" to emptyList<Double>(),
      "embeddingVersion" to null,
      "processingMs" to (System.currentTimeMillis() - startedAt).toInt()
    )
  }

  // MARK: - ML Kit

  private fun prepareSegmentationModel(): Map<String, Any?> {
    val segmenter = SubjectSegmentation.getClient(segmenterOptions())

    return try {
      val client = ModuleInstall.getClient(appContext.reactContext ?: throw ContextUnavailableException())
      val request = ModuleInstallRequest.newBuilder().addApi(segmenter).build()
      Tasks.await(client.installModules(request), MODEL_INSTALL_TIMEOUT_SECONDS, TimeUnit.SECONDS)
      mapOf("ready" to true, "message" to null)
    } catch (error: Exception) {
      // 모델을 못 받아도 촬영은 계속할 수 있어야 한다. 사각 크롭으로 넘어간다.
      mapOf("ready" to false, "message" to (error.message ?: "누끼 모델을 준비하지 못했어요."))
    } finally {
      segmenter.close()
    }
  }

  /** 고양이로 판정되면 신뢰도를, 아니면 null을 돌려준다. */
  private fun detectCatConfidence(input: InputImage): Float? {
    val labeler = ImageLabeling.getClient(
      ImageLabelerOptions.Builder().setConfidenceThreshold(CAT_CONFIDENCE_THRESHOLD).build()
    )

    return try {
      Tasks.await(labeler.process(input), PROCESS_TIMEOUT_SECONDS, TimeUnit.SECONDS)
        .filter { it.text.equals("Cat", ignoreCase = true) }
        .maxByOrNull { it.confidence }
        ?.confidence
    } catch (error: Exception) {
      null
    } finally {
      labeler.close()
    }
  }

  /** 배경이 투명해진 전체 크기 비트맵. 모델이 없거나 피사체를 못 찾으면 null. */
  private fun segmentForeground(input: InputImage): Bitmap? {
    val segmenter = SubjectSegmentation.getClient(segmenterOptions())

    return try {
      Tasks.await(segmenter.process(input), PROCESS_TIMEOUT_SECONDS, TimeUnit.SECONDS).foregroundBitmap
    } catch (error: Exception) {
      null
    } finally {
      segmenter.close()
    }
  }

  private fun segmenterOptions() = SubjectSegmenterOptions.Builder()
    .enableForegroundBitmap()
    .build()

  // MARK: - 이미지 처리

  private fun loadBitmap(imageUri: String): Bitmap {
    val path = when {
      imageUri.startsWith("file://") -> Uri.parse(imageUri).path
      imageUri.startsWith("/") -> imageUri
      else -> throw UnsupportedUriException()
    } ?: throw UnsupportedUriException()

    if (!File(path).exists()) {
      throw ImageLoadException()
    }

    val bounds = BitmapFactory.Options().apply { inJustDecodeBounds = true }
    BitmapFactory.decodeFile(path, bounds)

    // 12MP 원본을 그대로 돌리면 느리다. 목표 크기의 두 배 아래로 먼저 줄여서 디코딩한다.
    var sampleSize = 1
    while (max(bounds.outWidth, bounds.outHeight) / sampleSize > MAX_DIMENSION * 2) {
      sampleSize *= 2
    }

    val decoded = BitmapFactory.decodeFile(
      path,
      BitmapFactory.Options().apply {
        inSampleSize = sampleSize
        inPreferredConfig = Bitmap.Config.ARGB_8888
      }
    ) ?: throw ImageLoadException()

    return scaleToMaxDimension(applyExifRotation(decoded, path))
  }

  private fun applyExifRotation(bitmap: Bitmap, path: String): Bitmap {
    val orientation = try {
      ExifInterface(path).getAttributeInt(ExifInterface.TAG_ORIENTATION, ExifInterface.ORIENTATION_NORMAL)
    } catch (error: Exception) {
      ExifInterface.ORIENTATION_NORMAL
    }

    val matrix = Matrix()
    when (orientation) {
      ExifInterface.ORIENTATION_ROTATE_90 -> matrix.postRotate(90f)
      ExifInterface.ORIENTATION_ROTATE_180 -> matrix.postRotate(180f)
      ExifInterface.ORIENTATION_ROTATE_270 -> matrix.postRotate(270f)
      ExifInterface.ORIENTATION_FLIP_HORIZONTAL -> matrix.postScale(-1f, 1f)
      ExifInterface.ORIENTATION_FLIP_VERTICAL -> matrix.postScale(1f, -1f)
      else -> return bitmap
    }

    return Bitmap.createBitmap(bitmap, 0, 0, bitmap.width, bitmap.height, matrix, true)
  }

  private fun scaleToMaxDimension(bitmap: Bitmap): Bitmap {
    val longest = max(bitmap.width, bitmap.height)
    if (longest <= MAX_DIMENSION) {
      return bitmap
    }

    val scale = MAX_DIMENSION.toFloat() / longest
    return Bitmap.createScaledBitmap(
      bitmap,
      (bitmap.width * scale).roundToInt(),
      (bitmap.height * scale).roundToInt(),
      true
    )
  }

  /** 알파가 남아 있는(=피사체) 영역의 경계를 찾는다. 좌상단 원점 픽셀 좌표. */
  private fun opaqueBounds(bitmap: Bitmap): Rect? {
    val sample = Bitmap.createScaledBitmap(bitmap, SAMPLE_SIZE, SAMPLE_SIZE, true)
    val pixels = IntArray(SAMPLE_SIZE * SAMPLE_SIZE)
    sample.getPixels(pixels, 0, SAMPLE_SIZE, 0, 0, SAMPLE_SIZE, SAMPLE_SIZE)

    var minX = SAMPLE_SIZE
    var minY = SAMPLE_SIZE
    var maxX = -1
    var maxY = -1

    for (y in 0 until SAMPLE_SIZE) {
      for (x in 0 until SAMPLE_SIZE) {
        if ((pixels[y * SAMPLE_SIZE + x] ushr 24) > 127) {
          minX = min(minX, x)
          minY = min(minY, y)
          maxX = max(maxX, x)
          maxY = max(maxY, y)
        }
      }
    }

    if (maxX < minX || maxY < minY) {
      return null
    }

    val stepX = bitmap.width.toFloat() / SAMPLE_SIZE
    val stepY = bitmap.height.toFloat() / SAMPLE_SIZE

    return Rect(
      (minX * stepX).toInt(),
      (minY * stepY).toInt(),
      min(bitmap.width, ((maxX + 1) * stepX).roundToInt()),
      min(bitmap.height, ((maxY + 1) * stepY).roundToInt())
    )
  }

  private fun paddedCropRect(bounds: Rect, width: Int, height: Int): Rect {
    val padding = (max(bounds.width(), bounds.height()) * CROP_PADDING_RATIO).roundToInt()
    val left = max(0, bounds.left - padding)
    val top = max(0, bounds.top - padding)

    return Rect(
      left,
      top,
      max(left + 1, min(width, bounds.right + padding)),
      max(top + 1, min(height, bounds.bottom + padding))
    )
  }

  private fun normalizedBoundingBox(bounds: Rect, width: Int, height: Int): Map<String, Double> = mapOf(
    "x" to bounds.left.toDouble() / width,
    "y" to bounds.top.toDouble() / height,
    "width" to bounds.width().toDouble() / width,
    "height" to bounds.height().toDouble() / height
  )

  // MARK: - 털색 힌트

  /**
   * 누끼 이미지의 픽셀을 색 계열(검정/흰색/회색/주황/갈색)로 분류해 비율을 반환한다.
   * 개체 식별이 아니라 후보 정렬의 털색 힌트로만 사용한다.
   * 판정 기준은 iOS 구현과 동일하게 유지해야 플랫폼 간 힌트가 어긋나지 않는다.
   */
  private fun coatColorProfile(bitmap: Bitmap, usesAlphaMask: Boolean): Map<String, Double>? {
    val sample = Bitmap.createScaledBitmap(bitmap, SAMPLE_SIZE, SAMPLE_SIZE, true)
    val pixels = IntArray(SAMPLE_SIZE * SAMPLE_SIZE)
    sample.getPixels(pixels, 0, SAMPLE_SIZE, 0, 0, SAMPLE_SIZE, SAMPLE_SIZE)

    val counts = mutableMapOf("black" to 0, "white" to 0, "gray" to 0, "orange" to 0, "brown" to 0)
    var classified = 0
    var opaque = 0

    for (pixel in pixels) {
      val alpha = (pixel ushr 24) / 255.0

      // 정밀 누끼면 마스크 밖(투명) 픽셀을 제외한다. 사각 크롭이면 배경이
      // 섞이므로 중앙 가중 없이 전체를 대상으로 하되 알파는 그대로 본다.
      if (alpha < 0.5) {
        continue
      }

      opaque += 1

      val red = ((pixel shr 16) and 0xFF) / 255.0
      val green = ((pixel shr 8) and 0xFF) / 255.0
      val blue = (pixel and 0xFF) / 255.0

      // 냉색 계열(배경 잔여물 등)은 분모에서 제외한다.
      val family = colorFamily(red, green, blue) ?: continue
      counts[family] = counts.getValue(family) + 1
      classified += 1
    }

    if (classified <= 32) {
      return null
    }

    val profile = counts.mapValues { (_, count) -> count.toDouble() / classified }.toMutableMap()
    profile["coverage"] = opaque.toDouble() / (SAMPLE_SIZE * SAMPLE_SIZE)
    profile["maskUsed"] = if (usesAlphaMask) 1.0 else 0.0

    return profile
  }

  private fun colorFamily(red: Double, green: Double, blue: Double): String? {
    val maxValue = max(red, max(green, blue))
    val minValue = min(red, min(green, blue))
    val delta = maxValue - minValue
    val saturation = if (maxValue <= 0) 0.0 else delta / maxValue

    var hue = 0.0
    if (delta > 0) {
      hue = when (maxValue) {
        red -> ((green - blue) / delta) % 6
        green -> (blue - red) / delta + 2
        else -> (red - green) / delta + 4
      } * 60
      if (hue < 0) {
        hue += 360
      }
    }

    val isWarmHue = hue in 10.0..55.0

    return when {
      maxValue < 0.2 -> "black"
      saturation < 0.16 && maxValue > 0.8 -> "white"
      saturation < 0.18 -> "gray"
      isWarmHue && (saturation >= 0.32 || maxValue >= 0.65) && maxValue >= 0.45 -> "orange"
      isWarmHue -> "brown"
      else -> null
    }
  }

  // MARK: - 파일

  private fun cacheDirectory(): File {
    val context = appContext.reactContext ?: throw ContextUnavailableException()
    return File(context.cacheDir, "cat-vision").apply { mkdirs() }
  }

  private fun writePng(bitmap: Bitmap): File {
    val file = File(cacheDirectory(), "cat-cutout-${UUID.randomUUID()}.png")
    FileOutputStream(file).use { bitmap.compress(Bitmap.CompressFormat.PNG, 100, it) }

    return file
  }

  private companion object {
    const val MAX_DIMENSION = 2048
    const val SAMPLE_SIZE = 64

    /** 잘라낼 때 경계 상자 바깥으로 남기는 여백 비율. 수염과 귀 끝이 잘리지 않게 한다. */
    const val CROP_PADDING_RATIO = 0.18f
    const val CAT_CONFIDENCE_THRESHOLD = 0.3f
    const val PROCESS_TIMEOUT_SECONDS = 30L
    const val MODEL_INSTALL_TIMEOUT_SECONDS = 120L
  }
}

private class ImageLoadException : CodedException("이미지를 불러오지 못했어요.")

private class UnsupportedUriException : CodedException("로컬 파일 이미지만 처리할 수 있어요.")

private class ContextUnavailableException : CodedException("앱 컨텍스트를 사용할 수 없어요.")
