Pod::Spec.new do |s|
  s.name           = 'CameraZoom'
  s.version        = '1.0.0'
  s.summary        = 'Camera zoom capability lookup'
  s.description    = 'Camera zoom capability lookup'
  s.license        = 'MIT'
  s.author         = 'Catdex'
  s.homepage       = 'https://github.com/wpdbs1229/catdex'
  s.platforms      = { :ios => '15.1' }
  s.swift_version  = '5.9'
  s.source         = { :git => 'https://github.com/wpdbs1229/catdex.git' }
  s.static_framework = true

  s.dependency 'ExpoModulesCore'

  s.source_files = '**/*.{h,m,mm,swift}'
  s.pod_target_xcconfig = {
    'DEFINES_MODULE' => 'YES',
    'SWIFT_COMPILATION_MODE' => 'wholemodule'
  }
end
