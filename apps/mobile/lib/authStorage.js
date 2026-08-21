import 'react-native-get-random-values';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import * as aesjs from 'aes-js';

const ENCRYPTION_KEY_SUFFIX = '.encryption-key';

class SecureSessionStorage {
  encryptionKeyName(key) {
    return `${key}${ENCRYPTION_KEY_SUFFIX}`;
  }

  async encrypt(key, value) {
    const encryptionKey = crypto.getRandomValues(new Uint8Array(32));
    const cipher = new aesjs.ModeOfOperation.ctr(
      encryptionKey,
      new aesjs.Counter(1)
    );
    const encryptedValue = aesjs.utils.hex.fromBytes(
      cipher.encrypt(aesjs.utils.utf8.toBytes(value))
    );

    await SecureStore.setItemAsync(
      this.encryptionKeyName(key),
      aesjs.utils.hex.fromBytes(encryptionKey)
    );

    return encryptedValue;
  }

  async decrypt(key, encryptedValue) {
    const encryptionKey = await SecureStore.getItemAsync(
      this.encryptionKeyName(key)
    );
    if (!encryptionKey) return null;

    const cipher = new aesjs.ModeOfOperation.ctr(
      aesjs.utils.hex.toBytes(encryptionKey),
      new aesjs.Counter(1)
    );

    return aesjs.utils.utf8.fromBytes(
      cipher.decrypt(aesjs.utils.hex.toBytes(encryptedValue))
    );
  }

  async getItem(key) {
    const encryptedValue = await AsyncStorage.getItem(key);
    if (encryptedValue) return this.decrypt(key, encryptedValue);

    // Support sessions stored directly in SecureStore.
    const secureStoreValue = await SecureStore.getItemAsync(key);
    if (!secureStoreValue) return null;

    await this.setItem(key, secureStoreValue);
    await SecureStore.deleteItemAsync(key);
    return secureStoreValue;
  }

  async setItem(key, value) {
    const encryptedValue = await this.encrypt(key, value);
    await AsyncStorage.setItem(key, encryptedValue);
  }

  async removeItem(key) {
    await Promise.all([
      AsyncStorage.removeItem(key),
      SecureStore.deleteItemAsync(this.encryptionKeyName(key)),
      SecureStore.deleteItemAsync(key),
    ]);
  }
}

export const authStorage = new SecureSessionStorage();
