const GOOGLE_CLIENT_SUFFIX = '.apps.googleusercontent.com';
const REPORT_LINK_HOST = 'litterbugs.app';
const REPORT_LINK_PATH_PREFIX = '/reports/';

const toGoogleUrlScheme = (clientId) => {
  if (!clientId?.endsWith(GOOGLE_CLIENT_SUFFIX)) return null;
  return clientId.split('.').reverse().join('.');
};

module.exports = ({ config }) => {
  const appVariant = process.env.APP_VARIANT || 'local';
  const isProduction = appVariant === 'production';
  const buildPlatform = process.env.EAS_BUILD_PLATFORM;
  const isIosBuild = buildPlatform === 'ios';
  const isAndroidBuild = buildPlatform === 'android';
  const shouldConfigureIos = isIosBuild || !buildPlatform;
  const shouldConfigureAndroid = isAndroidBuild || !buildPlatform;
  const appName = isAndroidBuild && !isProduction
    ? 'Litterbugs QA'
    : config.name;
  const iosBundleIdentifier = isProduction
    ? config.ios?.bundleIdentifier
    : process.env.IOS_BUNDLE_IDENTIFIER || config.ios?.bundleIdentifier;
  const expectedAndroidPackage = isProduction
    ? config.android?.package
    : 'com.litterbugs.app.qa';
  const androidPackage = process.env.ANDROID_PACKAGE_IDENTIFIER
    || expectedAndroidPackage;
  const googleMapsAndroidApiKey = shouldConfigureAndroid
    ? process.env.GOOGLE_MAPS_ANDROID_API_KEY
    : undefined;
  const androidBlockedPermissions = isAndroidBuild && isProduction
    ? [
      ...(config.android?.blockedPermissions || []),
      'android.permission.RECORD_AUDIO',
      'android.permission.SYSTEM_ALERT_WINDOW',
    ]
    : config.android?.blockedPermissions;
  const googleIosClientId = process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID;
  const googleIosClientBundleId = process.env.GOOGLE_IOS_CLIENT_BUNDLE_ID;
  const googleUrlScheme = toGoogleUrlScheme(googleIosClientId);
  const stripeApplePayEnabled = process.env.ENABLE_APPLE_PAY === 'true';
  const iosAssociatedDomainsEnabled = process.env.ENABLE_IOS_ASSOCIATED_DOMAINS !== 'false';
  const stripeAppleMerchantIdentifier = stripeApplePayEnabled
    ? process.env.STRIPE_APPLE_MERCHANT_IDENTIFIER
    : undefined;
  if (stripeApplePayEnabled && !stripeAppleMerchantIdentifier) {
    throw new Error('STRIPE_APPLE_MERCHANT_IDENTIFIER is required when ENABLE_APPLE_PAY=true.');
  }
  const plugins = [...(config.plugins || [])];
  if (!plugins.some((plugin) => (
    plugin === 'expo-build-properties'
    || (Array.isArray(plugin) && plugin[0] === 'expo-build-properties')
  ))) {
    plugins.push([
      'expo-build-properties',
      {
        ios: {
          buildReactNativeFromSource: true,
        },
      },
    ]);
  }
  if (!plugins.includes('./plugins/with-ios-fmt-xcode26-fix')) {
    plugins.push('./plugins/with-ios-fmt-xcode26-fix');
  }
  if (!plugins.some((plugin) => (
    plugin === '@stripe/stripe-react-native'
    || (Array.isArray(plugin) && plugin[0] === '@stripe/stripe-react-native')
  ))) {
    plugins.push([
      '@stripe/stripe-react-native',
      {
        ...(stripeApplePayEnabled ? {
          merchantIdentifier: stripeAppleMerchantIdentifier,
        } : {}),
        enableGooglePay: true,
      },
    ]);
  }

  // EAS evaluates this file once before it loads the selected remote
  // environment. Validate on the worker, where every sensitive build value is
  // available, and in explicit local build simulations.
  const isConfiguredBuild = process.env.EAS_BUILD === 'true';
  const reportAssociatedDomain = `applinks:${REPORT_LINK_HOST}`;
  const configuredAssociatedDomains = (config.ios?.associatedDomains || [])
    .filter((domain) => domain !== reportAssociatedDomain);
  const associatedDomains = isProduction && iosAssociatedDomainsEnabled
    ? [...new Set([...configuredAssociatedDomains, reportAssociatedDomain])]
    : configuredAssociatedDomains.length > 0 ? configuredAssociatedDomains : undefined;
  const reportIntentFilter = {
    action: 'VIEW',
    autoVerify: true,
    data: [{
      scheme: 'https',
      host: REPORT_LINK_HOST,
      pathPrefix: REPORT_LINK_PATH_PREFIX,
    }],
    category: ['BROWSABLE', 'DEFAULT'],
  };
  const androidIntentFilters = isProduction
    ? [
      ...(config.android?.intentFilters || []).filter((filter) => (
        !filter.data?.some((entry) => (
          entry.host === REPORT_LINK_HOST
          && entry.pathPrefix === REPORT_LINK_PATH_PREFIX
        ))
      )),
      reportIntentFilter,
    ]
    : config.android?.intentFilters;

  if (isConfiguredBuild) {
    const requiredBuildValues = {
      EXPO_PUBLIC_SUPABASE_URL: process.env.EXPO_PUBLIC_SUPABASE_URL,
      EXPO_PUBLIC_SUPABASE_ANON_KEY: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY,
      ...(isIosBuild ? {
        EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID,
        EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID: googleIosClientId,
        GOOGLE_IOS_CLIENT_BUNDLE_ID: googleIosClientBundleId,
      } : {}),
      ...(isAndroidBuild ? {
        GOOGLE_MAPS_ANDROID_API_KEY: googleMapsAndroidApiKey,
        ANDROID_PACKAGE_IDENTIFIER: process.env.ANDROID_PACKAGE_IDENTIFIER,
      } : {}),
    };
    const missingValues = Object.entries(requiredBuildValues)
      .filter(([, value]) => !value)
      .map(([name]) => name);

    if (missingValues.length) {
      throw new Error(
        `Missing EAS auth configuration: ${missingValues.join(', ')}`
      );
    }

    if (isIosBuild && googleIosClientBundleId !== iosBundleIdentifier) {
      throw new Error(
        `Google iOS client is for ${googleIosClientBundleId}, not ${iosBundleIdentifier}.`
      );
    }

    if (isAndroidBuild && androidPackage !== expectedAndroidPackage) {
      throw new Error(
        `Android package is ${androidPackage}, not ${expectedAndroidPackage}.`
      );
    }
  }

  if (shouldConfigureIos && googleUrlScheme) {
    plugins.push([
      '@react-native-google-signin/google-signin',
      { iosUrlScheme: googleUrlScheme },
    ]);
  }

  return {
    ...config,
    name: appName,
    ios: {
      ...config.ios,
      bundleIdentifier: iosBundleIdentifier,
      ...(associatedDomains ? { associatedDomains } : {}),
    },
    android: {
      ...config.android,
      package: androidPackage,
      ...(androidBlockedPermissions ? {
        blockedPermissions: [...new Set(androidBlockedPermissions)],
      } : {}),
      ...(androidIntentFilters ? { intentFilters: androidIntentFilters } : {}),
      config: {
        ...config.android?.config,
        ...(googleMapsAndroidApiKey ? {
          googleMaps: { apiKey: googleMapsAndroidApiKey },
        } : {}),
      },
    },
    extra: {
      ...config.extra,
      stripeApplePayEnabled,
      ...(stripeAppleMerchantIdentifier ? { stripeAppleMerchantIdentifier } : {}),
    },
    plugins,
  };
};
