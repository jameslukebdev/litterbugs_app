import { Alert, Linking } from 'react-native';
import Constants from 'expo-constants';

export async function openSupport() {
  const version = Constants.expoConfig?.version || 'Unknown';
  try {
    await Linking.openURL(`mailto:support@litterbugs.app?subject=${encodeURIComponent('Litterbugs help')}&body=${encodeURIComponent(`App version: ${version}\n\nHow can we help?\n`)}`);
  } catch {
    Alert.alert('Get help', 'Email support@litterbugs.app and describe what happened.');
  }
}
