package expo.modules.catvision

import android.content.Context
import android.graphics.Bitmap
import android.graphics.BitmapFactory
import android.graphics.Color
import android.graphics.Matrix
import androidx.exifinterface.media.ExifInterface
import com.google.mlkit.vision.common.InputImage
import com.google.mlkit.vision.label.ImageLabeling
import com.google.mlkit.vision.label.defaults.ImageLabelerOptions
import com.google.mlkit.vision.segmentation.subject.SubjectSegmentation
import com.google.mlkit.vision.segmentation.subject.SubjectSegmenterOptions
import expo.modules.kotlin.exception.CodedException
import expo.modules.kotlin.functions.Coroutine
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import kotlinx.coroutines.tasks.await
import java.io.File
import java.io.FileOutputStream
import java.util.UUID
import kotlin.math.max
import kotlin.math.min

// iOS CatVisionModule과 동일한 결과 구조를 반환하는 Android 구현.
// - 고양이 탐지: ML Kit 이미지 라벨링 ("Cat" 라벨)
// - 누끼: ML Kit Subject Segmentation (가장 큰 피사체)
// - 털색 프로파일: 누끼 픽셀 색 분포 (iOS와 같은 규칙)
// - 임베딩: 아직 없음(빈 배열) — 추후 양 플랫폼 공통 TFLite 모델로 통일 예정
class CatVisionModule : Module() {
  override fun definition() = ModuleDefinition {
    Name("CatVision")

    AsyncFunction("processCatPhoto") Coroutine { imageUri: String ->
      processCatPhoto(imageUri)
    }
  }

  private suspend fun processCatPhoto(imageUri: String): Map<String, Any?> {
    val context = appContext.reactContext
      ?: throw CodedException("CatVision", "앱 컨텍스트를 사용할 수 없어요.", null)

    val sourceBitmap = try {
      loadOrientedBitmap(normalizePath(imageUri))
    } catch (error: Exception) {
      throw CodedException("CatVision", "이미지를 불러오지 못했어요.", error)
    } ?: throw CodedException("CatVision", "이미지를 디코딩하지 못했어요.", null)

    val inputImage = InputImage.fromBitmap(sourceBitmap, 0)
    val catConfidence = detectCatConfidence(inputImage)

    if (catConfidence == null) {
      return mapOf(
        "hasCat" to false,
        "confidence" to 0.0,
        "boundingBox" to null,
        "cutoutImageUri" to null,
        "featureVector" to emptyList<Double>(),
        "isPreciseCutout" to false,
        "colorProfile" to emptyMap<String, Double>(),
        "embedding" to emptyList<Double>(),
        "embeddingVersion" to null
      )
    }

    val cutout = makeCutout(context, inputImage, sourceBitmap)
    val boundingBox = cutout.boundingBox
    val imageWidth = sourceBitmap.width.toDouble()
    val imageHeight = sourceBitmap.height.toDouble()
    val boxWidth = boundingBox["width"] ?: 1.0
    val boxHeight = boundingBox["height"] ?: 1.0

    return mapOf(
      "hasCat" to true,
      "confidence" to catConfidence,
      "boundingBox" to boundingBox,
      "cutoutImageUri" to cutout.fileUri,
      // iOS featureVector와 같은 의미의 메타 벡터
      "featureVector" to listOf(
        catConfidence,
        boxWidth,
        boxHeight,
        boxWidth / max(boxHeight, 0.001),
        boxWidth * boxHeight,
        imageWidth / 1000.0,
        imageHeight / 1000.0
      ),
      "isPreciseCutout" to cutout.isPrecise,
      "colorProfile" to coatColorProfile(cutout.bitmap, cutout.isPrecise),
      "embedding" to emptyList<Double>(),
      "embeddingVersion" to null
    )
  }

  private fun normalizePath(imageUri: String): String {
    return imageUri.removePrefix("file://")
  }

  /** EXIF 회전을 반영해 비트맵을 로드한다. */
  private fun loadOrientedBitmap(path: String): Bitmap? {
    val bitmap = BitmapFactory.decodeFile(path) ?: return null
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
      else -> return bitmap
    }

    return Bitmap.createBitmap(bitmap, 0, 0, bitmap.width, bitmap.height, matrix, true)
  }

  /** "Cat" 라벨 신뢰도. 고양이가 없으면 null. */
  private suspend fun detectCatConfidence(inputImage: InputImage): Double? {
    val labeler = ImageLabeling.getClient(ImageLabelerOptions.DEFAULT_OPTIONS)

    val labels = try {
      labeler.process(inputImage).await()
    } catch (error: Exception) {
      throw CodedException("CatVision", "이미지 분석 모델을 사용할 수 없어요. 잠시 후 다시 시도해 주세요.", error)
    } finally {
      labeler.close()
    }

    return labels
      .firstOrNull { it.text.equals("Cat", ignoreCase = true) && it.confidence >= 0.55f }
      ?.confidence
      ?.toDouble()
  }

  private data class CutoutResult(
    val fileUri: String,
    val bitmap: Bitmap,
    val boundingBox: Map<String, Double>,
    val isPrecise: Boolean,
  )

  /** 가장 큰 피사체를 배경 제거(누끼)해 PNG로 저장한다. 실패하면 원본 사용. */
  private suspend fun makeCutout(context: Context, inputImage: InputImage, sourceBitmap: Bitmap): CutoutResult {
    val imageWidth = sourceBitmap.width.toDouble()
    val imageHeight = sourceBitmap.height.toDouble()

    try {
      val segmenter = SubjectSegmentation.getClient(
        SubjectSegmenterOptions.Builder()
          .enableMultipleSubjects(
            SubjectSegmenterOptions.SubjectResultOptions.Builder()
              .enableSubjectBitmap()
              .build()
          )
          .build()
      )

      val result = try {
        segmenter.process(inputImage).await()
      } finally {
        segmenter.close()
      }

      val subject = result.subjects.maxByOrNull { it.width * it.height }
      val subjectBitmap = subject?.bitmap

      if (subject != null && subjectBitmap != null) {
        val fileUri = saveBitmap(context, subjectBitmap)

        return CutoutResult(
          fileUri = fileUri,
          bitmap = subjectBitmap,
          boundingBox = mapOf(
            "x" to subject.startX / imageWidth,
            "y" to subject.startY / imageHeight,
            "width" to subject.width / imageWidth,
            "height" to subject.height / imageHeight
          ),
          isPrecise = true,
        )
      }
    } catch (error: Exception) {
      // 분할 모델 미설치 등 — 원본 크롭으로 계속 진행한다.
    }

    val fileUri = saveBitmap(context, sourceBitmap)

    return CutoutResult(
      fileUri = fileUri,
      bitmap = sourceBitmap,
      boundingBox = mapOf("x" to 0.0, "y" to 0.0, "width" to 1.0, "height" to 1.0),
      isPrecise = false,
    )
  }

  private fun saveBitmap(context: Context, bitmap: Bitmap): String {
    val directory = File(context.cacheDir, "cat-vision").apply { mkdirs() }
    val file = File(directory, "cat-cutout-${UUID.randomUUID()}.png")

    FileOutputStream(file).use { stream ->
      bitmap.compress(Bitmap.CompressFormat.PNG, 100, stream)
    }

    return "file://${file.absolutePath}"
  }

  /** iOS coatColorProfile과 동일한 규칙의 색 분포 계산. */
  private fun coatColorProfile(bitmap: Bitmap, usesAlphaMask: Boolean): Map<String, Double> {
    val sampleSize = 64
    val scaled = Bitmap.createScaledBitmap(bitmap, sampleSize, sampleSize, true)
    val pixels = IntArray(sampleSize * sampleSize)
    scaled.getPixels(pixels, 0, sampleSize, 0, 0, sampleSize, sampleSize)

    val counts = mutableMapOf("black" to 0, "white" to 0, "gray" to 0, "orange" to 0, "brown" to 0)
    var classified = 0
    var opaque = 0

    for (pixel in pixels) {
      val alpha = Color.alpha(pixel) / 255.0

      if (alpha < 0.5) {
        continue
      }

      opaque += 1

      val red = Color.red(pixel) / 255.0
      val green = Color.green(pixel) / 255.0
      val blue = Color.blue(pixel) / 255.0

      val maxValue = max(red, max(green, blue))
      val minValue = min(red, min(green, blue))
      val delta = maxValue - minValue
      val value = maxValue
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

      val family = when {
        value < 0.2 -> "black"
        saturation < 0.16 && value > 0.8 -> "white"
        saturation < 0.18 -> "gray"
        isWarmHue && (saturation >= 0.32 || value >= 0.65) && value >= 0.45 -> "orange"
        isWarmHue -> "brown"
        else -> null
      }

      if (family != null) {
        counts[family] = (counts[family] ?: 0) + 1
        classified += 1
      }
    }

    if (classified <= 32) {
      return emptyMap()
    }

    val profile = mutableMapOf<String, Double>()
    for ((family, count) in counts) {
      profile[family] = count.toDouble() / classified
    }
    profile["coverage"] = opaque.toDouble() / (sampleSize * sampleSize)
    profile["maskUsed"] = if (usesAlphaMask) 1.0 else 0.0

    return profile
  }
}
