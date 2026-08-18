const GOOGLE_CLIENT_SUFFIX = '.apps.googleusercontent.com';

const toGoogleUrlScheme = (clientId) => {
  if (!clientId?.endsWith(GOOGLE_CLIENT_SUFFIX)) return null;
  return clientId.split('.').reverse().join('.');
};

module.exports = ({ config }) => {
  const appVariant = process.env.APP_VARIANT || 'local';
  const isProduction = appVariant === 'production';
  const iosBundleIdentifier = isProduction
    ? config.ios?.bundleIdentifier
    : process.env.IOS_BUNDLE_IDENTIFIER || config.ios?.bundleIdentifier;
  const googleIosClientId = process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID;
  const googleIosClientBundleId = process.env.GOOGLE_IOS_CLIENT_BUNDLE_ID;
  const googleUrlScheme = toGoogleUrlScheme(googleIosClientId);
  const plugins = [...(config.plugins || [])];

  // EAS evaluates this file once before it loads the selected remote
  // environment. Validate on the worker, where every sensitive build value is
  // available, and in explicit local build simulations.
  const isConfiguredBuild = process.env.EAS_BUILD === 'true';

  if (isConfiguredBuild) {
    const requiredBuildValues = {
      EXPO_PUBLIC_SUPABASE_URL: process.env.EXPO_PUBLIC_SUPABASE_URL,
      EXPO_PUBLIC_SUPABASE_ANON_KEY: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY,
      EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID,
      EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID: googleIosClientId,
      GOOGLE_IOS_CLIENT_BUNDLE_ID: googleIosClientBundleId,
    };
    const missingValues = Object.entries(requiredBuildValues)
      .filter(([, value]) => !value)
      .map(([name]) => name);

    if (missingValues.length) {
      throw new Error(
        `Missing EAS auth configuration: ${missingValues.join(', ')}`
      );
    }

    if (googleIosClientBundleId !== iosBundleIdentifier) {
      throw new Error(
        `Google iOS client is for ${googleIosClientBundleId}, not ${iosBundleIdentifier}.`
      );
    }
  }

  if (googleUrlScheme) {
    plugins.push([
      '@react-native-google-signin/google-signin',
      { iosUrlScheme: googleUrlScheme },
    ]);
  }

  return {
    ...config,
    ios: {
      ...config.ios,
      bundleIdentifier: iosBundleIdentifier,
    },
    plugins,
  };
};
