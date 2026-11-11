import { Alert, Linking } from 'react-native';

// System alerts the map shows before an action can continue (moved out of MapScreen unchanged).

export const showPermanentAccountRequired = () => {
  Alert.alert(
    'Account required',
    'Sign in with email, Google, or Facebook to create and manage reports.'
  );
};

export const showLocationSettingsAlert = (message) => {
  Alert.alert(
    'Location Access Needed',
    `${message} You can turn location access on in Settings.`,
    [
      { text: 'Not now', style: 'cancel' },
      {
        text: 'Open Settings',
        onPress: () => Linking.openSettings().catch((error) => {
          console.log('Open location settings error:', error);
        }),
      },
    ]
  );
};
