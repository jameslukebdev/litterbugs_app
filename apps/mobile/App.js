import { loadDiscoveryMemory, markWelcomeSeen } from './lib/discoveryMemory';
import { retryDeletedAccountDataCleanup } from './lib/deletedAccountData';
import { authenticatedActionDestination } from './lib/authIntent';
import { watchNativeProviderAuthorization } from './lib/nativeSocialAuth';
import { useCallback, useEffect, useRef, useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import { useFonts } from 'expo-font';
import { startAnalytics, trackScreen } from './lib/analytics';

startAnalytics();
import {
  NavigationContainer,
  useNavigationContainerRef,
} from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import {
  Alert,
  Image,
  Linking,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';

import AppTabs from './AppTabs';
import { PrimaryButton, TextLink } from './components/ui';
import BrandedLoadingState from './BrandedLoadingState';
import AuthScreen from './AuthScreen';
import SignInMethodsScreen from './SignInMethodsScreen';
import SettingsInfoScreen from './SettingsInfoScreen';
import BlockedAccountsScreen from './BlockedAccountsScreen';
import CompleteProfileScreen from './CompleteProfileScreen';
import CleanupFeedbackScreen from './CleanupFeedbackScreen';
import CleanupSubmissionScreen from './CleanupSubmissionScreen';
import CleanupReviewScreen from './CleanupReviewScreen';
import PaymentDetailScreen from './PaymentDetailScreen';
import ProfileScreen from './ProfileScreen';
import ContributionHistoryScreen from './ContributionHistoryScreen';
import EditProfileScreen from './EditProfileScreen';
import ExpiredReportsScreen from './ExpiredReportsScreen';
import FundingContributionScreen from './FundingContributionScreen';
import PayoutSetupScreen from './PayoutSetupScreen';
import PublicProfileScreen from './PublicProfileScreen';
import RankCelebrationManager from './RankCelebrationManager';
import ReportUserScreen from './ReportUserScreen';
import ResetPasswordScreen from './ResetPasswordScreen';
import { handleAuthCallbackUrl, isBrowserAuthInProgress, AUTH_CALLBACK_PATH, PASSWORD_RECOVERY_PATH, signOut } from './lib/auth';
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
import { colors, fonts } from './lib/theme';

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
    <ScrollView
      style={styles.container}
      contentContainerStyle={[styles.homeContent, { minHeight: height }]}
      alwaysBounceVertical={false}
      showsVerticalScrollIndicator={false}
    >
      <Image
        source={require('./assets/LB_Logo_PNG.png')}
        style={[styles.logo, { width: logoSize, height: logoSize }]}
        resizeMode="contain"
      />
      <Text style={styles.title}>A cleaner community starts here.</Text>
      <Text style={styles.subtitle}>Report litter, help clean it up, or fund a local cleanup.</Text>

      <PrimaryButton label="Explore the Map" style={styles.primaryButton} onPress={async () => { await markWelcomeSeen(); navigation.replace('App', { screen: 'Map' }); }} />
      <TextLink tone="muted" label="Sign in or create account" style={styles.secondaryButton} onPress={async () => { await markWelcomeSeen(); navigation.navigate('Auth'); }} />
      <StatusBar hidden={false} style="dark" backgroundColor={colors.white} />
    </ScrollView>
  );
}

function LoadingScreen({ onLogoReady }) {
  return <BrandedLoadingState logoOnly onLogoReady={onLogoReady} />;
}

function ProfileLoadError() {
  const { refreshProfile } = useProfile();
  return (
    <ScrollView
      style={styles.errorStateScroll}
      contentContainerStyle={styles.errorState}
      alwaysBounceVertical={false}
      showsVerticalScrollIndicator={false}
    >
      <Text style={styles.errorTitle}>We couldn’t load your profile</Text>
      <Text style={styles.errorText}>Check your connection and try again.</Text>
      <PrimaryButton label="Try again" style={styles.primaryButton} onPress={refreshProfile} />
      <TextLink label="Sign out" style={styles.textButton} onPress={signOut} />
    </ScrollView>
  );
}

function AppNavigation({
  session,
  passwordRecovery,
  onLaunchReady,
  onRecoveryComplete,
  welcomeSeen,
}) {
  const { profile, loading, pendingAction, setPendingAction } = useProfile();
  const permanent = isPermanentUser(session?.user);
  const navigationRef = useNavigationContainerRef();
  const pendingNotificationData = useRef(null);
  const handledNotificationId = useRef(null);

  useEffect(() => {
    const firstDestinationReady = !permanent
      || passwordRecovery
      || (!loading && (!profile || !profile.profile_completed_at));
    if (!firstDestinationReady) return undefined;

    const revealFrame = requestAnimationFrame(onLaunchReady);
    return () => cancelAnimationFrame(revealFrame);
  }, [loading, onLaunchReady, passwordRecovery, permanent, profile]);

  const resumePendingAction = useCallback(() => {
    const destination = authenticatedActionDestination({ permanent, profileComplete: Boolean(profile?.profile_completed_at), intent: pendingAction });
    if (!destination || !navigationRef.isReady()) return;
    setPendingAction(null);
    navigationRef.navigate(destination.name, destination.params);
  }, [permanent, profile?.profile_completed_at, pendingAction, navigationRef, setPendingAction]);
  useEffect(() => { resumePendingAction(); }, [resumePendingAction]);

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
    if (destination.url) {
      Linking.openURL(destination.url).catch(() => Alert.alert('Couldn’t open the inbox', 'Visit litterbugs.app/admin to review community reports.'));
    } else {
      navigationRef.navigate(destination.name, destination.params);
    }
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
        onCancel={onRecoveryComplete}
        onComplete={() => {
          onRecoveryComplete();
          Alert.alert('Password updated', 'Your new password is ready to use.');
        }}
      />
    );
  }

  if (permanent && loading && !profile) return <LoadingScreen />;
  if (permanent && !loading && !profile) return <ProfileLoadError />;

  const initialRouteName = permanent
    ? profile?.profile_completed_at ? 'App' : 'CompleteProfile'
    : welcomeSeen ? 'App' : 'Home';

  const headerOptions = {
    headerShown: true,
    headerShadowVisible: false,
    headerTintColor: colors.primary,
    // Website page titles: dark Nunito Black; the back arrow stays purple.
    headerTitleStyle: { color: colors.ink, fontFamily: fonts.heading, fontSize: 20 },
    headerStyle: { backgroundColor: colors.white },
    headerBackTitle: 'Back',
    headerBackTitleVisible: false,
    headerBackButtonDisplayMode: 'minimal',
  };

  return (
    <NavigationContainer
      key={permanent ? 'permanent-navigation' : 'signed-out-navigation'}
      ref={navigationRef}
      linking={navigationLinking}
      onReady={() => {
        trackScreen(navigationRef.getCurrentRoute()?.name);
        resumePendingAction();
        if (pendingNotificationData.current) {
          openNotificationData(pendingNotificationData.current);
        }
      }}
      onStateChange={() => trackScreen(navigationRef.getCurrentRoute()?.name)}
    >
      <Stack.Navigator
        key={permanent ? 'permanent' : 'signed-out'}
        initialRouteName={initialRouteName}
        // Android pushes slide in from the right like iOS, instead of the system default.
        screenOptions={{ headerShown: false, animation: Platform.OS === 'android' ? 'slide_from_right' : 'default' }}
      >
        <Stack.Screen name="Home" component={HomeScreen} />
        <Stack.Screen name="App">
          {(screenProps) => (
            <AppTabs {...screenProps} onLaunchReady={onLaunchReady} />
          )}
        </Stack.Screen>
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
          options={{ ...headerOptions, title: '' }} // the bee heading below names this screen
        />
        <Stack.Screen
          name="PayoutSetup"
          component={PayoutSetupScreen}
          options={{ ...headerOptions, title: 'Cleanup payouts' }}
        />
        <Stack.Screen name="PaymentDetail" component={PaymentDetailScreen} options={{ ...headerOptions, title: 'Payment details' }} />
        <Stack.Screen name="MyActivity" component={ProfileScreen} initialParams={{ section: 'activity' }} options={{ ...headerOptions, title: 'My activity' }} />
        <Stack.Screen name="Payments" component={ProfileScreen} initialParams={{ section: 'payments' }} options={{ ...headerOptions, title: 'Payments' }} />
        <Stack.Screen name="SignInMethods" component={SignInMethodsScreen} options={{ ...headerOptions, title: 'Sign-in methods' }} />
        <Stack.Screen name="SettingsInfo" component={SettingsInfoScreen} options={{ ...headerOptions, title: 'Settings' }} />
        <Stack.Screen name="Settings" component={ProfileScreen} initialParams={{ section: 'settings' }} options={{ ...headerOptions, title: 'Settings' }} />
        <Stack.Screen
          name="ContributionHistory"
          component={ContributionHistoryScreen}
          options={{ ...headerOptions, title: 'Payment activity' }}
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
          options={{ ...headerOptions, title: 'Report user', presentation: 'modal', animation: Platform.OS === 'android' ? 'slide_from_bottom' : 'default' }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
}

export default function App() {
  const [discoveryMemory, setDiscoveryMemory] = useState(null);
  useEffect(() => { loadDiscoveryMemory().then(setDiscoveryMemory); }, []);
  const [session, setSession] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [passwordRecovery, setPasswordRecovery] = useState(false);
  const [launchReady, setLaunchReady] = useState(false);
  const nativeSplashHidden = useRef(false);
  // Screens wait (behind the launch logo) for Nunito: Android keeps the system font on
  // any heading drawn before the font finished loading. Never wait more than 3 seconds.
  const [fontsLoaded, fontError] = useFonts({ [fonts.heading]: require('./assets/fonts/Nunito-Black.ttf') });
  const [fontWaitOver, setFontWaitOver] = useState(false);
  useEffect(() => { const timer = setTimeout(() => setFontWaitOver(true), 3000); return () => clearTimeout(timer); }, []);
  const fontsReady = fontsLoaded || Boolean(fontError) || fontWaitOver;

  useEffect(() => {
    if (!session?.access_token) return;
    return watchNativeProviderAuthorization();
  }, [session?.access_token]);

  const markLaunchReady = useCallback(() => {
    setLaunchReady(true);
  }, []);

  const hideNativeSplash = useCallback(() => {
    if (nativeSplashHidden.current) return;
    nativeSplashHidden.current = true;
    SplashScreen.hideAsync().catch((error) => {
      console.log('Splash screen hide error:', error);
    });
  }, []);

  useEffect(() => {
    // A warm launch can remove the React loading logo before its onLoad fires.
    // The native splash must still leave once the destination is ready.
    if (launchReady) hideNativeSplash();
  }, [launchReady, hideNativeSplash]);

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
      // The active browser flow owns its callback and user feedback. Cold-start
      // and password-recovery links still use the global listener.
      if (isBrowserAuthInProgress() && url.startsWith(`litterbugs://${AUTH_CALLBACK_PATH}`)) return;
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
      await retryDeletedAccountDataCleanup().catch(() => {});
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

  return (
    <View style={styles.appRoot}>
      <StatusBar style="dark" backgroundColor={colors.white} />
      {!authLoading && discoveryMemory && fontsReady ? (
        <SessionProvider session={session}>
          <ProfileProvider>
            <ReportsProvider initialDiscovery={discoveryMemory.lastMap}>
              <AppNavigation
                welcomeSeen={discoveryMemory.welcomeSeen}
                session={session}
                passwordRecovery={passwordRecovery}
                onLaunchReady={markLaunchReady}
                onRecoveryComplete={() => setPasswordRecovery(false)}
              />
              <RankCelebrationManager />
            </ReportsProvider>
          </ProfileProvider>
        </SessionProvider>
      ) : null}
      {!launchReady ? (
        <View style={styles.launchOverlay}>
          <LoadingScreen onLogoReady={hideNativeSplash} />
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  appRoot: {
    flex: 1,
    backgroundColor: colors.white,
  },
  launchOverlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 10000,
    backgroundColor: colors.white,
    elevation: 10000,
  },
  container: {
    flex: 1,
    backgroundColor: colors.white,
  },
  homeContent: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 32,
    paddingHorizontal: 24,
    backgroundColor: colors.white,
  },
  logo: { marginBottom: 12 },
  title: { maxWidth: 330, color: colors.ink, fontSize: 30, lineHeight: 36, fontFamily: fonts.heading, textAlign: 'center' },
  subtitle: {
    maxWidth: 330,
    marginTop: 10,
    marginBottom: 34,
    color: colors.muted,
    fontSize: 16,
    lineHeight: 23,
    textAlign: 'center',
  },
  primaryButton: { width: '100%', maxWidth: 390 },
  secondaryButton: { minHeight: 52, marginTop: 12 },
  errorState: {
    flexGrow: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 32,
    paddingHorizontal: 28,
    backgroundColor: colors.white,
  },
  errorStateScroll: {
    flex: 1,
    backgroundColor: colors.white,
  },
  errorTitle: { color: colors.ink, fontSize: 22, fontFamily: fonts.heading, textAlign: 'center' },
  errorText: { marginVertical: 10, color: colors.muted, fontSize: 15, textAlign: 'center' },
  textButton: { marginTop: 8 },
});
