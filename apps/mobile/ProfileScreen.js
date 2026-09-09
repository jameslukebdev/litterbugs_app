import { loadReportDraft } from './lib/savedReportDraft';
import ActionRow from './components/NavigationRow';
import { useCallback, useLayoutEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Linking,
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
import { loadCurrentUserCleanupSummary } from './lib/cleanup';
import { cleanupStatusPresentation } from './lib/cleanupEligibility';
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

const PATREON_URL = 'https://patreon.com/litterbugs?utm_medium=unknown&utm_source=join_link&utm_campaign=creatorshare_creator&utm_content=copyLink';
const TERMS_URL = 'https://litterbugs.app/terms';
const PRIVACY_URL = 'https://litterbugs.app/privacy';
const CLEANUP_POLICY_URL = 'https://litterbugs.app/cleanup-policy';

const openPatreon = async () => {
  try {
    await Linking.openURL(PATREON_URL);
  } catch (error) {
    Alert.alert('Can’t open link', 'Unable to open Patreon on this device.');
  }
};

const openLitterbugsLink = async (url) => {
  try {
    await Linking.openURL(url);
  } catch (error) {
    Alert.alert('Can’t open link', 'Unable to open this Litterbugs page on your device.');
  }
};

function StripeConnectionStatus({ status, loading, error, onRetry }) {
  const presentation = payoutConnectionPresentation({ status, loading, error });

  return (
    <TouchableOpacity
      style={[
        styles.stripeConnectionRow,
        { backgroundColor: presentation.backgroundColor },
      ]}
      onPress={error ? onRetry : undefined}
      disabled={!error}
      activeOpacity={0.72}
      accessible
      accessibilityRole={error ? 'button' : undefined}
      accessibilityLabel={presentation.label}
      accessibilityHint={error ? 'Retries checking your Stripe payout connection' : undefined}
    >
      {loading ? (
        <ActivityIndicator size="small" color={presentation.color} />
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
        <Ionicons name={presentation?.icon || 'time-outline'} size={24} color="#687178" />
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
      <Ionicons name="chevron-forward" size={22} color="#687178" />
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
    pending: 'Transfer queued',
    processing: 'Transfer processing',
    transferred: 'Reward sent',
    failed: 'Transfer needs attention',
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
        <Ionicons name="checkmark" size={22} color="#FFFFFF" />
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
      <Ionicons name="chevron-forward" size={22} color="#6C8B70" />
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
        <View style={styles.rankLoadingStage}>
          <Ionicons
            name={showingLoader ? 'ribbon-outline' : 'cloud-offline-outline'}
            size={34}
            color="#2F7D32"
          />
        </View>
        <Text style={styles.rankLoadingTitle}>
          {showingLoader ? 'Loading your rank…' : 'Rank unavailable'}
        </Text>
        {error ? <Text style={styles.rankRetryText}>Tap to try again.</Text> : null}
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
          <Text style={styles.rankEyebrow}>COMMUNITY RANK</Text>
          <Text style={styles.rankName}>{ranking.rank}</Text>
          <Text style={styles.rankPoints}>{pointsLabel}</Text>
        </View>
      </View>

      {ranking.nextRank ? (
        <View style={styles.rankProgressSection}>
          <View style={styles.rankProgressHeader}>
            <Text style={styles.rankProgressTitle}>Progress to {ranking.nextRank}</Text>
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
          <Ionicons name="sparkles" size={20} color="#52615A" />
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
      <View style={styles.signedOutIcon}>
        <Ionicons name="person-outline" size={48} color="#2F7D32" />
      </View>
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
        <ActionRow label="Support Litterbugs" icon="heart-outline" onPress={openPatreon} />
        <ActionRow label="Terms of use" icon="document-text-outline" onPress={() => openLitterbugsLink(TERMS_URL)} />
        <ActionRow label="Privacy policy" icon="shield-checkmark-outline" onPress={() => openLitterbugsLink(PRIVACY_URL)} />
      </View>
    </ScrollView>
  );
}

export default function ProfileScreen({ navigation, route }) {
  const { fontScale } = useWindowDimensions();
  const section = route?.params?.section || 'overview';
  const [activityView, setActivityView] = useState('current');
  const openScreen = (name, params) => navigation.navigate(name, params);
  const openReport = (reportId) => navigation.navigate('App', { screen: 'Map', params: { reportId } });
  const { user } = useSession();
  const permanent = isPermanentUser(user);
  const { profile, refreshProfile, loading } = useProfile();
  const { reports, loading: reportsLoading, error: reportsError, refresh: refreshReports } = useAccountReports(permanent ? user.id : null);
  const [reportView, setReportView] = useState('active');
  const insets = useSafeAreaInsets();
  const [signingOut, setSigningOut] = useState(false);
  const [deletingAccount, setDeletingAccount] = useState(false);
  const cleanups = useFocusedResource(useCallback(() => loadCurrentUserCleanupSummary(user.id), [user?.id]), { enabled: permanent && section !== 'settings' });
  const rankingResource = useFocusedResource(useCallback(() => loadRanking(user.id), [user?.id]), { enabled: permanent && section === 'overview' });
  const flags = useFocusedResource(useCallback(() => loadCleanupFeatureFlags(), [user?.id]), { enabled: permanent });
  const fundingSchemaReady = flags.hasLoaded && !flags.error;
  const fundingEnabled = fundingSchemaReady && Boolean(flags.data?.payments_enabled && flags.data?.gemini_financial_review_enabled);
  const payout = useFocusedResource(useCallback(() => loadPayoutStatus(), [user?.id]), { enabled: permanent && section === 'payments' && fundingEnabled });
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
          <Ionicons name="create-outline" size={22} color="#2F7D32" />
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
          const { error } = await signOut();
          if (error) {
            setSigningOut(false);
            Alert.alert('Couldn’t sign out', 'Check your connection and try again.');
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
              await deleteCurrentAccount();
            } catch (error) {
              Alert.alert('Couldn’t delete account', 'Check your connection and try again.');
            } finally {
              setDeletingAccount(false);
            }
          },
        },
      ]
    );
  };

  const refresh = async () => {
    await Promise.allSettled([
      refreshProfile(),
      refreshReports(),
      refreshCleanups(),
      refreshRanking(),
      flags.refresh(),
      ...(fundingEnabled ? [refreshPayoutStatus()] : []),
    ]);
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={{ paddingBottom: bottomPadding }}
      showsVerticalScrollIndicator={false}
      refreshControl={<RefreshControl refreshing={loading || reportsLoading || cleanupsLoading || rankingLoading || flags.loading || payoutStatusLoading} onRefresh={refresh} tintColor="#2F7D32" />}
    >
      {section === 'overview' ? <>
      <View style={styles.identity}>
        <View style={[styles.identityTop, fontScale > 1.5 && { flexDirection: 'column', alignItems: 'stretch', gap: 12 }]}>
          <ProfileAvatar profile={profile} size={82} />
          <View style={[styles.identityCopy, fontScale > 1.5 && { marginLeft: 0 }]}>
            <Text style={styles.name}>{profile?.display_name || 'Profile unavailable'}</Text>
            {profile?.username ? <Text style={styles.username}>@{profile.username}</Text> : null}
            {profile?.location ? (
              <View style={styles.locationRow}>
                <Ionicons name="location-outline" size={15} color="#677178" />
                <Text style={styles.location}>{profile.location}</Text>
              </View>
            ) : null}
            <Text style={styles.joined}>
              Joined {new Date(profile?.created_at || Date.now()).toLocaleDateString(undefined, { month: 'long', year: 'numeric' })}
            </Text>
          </View>
        </View>
        {profile?.bio ? <Text style={styles.bio}>{profile.bio}</Text> : null}
      </View>

      <RankingCard
        ranking={ranking}
        loading={rankingLoading}
        error={rankingError}
        onRetry={refreshRanking}
      />

      <PointsExplanation ranking={ranking} />

      {cleanupSummary.current.length > 0 ? <View style={[styles.card, { marginTop: 16 }]}>
        <ActionRow label="Continue cleanup" icon="leaf-outline" onPress={() => openReport(cleanupSummary.current[0].report_id)} />
      </View> : null}
      <View style={[styles.card, { marginTop: 20 }]}>
        <ActionRow label="My activity" icon="leaf-outline" onPress={() => openScreen('MyActivity')} />
        <ActionRow label="Payments" icon="wallet-outline" onPress={() => openScreen('Payments')} />
        <ActionRow label="Settings" icon="settings-outline" onPress={() => openScreen('Settings')} />
      </View>
      <Text style={[styles.statLabel, { textAlign: 'center', marginTop: 18 }]}>{profile?.reports_created_count ?? 0} reports submitted · {cleanupSummary.counts.completed} cleanups completed</Text>
      </> : null}

      {section === 'payments' ? (
        <>
          <Text style={styles.sectionTitle}>Cleanup rewards</Text>
          <View style={[styles.card, styles.paymentCard]}>
            <View style={styles.paymentIntro}>
              <View style={styles.paymentIcon}>
                <Ionicons name="wallet-outline" size={25} color="#245F2A" />
              </View>
              <View style={styles.paymentIntroCopy}>
                <Text style={styles.paymentIntroTitle}>Manage cleanup money</Text>
                <Text style={styles.paymentIntroText}>
                  Connect Stripe to receive cleanup rewards, or review contributions you have made.
                </Text>
              </View>
            </View>
            {flags.loading ? <Text style={{ padding: 17, color: '#687178' }}>Checking payout availability…</Text> : flags.error ? <ActionRow label="Retry payout availability" icon="refresh-outline" onPress={flags.refresh} /> : fundingEnabled ? <>
            {payoutStatusLoading || payoutStatusError || payoutStatus?.payoutsEnabled ? <StripeConnectionStatus
              status={payoutStatus}
              loading={payoutStatusLoading}
              error={payoutStatusError}
              onRetry={refreshPayoutStatus}
            /> : null}
            <ActionRow
              label={payoutStatus?.payoutsEnabled ? 'Review payout details' : 'Set up cleanup payouts'}
              icon="card-outline"
              onPress={() => navigation.navigate('PayoutSetup')}
            />
            </> : <Text style={{ padding: 17, color: '#687178' }}>Payout setup is currently unavailable. Your payment history is still accessible below.</Text>}
            <ActionRow
              label="Contributions & payment history"
              icon="receipt-outline"
              onPress={() => navigation.navigate('ContributionHistory')}
            />
          </View>
          <Text style={styles.sectionTitle}>Cleanup earnings</Text>
          <View style={styles.card}>
            {cleanupsError ? <ActionRow label="Retry loading earnings" icon="refresh-outline" onPress={refreshCleanups} /> : cleanupsLoading ? <Text style={{ padding: 20, color: '#687178' }}>Loading earnings…</Text> : cleanupSummary.completed.filter(attempt => attempt.is_paid).length ? cleanupSummary.completed.filter(attempt => attempt.is_paid).map((attempt, index) => <CompletedCleanupRow key={attempt.id} attempt={attempt} divided={index > 0} onPress={() => openReport(attempt.report_id)} />) : <Text style={{ padding: 20, color: '#687178', lineHeight: 21 }}>Rewards from your completed paid cleanups will appear here.</Text>}
          </View>
        </>
      ) : null}

      {section === 'activity' ? <>
      {savedDraft.data ? <View style={styles.card}><ActionRow label="Continue draft" icon="create-outline" onPress={() => navigation.navigate('App', { screen: 'Map', params: { resumeDraft: Date.now() } })} /><Text style={{ padding: 16, color: '#687178' }}>Saved {new Date(savedDraft.data.savedAt).toLocaleString()}</Text></View> : null}
      {savedDraft.error ? <ActionRow label="Retry loading your draft" icon="refresh-outline" onPress={savedDraft.refresh} /> : null}
      <View style={{ flexDirection: fontScale > 1.5 ? 'column' : 'row', margin: 16, borderRadius: 14, backgroundColor: '#FFFFFF', padding: 4 }}>
        {[['current', 'Current cleanups'], ['history', 'Cleanup history'], ['reports', 'My reports']].map(([value, label]) => <TouchableOpacity key={value} accessibilityRole="tab" accessibilityState={{ selected: activityView === value }} onPress={() => setActivityView(value)} style={{ flex: 1, minHeight: 48, justifyContent: 'center', alignItems: 'center', padding: 8, borderRadius: 11, backgroundColor: activityView === value ? '#EAF4EC' : '#FFFFFF' }}><Text style={{ color: activityView === value ? '#245F2A' : '#59636A', fontWeight: '700' }}>{label}</Text></TouchableOpacity>)}
      </View>
      {activityView !== 'reports' ? <>
      <Text style={styles.sectionTitle}>My cleanups</Text>
      <View style={styles.cleanupStatsCard}>
        <CleanupStat value={cleanupSummary.counts.completed} label="Completed" />
        <CleanupStat value={cleanupSummary.counts.awaitingReview} label="Awaiting review" divided />
        <CleanupStat value={cleanupSummary.counts.active} label="Active" divided />
      </View>
      </> : null}

      {activityView === 'current' ? <>
      <Text style={styles.subsectionTitle}>Current cleanups</Text>
      <View style={[styles.card, styles.activeCleanupCard]}>
        {cleanupsLoading && cleanupSummary.current.length === 0 ? (
          <View style={styles.activeCleanupEmpty}>
            <ActivityIndicator color="#687178" />
            <Text style={styles.activeCleanupEmptyText}>Checking your cleanups…</Text>
          </View>
        ) : cleanupsError ? (
          <TouchableOpacity style={styles.activeCleanupEmpty} onPress={refreshCleanups}>
            <Ionicons name="cloud-offline-outline" size={27} color="#687178" />
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
            <Ionicons name="leaf-outline" size={27} color="#6F797F" />
            <Text style={styles.activeCleanupEmptyTitle}>No active cleanups</Text>
            <Text style={styles.activeCleanupEmptyText}>Claimed and awaiting-review cleanups will appear here.</Text>
            <ActionRow label="Browse reports" icon="map-outline" onPress={() => navigation.navigate('App', { screen: 'Map' })} />
          </View>
        )}
      </View>

      </> : null}
      {activityView === 'history' ? <>
      <Text style={styles.subsectionTitle}>Completed cleanups</Text>
      <View style={styles.card}>
        {cleanupsLoading ? <Text style={{ padding: 20, color: '#687178' }}>Loading completed cleanups…</Text> : cleanupsError ? <ActionRow label="Retry loading completed cleanups" icon="refresh-outline" onPress={refreshCleanups} /> : cleanupSummary.completed.length > 0 ? (
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
            <Ionicons name="checkmark-circle-outline" size={29} color="#6F797F" />
            <Text style={styles.activeCleanupEmptyTitle}>No completed cleanups yet</Text>
            <Text style={styles.activeCleanupEmptyText}>Your completed cleanup history will appear here.</Text>
          </View>
        )}
      </View>

      </> : null}
      {activityView === 'reports' ? <>
      <Text style={styles.sectionTitle}>My reports</Text>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginHorizontal: 16, marginBottom: 12 }}>
        {[['active', 'Active'], ['completed', 'Completed'], ['closed', 'Closed']].map(([value, label]) => (
          <TouchableOpacity key={value} accessibilityRole="tab" accessibilityState={{ selected: reportView === value }} onPress={() => setReportView(value)} style={{ minHeight: 44, paddingHorizontal: 14, justifyContent: 'center', borderRadius: 22, backgroundColor: reportView === value ? '#EAF4EC' : '#FFFFFF' }}>
            <Text style={{ color: '#245F2A', fontWeight: '600' }}>{label}</Text>
          </TouchableOpacity>
        ))}
      </View>
      <View style={styles.card}>
        {reportsLoading ? <Text style={{ padding: 20, color: '#687178' }}>Loading your reports…</Text> : reportsError ? <ActionRow label="Retry loading your reports" icon="refresh-outline" onPress={refreshReports} /> : <ProfileReportList
          reports={reportGroups[reportView]}
          emptyTitle={`No ${reportView} reports`}
          emptyText="Reports you submit appear here, wherever you browse on the map."
          onReportPress={(report) => openReport(report.id)}
        />}
      </View>

      {fundingSchemaReady ? <View style={[styles.card, { marginTop: 16 }]}><ActionRow label="Expired report decisions" icon="calendar-outline" onPress={() => openScreen('ExpiredReports')} /></View> : null}
      </> : null}
      </> : null}

      {section === 'settings' ? <>
      <Text style={styles.sectionTitle}>Account</Text>
      <View style={styles.card}>
        <View style={styles.emailRow}>
          <View style={styles.emailCopy}>
            <Text style={styles.emailLabel}>Email</Text>
            <Text style={styles.emailText} numberOfLines={1} ellipsizeMode="middle">
              {user.email || 'Email unavailable for this account'}
            </Text>
          </View>
        </View>
        <ActionRow
          label="Blocked accounts"
          icon="ban-outline"
          onPress={() => navigation.navigate('BlockedAccounts')}
        />
        <ActionRow label="Edit profile" icon="person-outline" onPress={() => openScreen('EditProfile')} />
        <ActionRow label="Terms of use" icon="document-text-outline" onPress={() => openLitterbugsLink(TERMS_URL)} />
        <ActionRow label="Privacy policy" icon="shield-checkmark-outline" onPress={() => openLitterbugsLink(PRIVACY_URL)} />
        <ActionRow label="Cleanup and reward policy" icon="leaf-outline" onPress={() => openLitterbugsLink(CLEANUP_POLICY_URL)} />
        <ActionRow label="Support Litterbugs" icon="heart-outline" onPress={openPatreon} />
        <ActionRow label={signingOut ? 'Signing out…' : 'Sign out'} icon="log-out-outline" onPress={handleSignOut} busy={signingOut} />
      </View>

      <View style={[styles.card, styles.deleteCard]}>
        <ActionRow
          label={deletingAccount ? 'Deleting account…' : 'Delete account'}
          icon="trash-outline"
          onPress={handleDeleteAccount}
          destructive
          busy={deletingAccount}
        />
      </View>
      </> : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F6F7' },
  identity: { marginHorizontal: 16, marginTop: 18, padding: 18, borderRadius: 20, backgroundColor: '#FFFFFF' },
  identityTop: { flexDirection: 'row', alignItems: 'center' },
  identityCopy: { flex: 1, minWidth: 0, marginLeft: 15 },
  name: { color: '#202428', fontSize: 22, fontWeight: '900' },
  username: { marginTop: 2, color: '#687178', fontSize: 14 },
  locationRow: { marginTop: 9, flexDirection: 'row', alignItems: 'center', gap: 4 },
  location: { color: '#59636A', fontSize: 14 },
  bio: { marginTop: 14, paddingHorizontal: 8, color: '#4F5960', fontSize: 14, lineHeight: 20, textAlign: 'center' },
  joined: { marginTop: 7, color: '#7A8288', fontSize: 12 },
  headerEditButtonContainer: { paddingRight: 16, justifyContent: 'flex-end' },
  headerEditButton: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  rankCard: { marginHorizontal: 16, marginTop: 14, padding: 18, borderWidth: 1, borderColor: '#E0E5E1', borderRadius: 20, backgroundColor: '#FFFFFF' },
  rankSummaryRow: { flexDirection: 'row', alignItems: 'center' },
  rankSummaryCopy: { flex: 1, minWidth: 0, marginLeft: 16 },
  rankEyebrow: { color: '#52615A', fontSize: 12, lineHeight: 16, fontWeight: '900', letterSpacing: 1.5 },
  rankArtworkStage: { width: 56, height: 56, alignItems: 'center', justifyContent: 'center', overflow: 'hidden', borderWidth: 2, borderColor: '#E0E5E1', borderRadius: 24, backgroundColor: '#FFFFFF' },
  rankArtwork: { width: '100%', height: '100%' },
  rankName: { marginTop: 5, color: '#242029', fontSize: 20, lineHeight: 25, fontWeight: '900' },
  rankPoints: { marginTop: 2, color: '#2F7D32', fontSize: 17, lineHeight: 22, fontWeight: '900' },
  rankProgressSection: { width: '100%', marginTop: 16 },
  rankProgressHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  rankProgressTitle: { flex: 1, color: '#4C4450', fontSize: 14, fontWeight: '800' },
  rankProgressPercent: { color: '#52615A', fontSize: 14, fontWeight: '900' },
  rankProgressTrack: { height: 5, marginTop: 8, overflow: 'hidden', borderRadius: 5, backgroundColor: '#EDF1EE' },
  rankProgressFill: { height: '100%', borderRadius: 7, backgroundColor: '#2F7D32' },
  rankRemaining: { marginTop: 10, color: '#625768', fontSize: 14, lineHeight: 20, fontWeight: '700', textAlign: 'center' },
  highestRankBadge: { minHeight: 48, marginTop: 19, paddingHorizontal: 18, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderRadius: 24, backgroundColor: '#EDF1EE' },
  highestRankText: { color: '#52615A', fontSize: 15, fontWeight: '900' },
  rankLoadingStage: { width: 76, height: 76, alignSelf: 'center', alignItems: 'center', justifyContent: 'center', borderRadius: 20, backgroundColor: '#EDF1EE' },
  rankLoadingTitle: { marginTop: 15, color: '#413946', fontSize: 17, fontWeight: '800' },
  rankRetryText: { marginTop: 5, color: '#52615A', fontSize: 14, fontWeight: '700' },
  rankRefreshWarning: { marginTop: 15, color: '#52615A', fontSize: 13, fontWeight: '700', textAlign: 'center' },
  statCard: { marginHorizontal: 16, marginTop: 14, paddingVertical: 14, alignItems: 'center', borderRadius: 16, backgroundColor: '#FFFFFF' },
  statValue: { color: '#245F2A', fontSize: 28, fontWeight: '800' },
  statLabel: { marginTop: 3, color: '#687178', fontSize: 14, fontWeight: '700' },
  sectionTitle: { marginHorizontal: 20, marginTop: 27, marginBottom: 9, color: '#30363B', fontSize: 17, fontWeight: '800' },
  subsectionTitle: { marginHorizontal: 20, marginTop: 16, marginBottom: 8, color: '#596168', fontSize: 14, fontWeight: '800' },
  card: { marginHorizontal: 16, overflow: 'hidden', borderRadius: 16, backgroundColor: '#FFFFFF' },
  paymentCard: { borderWidth: 1, borderColor: '#CFE2D0' },
  paymentIntro: { minHeight: 102, padding: 17, flexDirection: 'row', alignItems: 'center', backgroundColor: '#F2F8F2' },
  paymentIcon: { width: 48, height: 48, marginRight: 13, alignItems: 'center', justifyContent: 'center', borderRadius: 24, backgroundColor: '#DDEEDD' },
  paymentIntroCopy: { flex: 1 },
  paymentIntroTitle: { color: '#244027', fontSize: 17, fontWeight: '800' },
  paymentIntroText: { marginTop: 5, color: '#5F6D61', fontSize: 13, lineHeight: 18 },
  stripeConnectionRow: { minHeight: 54, paddingHorizontal: 17, flexDirection: 'row', alignItems: 'center', gap: 9, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: '#DDE5DE' },
  stripeConnectionText: { flex: 1, fontSize: 15, fontWeight: '900' },
  stripeConnectionDetail: { fontSize: 12, fontWeight: '800' },
  cleanupStatsCard: { marginHorizontal: 16, flexDirection: 'row', overflow: 'hidden', borderRadius: 16, backgroundColor: '#FFFFFF' },
  cleanupStat: { flex: 1, minHeight: 86, alignItems: 'center', paddingHorizontal: 6, paddingVertical: 16 },
  cleanupStatDivider: { borderLeftWidth: StyleSheet.hairlineWidth, borderLeftColor: '#DDE2DE' },
  cleanupStatValue: { color: '#245F2A', fontSize: 25, fontWeight: '800' },
  cleanupStatLabelContainer: { flexGrow: 1, marginTop: 4, justifyContent: 'center', alignSelf: 'stretch' },
  cleanupStatLabel: { color: '#687178', fontSize: 12, lineHeight: 16, fontWeight: '700', textAlign: 'center' },
  activeCleanupCard: { borderWidth: 1, borderColor: '#E0E5E1', backgroundColor: '#FFFFFF' },
  activeCleanupRow: { minHeight: 124, padding: 16, flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFFFFF' },
  activeCleanupDivider: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: '#E0E5E1' },
  activeCleanupIcon: { width: 46, height: 46, marginRight: 13, borderRadius: 23, alignItems: 'center', justifyContent: 'center', backgroundColor: '#F1F4F2' },
  activeCleanupCopy: { flex: 1, marginRight: 8 },
  activeCleanupTitle: { color: '#30363B', fontSize: 16, fontWeight: '800' },
  activeCleanupStatus: { marginTop: 4, color: '#687178', fontSize: 13, fontWeight: '800' },
  activeCleanupReward: { marginTop: 3, color: '#245F2A', fontSize: 13, fontWeight: '800' },
  activeCleanupDeadline: { marginTop: 3, color: '#687178', fontSize: 13, lineHeight: 18 },
  activeCleanupLink: { marginTop: 8, color: '#2F7D32', fontSize: 14, fontWeight: '800' },
  activeCleanupEmpty: { minHeight: 126, alignItems: 'center', justifyContent: 'center', padding: 20 },
  activeCleanupEmptyTitle: { marginTop: 8, color: '#4F5960', fontSize: 15, fontWeight: '800' },
  activeCleanupEmptyText: { marginTop: 5, color: '#747D84', fontSize: 14, textAlign: 'center' },
  completedCleanupRow: { minHeight: 82, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFFFFF' },
  completedCleanupDivider: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: '#E0E3E5' },
  completedCleanupIcon: { width: 40, height: 40, marginRight: 13, borderRadius: 20, alignItems: 'center', justifyContent: 'center', backgroundColor: '#2F7D32' },
  completedCleanupCopy: { flex: 1, marginRight: 8 },
  completedCleanupTitle: { color: '#30363B', fontSize: 15, fontWeight: '800' },
  completedCleanupMeta: { marginTop: 5, color: '#687178', fontSize: 13 },
  completedCleanupReward: { marginTop: 4, color: '#245F2A', fontSize: 13, fontWeight: '800' },
  completedCleanupEmpty: { minHeight: 126, alignItems: 'center', justifyContent: 'center', padding: 20 },
  emailRow: { minHeight: 68, paddingHorizontal: 17, justifyContent: 'center' },
  emailCopy: { minWidth: 0 },
  emailLabel: { color: '#727B82', fontSize: 12, fontWeight: '700' },
  emailText: { marginTop: 3, color: '#30363B', fontSize: 15 },
  deleteCard: { marginTop: 24 },
  signedOutContent: { flexGrow: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 24, backgroundColor: '#F5F6F7' },
  signedOutIcon: { width: 92, height: 92, borderRadius: 46, alignItems: 'center', justifyContent: 'center', backgroundColor: '#E4EEE5' },
  signedOutTitle: { marginTop: 20, color: '#202428', fontSize: 24, fontWeight: '800', textAlign: 'center' },
  signedOutText: { maxWidth: 360, marginTop: 10, color: '#667078', fontSize: 15, lineHeight: 22, textAlign: 'center' },
  primaryButton: { width: '100%', maxWidth: 390, minHeight: 54, marginTop: 24, alignItems: 'center', justifyContent: 'center', borderRadius: 14, backgroundColor: '#2F7D32' },
  primaryButtonText: { color: '#FFFFFF', fontSize: 16, fontWeight: '800' },
  signedOutSupport: { width: '100%', maxWidth: 390, marginTop: 28, overflow: 'hidden', borderRadius: 14 },
});
