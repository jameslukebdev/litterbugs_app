import { useState } from 'react';
import { View, 
  Text, 
  Modal, 
  TextInput, 
  StyleSheet, 
  TouchableOpacity, 
  Platform, 
  Image, 
  TouchableWithoutFeedback, 
  ActivityIndicator,
  KeyboardAvoidingView,
 } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from './lib/supabase';
import { Alert } from 'react-native';
import * as WebBrowser from 'expo-web-browser';
import * as Linking from 'expo-linking';


WebBrowser.maybeCompleteAuthSession();


export default function AuthScreen() {
    const navigation = useNavigation();
    const [emailModalOpen, setEmailModalOpen] = useState(false);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loadingEmail, setLoadingEmail] = useState(false);
    const redirectTo = Linking.createURL('auth-callback');
    const [showPassword, setShowPassword] = useState(false);


    const handleEmailContinue = async () => {
      const cleanEmail = email.trim().toLowerCase();
    
      if (!cleanEmail || !password) {
        Alert.alert('Missing info', 'Please enter an email and password.');
        return;
      }
    
      if (password.length < 6) {
        Alert.alert('Password too short', 'Password must be at least 6 characters.');
        return;
      }
    
      try {
        setLoadingEmail(true);
    
        // 1️⃣ Try sign-in first
        const { data: signInData, error: signInError } =
          await supabase.auth.signInWithPassword({
            email: cleanEmail,
            password,
          });
    
        if (!signInError && signInData?.session) {
          // ✅ Signed in successfully
          setEmailModalOpen(false);
          setPassword('');
          return;
        }
    
        // ❗ Only attempt sign-up if user truly does not exist
        const shouldAttemptSignUp =
          signInError?.message?.toLowerCase().includes('invalid login credentials') ||
          signInError?.message?.toLowerCase().includes('user not found');
    
        if (!shouldAttemptSignUp) {
          // ❌ Wrong password, unconfirmed email, etc.
          Alert.alert('Sign-in failed', signInError.message);
          return;
        }
    
        // 2️⃣ Try sign-up
        const { data: signUpData, error: signUpError } =
          await supabase.auth.signUp({
            email: cleanEmail,
            password,
          });
    
        if (signUpError) {
          Alert.alert('Unable to continue', signUpError.message);
          return;
        }
    
        if (signUpData?.session) {
          // ✅ Signed up & logged in immediately
          setEmailModalOpen(false);
          setPassword('');
          return;
        }
    
        // ✅ Email confirmation required
        Alert.alert(
          'Check your email',
          'We sent you a confirmation link. Please confirm your email, then come back and sign in.'
        );
    
        setEmailModalOpen(false);
        setPassword('');
      } catch (e) {
        Alert.alert('Error', 'Something went wrong. Please try again.');
        console.log('Email auth error:', e);
      } finally {
        setLoadingEmail(false);
      }
    };

    
    const handleGuestSignIn = async () => {
      try {
        const { data, error } = await supabase.auth.signInAnonymously();
    
        if (error) {
          Alert.alert('Guest sign-in failed', error.message);
          return;
        }
    
        // ✅ Inform user of guest limitations (shown once per sign-in)
        Alert.alert(
          'Guest Mode',
          'As a guest, you may create and view litter reports anonymously.\n\nTo edit or delete your reports, you must sign in. Anonymous users cannot edit or delete their reports once created.',
          [{ text: 'OK' }]
        );
    
        // ✅ Session is now set
        // App.js auth listener will redirect automatically
      } catch (err) {
        console.log('Guest auth error:', err);
        Alert.alert('Error', 'Unable to continue as guest.');
      }
    };
    
    



    // const handleGoogleSignIn = async () => {
    //   console.log('Google button pressed');
    
    //   try {
    //     const redirectTo = Linking.createURL('auth-callback');
    
    //     const { data, error } = await supabase.auth.signInWithOAuth({
    //       provider: 'google',
    //       options: {
    //         redirectTo,
    //       },
    //     });
    
    //     if (error) {
    //       Alert.alert('Google sign-in failed', error.message);
    //       return;
    //     }
    
    //     if (!data?.url) {
    //       console.log('No OAuth URL returned');
    //       return;
    //     }
    
    //     console.log('Opening OAuth URL:', data.url);
    
    //     await WebBrowser.openAuthSessionAsync(
    //       data.url,
    //       redirectTo
    //     );
    
    //   } catch (err) {
    //     console.log('Unexpected Google auth error:', err);
    //   }
    // };
    
    
    
    

  return (
    <View style={styles.container}>
      <Image
        source={require('./assets/LB_Logo_PNG.png')}
        style={styles.logo}
        resizeMode="contain"
      />

      <Text style={styles.title}>Join the Cleanup Movement</Text>
      <Text style={styles.subtitle}>Sign in to track and share reports.</Text>

      {/* <TouchableOpacity style={styles.googleButton} onPress={handleGoogleSignIn}>
          <Ionicons
          name="logo-google"
          size={20}
          color="#4285F4"
          style={styles.buttonIcon}
          />
        <Text style={styles.googleText}>Continue with Google</Text>
      </TouchableOpacity> */}

      {/* {Platform.OS === 'ios' && (
        <TouchableOpacity style={styles.appleButton} onPress={() => console.log('Apple sign in')}>
                <Ionicons
                  name="logo-apple"
                  size={20}
                  color="#000"
                  style={styles.buttonIcon}
                  />
          <Text style={styles.appleText}>Continue with Apple</Text>
        </TouchableOpacity>
      )} */}

      <TouchableOpacity 
        style={styles.emailButton}  
        onPress={() => setEmailModalOpen(true)} 
         >
            <Ionicons
            name="mail-outline"
            size={20}
            color="#2F7D32"
            style={styles.buttonIcon}
            />
            <Text style={styles.emailText}>Continue with Email</Text>
      </TouchableOpacity>

        <TouchableOpacity
          style={styles.guestButton}
          onPress={handleGuestSignIn}
          >
          <Ionicons
            name="person-outline"
            size={20}
            color="#555"
            style={styles.buttonIcon}
          />
          <Text style={styles.guestText}>Continue as Guest</Text>
        </TouchableOpacity>


      <StatusBar hidden={false} />


<Modal
  visible={emailModalOpen}
  animationType="slide"
  transparent
  onRequestClose={() => setEmailModalOpen(false)}
>
  <TouchableWithoutFeedback onPress={() => setEmailModalOpen(false)}>
    <View style={emailModalStyles.backdrop}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={emailModalStyles.kav}
      >
        <TouchableWithoutFeedback>
          <View style={emailModalStyles.sheet}>
            <Text style={emailModalStyles.title}>Sign in with Email</Text>
            <Text style={emailModalStyles.subtitle}>
            </Text>

            <Text style={emailModalStyles.label}>Email</Text>
            <TextInput
              value={email}
              onChangeText={setEmail}
              placeholder="you@example.com"
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="email-address"
              textContentType="emailAddress"
              style={emailModalStyles.input}
              returnKeyType="next"
            />

            <Text style={emailModalStyles.label}>Password</Text>

            <View style={{ position: 'relative' }}>
              <TextInput
                value={password}
                onChangeText={setPassword}
                placeholder="••••••••"
                autoCapitalize="none"
                autoCorrect={false}
                secureTextEntry={!showPassword}   // 👈 key change
                textContentType="password"
                style={emailModalStyles.input}
                returnKeyType="done"
              />

              <TouchableOpacity
                onPress={() => setShowPassword((prev) => !prev)}
                style={{
                  position: 'absolute',
                  right: 14,
                  top: '50%',
                  transform: [{ translateY: -12 }],
                }}
                accessibilityLabel={
                  showPassword ? 'Hide password' : 'Show password'
                }
              >
                <Ionicons
                  name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                  size={22}
                  color="#666"
                />
              </TouchableOpacity>
            </View>


            <TouchableOpacity
              style={emailModalStyles.primaryBtn}
              onPress={handleEmailContinue}
              // onPress={async () => {
              //   // UI-only placeholder for now
              //   setLoadingEmail(true);
              //   setTimeout(() => {
              //     console.log('Email auth submit:', { email, password });
              //     setLoadingEmail(false);
              //     // leave modal open for now; we’ll close it after Supabase auth succeeds
              //   }, 400);
              // }}
              disabled={loadingEmail}
              accessibilityRole="button"
              accessibilityLabel="Continue with email and password"
            >
              {loadingEmail ? (
                <ActivityIndicator />
              ) : (
                <Text style={emailModalStyles.primaryBtnText}>Continue</Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={emailModalStyles.secondaryBtn}
              onPress={() => setEmailModalOpen(false)}
              accessibilityRole="button"
              accessibilityLabel="Cancel email sign in"
            >
              <Text style={emailModalStyles.secondaryBtnText}>Cancel</Text>
            </TouchableOpacity>
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
  container: {
    flex: 1,
    backgroundColor: '#F5F6F7',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  logo: {
    width: 200,
    height: 200,
    marginBottom: 16,
  },
  title: {
    fontSize: 22,
    fontWeight: '800',
    color: '#333',
    marginBottom: 6,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    marginBottom: 24,
    textAlign: 'center',
  },
  googleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#81C784', // friendly green
    paddingVertical: 14,
    paddingHorizontal: 32,
    borderRadius: 14,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 3.5,
    elevation: 3,
  },
  googleText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  appleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FF6F61',
    paddingVertical: 14,
    paddingHorizontal: 32,
    borderRadius: 14,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 3.5,
    elevation: 3,
  },
  appleText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  emailButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FF6F61',
    paddingVertical: 14,
    paddingHorizontal: 32,
    borderRadius: 14,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 3.5,
    elevation: 3,
  },
  emailText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  linkText: {
    color: '#4A78FF',
    fontSize: 16,
    fontWeight: '600',
  },
  buttonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonIcon: {
    marginRight: 8,
  },
  guestButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFC42E',
    paddingVertical: 14,
    paddingHorizontal: 32,
    borderRadius: 14,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 3.5,
    elevation: 3,
  },
  guestText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
});

const emailModalStyles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.30)',
    justifyContent: 'flex-end',
  },
  kav: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: '#fff',
    padding: 16,
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
  },
  title: {
    fontSize: 18,
    fontWeight: '800',
    color: '#333',
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 13,
    color: '#666',
    marginBottom: 12,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 6,
    marginTop: 10,
  },
  input: {
    backgroundColor: '#F5F6F7',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  primaryBtn: {
    backgroundColor: '#81C784',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 14,
  },
  primaryBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  secondaryBtn: {
    backgroundColor: '#EAEAEA',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 10,
  },
  secondaryBtnText: {
    color: '#333',
    fontSize: 16,
    fontWeight: '700',
  },

});

