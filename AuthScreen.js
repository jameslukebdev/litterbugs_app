import { useState } from 'react';
import {
  ActivityIndicator, Alert, Image, KeyboardAvoidingView, Modal, Platform,
  ScrollView, StyleSheet, Text, TextInput, TouchableOpacity,
  TouchableWithoutFeedback, View,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import * as WebBrowser from 'expo-web-browser';

import {
  resendSignupVerification, sendPasswordRecovery, signInWithEmail,
  signInWithProvider, signUpWithEmail,
} from './lib/auth';
import { supabase } from './lib/supabase';

WebBrowser.maybeCompleteAuthSession();

const PROVIDERS = [
  {
    id: 'google',
    label: 'Continue with Google',
    image: require('./assets/google-g-logo.png'),
  },
  { id: 'facebook', label: 'Continue with Facebook', icon: 'logo-facebook' },
];

const cleanAddress = (value) => value.trim().toLowerCase();

const isNetworkError = (error) =>
  /network|internet|offline|failed to fetch|network request failed/i.test(error?.message || '');

const isProviderCancellation = (error) =>
  error?.code === 'ERR_REQUEST_CANCELED'
  || /cancelled|canceled|denied|declined|access_denied|authentication session.*error 1/i.test(error?.message || '');

const getProviderErrorMessage = (error) => {
  const message = error?.message?.toLowerCase() || '';

  if (isNetworkError(error)) {
    return 'Check your internet connection and try again.';
  }

  if (/another web browser is already open|browser.*already open/.test(message)) {
    return 'Close the current sign-in window, then try again.';
  }

  return 'We couldn’t complete sign in. Please try again.';
};

export default function AuthScreen() {
  const [emailModalOpen, setEmailModalOpen] = useState(false);
  const [emailMode, setEmailMode] = useState('login');
  const [sentReason, setSentReason] = useState('signup');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loadingEmail, setLoadingEmail] = useState(false);
  const [loadingProvider, setLoadingProvider] = useState(null);
  const [formError, setFormError] = useState('');

  const resetForm = (mode = 'login') => {
    setEmailMode(mode);
    setPassword('');
    setShowPassword(false);
    setFormError('');
  };

  const openEmail = () => {
    resetForm('login');
    setEmailModalOpen(true);
  };

  const closeEmail = () => {
    if (loadingEmail) return;
    setEmailModalOpen(false);
    resetForm('login');
  };

  const validateEmail = () => {
    const cleanEmail = cleanAddress(email);
    if (!cleanEmail || !cleanEmail.includes('@')) {
      setFormError('Enter a valid email address.');
      return null;
    }
    return cleanEmail;
  };

  const handleEmailSubmit = async () => {
    if (loadingEmail) return;

    setFormError('');
    const cleanEmail = validateEmail();
    if (!cleanEmail) return;

    if (emailMode === 'login' && !password) {
      setFormError('Enter your password.');
      return;
    }

    if (emailMode === 'signup' && password.length < 8) {
      setFormError('Use at least 8 characters for your new password.');
      return;
    }

    try {
      setLoadingEmail(true);

      if (emailMode === 'login') {
        const { error } = await signInWithEmail(cleanEmail, password);
        if (error) {
          const unverified = error.message?.toLowerCase().includes('email not confirmed');
          setFormError(isNetworkError(error)
            ? 'Check your internet connection and try again.'
            : unverified
              ? 'Please verify your email before signing in.'
              : 'That email and password did not match. Try again or reset your password.');
          return;
        }
        setEmailModalOpen(false);
        setPassword('');
        return;
      }

      if (emailMode === 'signup') {
        const { data, error } = await signUpWithEmail(cleanEmail, password);
        const hiddenDuplicate = Array.isArray(data?.user?.identities)
          && data.user.identities.length === 0;
        const duplicate = error?.message?.toLowerCase().includes('already registered')
          || error?.message?.toLowerCase().includes('already been registered')
          || hiddenDuplicate;
        if (error || duplicate) {
          setFormError(duplicate
            ? 'An account may already exist for this email. Try signing in or reset your password.'
            : 'We couldn’t create your account. Check your connection and try again.');
          return;
        }
        if (data?.session) {
          setEmailModalOpen(false);
          setPassword('');
          return;
        }
        setSentReason('signup');
        setEmailMode('sent');
        setPassword('');
        return;
      }

      const { error } = await sendPasswordRecovery(cleanEmail);
      if (error) {
        setFormError('We couldn’t send a reset link. Check your connection and try again.');
        return;
      }
      setSentReason('recovery');
      setEmailMode('sent');
    } catch (error) {
      setFormError('Something went wrong. Check your connection and try again.');
    } finally {
      setLoadingEmail(false);
    }
  };

  const handleResend = async () => {
    setFormError('');
    const cleanEmail = validateEmail();
    if (!cleanEmail) return;

    try {
      setLoadingEmail(true);
      const { error } = await resendSignupVerification(cleanEmail);
      if (error) throw error;
      Alert.alert('Email sent', 'We sent a fresh verification link.');
    } catch (error) {
      setFormError('We couldn’t resend the email. Check your connection and try again.');
    } finally {
      setLoadingEmail(false);
    }
  };

  const handleProvider = async (provider) => {
    if (loadingProvider) return;

    try {
      setLoadingProvider(provider);
      await signInWithProvider(provider);
    } catch (error) {
      if (isProviderCancellation(error)) return;
      const name = provider.charAt(0).toUpperCase() + provider.slice(1);
      Alert.alert(`${name} sign in unavailable`, getProviderErrorMessage(error));
    } finally {
      setLoadingProvider(null);
    }
  };

  const handleGuestSignIn = async () => {
    if (loadingProvider) return;

    try {
      setLoadingProvider('guest');
      const { error } = await supabase.auth.signInAnonymously();
      if (error) throw error;
      Alert.alert(
        'Guest mode',
        'You can create and manage reports during this guest session. If you sign out or remove the app, this guest account and its reports cannot be transferred or recovered.',
        [{ text: 'Continue' }]
      );
    } catch (error) {
      Alert.alert('Guest mode unavailable', 'Check your connection and try again.');
    } finally {
      setLoadingProvider(null);
    }
  };

  const renderProviderButton = ({ id, label, icon, image }) => {
    const loading = loadingProvider === id;
    const disabled = Boolean(loadingProvider);
    const providerName = id.charAt(0).toUpperCase() + id.slice(1);
    const visibleLabel = loading ? `Signing in with ${providerName}…` : label;

    return (
      <TouchableOpacity
        key={id}
        style={[
          styles.providerButton,
          id === 'google' && styles.googleButton,
          id === 'facebook' && styles.facebookButton,
          disabled && !loading && styles.disabled,
        ]}
        onPress={() => handleProvider(id)}
        disabled={disabled}
        accessibilityRole="button"
        accessibilityLabel={visibleLabel}
        accessibilityState={{ disabled, busy: loading }}
      >
        {image ? (
          <Image source={image} style={styles.googleIcon} resizeMode="contain" />
        ) : (
          <Ionicons name={icon} size={21} color={id === 'facebook' ? '#fff' : '#222'} style={styles.buttonIcon} />
        )}
        <Text style={[
          styles.providerText,
          id === 'google' && styles.googleText,
          id === 'facebook' && styles.facebookText,
        ]}>{visibleLabel}</Text>
        {loading && (
          <ActivityIndicator
            size="small"
            color={id === 'facebook' ? '#fff' : '#333'}
            style={styles.providerSpinner}
          />
        )}
      </TouchableOpacity>
    );
  };

  const title = emailMode === 'signup'
    ? 'Create your account'
    : emailMode === 'forgot' ? 'Reset your password' : 'Sign in with email';

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        <Image source={require('./assets/LB_Logo_PNG.png')} style={styles.logo} resizeMode="contain" />
        <Text style={styles.title}>Join the Cleanup Movement</Text>
        <Text style={styles.subtitle}>Sign in to track and share reports.</Text>

        <View style={styles.actions}>
          {PROVIDERS.map(renderProviderButton)}
          <View style={styles.dividerRow}>
            <View style={styles.divider} />
            <Text style={styles.dividerText}>or</Text>
            <View style={styles.divider} />
          </View>
          <TouchableOpacity style={[styles.emailButton, loadingProvider && styles.disabled]} onPress={openEmail} disabled={Boolean(loadingProvider)} accessibilityRole="button" accessibilityLabel="Continue with Email">
            <Ionicons name="mail-outline" size={21} color="#fff" style={styles.buttonIcon} />
            <Text style={styles.emailText}>Continue with Email</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.guestLink, loadingProvider && styles.disabled]} onPress={handleGuestSignIn} disabled={Boolean(loadingProvider)} accessibilityRole="button" accessibilityLabel="Continue as Guest">
            {loadingProvider === 'guest' ? <ActivityIndicator color="#555" /> : <Text style={styles.guestText}>Continue as Guest</Text>}
          </TouchableOpacity>
        </View>
      </ScrollView>

      <StatusBar hidden={false} />
      <Modal visible={emailModalOpen} animationType="slide" transparent onRequestClose={closeEmail}>
        <TouchableWithoutFeedback onPress={closeEmail} accessible={false}>
          <View style={emailStyles.backdrop}>
            <KeyboardAvoidingView
              behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
              keyboardVerticalOffset={Platform.OS === 'ios' ? -36 : 0}
              style={emailStyles.kav}
            >
              <TouchableWithoutFeedback accessible={false}>
                <View style={emailStyles.sheet}>
                  <ScrollView
                    contentContainerStyle={emailStyles.sheetContent}
                    keyboardShouldPersistTaps="handled"
                    showsVerticalScrollIndicator={false}
                    bounces={false}
                  >
                  <View style={emailStyles.handle} />
                  {emailMode === 'sent' ? (
                    <View style={emailStyles.sentContent}>
                      <Ionicons name="mail-unread-outline" size={42} color="#2F7D32" />
                      <Text style={emailStyles.sentTitle}>Check your email</Text>
                      <Text style={emailStyles.sentText}>
                        {sentReason === 'signup'
                          ? `If ${cleanAddress(email)} is new, a verification link is on its way. If you’ve used this email before, sign in or reset your password.`
                          : `If an account exists for ${cleanAddress(email)}, a password-reset link is on its way.`}
                      </Text>
                      {sentReason === 'signup' && (
                        <>
                          <TouchableOpacity style={emailStyles.textButton} onPress={handleResend} disabled={loadingEmail} accessibilityRole="button" accessibilityLabel="Resend verification email">
                            {loadingEmail ? <ActivityIndicator color="#2F7D32" /> : <Text style={emailStyles.linkText}>Resend verification email</Text>}
                          </TouchableOpacity>
                          <View style={emailStyles.sentLinksRow}>
                            <TouchableOpacity style={emailStyles.sentLinkButton} onPress={() => resetForm('login')} accessibilityRole="button" accessibilityLabel="Sign in instead">
                              <Text style={emailStyles.linkText}>Sign in instead</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={emailStyles.sentLinkButton} onPress={() => resetForm('forgot')} accessibilityRole="button" accessibilityLabel="Reset password">
                              <Text style={emailStyles.linkText}>Reset password</Text>
                            </TouchableOpacity>
                          </View>
                        </>
                      )}
                      {!!formError && <Text style={emailStyles.error}>{formError}</Text>}
                      <TouchableOpacity style={emailStyles.primaryButton} onPress={closeEmail} accessibilityRole="button" accessibilityLabel="Done">
                        <Text style={emailStyles.primaryButtonText}>Done</Text>
                      </TouchableOpacity>
                    </View>
                  ) : (
                    <>
                      <View style={emailStyles.headingRow}>
                        <View style={emailStyles.headingCopy}>
                          <Text style={emailStyles.title}>{title}</Text>
                          <Text style={emailStyles.subtitle}>
                            {emailMode === 'signup' ? 'We’ll email you a link to verify your account.'
                              : emailMode === 'forgot' ? 'We’ll send a secure link to your email.' : 'Welcome back.'}
                          </Text>
                        </View>
                        <TouchableOpacity onPress={closeEmail} style={emailStyles.closeButton} accessibilityRole="button" accessibilityLabel="Close">
                          <Ionicons name="close" size={24} color="#555" />
                        </TouchableOpacity>
                      </View>

                      <Text style={emailStyles.label}>Email</Text>
                      <TextInput
                        value={email} onChangeText={setEmail} placeholder="you@example.com"
                        autoCapitalize="none" autoCorrect={false} keyboardType="email-address"
                        textContentType="emailAddress" autoComplete="email" style={emailStyles.input}
                        accessibilityLabel="Email address"
                      />

                      {emailMode !== 'forgot' && (
                        <>
                          <Text style={emailStyles.label}>Password</Text>
                          <View style={emailStyles.passwordRow}>
                            <TextInput
                              value={password} onChangeText={setPassword} placeholder="At least 8 characters"
                              autoCapitalize="none" autoCorrect={false} secureTextEntry={!showPassword}
                              textContentType={emailMode === 'signup' ? 'newPassword' : 'password'}
                              autoComplete={emailMode === 'signup' ? 'new-password' : 'current-password'}
                              style={emailStyles.passwordInput} returnKeyType="done"
                              onSubmitEditing={handleEmailSubmit} accessibilityLabel="Password"
                            />
                            <TouchableOpacity onPress={() => setShowPassword((visible) => !visible)} style={emailStyles.eyeButton} accessibilityLabel={showPassword ? 'Hide password' : 'Show password'}>
                              <Ionicons name={showPassword ? 'eye-off-outline' : 'eye-outline'} size={22} color="#666" />
                            </TouchableOpacity>
                          </View>
                        </>
                      )}

                      {emailMode === 'login' && (
                        <TouchableOpacity
                          style={[emailStyles.forgotButton, loadingEmail && styles.disabled]}
                          onPress={() => resetForm('forgot')}
                          disabled={loadingEmail}
                          accessibilityRole="button"
                          accessibilityLabel="Forgot password"
                        >
                          <Text style={emailStyles.linkText}>Forgot password?</Text>
                        </TouchableOpacity>
                      )}
                      {!!formError && <Text style={emailStyles.error}>{formError}</Text>}
                      <TouchableOpacity style={[emailStyles.primaryButton, loadingEmail && styles.disabled]} onPress={handleEmailSubmit} disabled={loadingEmail} accessibilityRole="button" accessibilityLabel={title}>
                        {loadingEmail ? <ActivityIndicator color="#fff" /> : (
                          <Text style={emailStyles.primaryButtonText}>
                            {emailMode === 'signup' ? 'Create account' : emailMode === 'forgot' ? 'Send reset link' : 'Sign in'}
                          </Text>
                        )}
                      </TouchableOpacity>
                      <View style={emailStyles.switchRow}>
                        <Text style={emailStyles.switchText}>
                          {emailMode === 'login' ? 'New to Litterbugs?' : emailMode === 'signup' ? 'Already have an account?' : 'Remember your password?'}
                        </Text>
                        <TouchableOpacity
                          style={[emailStyles.switchLinkButton, loadingEmail && styles.disabled]}
                          onPress={() => resetForm(emailMode === 'login' ? 'signup' : 'login')}
                          disabled={loadingEmail}
                          accessibilityRole="button"
                          accessibilityLabel={emailMode === 'login' ? 'Create account' : 'Sign in'}
                        >
                          <Text style={emailStyles.switchLink}>{emailMode === 'login' ? 'Create account' : 'Sign in'}</Text>
                        </TouchableOpacity>
                      </View>
                    </>
                  )}
                  </ScrollView>
                </View>
              </TouchableWithoutFeedback>
            </KeyboardAvoidingView>
          </View>
        </TouchableWithoutFeedback>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F6F7' },
  content: { flexGrow: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 24, paddingVertical: 24 },
  logo: { width: 145, height: 145, marginBottom: 8 },
  title: { fontSize: 23, fontWeight: '800', color: '#333', marginBottom: 6, textAlign: 'center' },
  subtitle: { fontSize: 15, color: '#666', marginBottom: 22, textAlign: 'center' },
  actions: { width: '100%', maxWidth: 420 },
  providerButton: { minHeight: 52, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#fff', borderWidth: 1, borderColor: '#D8DDE2', borderRadius: 14, marginBottom: 11 },
  providerText: { color: '#222', fontSize: 16, fontWeight: '700' },
  providerSpinner: { position: 'absolute', right: 16 },
  googleButton: { borderColor: '#747775' },
  googleText: { color: '#1F1F1F' },
  googleIcon: { width: 20, height: 20, marginRight: 10 },
  facebookButton: { backgroundColor: '#1877F2', borderColor: '#1877F2' },
  facebookText: { color: '#fff' },
  buttonIcon: { marginRight: 10 },
  dividerRow: { flexDirection: 'row', alignItems: 'center', marginVertical: 4 },
  divider: { flex: 1, height: StyleSheet.hairlineWidth, backgroundColor: '#BCC3CA' },
  dividerText: { marginHorizontal: 12, color: '#777', fontSize: 13 },
  emailButton: { minHeight: 52, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#E57373', borderRadius: 14, marginTop: 7 },
  emailText: { color: '#fff', fontSize: 16, fontWeight: '800' },
  guestLink: { minHeight: 48, alignItems: 'center', justifyContent: 'center', marginTop: 5 },
  guestText: { color: '#4F5B66', fontSize: 15, fontWeight: '700', textDecorationLine: 'underline' },
  disabled: { opacity: 0.58 },
});

const emailStyles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.34)', justifyContent: 'flex-end' },
  kav: { flex: 1, justifyContent: 'flex-end' },
  sheet: { maxHeight: '92%', backgroundColor: '#fff', borderTopLeftRadius: 22, borderTopRightRadius: 22, overflow: 'hidden' },
  sheetContent: { paddingHorizontal: 22, paddingTop: 10, paddingBottom: Platform.OS === 'ios' ? 34 : 22 },
  handle: { width: 42, height: 5, borderRadius: 3, backgroundColor: '#D3D7DB', alignSelf: 'center', marginBottom: 14 },
  headingRow: { flexDirection: 'row', alignItems: 'flex-start' },
  headingCopy: { flex: 1 },
  closeButton: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center', marginTop: -8, marginRight: -10 },
  title: { fontSize: 22, fontWeight: '800', color: '#333' },
  subtitle: { fontSize: 14, lineHeight: 20, color: '#666', marginTop: 5, marginBottom: 10 },
  label: { fontSize: 14, fontWeight: '700', color: '#333', marginBottom: 7, marginTop: 11 },
  input: { minHeight: 50, backgroundColor: '#FAFBFC', borderWidth: 1, borderColor: '#D8DDE2', borderRadius: 12, paddingHorizontal: 14 },
  passwordRow: { minHeight: 50, flexDirection: 'row', alignItems: 'center', backgroundColor: '#FAFBFC', borderWidth: 1, borderColor: '#D8DDE2', borderRadius: 12 },
  passwordInput: { flex: 1, paddingHorizontal: 14 },
  eyeButton: { width: 48, height: 48, alignItems: 'center', justifyContent: 'center' },
  forgotButton: { minHeight: 44, alignSelf: 'flex-end', justifyContent: 'center' },
  linkText: { color: '#2F7D32', fontSize: 14, fontWeight: '800' },
  error: { color: '#B42318', fontSize: 14, lineHeight: 20, marginTop: 9 },
  primaryButton: { minHeight: 52, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: '#2F7D32', marginTop: 14, width: '100%' },
  primaryButtonText: { color: '#fff', fontSize: 16, fontWeight: '800' },
  switchRow: { minHeight: 46, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', flexWrap: 'wrap', gap: 6 },
  switchText: { color: '#666', fontSize: 14 },
  switchLinkButton: { minHeight: 44, justifyContent: 'center' },
  switchLink: { color: '#2F7D32', fontSize: 14, fontWeight: '800' },
  sentContent: { alignItems: 'center', paddingTop: 4 },
  sentTitle: { fontSize: 22, fontWeight: '800', color: '#333', marginTop: 12 },
  sentText: { fontSize: 15, lineHeight: 22, color: '#5C6670', textAlign: 'center', marginTop: 8 },
  textButton: { minHeight: 44, justifyContent: 'center', marginTop: 5 },
  sentLinksRow: { flexDirection: 'row', justifyContent: 'center', flexWrap: 'wrap', columnGap: 18 },
  sentLinkButton: { minHeight: 44, justifyContent: 'center' },
});
