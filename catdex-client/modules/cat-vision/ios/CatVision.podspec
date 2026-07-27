Pod::Spec.new do |s|
  s.name           = 'CatVision'
  s.version        = '1.0.0'
  s.summary        = 'On-device cat detection and cutout'
  s.description    = 'On-device cat detection and cutout'
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
