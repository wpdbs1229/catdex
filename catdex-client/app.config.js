const baseConfig = require('./app.json');

const kakaoNativeAppKey =
  process.env.EXPO_PUBLIC_KAKAO_NATIVE_APP_KEY?.trim() ||
  process.env.KAKAO_NATIVE_APP_KEY?.trim() ||
  'fd0a990fa57ac38b31d0c4cb30ba2242';

const appVariants = {
  development: {
    name: '냥도감 Dev',
    scheme: 'catdex-dev',
    iosBundleIdentifier: 'com.persimmontree.catdex.dev',
    androidPackage: 'com.persimmontree.catdex.dev',
  },
  production: {
    name: '냥도감',
    scheme: 'catdex',
    iosBundleIdentifier: 'com.persimmontree.catdex',
    androidPackage: 'com.persimmontree.catdex',
  },
};

function resolveAppVariant() {
  const explicitVariant = process.env.APP_VARIANT?.trim().toLowerCase();

  if (explicitVariant === 'production' || explicitVariant === 'development') {
    return explicitVariant;
  }

  if (process.env.EAS_BUILD_PROFILE === 'production') {
    return 'production';
  }

  return 'development';
}

function withKakaoNativeAppKey(plugins = []) {
  return plugins.map((plugin) => {
    if (!Array.isArray(plugin) || plugin[0] !== '@react-native-kakao/core') {
      return plugin;
    }

    return [
      plugin[0],
      {
        ...plugin[1],
        nativeAppKey: kakaoNativeAppKey,
      },
    ];
  });
}

module.exports = () => {
  const expo = baseConfig.expo;
  const appVariant = resolveAppVariant();
  const variantConfig = appVariants[appVariant];
  const oauthRedirectUri =
    process.env.EXPO_PUBLIC_OAUTH_REDIRECT_URI?.trim() || `${variantConfig.scheme}://auth/callback`;

  return {
    ...expo,
    name: variantConfig.name,
    scheme: variantConfig.scheme,
    ios: {
      ...expo.ios,
      bundleIdentifier: variantConfig.iosBundleIdentifier,
    },
    android: {
      ...expo.android,
      package: variantConfig.androidPackage,
    },
    plugins: withKakaoNativeAppKey(expo.plugins),
    extra: {
      ...expo.extra,
      appVariant,
      appScheme: variantConfig.scheme,
      oauthRedirectUri,
      eas: expo.extra?.eas,
    },
  };
};
