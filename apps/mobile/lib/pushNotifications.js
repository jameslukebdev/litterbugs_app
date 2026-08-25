import { Platform } from 'react-native';
import Constants from 'expo-constants';
import * as Crypto from 'expo-crypto';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import * as SecureStore from 'expo-secure-store';

import { supabase } from './supabase';

const INSTALLATION_ID_KEY = 'litterbugs.push.installation-id';
const CLEANUP_NOTIFICATION_CHANNEL = 'cleanup-updates';
let installationIdPromise = null;
let pushRegistrationQueue = Promise.resolve();

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

const getInstallationId = () => {
  if (!installationIdPromise) {
    installationIdPromise = (async () => {
      const existing = await SecureStore.getItemAsync(INSTALLATION_ID_KEY);
      if (existing) return existing;

      const created = Crypto.randomUUID();
      await SecureStore.setItemAsync(INSTALLATION_ID_KEY, created);
      return created;
    })().catch((error) => {
      installationIdPromise = null;
      throw error;
    });
  }

  return installationIdPromise;
};

const configureAndroidChannel = async () => {
  if (Platform.OS !== 'android') return;
  await Notifications.setNotificationChannelAsync(
    CLEANUP_NOTIFICATION_CHANNEL,
    {
      name: 'Cleanup updates',
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#2F7D32',
    }
  );
};

const expoProjectId = () => (
  Constants.expoConfig?.extra?.eas?.projectId
  ?? Constants.easConfig?.projectId
  ?? null
);

const saveExpoPushToken = async (expoPushToken) => {
  const installationId = await getInstallationId();
  const { error } = await supabase.rpc('register_push_device', {
    target_installation_id: installationId,
    target_expo_push_token: expoPushToken,
    target_platform: Platform.OS,
  });
  if (error) throw error;
};

const performPushRegistration = async (devicePushToken) => {
  if (!Device.isDevice || !['ios', 'android'].includes(Platform.OS)) {
    return { status: 'unsupported' };
  }

  await configureAndroidChannel();
  const existingPermission = await Notifications.getPermissionsAsync();
  const permission = existingPermission.status === 'undetermined'
    ? await Notifications.requestPermissionsAsync()
    : existingPermission;
  if (!permission.granted) return { status: 'denied' };

  const projectId = expoProjectId();
  if (!projectId) throw new Error('Expo project ID is unavailable.');

  const token = await Notifications.getExpoPushTokenAsync({
    projectId,
    ...(devicePushToken ? { devicePushToken } : {}),
  });
  await saveExpoPushToken(token.data);
  return { status: 'registered', token: token.data };
};

export function registerCleanupPushDevice(devicePushToken = null) {
  const registration = pushRegistrationQueue
    .catch(() => undefined)
    .then(() => performPushRegistration(devicePushToken));
  pushRegistrationQueue = registration;
  return registration;
}

export function subscribeToPushTokenChanges() {
  return Notifications.addPushTokenListener((devicePushToken) => {
    registerCleanupPushDevice(devicePushToken).catch((error) => {
      console.log('Cleanup push token refresh error:', error);
    });
  });
}

export async function unregisterCurrentPushDevice() {
  const installationId = await SecureStore.getItemAsync(INSTALLATION_ID_KEY);
  if (!installationId) return false;

  const { data, error } = await supabase.rpc('unregister_push_device', {
    target_installation_id: installationId,
  });
  if (error) throw error;
  return data === true;
}

export const addCleanupNotificationResponseListener = (listener) => (
  Notifications.addNotificationResponseReceivedListener(listener)
);

export const getLastCleanupNotificationResponse = () => (
  Notifications.getLastNotificationResponseAsync()
);

export const clearLastCleanupNotificationResponse = () => (
  Notifications.clearLastNotificationResponseAsync()
);
