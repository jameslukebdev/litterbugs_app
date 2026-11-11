import { reportDraftSummary as loadReportDraft } from './lib/savedReportDraft';
import ActionRow from './components/NavigationRow';
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { useScrollToTop } from '@react-navigation/native';
import {
  AccessibilityInfo,
  Alert,
  Animated,
  Easing,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import useFocusedResource from './lib/useFocusedResource';
import PointsExplanation from './components/PointsExplanation';
import { Image } from 'expo-image';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import ProfileAvatar from './ProfileAvatar';
import { CompletedCleanupRow, CurrentCleanupRow, ReportActivityRow } from './components/ActivityRows';
import { deleteCurrentAccount, signOut } from './lib/auth';
import { openSupport } from './lib/support';
import * as WebBrowser from 'expo-web-browser';
import { loadCurrentUserCleanupSummary } from './lib/cleanup';
import { ReporterEarnings } from './components/ReporterEarnings';
import { loadCleanupFeatureFlags, loadPayoutStatus } from './lib/funding';
import { emptyCleanupSummary } from './lib/cleanupProfile';
import { getBottomNavClearance } from './lib/navigationLayout';
import { payoutConnectionPresentation } from './lib/payoutConnectionPresentation';
import { useProfile } from './lib/profile';
import { getRankAsset } from './lib/rankAssets';
import { getRankForPoints, RANKS } from './lib/ranking';
import { loadRanking } from './lib/rankingService';
import { isPermanentUser } from './lib/reportAccess';
import useAccountReports from './lib/useAccountReports';
import { groupAccountReports } from './lib/accountReports';
import { useSession } from './lib/session';
import { colors, fonts } from './lib/theme';
import BrandBug from './components/BrandBug';
import LoadingBee from './components/LoadingBee';
import { EmptyState, LoadFailure, PillTabs, PrimaryButton, PullRefresh } from './components/ui';

const TERMS_URL = 'https://litterbugs.app/terms';
const PRIVACY_URL = 'https://litterbugs.app/privacy';
const CLEANUP_POLICY_URL = 'https://litterbugs.app/cleanup-policy';
const CLEANUP_SAFETY_URL = 'https://litterbugs.app/cleanup-safety';

const openLitterbugsLink = async (url) => {
  try {
    await WebBrowser.openBrowserAsync(url, { toolbarColor: colors.white, controlsColor: colors.primary, presentationStyle: WebBrowser.WebBrowserPresentationStyle.PAGE_SHEET });
  } catch (error) {
    Alert.alert('Can’t open link', 'Unable to open this Litterbugs page on your device.');
  }
};

function StripeConnectionStatus({ status, loading, error, onRetry }) {
  const presentation = payoutConnectionPresentation({ status, loading, error });
  if (loading && !status) return <View style={styles.stripeConnectionRow} />;

  return (
    <TouchableOpacity
      style={[
        styles.stripeConnectionRow,
      ]}
      onPress={error ? onRetry : undefined}
      disabled={!error}
      activeOpacity={0.72}
      accessible
      accessibilityRole={error ? 'button' : undefined}
      accessibilityLabel={presentation.label}
      accessibilityHint={error ? 'Retries checking your Stripe payout connection' : undefined}
    >
      {loading && !status ? (
        <Ionicons name="wallet-outline" size={23} color={colors.muted} />
      ) : (
        <Ionicons name={presentation.icon} size={23} color={presentation.color} />
      )}
      <Text style={[styles.stripeConnectionText, { color: presentation.color }]}>
        {presentation.label}
      </Text>
      {presentation.detail ? (
        <Text style={[styles.stripeConnectionDetail, { color: presentation.color }]}>
          {presentation.detail}
        </Text>
      ) : null}
    </TouchableOpacity>
  );
}

// The bar fills from empty when the rank arrives, with the cocoon on its leading
// edge; with reduced motion it simply shows the result.
function RankProgressBar({ percent, label }) {
  const fill = useRef(new Animated.Value(0)).current;
  const [trackWidth, setTrackWidth] = useState(0);
  useEffect(() => {
    let cancelled = false;
    AccessibilityInfo.isReduceMotionEnabled?.()
      .then((reduce) => {
        if (cancelled) return;
        if (reduce) fill.setValue(percent);
        else Animated.timing(fill, { toValue: percent, duration: 1500, delay: 250, easing: Easing.bezier(0.4, 0, 0.2, 1), useNativeDriver: false }).start();
      })
      .catch(() => fill.setValue(percent));
    return () => { cancelled = true; };
  }, [fill, percent]);
  const filled = fill.interpolate({ inputRange: [0, 100], outputRange: [0, trackWidth], extrapolate: 'clamp' });

  return (
    <View
      style={styles.rankProgressTrack}
      onLayout={(event) => setTrackWidth(event.nativeEvent.layout.width)}
      accessible
      accessibilityRole="progressbar"
      accessibilityLabel={label}
      accessibilityValue={{ min: 0, max: 100, now: percent }}
    >
      <Animated.View style={[styles.rankProgressFill, { width: filled }]} />
      <Animated.View style={[styles.rankProgressMarker, { transform: [{ translateX: filled }] }]} pointerEvents="none">
        <BrandBug kind="cocoon" size={30} />
      </Animated.View>
    </View>
  );
}

function RankingCard({ ranking, loading, error, onRetry }) {
  if (!ranking) {
    // One quiet loader, or one failure with a retry, while the rank is unknown.
    return (
      <View style={styles.rankCard}>
        {loading || !error
          ? <LoadingBee label="Loading rank" size={48} style={styles.rankPending} />
          : <LoadFailure title="Couldn’t load your rank" onRetry={onRetry} style={styles.rankPending} />}
      </View>
    );
  }

  const rankDefinition = getRankForPoints(ranking.points);
  const pointsLabel = `${ranking.points.toLocaleString()} ${ranking.points === 1 ? 'point' : 'points'}`;
  const remainingLabel = `${ranking.pointsRemaining.toLocaleString()} ${ranking.pointsRemaining === 1 ? 'point' : 'points'}`;
  const progressPercent = Math.round(ranking.progress * 100);
  const nextRankDefinition = RANKS.find(({ name }) => name === ranking.nextRank);

  return (
    <View style={styles.rankCard}>
      <View style={styles.rankSummaryRow}>
        <View style={styles.rankArtworkStage}>
          <Image
            source={getRankAsset(rankDefinition)}
            contentFit="contain"
            transition={120}
            style={styles.rankArtwork}
            accessibilityLabel={`${ranking.rank} rank artwork`}
          />
        </View>
        <View style={styles.rankSummaryCopy}>
          <Text style={styles.rankName}>{ranking.rank}</Text>
          <Text style={styles.rankEyebrow}>Your rank · {pointsLabel}</Text>
        </View>
      </View>

      {/* Website rank: the bar fills while the cocoon rides its leading edge, then
          the points still to go sit beside the next rank's bug. */}
      <View style={styles.rankProgressSection}>
        <RankProgressBar percent={ranking.nextRank ? progressPercent : 100} label={ranking.nextRank ? `Progress to ${ranking.nextRank}` : 'Highest rank reached'} />
        {ranking.nextRank ? (
          <View style={styles.rankNextRow}>
            <Image source={getRankAsset(nextRankDefinition)} contentFit="contain" style={styles.rankNextArtwork} accessible={false} />
            <Text style={styles.rankNextText}>
              <Text style={styles.rankNextPoints}>{remainingLabel}</Text> to {ranking.nextRank}
            </Text>
          </View>
        ) : (
          <Text style={styles.rankNextText}>Highest rank reached</Text>
        )}
      </View>

      {error ? (
        <TouchableOpacity onPress={onRetry} activeOpacity={0.72} accessibilityRole="button">
          <Text style={styles.rankRefreshWarning}>Couldn’t refresh rank · Tap to retry</Text>
        </TouchableOpacity>
      ) : null}
    </View>
  );
}

function SignedOutProfile({ navigation, bottomPadding }) {
  return (
    <ScrollView contentContainerStyle={[styles.signedOutContent, { paddingBottom: bottomPadding }]}>
      {/* No tinted icon circle; the ladybug labels reporting, as on the website. */}
      <BrandBug kind="ladybug" size={44} />
      <Text style={styles.signedOutTitle}>Make your reports yours</Text>
      <Text style={styles.signedOutText}>
        Sign in to submit litter reports, build your public profile, and keep your activity connected across devices.
      </Text>
      <PrimaryButton label="Sign in or create account" onPress={() => navigation.navigate('Auth')} style={styles.primaryButton} />
      <View style={styles.signedOutSupport}>
        <ActionRow appearance="profile" divided={true} label="Get help" icon="help-circle-outline" onPress={() => navigation.navigate('SettingsInfo', { topic: 'help' })} />
        <ActionRow appearance="profile" divided={true} label="Support Litterbugs" icon="heart-outline" onPress={() => navigation.navigate('SettingsInfo', { topic: 'support' })} />
        <ActionRow appearance="profile" divided={true} label="Terms of use" icon="document-text-outline" onPress={() => openLitterbugsLink(TERMS_URL)} />
        <ActionRow appearance="profile" divided={false} label="Privacy policy" icon="shield-checkmark-outline" onPress={() => openLitterbugsLink(PRIVACY_URL)} />
      </View>
    </ScrollView>
  );
}

export default function ProfileScreen({ navigation, route }) {
  const { fontScale } = useWindowDimensions();
  const section = route?.params?.section || 'overview';
  const [activityView, setActivityView] = useState('current');
  const [pullRefreshing, setPullRefreshing] = useState(false);
  const openScreen = (name, params) => navigation.navigate(name, params);
  const openAppTab = (screen, params) => section === 'overview' ? navigation.navigate(screen, params) : navigation.popTo('App', { screen, params });
  const openReport = reportId => openAppTab('Map', { reportId });
  const { user } = useSession();
  const permanent = isPermanentUser(user);
  const { profile, refreshProfile, loading } = useProfile();
  const { reports, loading: reportsLoading, error: reportsError, hasLoaded: reportsHaveLoaded, refresh: refreshReports } = useAccountReports(permanent ? user.id : null);
  const insets = useSafeAreaInsets();
  // Tapping the Profile tab again returns the page to the top.
  const scrollRef = useRef(null);
  useScrollToTop(scrollRef);
  const [signingOut, setSigningOut] = useState(false);
  const [deletingAccount, setDeletingAccount] = useState(false);
  const cleanups = useFocusedResource(useCallback(() => loadCurrentUserCleanupSummary(user.id), [user?.id]), { enabled: permanent && section !== 'settings', cacheKey: `cleanups:${user?.id}` });
  const rankingResource = useFocusedResource(useCallback(() => loadRanking(user.id), [user?.id]), { enabled: permanent && section === 'overview', cacheKey: `rank:${user?.id}` });
  const flags = useFocusedResource(useCallback(() => loadCleanupFeatureFlags(), [user?.id]), { enabled: permanent, cacheKey: `funding-flags:${user?.id}` });
  const fundingSchemaReady = flags.hasLoaded;
  const fundingEnabled = fundingSchemaReady && Boolean(flags.data?.payments_enabled && flags.data?.gemini_financial_review_enabled);
  const payout = useFocusedResource(useCallback(() => loadPayoutStatus(), [user?.id]), { enabled: permanent && section === 'payments' && fundingEnabled, cacheKey: `payout:${user?.id}` });
  const cleanupSummary = cleanups.data ?? emptyCleanupSummary();
  const { loading: cleanupsLoading, error: cleanupsError, refresh: refreshCleanups } = cleanups;
  const { data: ranking, loading: rankingLoading, error: rankingError, refresh: refreshRanking } = rankingResource;
  const { data: payoutStatus, loading: payoutStatusLoading, error: payoutStatusError, refresh: refreshPayoutStatus } = payout;
  const savedDraft = useFocusedResource(useCallback(() => loadReportDraft(user.id), [user?.id]), { enabled: permanent && section === 'activity' });
  const accountBusy = signingOut || deletingAccount;
  const bottomPadding = section === 'overview' ? getBottomNavClearance(insets.bottom) + 18 : insets.bottom + 24;

  useLayoutEffect(() => {
    navigation.setOptions({
      headerRight: permanent && section === 'overview' ? () => (
        <TouchableOpacity
          style={styles.headerEditButton}
          hitSlop={6}
          onPress={() => navigation.navigate('EditProfile')}
          accessibilityRole="button"
          accessibilityLabel="Edit profile"
        >
          <Ionicons name="create-outline" size={22} color={colors.primary} />
        </TouchableOpacity>
      ) : undefined,
      headerRightContainerStyle: styles.headerEditButtonContainer,
    });
  }, [navigation, permanent, section]);

  // Website My reports: one list, each row labelled with its state.
  const closedReportIds = useMemo(() => new Set(groupAccountReports(reports).closed.map(({ id }) => id)), [reports]);

  if (!permanent) {
    return <SignedOutProfile navigation={navigation} bottomPadding={bottomPadding} />;
  }

  const handleSignOut = () => {
    if (accountBusy) return;
    Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign Out',
        style: 'destructive',
        onPress: async () => {
          setSigningOut(true);
          try {
            const { error } = await signOut();
            if (error) throw error;
          } catch {
            Alert.alert('Couldn’t sign out', 'Check your connection and try again.');
          } finally {
            setSigningOut(false);
          }
        },
      },
    ]);
  };

  const handleDeleteAccount = () => {
    if (accountBusy) return;
    Alert.alert(
      'Delete Account',
      'This permanently deletes your account and uploaded photos. Community report information remains without your identity. This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete Account',
          style: 'destructive',
          onPress: async () => {
            try {
              setDeletingAccount(true);
              const result = await deleteCurrentAccount();
              if (result.appleManualRevocationRequired) {
                Alert.alert('Your account has been deleted',
                  'You can also remove Litterbugs from Sign in with Apple in your Apple Account settings.'
                  + (result.localCleanupPending ? ' Some saved drafts still need to be cleared; reopen Litterbugs to try again.' : ''), [
                    { text: 'Done', style: 'cancel' },
                    { text: 'Apple Account', onPress: () => WebBrowser.openBrowserAsync('https://account.apple.com/account/manage').catch(() => null) },
                  ]);
              } else if (result.localCleanupPending) {
                Alert.alert('Your account has been deleted', 'Some saved drafts could not be removed from this phone. Reopen Litterbugs to try again, or contact us for help.');
              }
            } catch (error) {
              if (error?.code === 'PAYOUT_PENDING') {
                Alert.alert('A reward is still being sent', 'Contact us for help completing your account deletion.', [
                  { text: 'Cancel', style: 'cancel' },
                  { text: 'Get help', onPress: () => openSupport() },
                ]);
              } else {
                Alert.alert('Couldn’t delete account', 'Please try again or contact support for help.', [
                  { text: 'Cancel', style: 'cancel' },
                  { text: 'Get help', onPress: () => openSupport() },
                ]);
              }
            } finally {
              setDeletingAccount(false);
            }
          },
        },
      ]
    );
  };

  const refresh = async () => {
    setPullRefreshing(true);
    await Promise.allSettled([
      refreshProfile(),
      refreshReports(),
      refreshCleanups(),
      refreshRanking(),
      flags.refresh(),
      ...(fundingEnabled ? [refreshPayoutStatus()] : []),
    ]);
    setPullRefreshing(false);
  };

  return (
    <ScrollView
      ref={scrollRef}
      style={[styles.container, (section === 'overview' || section === 'activity' || section === 'payments' || section === 'settings') && styles.overviewContainer]}
      contentContainerStyle={{ paddingBottom: bottomPadding }}
      showsVerticalScrollIndicator={false}
      refreshControl={<PullRefresh refreshing={pullRefreshing} onRefresh={refresh} />}
    >
      {section === 'overview' ? <>
      <View style={styles.identity}>
        <View style={[styles.identityTop, fontScale > 1.5 && { flexDirection: 'column', alignItems: 'stretch', gap: 12 }]}>
          <View style={styles.identityAvatar}><ProfileAvatar profile={profile} size={64} /></View>
          <View style={[styles.identityCopy, fontScale > 1.5 && { marginLeft: 0 }]}>
            <Text style={styles.name}>{profile?.display_name || 'Profile unavailable'}</Text>
            {profile?.username ? <Text style={styles.username}>@{profile.username}</Text> : null}
            {profile?.location ? (
              <View style={styles.locationRow}>
                <Ionicons name="location-outline" size={15} color={colors.muted} />
                <Text style={styles.location}>{profile.location}</Text>
              </View>
            ) : null}
            <View style={styles.joinedRow}>
              <Text style={styles.joined}>
              Joined {new Date(profile?.created_at || Date.now()).toLocaleDateString(undefined, { month: 'long', year: 'numeric' })}
              </Text>
            </View>
          </View>
        </View>
        {profile?.bio ? <Text style={styles.bio}>{profile.bio}</Text> : null}
        {/* Website profile header: the counts sit with the name, not in a separate box. */}
        <Text style={styles.identityCounts} accessibilityLabel={`${reportsHaveLoaded ? reports.length : 'Loading'} reports, ${cleanups.hasLoaded ? cleanupSummary.counts.completed : 'loading'} cleanups completed`}>
          <Text style={styles.identityCountValue}>{reportsError && !reportsHaveLoaded ? '—' : !reportsHaveLoaded ? '…' : reports.length}</Text>
          {` ${reportsHaveLoaded && reports.length === 1 ? 'report' : 'reports'}     `}
          <Text style={styles.identityCountValue}>{cleanups.hasLoaded ? cleanupSummary.counts.completed : cleanupsError ? '—' : '…'}</Text>
          {` ${cleanups.hasLoaded && cleanupSummary.counts.completed === 1 ? 'cleanup' : 'cleanups'}`}
        </Text>
      </View>

      <View style={styles.rankPanel}>
      <RankingCard
        ranking={ranking}
        loading={rankingLoading}
        error={rankingError}
        onRetry={refreshRanking}
      />

      <PointsExplanation ranking={ranking} appearance="row" />
      </View>

      {cleanupSummary.current.length > 0 ? <View style={[styles.card, styles.continueCleanupCard]}>
        <ActionRow label="Continue cleanup" icon="leaf-outline" onPress={() => openReport(cleanupSummary.current[0].report_id)} />
      </View> : null}
      <View style={[styles.card, styles.overviewActions]}>
        <ActionRow appearance="profile" divided label="My activity" icon="leaf-outline" onPress={() => openScreen('MyActivity')} />
        <ActionRow appearance="profile" divided label="Payments" icon="wallet-outline" onPress={() => openScreen('Payments')} />
        <ActionRow appearance="profile" label="Settings" icon="settings-outline" onPress={() => openScreen('Settings')} />
      </View>
      </> : null}

      {section === 'payments' ? (
        <>
          <Text style={styles.activityHeading}>Cleanup rewards</Text>
          <View style={[styles.card, styles.paymentCard]}>
            {flags.loading && !flags.hasLoaded ? <><View style={styles.stripeConnectionRow} /><ActionRow label="Set up cleanup payouts" icon="card-outline" onPress={() => navigation.navigate('PayoutSetup')} /></> : flags.error ? <ActionRow label="Retry payout availability" icon="refresh-outline" onPress={flags.refresh} /> : fundingEnabled ? <>
            {<StripeConnectionStatus
              status={payoutStatus}
              loading={payoutStatusLoading && !payoutStatus}
              error={payoutStatusError}
              onRetry={refreshPayoutStatus}
            />}
            <ActionRow
              label={payoutStatus?.payoutsEnabled ? 'Review payout details' : 'Set up payouts'}
              icon="card-outline"
              onPress={() => navigation.navigate('PayoutSetup')}
            />
            </> : <Text style={{ padding: 17, color: colors.muted }}>Payout setup is currently unavailable. Your payment history is still accessible below.</Text>}
            <ActionRow
              label="Your contributions & payments"
              icon="receipt-outline"
              onPress={() => navigation.navigate('ContributionHistory')}
            />
          </View>
          <Text style={styles.activityHeading}>Cleanup earnings</Text>
          <View style={styles.card}>
            {cleanupsError && !cleanups.hasLoaded ? <LoadFailure title="Couldn’t load earnings" onRetry={refreshCleanups} /> : cleanupsLoading && !cleanups.hasLoaded ? <LoadingBee label="Loading earnings" size={48} /> : cleanupSummary.completed.filter(attempt => attempt.is_paid).length ? cleanupSummary.completed.filter(attempt => attempt.is_paid).map((attempt, index) => <CompletedCleanupRow key={attempt.id} attempt={attempt} divided={index > 0} onPress={() => openReport(attempt.report_id)} />) : <EmptyState bug="bee" title="No cleanup earnings yet" text="Rewards from your completed paid cleanups will appear here." />}
          </View>
          <ReporterEarnings userId={user.id} onOpenReport={openReport} />
        </>
      ) : null}

      {section === 'activity' ? <>
      {savedDraft.data ? <View style={styles.card}><ActionRow label="Continue draft" icon="create-outline" onPress={() => openAppTab('Map', { resumeDraft: Date.now() })} /><Text style={{ padding: 16, color: colors.muted }}>Saved {new Date(savedDraft.data.savedAt).toLocaleString()}</Text></View> : null}
      {savedDraft.error ? <ActionRow label="Retry loading your draft" icon="refresh-outline" onPress={savedDraft.refresh} /> : null}
      <PillTabs style={styles.activityTabs} stacked={fontScale > 1.5} value={activityView} onChange={setActivityView} options={[['current', 'Current cleanups'], ['history', 'Cleanup history'], ['reports', 'My reports']]} />
      {cleanupsError && cleanups.hasLoaded ? <ActionRow label="Couldn’t update cleanups. Try again" icon="refresh-outline" onPress={refreshCleanups} /> : null}
      {activityView === 'current' ? <>
      <View style={[styles.card, styles.activityList]}>
        {cleanupsLoading && cleanupSummary.current.length === 0 ? (
          <LoadingBee label="Checking your cleanups" size={48} />
        ) : cleanupsError && !cleanups.hasLoaded ? (
          <LoadFailure title="Couldn’t load cleanups" onRetry={refreshCleanups} />
        ) : cleanupSummary.current.length > 0 ? (
          cleanupSummary.current.map((attempt, index) => (
            <CurrentCleanupRow
              key={attempt.id}
              attempt={attempt}
              divided={index > 0}
              onPress={() => openReport(attempt.report_id)}
            />
          ))
        ) : (
          <EmptyState bug="ladybug" title="No current cleanups" text="Cleanups you claim appear here until they’re approved." action={{ label: 'Browse reports', onPress: () => openAppTab('Reports') }} actionStyle="link" />
        )}
      </View>

      </> : null}
      {activityView === 'history' ? <>
      <View style={[styles.card, styles.activityList]}>
        {cleanupsLoading && !cleanups.hasLoaded ? <LoadingBee label="Loading completed cleanups" size={48} /> : cleanupsError && !cleanups.hasLoaded ? <LoadFailure title="Couldn’t load cleanups" onRetry={refreshCleanups} /> : cleanupSummary.completed.length > 0 ? (
          cleanupSummary.completed.map((attempt, index) => (
            <CompletedCleanupRow
              key={attempt.id}
              attempt={attempt}
              divided={index > 0}
              onPress={() => openReport(attempt.report_id)}
            />
          ))
        ) : (
          <EmptyState bug="flower" title="No completed cleanups yet" text="Your completed cleanup history will appear here." />
        )}
      </View>

      </> : null}
      {activityView === 'reports' ? <>
      {reportsError && reportsHaveLoaded ? <ActionRow label="Couldn’t update reports. Try again" icon="refresh-outline" onPress={refreshReports} /> : null}
      <View style={[styles.card, styles.activityList]}>
        {reportsLoading && !reportsHaveLoaded ? <LoadingBee label="Loading your reports" size={48} /> : reportsError && !reportsHaveLoaded ? <LoadFailure title="Couldn’t load your reports" onRetry={refreshReports} /> : reports.length > 0 ? (
          reports.map((report, index) => (
            <ReportActivityRow
              key={report.id}
              report={report}
              closed={closedReportIds.has(report.id)}
              divided={index > 0}
              onPress={() => openReport(report.id)}
            />
          ))
        ) : (
          <EmptyState bug="ladybug" title="No reports yet" text="Reports you submit appear here." />
        )}
      </View>

      {fundingSchemaReady ? <View style={[styles.settingsGroup, { marginTop: 16 }]}><ActionRow appearance="profile" label="Expired reports" icon="calendar-outline" onPress={() => openScreen('ExpiredReports')} /></View> : null}
      </> : null}
      </> : null}

      {section === 'settings' ? <>
        <Text style={styles.settingsHeading}>Your account</Text>
        <View style={styles.settingsGroup}>
          {/* Website settings: the email is a plain row in the account group. */}
          <View style={styles.settingsEmailRow}>
            <Text style={styles.emailLabel}>Email</Text>
            <Text style={styles.emailText} selectable numberOfLines={1}>{user.email || 'Not shared'}</Text>
          </View>
          <ActionRow appearance="profile" divided label="Edit profile" icon="person-outline" onPress={() => openScreen('EditProfile')} />
          <ActionRow appearance="profile" divided label="Sign-in methods" icon="key-outline" onPress={() => openScreen('SignInMethods')} />
          <ActionRow appearance="profile" label="Blocked accounts" icon="ban-outline" onPress={() => openScreen('BlockedAccounts')} />
        </View>
        <Text style={styles.settingsHeading}>Help & community</Text>
        <View style={styles.settingsGroup}>
          <ActionRow appearance="profile" divided label="Get help" icon="help-circle-outline" onPress={() => openScreen('SettingsInfo', { topic: 'help' })} />
          <ActionRow appearance="profile" label="Support Litterbugs" icon="heart-outline" onPress={() => openScreen('SettingsInfo', { topic: 'support' })} />
        </View>
        <Text style={styles.settingsHeading}>Privacy & policies</Text>
        <View style={styles.settingsGroup}>
          <ActionRow appearance="profile" divided label="About photo review" icon="images-outline" onPress={() => openScreen('SettingsInfo', { topic: 'photos' })} />
          <ActionRow appearance="profile" divided label="Cleanup safety" icon="shield-outline" onPress={() => openLitterbugsLink(CLEANUP_SAFETY_URL)} />
          <ActionRow appearance="profile" divided label="Cleanup and reward policy" icon="leaf-outline" onPress={() => openLitterbugsLink(CLEANUP_POLICY_URL)} />
          <ActionRow appearance="profile" divided label="Privacy policy" icon="shield-checkmark-outline" onPress={() => openLitterbugsLink(PRIVACY_URL)} />
          <ActionRow appearance="profile" label="Terms of use" icon="document-text-outline" onPress={() => openLitterbugsLink(TERMS_URL)} />
        </View>
        <View style={[styles.settingsGroup, { marginTop: 24 }]}>
          <ActionRow appearance="profile" label="Sign out" icon="log-out-outline" onPress={handleSignOut} busy={accountBusy} />
        </View>
        <View style={[styles.settingsGroup, { marginTop: 12 }]}>
          <ActionRow appearance="profile" label="Delete account" icon="trash-outline" onPress={handleDeleteAccount} destructive busy={accountBusy} />
        </View>
        <Text style={styles.settingsFootnote}>Account deletion is permanent. You’ll review what happens before confirming.</Text>
      </> : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  settingsEmailRow: { minHeight: 56, paddingHorizontal: 18, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.line, backgroundColor: colors.white },
  settingsHeading: { marginHorizontal: 20, marginTop: 24, marginBottom: 10, fontSize: 17, lineHeight: 22, fontFamily: fonts.heading, color: colors.ink },
  settingsGroup: { marginHorizontal: 20, borderRadius: 18, borderWidth: 1, borderColor: colors.line, overflow: 'hidden', backgroundColor: colors.white },
  settingsFootnote: { marginHorizontal: 24, marginTop: 12, fontSize: 12, lineHeight: 18, color: colors.muted },
  container: { flex: 1, backgroundColor: colors.mist },
  activityTabs: { marginHorizontal: 20, marginTop: 16, marginBottom: 8 },
  activityHeading: { marginHorizontal: 20, marginTop: 16, marginBottom: 12, color: colors.ink, fontSize: 20, lineHeight: 25, fontFamily: fonts.heading },
  overviewContainer: { backgroundColor: colors.white },
  overviewActions: { marginHorizontal: 20, marginTop: 18, borderRadius: 18, borderWidth: 1, borderColor: colors.line },
  continueCleanupCard: {
    marginHorizontal: 20,
    marginTop: 16,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: colors.primaryBorder,
    backgroundColor: colors.white,
    shadowColor: colors.ink,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
  // Website account page: the profile and the rank read as one page, not two boxed cards.
  identity: { marginHorizontal: 20, marginTop: 20, marginBottom: 24, backgroundColor: colors.white },
  identityAvatar: { alignSelf: 'flex-start' },
  identityCounts: { marginTop: 14, color: colors.body, fontSize: 15 },
  identityCountValue: { color: colors.ink, fontSize: 17, fontWeight: '900' },
  identityTop: { flexDirection: 'row', alignItems: 'center' },
  identityCopy: { flex: 1, minWidth: 0, marginLeft: 16 },
  name: { color: colors.ink, fontSize: 22, lineHeight: 27, fontFamily: fonts.heading },
  username: { marginTop: 2, color: colors.muted, fontSize: 14 },
  locationRow: { marginTop: 9, flexDirection: 'row', alignItems: 'center', gap: 4 },
  location: { color: colors.muted, fontSize: 14 },
  bio: { marginTop: 16, color: colors.body, fontSize: 14, lineHeight: 21 },
  joinedRow: { marginTop: 6, flexDirection: 'row', alignItems: 'center', gap: 5 },
  joined: { flexShrink: 1, color: colors.muted, fontSize: 14, lineHeight: 19 },
  headerEditButtonContainer: { paddingRight: 16, justifyContent: 'flex-end' },
  headerEditButton: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  rankPanel: { marginHorizontal: 20, backgroundColor: colors.white },
  rankCard: { paddingBottom: 14 },
  rankPending: { minHeight: 150, padding: 0, backgroundColor: 'transparent' },
  rankSummaryRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 14 },
  rankSummaryCopy: { flex: 1, minWidth: 100 },
  rankEyebrow: { marginTop: 2, color: colors.muted, fontSize: 14, lineHeight: 19, fontWeight: '600' },
  rankArtworkStage: { width: 56, height: 56, alignItems: 'center', justifyContent: 'center' },
  rankArtwork: { width: '100%', height: '100%' },
  rankName: { color: colors.ink, fontSize: 22, lineHeight: 27, fontFamily: fonts.heading },
  rankProgressSection: { width: '100%', marginTop: 20 },
  rankProgressTrack: { height: 10, borderRadius: 10, backgroundColor: colors.edge },
  rankProgressFill: { position: 'absolute', left: 0, top: 0, bottom: 0, borderRadius: 10, backgroundColor: colors.primary },
  rankProgressMarker: { position: 'absolute', left: -15, top: -13 },
  rankNextRow: { marginTop: 12, flexDirection: 'row', alignItems: 'center', gap: 8 },
  rankNextArtwork: { width: 20, height: 20 },
  rankNextText: { marginTop: 0, color: colors.body, fontSize: 14, lineHeight: 20 },
  rankNextPoints: { color: colors.ink, fontWeight: '700' },
  rankRefreshWarning: { marginTop: 15, color: colors.body, fontSize: 13, fontWeight: '700', textAlign: 'center' },
  card: { marginHorizontal: 20, overflow: 'hidden', borderRadius: 18, backgroundColor: colors.white },
  activityList: { marginTop: 16, borderWidth: 1, borderColor: colors.line },
  paymentCard: { borderWidth: 1, borderColor: colors.line, borderRadius: 18 },
  // Payout status: coloured icon and words on white, as on the website.
  stripeConnectionRow: { minHeight: 54, paddingHorizontal: 17, flexDirection: 'row', alignItems: 'center', gap: 9, backgroundColor: colors.white },
  stripeConnectionText: { flex: 1, fontSize: 15, lineHeight: 20, fontWeight: '700' },
  stripeConnectionDetail: { fontSize: 12, fontWeight: '800' },
  emailLabel: { color: colors.ink, fontSize: 16, fontWeight: '600' },
  emailText: { flexShrink: 1, color: colors.muted, fontSize: 15, fontWeight: '700' },
  signedOutContent: { flexGrow: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 24, backgroundColor: colors.white },
  signedOutTitle: { marginTop: 20, color: colors.ink, fontSize: 24, fontFamily: fonts.heading, textAlign: 'center' },
  signedOutText: { maxWidth: 360, marginTop: 10, color: colors.muted, fontSize: 15, lineHeight: 22, textAlign: 'center' },
  primaryButton: { width: '100%', maxWidth: 390, marginTop: 24 },
  signedOutSupport: { alignSelf: 'stretch', marginTop: 28, borderRadius: 18, borderWidth: 1, borderColor: colors.line, overflow: 'hidden', backgroundColor: colors.white },
});
