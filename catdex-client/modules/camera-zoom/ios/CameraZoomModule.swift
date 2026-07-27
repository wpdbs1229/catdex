import AVFoundation
import ExpoModulesCore

// expo-camera의 zoom prop은 0~1 정규화 값이라, 이 값이 실제 몇 배인지 JS에서 알 수 없다.
// 배율 칩에 "2x" 같은 라벨을 정확히 붙이려면 기기의 최대 배율이 필요해서 여기서 조회한다.
//
// iOS expo-camera는 videoZoomFactor = pow(activeFormat.videoMaxZoomFactor, zoom)으로 적용한다.
// (expo-camera/ios/Current/CameraSessionManager.swift updateZoom 참고)
// 따라서 매핑은 exponential이고, 최소 배율은 항상 1이다.
public class CameraZoomModule: Module {
  public func definition() -> ModuleDefinition {
    Name("CameraZoom")

    AsyncFunction("getZoomCapabilities") { (facing: String) -> [String: Any] in
      let position: AVCaptureDevice.Position = facing == "front" ? .front : .back

      guard let device = defaultDevice(for: position) else {
        return ["available": false, "minFactor": 1.0, "maxFactor": 1.0, "mapping": "exponential"]
      }

      return [
        "available": true,
        "minFactor": 1.0,
        "maxFactor": Double(device.activeFormat.videoMaxZoomFactor),
        "mapping": "exponential"
      ]
    }
  }

  /// expo-camera가 고르는 기기와 최대한 같은 것을 고른다.
  /// (expo-camera/ios/Common/DeviceDiscovery.swift defaultBackCamera 참고)
  private func defaultDevice(for position: AVCaptureDevice.Position) -> AVCaptureDevice? {
    if position == .back {
      if #available(iOS 17.0, *), let preferred = AVCaptureDevice.systemPreferredCamera, preferred.position == .back {
        return preferred
      }

      if let standard = AVCaptureDevice.default(for: .video), standard.position == .back {
        return standard
      }
    }

    return AVCaptureDevice.default(.builtInWideAngleCamera, for: .video, position: position)
  }
}
