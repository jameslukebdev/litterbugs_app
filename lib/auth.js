import * as WebBrowser from 'expo-web-browser';

import { supabase } from './supabase';
import {
  clearNativeProviderSessions,
  signInWithNativeProvider,
} from './nativeSocialAuth';

/** @typedef {'google' | 'facebook'} AuthProvider */

export const AUTH_CALLBACK_PATH = 'auth/callback';
export const PASSWORD_RECOVERY_PATH = 'auth/reset-password';
const APP_SCHEME = 'litterbugs';
const AUTH_BRIDGE_URL = 'https://auth.litterbugs.app/start';

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

const signInWithBrowserProvider = async (provider) => {
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

  const launchUrl = provider === 'facebook'
    ? `${AUTH_BRIDGE_URL}?target=${encodeURIComponent(data.url)}`
    : data.url;

  const result = await WebBrowser.openAuthSessionAsync(launchUrl, redirectTo, {
    showInRecents: true,
  });

  if (result.type !== 'success' || !result.url) return { cancelled: true };

  await handleAuthCallbackUrl(result.url);
  return { cancelled: false };
};

/**
 * Uses provider-native sign in on iOS. Other platforms retain the existing
 * browser flow until their native provider work is added.
 * @param {AuthProvider} provider
 */
export const signInWithProvider = async (provider) => {
  // Keep Google on its polished native flow. Facebook uses secure browser
  // OAuth because Litterbugs needs identity only, not Meta's native SDK.
  if (provider === 'google') {
    const nativeResult = await signInWithNativeProvider(provider);
    if (nativeResult) return nativeResult;
  }

  return signInWithBrowserProvider(provider);
};

export const signOut = async () => {
  const result = await supabase.auth.signOut();
  if (!result.error) {
    await Promise.allSettled([clearNativeProviderSessions()]);
  }
  return result;
};
