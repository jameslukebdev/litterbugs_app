import { useCallback, useEffect, useRef, useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import {
  NavigationContainer,
  useNavigationContainerRef,
} from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import {
  ActivityIndicator,
  Alert,
  Image,
  Linking,
  StyleSheet,
  Text,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from 'react-native';

import AppTabs from './AppTabs';
import AuthScreen from './AuthScreen';
import BlockedAccountsScreen from './BlockedAccountsScreen';
import CompleteProfileScreen from './CompleteProfileScreen';
import CleanupFeedbackScreen from './CleanupFeedbackScreen';
import CleanupSubmissionScreen from './CleanupSubmissionScreen';
import CleanupReviewScreen from './CleanupReviewScreen';
import ContributionHistoryScreen from './ContributionHistoryScreen';
import EditProfileScreen from './EditProfileScreen';
import ExpiredReportsScreen from './ExpiredReportsScreen';
import FundingContributionScreen from './FundingContributionScreen';
import PayoutSetupScreen from './PayoutSetupScreen';
import PublicProfileScreen from './PublicProfileScreen';
import RankCelebrationManager from './RankCelebrationManager';
import ReportUserScreen from './ReportUserScreen';
import ResetPasswordScreen from './ResetPasswordScreen';
import { handleAuthCallbackUrl, PASSWORD_RECOVERY_PATH, signOut } from './lib/auth';
import { acknowledgeCleanupNotifications } from './lib/cleanup';
import { cleanupNotificationDestination } from './lib/cleanupNotifications';
import { ProfileProvider, useProfile } from './lib/profile';
import {
  addCleanupNotificationResponseListener,
  clearLastCleanupNotificationResponse,
  getLastCleanupNotificationResponse,
  registerCleanupPushDevice,
  subscribeToPushTokenChanges,
} from './lib/pushNotifications';
import { isPermanentUser } from './lib/reportAccess';
import { ReportsProvider } from './lib/reports';
import { SessionProvider } from './lib/session';
import { supabase } from './lib/supabase';

const Stack = createNativeStackNavigator();

const navigationLinking = {
  prefixes: [
    'litterbugs://',
    'https://litterbugs.app',
    'https://www.litterbugs.app',
  ],
  config: {
    screens: {
      App: {
        screens: {
          Map: 'reports/:reportId',
        },
      },
    },
  },
};

function HomeScreen({ navigation }) {
  const { width, height } = useWindowDimensions();
  const logoSize = Math.min(width * 0.5, height * 0.45, 360);

  return (
    <View style={styles.container}>
      <Image
        source={require('./assets/LB_Logo_PNG.png')}
        style={[styles.logo, { width: logoSize, height: logoSize }]}
        resizeMode="contain"
      />
      <Text style={styles.title}>Welcome to Litterbugs!</Text>
      <Text style={styles.subtitle}>Clean your community one report at a time</Text>

      <TouchableOpacity
        style={styles.primaryButton}
        onPress={() => navigation.navigate('App', { screen: 'Map' })}
        accessibilityRole="button"
        accessibilityLabel="Explore the Map"
      >
        <Text style={styles.primaryButtonText}>Explore the Map</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.secondaryButton}
        onPress={() => navigation.navigate('Auth')}
        accessibilityRole="button"
        accessibilityLabel="Sign in or create account"
      >
        <Text style={styles.secondaryButtonText}>Sign in or create account</Text>
      </TouchableOpacity>
      <StatusBar hidden={false} />
    </View>
  );
}

function LoadingScreen({ label = 'Loading Litterbugs' }) {
  return (
    <View style={styles.loading} accessibilityLabel={label}>
      <ActivityIndicator size="large" color="#2F7D32" />
    </View>
  );
}

function ProfileLoadError() {
  const { refreshProfile } = useProfile();
  return (
    <View style={styles.errorState}>
      <Text style={styles.errorTitle}>We couldn’t load your profile</Text>
      <Text style={styles.errorText}>Check your connection and try again.</Text>
      <TouchableOpacity style={styles.primaryButton} onPress={refreshProfile}>
        <Text style={styles.primaryButtonText}>Try again</Text>
      </TouchableOpacity>
      <TouchableOpacity style={styles.textButton} onPress={signOut}>
        <Text style={styles.textButtonText}>Sign out</Text>
      </TouchableOpacity>
    </View>
  );
}

function AppNavigation({ session, passwordRecovery, onRecoveryComplete }) {
  const { profile, loading } = useProfile();
  const permanent = isPermanentUser(session?.user);
  const navigationRef = useNavigationContainerRef();
  const pendingNotificationData = useRef(null);
  const handledNotificationId = useRef(null);

  const openNotificationData = useCallback((data) => {
    const notificationId = data?.notificationId;
    if (notificationId && handledNotificationId.current === notificationId) return;

    const destination = cleanupNotificationDestination(data);
    if (!destination) return;
    if (!navigationRef.isReady()) {
      pendingNotificationData.current = data;
      return;
    }

    handledNotificationId.current = notificationId ?? null;
    pendingNotificationData.current = null;
    navigationRef.navigate(destination.name, destination.params);
    if (notificationId) {
      acknowledgeCleanupNotifications([notificationId]).catch((error) => {
        console.log('Cleanup notification acknowledgment error:', error);
      });
    }
  }, [navigationRef]);

  useEffect(() => {
    if (!permanent || !profile?.profile_completed_at) return undefined;

    registerCleanupPushDevice().catch((error) => {
      console.log('Cleanup push registration error:', error);
    });
    const tokenSubscription = subscribeToPushTokenChanges();
    return () => tokenSubscription.remove();
  }, [permanent, profile?.profile_completed_at]);

  useEffect(() => {
    if (!permanent) return undefined;

    const responseSubscription = addCleanupNotificationResponseListener((response) => {
      openNotificationData(response.notification.request.content.data);
    });

    getLastCleanupNotificationResponse()
      .then((response) => {
        if (response) {
          openNotificationData(response.notification.request.content.data);
          return clearLastCleanupNotificationResponse();
        }
        return null;
      })
      .catch((error) => {
        console.log('Cleanup notification response error:', error);
      });

    return () => responseSubscription.remove();
  }, [openNotificationData, permanent]);

  if (passwordRecovery && permanent) {
    return (
      <ResetPasswordScreen
        onComplete={() => {
          onRecoveryComplete();
          Alert.alert('Password updated', 'Your new password is ready to use.');
        }}
      />
    );
  }

  if (permanent && loading && !profile) return <LoadingScreen label="Loading profile" />;
  if (permanent && !loading && !profile) return <ProfileLoadError />;

  const initialRouteName = permanent
    ? profile?.profile_completed_at ? 'App' : 'CompleteProfile'
    : 'Home';

  const headerOptions = {
    headerShown: true,
    headerShadowVisible: false,
    headerTintColor: '#2F7D32',
    headerStyle: { backgroundColor: '#FFFFFF' },
    headerBackTitleVisible: false,
    headerBackButtonDisplayMode: 'minimal',
  };

  return (
    <NavigationContainer
      key={permanent ? 'permanent-navigation' : 'signed-out-navigation'}
      ref={navigationRef}
      linking={navigationLinking}
      onReady={() => {
        if (pendingNotificationData.current) {
          openNotificationData(pendingNotificationData.current);
        }
      }}
    >
      <Stack.Navigator
        key={permanent ? 'permanent' : 'signed-out'}
        initialRouteName={initialRouteName}
        screenOptions={{ headerShown: false }}
      >
        <Stack.Screen name="Home" component={HomeScreen} />
        <Stack.Screen name="App" component={AppTabs} />
        <Stack.Screen
          name="Auth"
          component={AuthScreen}
          options={{ ...headerOptions, title: '' }}
        />
        <Stack.Screen
          name="CompleteProfile"
          component={CompleteProfileScreen}
          options={{ ...headerOptions, title: 'Complete your profile', headerBackVisible: false }}
        />
        <Stack.Screen
          name="EditProfile"
          component={EditProfileScreen}
          options={{ ...headerOptions, title: 'Edit profile' }}
        />
        <Stack.Screen
          name="CleanupFeedback"
          component={CleanupFeedbackScreen}
          options={{ ...headerOptions, title: 'Cleanup feedback' }}
        />
        <Stack.Screen
          name="CleanupSubmission"
          component={CleanupSubmissionScreen}
          options={{ ...headerOptions, title: 'Complete cleanup' }}
        />
        <Stack.Screen
          name="CleanupReview"
          component={CleanupReviewScreen}
          options={{ ...headerOptions, title: 'Review cleanup' }}
        />
        <Stack.Screen
          name="FundingContribution"
          component={FundingContributionScreen}
          options={{ ...headerOptions, title: 'Cleanup fund' }}
        />
        <Stack.Screen
          name="PayoutSetup"
          component={PayoutSetupScreen}
          options={{ ...headerOptions, title: 'Cleanup payouts' }}
        />
        <Stack.Screen
          name="ContributionHistory"
          component={ContributionHistoryScreen}
          options={{ ...headerOptions, title: 'Contributions' }}
        />
        <Stack.Screen
          name="ExpiredReports"
          component={ExpiredReportsScreen}
          options={{ ...headerOptions, title: 'Expired reports' }}
        />
        <Stack.Screen
          name="PublicProfile"
          component={PublicProfileScreen}
          options={{ ...headerOptions, title: 'Profile' }}
        />
        <Stack.Screen
          name="BlockedAccounts"
          component={BlockedAccountsScreen}
          options={{ ...headerOptions, title: 'Blocked accounts' }}
        />
        <Stack.Screen
          name="ReportUser"
          component={ReportUserScreen}
          options={{ ...headerOptions, title: 'Report user', presentation: 'modal' }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
}

export default function App() {
  const [session, setSession] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [passwordRecovery, setPasswordRecovery] = useState(false);

  useEffect(() => {
    let mounted = true;

    const normalizeSession = (nextSession) => {
      if (nextSession?.user?.is_anonymous === true) {
        setSession(null);
        setTimeout(() => {
          supabase.auth.signOut({ scope: 'local' }).catch((error) => {
            console.log('Anonymous session cleanup error:', error);
          });
        }, 0);
        return;
      }
      setSession(nextSession);
    };

    const { data: subscription } = supabase.auth.onAuthStateChange(
      (event, nextSession) => {
        if (!mounted) return;
        normalizeSession(nextSession);
        if (event === 'PASSWORD_RECOVERY') setPasswordRecovery(true);
      }
    );

    const processAuthUrl = async (url) => {
      if (!url) return;
      try {
        const result = await handleAuthCallbackUrl(url);
        if (
          result.type === 'recovery'
          || (result.handled && url.includes(PASSWORD_RECOVERY_PATH))
        ) {
          setPasswordRecovery(true);
        }
      } catch (error) {
        const message = error.message || '';
        const cancelled = /cancel|denied|declined|access_denied/i.test(message);
        const expired = /expired|otp_expired|invalid.*link|already.*used/i.test(message);
        Alert.alert(
          cancelled ? 'Sign in wasn’t completed' : 'This link is no longer valid',
          cancelled
            ? 'No changes were made. You can try again whenever you’re ready.'
            : expired
              ? 'This link may have expired or already been used. Request a new link.'
              : 'Return to Litterbugs and request a new link.'
        );
      }
    };

    const linkSubscription = Linking.addEventListener('url', ({ url }) => {
      processAuthUrl(url);
    });

    const restoreSession = async () => {
      const [sessionResult, initialUrlResult] = await Promise.allSettled([
        supabase.auth.getSession(),
        Linking.getInitialURL(),
      ]);

      if (!mounted) return;
      if (sessionResult.status === 'fulfilled') {
        normalizeSession(sessionResult.value.data.session);
      } else {
        console.log('Session restore error:', sessionResult.reason);
      }

      if (initialUrlResult.status === 'fulfilled') {
        await processAuthUrl(initialUrlResult.value);
      } else {
        console.log('Initial link error:', initialUrlResult.reason);
      }

      if (mounted) setAuthLoading(false);
    };

    restoreSession().catch((error) => {
      console.log('Auth restore error:', error);
      if (mounted) setAuthLoading(false);
    });

    return () => {
      mounted = false;
      linkSubscription.remove();
      subscription.subscription.unsubscribe();
    };
  }, []);

  if (authLoading) return <LoadingScreen />;

  return (
    <SessionProvider session={session}>
      <ProfileProvider>
        <ReportsProvider>
          <AppNavigation
            session={session}
            passwordRecovery={passwordRecovery}
            onRecoveryComplete={() => setPasswordRecovery(false)}
          />
          <RankCelebrationManager />
        </ReportsProvider>
      </ProfileProvider>
    </SessionProvider>
  );
}

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F5F6F7',
  },
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
    backgroundColor: '#F5F6F7',
  },
  logo: { marginBottom: 12 },
  title: { color: '#252A2E', fontSize: 28, fontWeight: '800', textAlign: 'center' },
  subtitle: {
    maxWidth: 330,
    marginTop: 10,
    marginBottom: 34,
    color: '#667078',
    fontSize: 16,
    lineHeight: 23,
    textAlign: 'center',
  },
  primaryButton: {
    width: '100%',
    maxWidth: 390,
    minHeight: 54,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 14,
    backgroundColor: '#2E7D32',
  },
  primaryButtonText: { color: '#FFFFFF', fontSize: 17, fontWeight: '800' },
  secondaryButton: {
    width: '100%',
    maxWidth: 390,
    minHeight: 52,
    marginTop: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#2E7D32',
    borderRadius: 14,
    backgroundColor: '#FFFFFF',
  },
  secondaryButtonText: { color: '#2E7D32', fontSize: 16, fontWeight: '800' },
  errorState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 28,
    backgroundColor: '#F5F6F7',
  },
  errorTitle: { color: '#252A2E', fontSize: 22, fontWeight: '800', textAlign: 'center' },
  errorText: { marginVertical: 10, color: '#667078', fontSize: 15, textAlign: 'center' },
  textButton: { minHeight: 48, justifyContent: 'center', marginTop: 8 },
  textButtonText: { color: '#2E7D32', fontSize: 15, fontWeight: '800' },
});
