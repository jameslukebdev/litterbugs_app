import 'react-native-get-random-values';
import * as Crypto from 'expo-crypto';
import {
  GoogleSignin,
  isCancelledResponse,
} from '@react-native-google-signin/google-signin';

import { supabase } from './supabase';

const GOOGLE_WEB_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID;
const GOOGLE_IOS_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID;

let googleConfigured = false;

const requireConfiguration = (value, provider) => {
  if (!value) throw new Error(`${provider} sign in is temporarily unavailable. Please choose another sign-in method.`);
  return value;
};

const configureGoogle = () => {
  if (googleConfigured) return;

  GoogleSignin.configure({
    webClientId: requireConfiguration(GOOGLE_WEB_CLIENT_ID, 'Google'),
    iosClientId: requireConfiguration(GOOGLE_IOS_CLIENT_ID, 'Google'),
  });
  googleConfigured = true;
};

const createNonce = () => Array.from(
  crypto.getRandomValues(new Uint8Array(32)),
  (byte) => byte.toString(16).padStart(2, '0')
).join('');

const signInWithGoogle = async () => {
  configureGoogle();

  const nonce = createNonce();
  const hashedNonce = await Crypto.digestStringAsync(
    Crypto.CryptoDigestAlgorithm.SHA256,
    nonce
  );
  const response = await GoogleSignin.signIn({ nonce: hashedNonce });
  if (isCancelledResponse(response)) return { cancelled: true };

  const idToken = response.data.idToken;
  if (!idToken) {
    throw new Error('Google sign-in didn’t finish. Please try again.');
  }

  const { accessToken } = await GoogleSignin.getTokens();
  const { error } = await supabase.auth.signInWithIdToken({
    provider: 'google',
    token: idToken,
    access_token: accessToken,
    nonce,
  });

  if (error) throw error;
  return { cancelled: false };
};

const nativeSignIn = {
  google: signInWithGoogle,
};

export const signInWithNativeProvider = async (provider) =>
  nativeSignIn[provider]?.() ?? null;

export const clearNativeProviderSessions = async () => {
  if (!GOOGLE_WEB_CLIENT_ID || !GOOGLE_IOS_CLIENT_ID) return;
  configureGoogle();
  await GoogleSignin.signOut();
};
