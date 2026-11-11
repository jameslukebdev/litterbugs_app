import { Alert, Linking, Platform } from 'react-native';

import { CLEANUP_NAVIGATION_SAFETY_REMINDER, cleanupNavigationUrls } from './cleanupNavigation';

// Moved out of MapScreen unchanged.
const openExternalMap = async (preferredUrl, fallbackUrl) => {
  try {
    const supported = await Linking.canOpenURL(preferredUrl);
    await Linking.openURL(supported ? preferredUrl : fallbackUrl);
  } catch (error) {
    console.log('Cleanup navigation error:', error);

    try {
      await Linking.openURL(fallbackUrl);
    } catch (fallbackError) {
      console.log('Cleanup navigation fallback error:', fallbackError);
      Alert.alert('Unable to open maps', 'Try opening the report location in your maps app.');
    }
  }
};

// Asks which maps app to use (with the safety reminder), then opens directions.
export function promptCleanupNavigation(report) {
  const urls = cleanupNavigationUrls(report);

  if (!urls) {
    Alert.alert('Location unavailable', 'This report does not have a valid cleanup location.');
    return;
  }

  if (Platform.OS === 'ios') {
    Alert.alert(
      'Navigate to Cleanup',
      CLEANUP_NAVIGATION_SAFETY_REMINDER,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Apple Maps',
          onPress: () => openExternalMap(urls.apple, urls.google),
        },
        {
          text: 'Google Maps',
          onPress: () => openExternalMap(urls.google, urls.google),
        },
      ]
    );
    return;
  }

  Alert.alert(
    'Navigate to Cleanup',
    CLEANUP_NAVIGATION_SAFETY_REMINDER,
    [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Open Maps',
        onPress: () => openExternalMap(urls.android, urls.google),
      },
    ]
  );
}
