const { withAndroidManifest, AndroidConfig } = require('expo/config-plugins');

// ML Kit 모델(주제 분할, 이미지 라벨링) 자동 다운로드 meta-data를 앱 매니페스트에
// 주입한다. expo-dev-launcher도 같은 키(barcode_ui)를 선언하므로, 라이브러리
// 매니페스트가 아니라 앱 매니페스트에서 tools:replace로 값을 합쳐 교체해야 한다.
const MLKIT_DEPENDENCIES_KEY = 'com.google.mlkit.vision.DEPENDENCIES';
const MLKIT_DEPENDENCIES_VALUE = 'barcode_ui,ica,subject_segment';

module.exports = function withMlkitDependencies(config) {
  return withAndroidManifest(config, (modConfig) => {
    const manifest = modConfig.modResults;
    manifest.manifest.$ = {
      ...manifest.manifest.$,
      'xmlns:tools': 'http://schemas.android.com/tools',
    };

    const application = AndroidConfig.Manifest.getMainApplicationOrThrow(manifest);
    const metaData = (application['meta-data'] ?? []).filter(
      (entry) => entry.$['android:name'] !== MLKIT_DEPENDENCIES_KEY,
    );

    metaData.push({
      $: {
        'android:name': MLKIT_DEPENDENCIES_KEY,
        'android:value': MLKIT_DEPENDENCIES_VALUE,
        'tools:replace': 'android:value',
      },
    });

    application['meta-data'] = metaData;
    return modConfig;
  });
};
