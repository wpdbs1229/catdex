package expo.modules.camerazoom

import android.content.Context
import android.hardware.camera2.CameraCharacteristics
import android.hardware.camera2.CameraManager
import android.os.Build
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

// expo-camera의 zoom prop은 0~1 정규화 값이라, 이 값이 실제 몇 배인지 JS에서 알 수 없다.
// 배율 칩에 "2x" 같은 라벨을 정확히 붙이려면 기기의 최대 배율이 필요해서 여기서 조회한다.
//
// Android expo-camera는 zoomRatio = max(1, min(maxZoomRatio, zoom * maxZoomRatio))로 적용한다.
// (expo-camera/android/.../ExpoCameraView.kt setCameraZoom 참고)
// 따라서 매핑은 linear이고, 1배 아래(초광각)로는 내려갈 수 없다.
class CameraZoomModule : Module() {
  override fun definition() = ModuleDefinition {
    Name("CameraZoom")

    AsyncFunction("getZoomCapabilities") { facing: String ->
      val lensFacing = if (facing == "front") {
        CameraCharacteristics.LENS_FACING_FRONT
      } else {
        CameraCharacteristics.LENS_FACING_BACK
      }

      val maxFactor = maxZoomRatio(lensFacing)

      mapOf(
        "available" to (maxFactor != null),
        "minFactor" to 1.0,
        "maxFactor" to (maxFactor?.toDouble() ?: 1.0),
        "mapping" to "linear"
      )
    }
  }

  private fun maxZoomRatio(lensFacing: Int): Float? {
    val context = appContext.reactContext ?: return null
    val manager = context.getSystemService(Context.CAMERA_SERVICE) as? CameraManager ?: return null

    return try {
      manager.cameraIdList
        .asSequence()
        .map { manager.getCameraCharacteristics(it) }
        .firstOrNull { it.get(CameraCharacteristics.LENS_FACING) == lensFacing }
        ?.let { characteristics ->
          if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
            characteristics.get(CameraCharacteristics.CONTROL_ZOOM_RATIO_RANGE)?.upper
          } else {
            null
          } ?: characteristics.get(CameraCharacteristics.SCALER_AVAILABLE_MAX_DIGITAL_ZOOM)
        }
    } catch (error: Exception) {
      null
    }
  }
}
