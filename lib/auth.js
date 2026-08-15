import { Platform } from 'react-native';
import * as AppleAuthentication from 'expo-apple-authentication';
import * as WebBrowser from 'expo-web-browser';

import { supabase } from './supabase';

/** @typedef {'google' | 'apple' | 'facebook'} AuthProvider */

export const AUTH_CALLBACK_PATH = 'auth/callback';
export const PASSWORD_RECOVERY_PATH = 'auth/reset-password';
const APP_SCHEME = 'litterbugs';

const handledCallbackUrls = new Set();

const createAppUrl = (path) => `${APP_SCHEME}://${path}`;

export const getAuthRedirectUrl = () => createAppUrl(AUTH_CALLBACK_PATH);
export const getPasswordRecoveryUrl = () => createAppUrl(PASSWORD_RECOVERY_PATH);

const readUrlParams = (url) => {
  const query = url.includes('?') ? url.split('?')[1].split('#')[0] : '';
  const hash = url.includes('#') ? url.split('#')[1] : '';
  const params = new URLSearchParams(query);

  new URLSearchParams(hash).forEach((value, key) => {
    if (!params.has(key)) params.set(key, value);
  });

  return params;
};

export const handleAuthCallbackUrl = async (url) => {
  if (!url || handledCallbackUrls.has(url)) return { handled: false };

  const params = readUrlParams(url);
  const code = params.get('code');
  const accessToken = params.get('access_token');
  const refreshToken = params.get('refresh_token');
  const tokenHash = params.get('token_hash');
  const type = params.get('type');
  const callbackError = params.get('error_description') || params.get('error');

  if (!code && !(accessToken && refreshToken) && !(tokenHash && type) && !callbackError) {
    return { handled: false };
  }

  handledCallbackUrls.add(url);

  try {
    if (callbackError) {
      throw new Error(callbackError.replace(/\+/g, ' '));
    }

    let error;

    if (code) {
      ({ error } = await supabase.auth.exchangeCodeForSession(code));
    } else if (accessToken && refreshToken) {
      ({ error } = await supabase.auth.setSession({
        access_token: accessToken,
        refresh_token: refreshToken,
      }));
    } else {
      ({ error } = await supabase.auth.verifyOtp({
        token_hash: tokenHash,
        type,
      }));
    }

    if (error) throw error;

    return { handled: true, type };
  } catch (error) {
    handledCallbackUrls.delete(url);
    throw error;
  }
};

export const signInWithEmail = (email, password) =>
  supabase.auth.signInWithPassword({ email, password });

export const signUpWithEmail = (email, password) =>
  supabase.auth.signUp({
    email,
    password,
    options: { emailRedirectTo: getAuthRedirectUrl() },
  });

export const resendSignupVerification = (email) =>
  supabase.auth.resend({
    type: 'signup',
    email,
    options: { emailRedirectTo: getAuthRedirectUrl() },
  });

export const sendPasswordRecovery = (email) =>
  supabase.auth.resetPasswordForEmail(email, {
    redirectTo: getPasswordRecoveryUrl(),
  });

const signInWithNativeApple = async () => {
  const available = await AppleAuthentication.isAvailableAsync();
  if (!available) throw new Error('Apple sign in is not available on this device.');

  const credential = await AppleAuthentication.signInAsync({
    requestedScopes: [
      AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
      AppleAuthentication.AppleAuthenticationScope.EMAIL,
    ],
  });

  if (!credential.identityToken) {
    throw new Error('Apple did not return a sign-in token. Please try again.');
  }

  const { error } = await supabase.auth.signInWithIdToken({
    provider: 'apple',
    token: credential.identityToken,
  });

  if (error) throw error;
};

/**
 * Starts an isolated Supabase provider flow. Apple uses the native iOS API;
 * Google, Facebook, and Android Apple use a secure browser session.
 * @param {AuthProvider} provider
 */
export const signInWithProvider = async (provider) => {
  if (provider === 'apple' && Platform.OS === 'ios') {
    await signInWithNativeApple();
    return { cancelled: false };
  }

  const redirectTo = getAuthRedirectUrl();
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider,
    options: {
      redirectTo,
      skipBrowserRedirect: true,
    },
  });

  if (error) throw error;
  if (!data?.url) throw new Error('Unable to start sign in. Please try again.');

  const result = await WebBrowser.openAuthSessionAsync(data.url, redirectTo, {
    preferEphemeralSession: true,
    showInRecents: true,
  });

  if (result.type !== 'success' || !result.url) return { cancelled: true };

  await handleAuthCallbackUrl(result.url);
  return { cancelled: false };
};
