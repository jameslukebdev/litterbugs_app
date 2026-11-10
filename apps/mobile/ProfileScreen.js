import { reportDraftSummary as loadReportDraft } from './lib/savedReportDraft';
import ActionRow from './components/NavigationRow';
import { useCallback, useEffect, useLayoutEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  RefreshControl,
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
import ProfileReportList from './ProfileReportList';
import { deleteCurrentAccount, signOut } from './lib/auth';
import { openSupport } from './lib/support';
import * as WebBrowser from 'expo-web-browser';
import { loadCurrentUserCleanupSummary } from './lib/cleanup';
import { cleanupStatusPresentation } from './lib/cleanupEligibility';
import { ReporterEarnings } from './components/ReporterEarnings';
import { formatUsd, loadCleanupFeatureFlags, loadPayoutStatus } from './lib/funding';
import {
  cleanupApprovalLabel,
  emptyCleanupSummary,
} from './lib/cleanupProfile';
import { getBottomNavClearance } from './lib/navigationLayout';
import { payoutConnectionPresentation } from './lib/payoutConnectionPresentation';
import { useProfile } from './lib/profile';
import { getRankAsset } from './lib/rankAssets';
import { getRankForPoints } from './lib/ranking';
import { loadRanking } from './lib/rankingService';
import { isPermanentUser } from './lib/reportAccess';
import useAccountReports from './lib/useAccountReports';
import { groupAccountReports } from './lib/accountReports';
import { useSession } from './lib/session';
import { colors, fonts } from './lib/theme';
import BrandBug from './components/BrandBug';

const TERMS_URL = 'https://litterbugs.app/terms';
const PRIVACY_URL = 'https://litterbugs.app/privacy';
const CLEANUP_POLICY_URL = 'https://litterbugs.app/cleanup-policy';

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

function ActiveCleanupRow({ attempt, onPress, divided }) {
  const presentation = cleanupStatusPresentation(
    { cleanup_state: attempt.status },
    true
  );
  const deadline = attempt.status === 'claimed' && attempt.claim_expires_at
    ? `Complete by ${new Date(attempt.claim_expires_at).toLocaleString()}`
    : presentation?.description;
  const paidStatus = attempt.dispute_status === 'open'
    ? 'Reward paused for dispute review'
      : attempt.financial_review_status === 'admin_review'
      ? 'Reward paused for review'
      : attempt.financial_review_status === 'better_photos'
        ? 'Replacement photos requested'
      : attempt.first_paid_admin_status === 'pending'
        ? 'First reward is being reviewed'
        : attempt.financial_review_status === 'passed'
          ? 'Reward in 48-hour dispute window'
          : attempt.financial_review_status === 'queued'
            ? 'Photos are being reviewed'
            : attempt.status === 'claimed'
              ? 'Reward held for this cleanup'
              : 'Reward pending';

  return (
    <TouchableOpacity
      style={[styles.activeCleanupRow, divided && styles.activeCleanupDivider]}
      onPress={onPress}
      activeOpacity={0.72}
      accessibilityRole="button"
      accessibilityLabel={`Return to ${attempt.report?.title || 'active cleanup'}`}
      accessibilityHint="Opens the claimed cleanup report on the map"
    >
      <View style={styles.activeCleanupIcon}>
        <Ionicons name={presentation?.icon || 'time-outline'} size={24} color={colors.muted} />
      </View>
      <View style={styles.activeCleanupCopy}>
        <Text style={styles.activeCleanupTitle} numberOfLines={2}>
          {attempt.report?.title || 'Litter cleanup'}
        </Text>
        <Text style={styles.activeCleanupStatus}>{presentation?.title}</Text>
        {attempt.is_paid ? (
          <Text style={styles.activeCleanupReward}>
            {formatUsd(attempt.reward_amount_cents)} · {paidStatus}
          </Text>
        ) : null}
        <Text style={styles.activeCleanupDeadline}>{deadline}</Text>
        <Text style={styles.activeCleanupLink}>Return to cleanup</Text>
      </View>
      <Ionicons name="chevron-forward" size={22} color={colors.muted} />
    </TouchableOpacity>
  );
}

function CleanupStat({ value, label, divided }) {
  return (
    <View testID={`cleanup-stat-${label}`} style={[styles.cleanupStat, divided && styles.cleanupStatDivider]}>
      <Text testID={`cleanup-value-${label}`} style={styles.cleanupStatValue}>{value}</Text>
      <View style={styles.cleanupStatLabelContainer}>
        <Text testID={`cleanup-label-${label}`} style={styles.cleanupStatLabel}>{label}</Text>
      </View>
    </View>
  );
}

function CompletedCleanupRow({ attempt, onPress, divided }) {
  const completedDate = attempt.completed_at
    ? new Date(attempt.completed_at).toLocaleDateString()
    : 'Date unavailable';
  const payoutStatus = {
    blocked: 'Awaiting release',
    pending: 'Reward pending',
    processing: 'Sending reward',
    transferred: 'Reward sent',
    failed: 'Reward needs attention',
  }[attempt.payout_status] || 'Payout status unavailable';

  return (
    <TouchableOpacity
      style={[styles.completedCleanupRow, divided && styles.completedCleanupDivider]}
      onPress={onPress}
      activeOpacity={0.72}
      accessibilityRole="button"
      accessibilityLabel={`Open completed cleanup ${attempt.report?.title || ''}`.trim()}
    >
      <View style={styles.completedCleanupIcon}>
        <Ionicons name="checkmark" size={22} color={colors.white} />
      </View>
      <View style={styles.completedCleanupCopy}>
        <Text style={styles.completedCleanupTitle} numberOfLines={2}>
          {attempt.report?.title || 'Completed litter cleanup'}
        </Text>
        <Text style={styles.completedCleanupMeta}>
          {completedDate} · {cleanupApprovalLabel(attempt.approval_method)}
        </Text>
        {attempt.is_paid ? (
          <Text style={styles.completedCleanupReward}>
            {formatUsd(attempt.reward_amount_cents)} · {payoutStatus}
          </Text>
        ) : null}
      </View>
      <Ionicons name="chevron-forward" size={22} color={colors.muted} />
    </TouchableOpacity>
  );
}

function RankingCard({ ranking, loading, error, onRetry }) {
  if (!ranking) {
    const showingLoader = loading || !error;

    return (
      <TouchableOpacity
        style={styles.rankCard}
        onPress={error ? onRetry : undefined}
        disabled={!error}
        activeOpacity={0.76}
        accessibilityRole={error ? 'button' : undefined}
        accessibilityLabel={error ? 'Retry loading rank' : 'Loading rank'}
      >
        <View style={styles.rankSummaryRow}>
          <View style={styles.rankArtworkStage}><Ionicons name={showingLoader ? 'ribbon-outline' : 'cloud-offline-outline'} size={34} color={colors.primary} /></View>
          <View style={styles.rankSummaryCopy}>
            <Text style={styles.rankEyebrow}>Community rank</Text>
            <Text style={styles.rankName}>{showingLoader ? 'Loading…' : 'Unavailable'}</Text>
          </View>
          <Text style={styles.rankPoints}>—</Text>
        </View>
        <View style={styles.rankProgressSection}>
          <View style={styles.rankProgressHeader}><Text style={styles.rankProgressTitle}>{error ? 'Tap to try again' : 'Your progress'}</Text><Text style={styles.rankProgressPercent}>—</Text></View>
          <View style={styles.rankProgressTrack} />
          <Text style={styles.rankRemaining}>{error ? 'Couldn’t load your rank' : 'Loading your rank…'}</Text>
        </View>
      </TouchableOpacity>
    );
  }

  const rankDefinition = getRankForPoints(ranking.points);
  const pointsLabel = `${ranking.points.toLocaleString()} ${ranking.points === 1 ? 'point' : 'points'}`;
  const remainingLabel = `${ranking.pointsRemaining.toLocaleString()} ${ranking.pointsRemaining === 1 ? 'point' : 'points'}`;
  const progressPercent = Math.round(ranking.progress * 100);

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

      {ranking.nextRank ? (
        <View style={styles.rankProgressSection}>
          <View style={styles.rankProgressHeader}>
            <Text style={styles.rankProgressTitle}>Next rank: {ranking.nextRank}</Text>
            <Text style={styles.rankProgressPercent}>{progressPercent}%</Text>
          </View>
          <View
            style={styles.rankProgressTrack}
            accessible
            accessibilityRole="progressbar"
            accessibilityLabel={`Progress to ${ranking.nextRank}`}
            accessibilityValue={{ min: 0, max: 100, now: progressPercent }}
          >
            <View style={[styles.rankProgressFill, { width: `${progressPercent}%` }]} />
          </View>
          <Text style={styles.rankRemaining}>
            {remainingLabel} until {ranking.nextRank}
          </Text>
        </View>
      ) : (
        <View style={styles.highestRankBadge}>
          <Ionicons name="sparkles" size={20} color={colors.body} />
          <Text style={styles.highestRankText}>Highest Rank Achieved</Text>
        </View>
      )}

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
      <TouchableOpacity
        style={styles.primaryButton}
        onPress={() => navigation.navigate('Auth')}
        accessibilityRole="button"
      >
        <Text style={styles.primaryButtonText}>Sign in or create account</Text>
      </TouchableOpacity>
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
  const [reportView, setReportView] = useState('active');
  const insets = useSafeAreaInsets();
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

  const reportGroups = useMemo(() => groupAccountReports(reports), [reports]);

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
      style={[styles.container, (section === 'overview' || section === 'activity' || section === 'payments' || section === 'settings') && styles.overviewContainer]}
      contentContainerStyle={{ paddingBottom: bottomPadding }}
      showsVerticalScrollIndicator={false}
      refreshControl={<RefreshControl refreshing={pullRefreshing} onRefresh={refresh} tintColor={colors.primary} />}
    >
      {section === 'overview' ? <>
      <View style={styles.identity}>
        <View style={[styles.identityTop, fontScale > 1.5 && { flexDirection: 'column', alignItems: 'stretch', gap: 12 }]}>
          <View style={styles.identityAvatar}><ProfileAvatar profile={profile} size={76} /></View>
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
            {cleanupsError && !cleanups.hasLoaded ? <ActionRow label="Retry loading earnings" icon="refresh-outline" onPress={refreshCleanups} /> : cleanupsLoading && !cleanups.hasLoaded ? <Text style={{ padding: 20, color: colors.muted }}>Loading earnings…</Text> : cleanupSummary.completed.filter(attempt => attempt.is_paid).length ? cleanupSummary.completed.filter(attempt => attempt.is_paid).map((attempt, index) => <CompletedCleanupRow key={attempt.id} attempt={attempt} divided={index > 0} onPress={() => openReport(attempt.report_id)} />) : <View style={styles.completedCleanupEmpty}><BrandBug kind="bee" size={36} /><Text style={styles.activeCleanupEmptyTitle}>No cleanup earnings yet</Text><Text style={styles.activeCleanupEmptyText}>Rewards from your completed paid cleanups will appear here.</Text></View>}
          </View>
          <ReporterEarnings userId={user.id} onOpenReport={openReport} />
        </>
      ) : null}

      {section === 'activity' ? <>
      {savedDraft.data ? <View style={styles.card}><ActionRow label="Continue draft" icon="create-outline" onPress={() => openAppTab('Map', { resumeDraft: Date.now() })} /><Text style={{ padding: 16, color: colors.muted }}>Saved {new Date(savedDraft.data.savedAt).toLocaleString()}</Text></View> : null}
      {savedDraft.error ? <ActionRow label="Retry loading your draft" icon="refresh-outline" onPress={savedDraft.refresh} /> : null}
      <View style={[styles.activityTabs, fontScale > 1.5 && { flexDirection: 'column' }]}>
        {[['current', 'Current cleanups'], ['history', 'Cleanup history'], ['reports', 'My reports']].map(([value, label]) => <TouchableOpacity key={value} accessibilityRole="tab" accessibilityState={{ selected: activityView === value }} onPress={() => setActivityView(value)} style={[styles.activityTab, activityView === value && styles.activityTabSelected]}><Text style={[styles.activityTabText, activityView === value && { color: colors.primaryDark }]}>{label}</Text></TouchableOpacity>)}
      </View>
      {activityView !== 'reports' ? <>
      <Text style={styles.activityHeading}>Cleanups you performed</Text>
      <View style={styles.cleanupStatsCard}>
        <CleanupStat value={cleanups.hasLoaded ? cleanupSummary.counts.completed : '—'} label="Completed" />
        <CleanupStat value={cleanups.hasLoaded ? cleanupSummary.counts.awaitingReview : '—'} label="Awaiting review" divided />
        <CleanupStat value={cleanups.hasLoaded ? cleanupSummary.counts.active : '—'} label="Active" divided />
      </View>
      </> : null}

      {cleanupsError && cleanups.hasLoaded ? <ActionRow label="Couldn’t update cleanups. Try again" icon="refresh-outline" onPress={refreshCleanups} /> : null}
      {activityView === 'current' ? <>
      <Text style={styles.subsectionTitle}>Current cleanups</Text>
      <View style={[styles.card, styles.activeCleanupCard]}>
        {cleanupsLoading && cleanupSummary.current.length === 0 ? (
          <View style={styles.activeCleanupEmpty}>
            <ActivityIndicator color={colors.muted} />
            <Text style={styles.activeCleanupEmptyText}>Checking your cleanups…</Text>
          </View>
        ) : cleanupsError && !cleanups.hasLoaded ? (
          <TouchableOpacity style={styles.activeCleanupEmpty} onPress={refreshCleanups}>
            <Ionicons name="cloud-offline-outline" size={27} color={colors.muted} />
            <Text style={styles.activeCleanupEmptyTitle}>Couldn’t load cleanups</Text>
            <Text style={styles.activeCleanupEmptyText}>Tap to try again.</Text>
          </TouchableOpacity>
        ) : cleanupSummary.current.length > 0 ? (
          cleanupSummary.current.map((attempt, index) => (
            <ActiveCleanupRow
              key={attempt.id}
              attempt={attempt}
              divided={index > 0}
              onPress={() => openReport(attempt.report_id)}
            />
          ))
        ) : (
          <View style={styles.activeCleanupEmpty}>
            <BrandBug kind="ladybug" size={36} />
            <Text style={styles.activeCleanupEmptyTitle}>No active cleanups</Text>
            <Text style={styles.activeCleanupEmptyText}>Claimed and awaiting-review cleanups will appear here.</Text>
            <TouchableOpacity accessibilityRole="button" onPress={() => openAppTab('Reports')} style={styles.browseReportsButton}><Ionicons name="list-outline" size={18} color={colors.primary} /><Text style={styles.browseReportsText}>Browse reports</Text><Ionicons name="arrow-forward" size={17} color={colors.primary} /></TouchableOpacity>
          </View>
        )}
      </View>

      </> : null}
      {activityView === 'history' ? <>
      <Text style={styles.subsectionTitle}>Completed cleanups</Text>
      <View style={styles.card}>
        {cleanupsLoading && !cleanups.hasLoaded ? <Text style={{ padding: 20, color: colors.muted }}>Loading completed cleanups…</Text> : cleanupsError && !cleanups.hasLoaded ? <ActionRow label="Retry loading completed cleanups" icon="refresh-outline" onPress={refreshCleanups} /> : cleanupSummary.completed.length > 0 ? (
          cleanupSummary.completed.map((attempt, index) => (
            <CompletedCleanupRow
              key={attempt.id}
              attempt={attempt}
              divided={index > 0}
              onPress={() => openReport(attempt.report_id)}
            />
          ))
        ) : (
          <View style={styles.completedCleanupEmpty}>
            <BrandBug kind="flower" size={36} />
            <Text style={styles.activeCleanupEmptyTitle}>No completed cleanups yet</Text>
            <Text style={styles.activeCleanupEmptyText}>Your completed cleanup history will appear here.</Text>
          </View>
        )}
      </View>

      </> : null}
      {activityView === 'reports' ? <>
      <Text style={styles.activityHeading}>My reports</Text>
      {reportsError && reportsHaveLoaded ? <ActionRow label="Couldn’t update reports. Try again" icon="refresh-outline" onPress={refreshReports} /> : null}
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginHorizontal: 20, marginBottom: 14 }}>
        {[['active', 'Active'], ['completed', 'Completed'], ['closed', 'Closed']].map(([value, label]) => (
          <TouchableOpacity key={value} accessibilityRole="tab" accessibilityState={{ selected: reportView === value }} onPress={() => setReportView(value)} style={{ minHeight: 44, paddingHorizontal: 14, justifyContent: 'center', borderRadius: 12, borderWidth: 1, borderColor: reportView === value ? colors.primaryLight : colors.line, backgroundColor: reportView === value ? colors.primarySoft : colors.white }}>
            <Text style={{ color: colors.primaryDark, fontWeight: '600' }}>{label} ({reportsError && !reportsHaveLoaded ? '—' : !reportsHaveLoaded ? '…' : reportGroups[value].length})</Text>
          </TouchableOpacity>
        ))}
      </View>
      <View style={styles.card}>
        {reportsLoading && !reportsHaveLoaded ? <Text style={{ padding: 20, color: colors.muted }}>Loading your reports…</Text> : reportsError && !reportsHaveLoaded ? <ActionRow label="Retry loading your reports" icon="refresh-outline" onPress={refreshReports} /> : <ProfileReportList
          reports={reportGroups[reportView]}
          emptyTitle={`No ${reportView} reports`}
          emptyText="Reports you submit appear here, wherever you browse on the map."
          onReportPress={(report) => openReport(report.id)}
        />}
      </View>

      {fundingSchemaReady ? <View style={[styles.card, { marginTop: 16 }]}><ActionRow label="Reports needing attention" icon="calendar-outline" onPress={() => openScreen('ExpiredReports')} /></View> : null}
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
  activityTabs: { flexDirection: 'row', marginHorizontal: 20, marginTop: 16, marginBottom: 8, gap: 8 },
  activityTab: { flex: 1, minHeight: 44, justifyContent: 'center', alignItems: 'center', padding: 6, borderRadius: 22, borderWidth: 1.5, borderColor: colors.line, backgroundColor: colors.white },
  activityTabSelected: { borderWidth: 2, borderColor: colors.primary },
  activityTabText: { fontSize: 13, lineHeight: 18, textAlign: 'center', color: colors.muted, fontWeight: '600' },
  activityHeading: { marginHorizontal: 20, marginTop: 16, marginBottom: 12, color: colors.ink, fontSize: 20, lineHeight: 25, fontFamily: fonts.heading },
  activityEmptyIcon: { width: 48, height: 48, borderRadius: 24, backgroundColor: colors.primarySoft, alignItems: 'center', justifyContent: 'center' },
  browseReportsButton: { minHeight: 44, marginTop: 16, paddingHorizontal: 14, flexDirection: 'row', alignItems: 'center', gap: 8, borderRadius: 12, borderWidth: 1, borderColor: colors.primaryBorder, backgroundColor: colors.primaryTint },
  browseReportsText: { color: colors.primary, fontSize: 14, fontWeight: '600' },
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
  overviewStats: { marginHorizontal: 20, marginTop: 16, flexDirection: 'row', paddingVertical: 14, borderRadius: 14, backgroundColor: colors.mist, borderWidth: 1, borderColor: colors.line },
  overviewStat: { flex: 1, justifyContent: 'center', paddingHorizontal: 16 },
  overviewStatDivider: { borderLeftWidth: StyleSheet.hairlineWidth, borderLeftColor: colors.line },
  overviewStatValue: { fontSize: 25, lineHeight: 31, fontWeight: '600', color: colors.primaryDark, fontVariant: ['tabular-nums'] },
  overviewStatLabel: { marginTop: 2, fontSize: 12, lineHeight: 18, color: colors.muted, fontWeight: '500' },
  identity: { marginHorizontal: 20, marginTop: 16, marginBottom: 16, padding: 20, borderRadius: 18, borderWidth: 1, borderColor: colors.line, backgroundColor: colors.white },
  identityAvatar: { alignSelf: 'flex-start' },
  identityCounts: { marginTop: 14, color: '#45434D', fontSize: 15 },
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
  rankPanel: { marginHorizontal: 20, borderWidth: 1, borderColor: colors.line, borderRadius: 18, overflow: 'hidden', backgroundColor: '#FCFBFF' },
  rankCard: { padding: 18 },
  rankSummaryRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 10 },
  rankSummaryCopy: { flex: 1, minWidth: 100 },
  rankEyebrow: { marginTop: 2, color: colors.muted, fontSize: 14, lineHeight: 19 },
  rankArtworkStage: { width: 56, height: 56, alignItems: 'center', justifyContent: 'center' },
  rankArtwork: { width: '100%', height: '100%' },
  rankName: { color: colors.ink, fontSize: 23, lineHeight: 28, fontFamily: fonts.heading },
  rankPoints: { color: colors.primaryDark, fontSize: 16, lineHeight: 22, fontWeight: '600', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 10, backgroundColor: colors.primarySoft },
  rankProgressSection: { width: '100%', marginTop: 18 },
  rankProgressHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  rankProgressTitle: { flex: 1, color: colors.body, fontSize: 13, fontWeight: '500' },
  rankProgressPercent: { color: colors.body, fontSize: 13, fontWeight: '600' },
  rankProgressTrack: { height: 10, marginTop: 8, overflow: 'hidden', borderRadius: 5, backgroundColor: '#EAE5FA' },
  rankProgressFill: { height: '100%', borderRadius: 7, backgroundColor: colors.primary },
  rankRemaining: { marginTop: 7, color: colors.muted, fontSize: 13, lineHeight: 19, fontWeight: '400' },
  highestRankBadge: { minHeight: 48, marginTop: 19, paddingHorizontal: 18, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderRadius: 24, backgroundColor: colors.mist },
  highestRankText: { color: colors.body, fontSize: 15, fontWeight: '900' },
  rankLoadingStage: { width: 76, height: 76, alignSelf: 'center', alignItems: 'center', justifyContent: 'center', borderRadius: 20, backgroundColor: colors.mist },
  rankLoadingTitle: { marginTop: 15, color: colors.ink, fontSize: 17, fontWeight: '800' },
  rankRetryText: { marginTop: 5, color: colors.body, fontSize: 14, fontWeight: '700' },
  rankRefreshWarning: { marginTop: 15, color: colors.body, fontSize: 13, fontWeight: '700', textAlign: 'center' },
  statCard: { marginHorizontal: 16, marginTop: 14, paddingVertical: 14, alignItems: 'center', borderRadius: 16, backgroundColor: colors.white },
  statValue: { color: colors.primaryDark, fontSize: 28, fontFamily: fonts.heading },
  statLabel: { marginTop: 3, color: colors.muted, fontSize: 14, fontWeight: '700' },
  sectionTitle: { marginHorizontal: 20, marginTop: 27, marginBottom: 9, color: colors.ink, fontSize: 17, fontWeight: '800' },
  subsectionTitle: { marginHorizontal: 20, marginTop: 16, marginBottom: 8, color: colors.body, fontSize: 14, fontWeight: '800' },
  card: { marginHorizontal: 16, overflow: 'hidden', borderRadius: 16, backgroundColor: colors.white },
  paymentCard: { borderWidth: 1, borderColor: colors.line, borderRadius: 18 },
  // Payout status: coloured icon and words on white, as on the website.
  stripeConnectionRow: { minHeight: 54, paddingHorizontal: 17, flexDirection: 'row', alignItems: 'center', gap: 9, backgroundColor: colors.white },
  stripeConnectionText: { flex: 1, fontSize: 15, lineHeight: 20, fontWeight: '700' },
  stripeConnectionDetail: { fontSize: 12, fontWeight: '800' },
  cleanupStatsCard: { marginHorizontal: 20, flexDirection: 'row', overflow: 'hidden', borderRadius: 18, borderWidth: 1, borderColor: colors.line, backgroundColor: colors.white },
  cleanupStat: { flex: 1, minHeight: 78, alignItems: 'center', paddingHorizontal: 6, paddingVertical: 12 },
  cleanupStatDivider: { borderLeftWidth: StyleSheet.hairlineWidth, borderLeftColor: colors.line },
  cleanupStatValue: { color: colors.ink, fontSize: 24, fontWeight: '900' },
  cleanupStatLabelContainer: { flexGrow: 1, marginTop: 4, justifyContent: 'center', alignSelf: 'stretch' },
  cleanupStatLabel: { color: colors.muted, fontSize: 12, lineHeight: 17, fontWeight: '500', textAlign: 'center' },
  activeCleanupCard: { borderWidth: 1, borderColor: colors.line, backgroundColor: colors.white },
  activeCleanupRow: { minHeight: 124, padding: 16, flexDirection: 'row', alignItems: 'center', backgroundColor: colors.white },
  activeCleanupDivider: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.line },
  activeCleanupIcon: { width: 46, height: 46, marginRight: 13, borderRadius: 23, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.mist },
  activeCleanupCopy: { flex: 1, marginRight: 8 },
  activeCleanupTitle: { color: colors.ink, fontSize: 16, lineHeight: 22, fontWeight: '600' },
  activeCleanupStatus: { marginTop: 4, color: colors.muted, fontSize: 13, fontWeight: '800' },
  activeCleanupReward: { marginTop: 3, color: colors.primaryDark, fontSize: 13, fontWeight: '800' },
  activeCleanupDeadline: { marginTop: 3, color: colors.muted, fontSize: 13, lineHeight: 18 },
  activeCleanupLink: { marginTop: 8, color: colors.primary, fontSize: 14, fontWeight: '800' },
  activeCleanupEmpty: { minHeight: 220, alignItems: 'center', justifyContent: 'center', padding: 24 },
  activeCleanupEmptyTitle: { marginTop: 10, color: colors.ink, fontSize: 17, lineHeight: 23, fontFamily: fonts.heading },
  activeCleanupEmptyText: { marginTop: 6, color: colors.muted, fontSize: 14, lineHeight: 21, textAlign: 'center', maxWidth: 290 },
  completedCleanupRow: { minHeight: 82, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', backgroundColor: colors.white },
  completedCleanupDivider: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.line },
  completedCleanupIcon: { width: 40, height: 40, marginRight: 13, borderRadius: 20, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.primary },
  completedCleanupCopy: { flex: 1, marginRight: 8 },
  completedCleanupTitle: { color: colors.ink, fontSize: 15, lineHeight: 21, fontWeight: '600' },
  completedCleanupMeta: { marginTop: 5, color: colors.muted, fontSize: 13 },
  completedCleanupReward: { marginTop: 4, color: colors.primaryDark, fontSize: 13, fontWeight: '800' },
  completedCleanupEmpty: { minHeight: 210, alignItems: 'center', justifyContent: 'center', padding: 24 },
  emailRow: { minHeight: 68, paddingHorizontal: 17, justifyContent: 'center' },
  emailCopy: { minWidth: 0 },
  emailLabel: { color: colors.ink, fontSize: 16, fontWeight: '600' },
  emailText: { flexShrink: 1, color: colors.muted, fontSize: 15, fontWeight: '700' },
  deleteCard: { marginTop: 24 },
  signedOutContent: { flexGrow: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 24, backgroundColor: colors.white },
  signedOutTitle: { marginTop: 20, color: colors.ink, fontSize: 24, fontFamily: fonts.heading, textAlign: 'center' },
  signedOutText: { maxWidth: 360, marginTop: 10, color: colors.muted, fontSize: 15, lineHeight: 22, textAlign: 'center' },
  primaryButton: { width: '100%', maxWidth: 390, minHeight: 54, marginTop: 24, alignItems: 'center', justifyContent: 'center', borderRadius: 14, backgroundColor: colors.primary },
  primaryButtonText: { color: colors.white, fontSize: 16, fontWeight: '800' },
  signedOutSupport: { alignSelf: 'stretch', marginTop: 28, borderRadius: 18, borderWidth: 1, borderColor: colors.line, overflow: 'hidden', backgroundColor: colors.white },
});
