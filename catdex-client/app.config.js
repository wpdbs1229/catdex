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

function isLocalDevelopmentRedirectUri(redirectUri) {
  return (
    redirectUri.startsWith('http://localhost') ||
    redirectUri.startsWith('http://127.0.0.1') ||
    redirectUri.startsWith('exp://localhost') ||
    redirectUri.startsWith('exp://127.0.0.1')
  );
}

function resolveOAuthRedirectUri(variantConfig) {
  const configuredRedirectUri = process.env.EXPO_PUBLIC_OAUTH_REDIRECT_URI?.trim();
  const defaultRedirectUri = `${variantConfig.scheme}://auth/callback`;

  if (!configuredRedirectUri) {
    return defaultRedirectUri;
  }

  if (configuredRedirectUri.startsWith(`${variantConfig.scheme}://`) || isLocalDevelopmentRedirectUri(configuredRedirectUri)) {
    return configuredRedirectUri;
  }

  return defaultRedirectUri;
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

module.exports = ({ config } = {}) => {
  const expo = config ?? baseConfig.expo;
  const appVariant = resolveAppVariant();
  const variantConfig = appVariants[appVariant];
  const oauthRedirectUri = resolveOAuthRedirectUri(variantConfig);

  return {
    ...expo,
    name: variantConfig.name,
    scheme: variantConfig.scheme,
    ios: {
      ...expo.ios,
      bundleIdentifier: variantConfig.iosBundleIdentifier,
      infoPlist: {
        ...expo.ios?.infoPlist,
        UIBackgroundModes: [
          ...new Set([
            ...(expo.ios?.infoPlist?.UIBackgroundModes ?? []),
            'fetch',
            'remote-notification',
          ]),
        ],
      },
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
