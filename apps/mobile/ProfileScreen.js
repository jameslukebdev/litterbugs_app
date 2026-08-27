import { useCallback, useMemo, useState } from 'react';
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
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import ProfileAvatar from './ProfileAvatar';
import ProfileReportList from './ProfileReportList';
import { deleteCurrentAccount, signOut } from './lib/auth';
import { loadCurrentUserCleanupSummary } from './lib/cleanup';
import { cleanupStatusPresentation } from './lib/cleanupEligibility';
import { formatUsd, loadCleanupFeatureFlags } from './lib/funding';
import {
  cleanupApprovalLabel,
  emptyCleanupSummary,
} from './lib/cleanupProfile';
import { getBottomNavClearance } from './lib/navigationLayout';
import { useProfile } from './lib/profile';
import { isPermanentUser } from './lib/reportAccess';
import { useReports } from './lib/reports';
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

function ActionRow({ label, icon, onPress, destructive = false, busy = false }) {
  return (
    <TouchableOpacity
      style={[styles.actionRow, busy && styles.disabled]}
      onPress={onPress}
      disabled={busy}
      activeOpacity={0.72}
      accessibilityRole="button"
      accessibilityLabel={label}
    >
      <View style={styles.actionCopy}>
        <Ionicons name={icon} size={21} color={destructive ? '#C62828' : '#4E5A61'} />
        <Text style={[styles.actionText, destructive && styles.destructiveText]}>{label}</Text>
      </View>
      {busy ? (
        <ActivityIndicator size="small" color={destructive ? '#C62828' : '#4E5A61'} />
      ) : (
        <Ionicons name="chevron-forward" size={21} color={destructive ? '#C62828' : '#9AA1A8'} />
      )}
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
      ? 'Reward paused for admin review'
      : attempt.financial_review_status === 'better_photos'
        ? 'Replacement photos requested'
      : attempt.first_paid_admin_status === 'pending'
        ? 'First reward awaiting admin check'
        : attempt.financial_review_status === 'passed'
          ? 'Reward in 48-hour dispute window'
          : attempt.financial_review_status === 'queued'
            ? 'Photos awaiting automated review'
            : attempt.status === 'claimed'
              ? 'Reward frozen for this cleanup'
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
        <Ionicons name={presentation?.icon || 'time-outline'} size={24} color="#8A6400" />
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
      <Ionicons name="chevron-forward" size={22} color="#9A7A18" />
    </TouchableOpacity>
  );
}

function CleanupStat({ value, label, divided }) {
  return (
    <View style={[styles.cleanupStat, divided && styles.cleanupStatDivider]}>
      <Text style={styles.cleanupStatValue}>{value}</Text>
      <Text style={styles.cleanupStatLabel}>{label}</Text>
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
        onPress={() => navigation.getParent()?.navigate('Auth')}
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

export default function ProfileScreen({ navigation }) {
  const { user } = useSession();
  const permanent = isPermanentUser(user);
  const { profile, refreshProfile, loading } = useProfile();
  const { reports, refreshReports } = useReports();
  const insets = useSafeAreaInsets();
  const [signingOut, setSigningOut] = useState(false);
  const [deletingAccount, setDeletingAccount] = useState(false);
  const [cleanupSummary, setCleanupSummary] = useState(emptyCleanupSummary);
  const [cleanupsLoading, setCleanupsLoading] = useState(false);
  const [cleanupsError, setCleanupsError] = useState(false);
  const [fundingEnabled, setFundingEnabled] = useState(false);
  const [fundingSchemaReady, setFundingSchemaReady] = useState(false);
  const accountBusy = signingOut || deletingAccount;
  const bottomPadding = getBottomNavClearance(insets.bottom) + 18;

  const activeReports = useMemo(
    () => reports.filter((report) => report.user_id === user?.id),
    [reports, user?.id]
  );

  const refreshCleanups = useCallback(async () => {
    if (!permanent || !user?.id) {
      setCleanupSummary(emptyCleanupSummary());
      setCleanupsError(false);
      return;
    }

    try {
      setCleanupsLoading(true);
      const summary = await loadCurrentUserCleanupSummary(user.id);
      setCleanupSummary(summary);
      setCleanupsError(false);
    } catch (error) {
      console.log('Profile cleanup load error:', error);
      setCleanupsError(true);
    } finally {
      setCleanupsLoading(false);
    }
  }, [permanent, user?.id]);

  useFocusEffect(useCallback(() => {
    refreshCleanups();
    loadCleanupFeatureFlags()
      .then((flags) => {
        setFundingSchemaReady(true);
        setFundingEnabled(Boolean(
          flags.payments_enabled && flags.gemini_financial_review_enabled
        ));
      })
      .catch(() => {
        setFundingSchemaReady(false);
        setFundingEnabled(false);
      });
  }, [refreshCleanups]));

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
      refreshReports({ showRefresh: true }),
      refreshCleanups(),
    ]);
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={{ paddingBottom: bottomPadding }}
      showsVerticalScrollIndicator={false}
      refreshControl={<RefreshControl refreshing={loading || cleanupsLoading} onRefresh={refresh} tintColor="#2F7D32" />}
    >
      <View style={styles.identity}>
        <ProfileAvatar profile={profile} size={104} />
        <Text style={styles.name}>{profile?.display_name || 'Profile unavailable'}</Text>
        {profile?.username ? <Text style={styles.username}>@{profile.username}</Text> : null}
        {profile?.location ? (
          <View style={styles.locationRow}>
            <Ionicons name="location-outline" size={16} color="#677178" />
            <Text style={styles.location}>{profile.location}</Text>
          </View>
        ) : null}
        {profile?.bio ? <Text style={styles.bio}>{profile.bio}</Text> : null}
        <Text style={styles.joined}>
          Joined {new Date(profile?.created_at || Date.now()).toLocaleDateString(undefined, { month: 'long', year: 'numeric' })}
        </Text>
        <TouchableOpacity
          style={styles.editButton}
          onPress={() => navigation.getParent()?.navigate('EditProfile')}
          accessibilityRole="button"
        >
          <Text style={styles.editButtonText}>Edit profile</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.statCard}>
        <Text style={styles.statValue}>{profile?.reports_created_count ?? 0}</Text>
        <Text style={styles.statLabel}>Reports submitted</Text>
      </View>

      <Text style={styles.sectionTitle}>My cleanups</Text>
      <View style={styles.cleanupStatsCard}>
        <CleanupStat value={cleanupSummary.counts.completed} label="Completed" />
        <CleanupStat value={cleanupSummary.counts.awaitingReview} label="Awaiting review" divided />
        <CleanupStat value={cleanupSummary.counts.active} label="Active" divided />
      </View>

      <Text style={styles.subsectionTitle}>Current cleanups</Text>
      <View style={[styles.card, styles.activeCleanupCard]}>
        {cleanupsLoading && cleanupSummary.current.length === 0 ? (
          <View style={styles.activeCleanupEmpty}>
            <ActivityIndicator color="#8A6400" />
            <Text style={styles.activeCleanupEmptyText}>Checking your cleanups…</Text>
          </View>
        ) : cleanupsError ? (
          <TouchableOpacity style={styles.activeCleanupEmpty} onPress={refreshCleanups}>
            <Ionicons name="cloud-offline-outline" size={27} color="#8A6400" />
            <Text style={styles.activeCleanupEmptyTitle}>Couldn’t load cleanups</Text>
            <Text style={styles.activeCleanupEmptyText}>Tap to try again.</Text>
          </TouchableOpacity>
        ) : cleanupSummary.current.length > 0 ? (
          cleanupSummary.current.map((attempt, index) => (
            <ActiveCleanupRow
              key={attempt.id}
              attempt={attempt}
              divided={index > 0}
              onPress={() => navigation.navigate('Map', { reportId: attempt.report_id })}
            />
          ))
        ) : (
          <View style={styles.activeCleanupEmpty}>
            <Ionicons name="leaf-outline" size={27} color="#6F797F" />
            <Text style={styles.activeCleanupEmptyTitle}>No active cleanups</Text>
            <Text style={styles.activeCleanupEmptyText}>Claimed and awaiting-review cleanups will appear here.</Text>
          </View>
        )}
      </View>

      <Text style={styles.subsectionTitle}>Completed cleanups</Text>
      <View style={styles.card}>
        {cleanupSummary.completed.length > 0 ? (
          cleanupSummary.completed.map((attempt, index) => (
            <CompletedCleanupRow
              key={attempt.id}
              attempt={attempt}
              divided={index > 0}
              onPress={() => navigation.navigate('Map', { reportId: attempt.report_id })}
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

      <Text style={styles.sectionTitle}>Active reports</Text>
      <View style={styles.card}>
        <ProfileReportList
          reports={activeReports}
          onReportPress={(report) => navigation.navigate('Map', { reportId: report.id })}
        />
      </View>

      <Text style={styles.sectionTitle}>Account</Text>
      <View style={styles.card}>
        <View style={styles.emailRow}>
          <View>
            <Text style={styles.emailLabel}>Email</Text>
            <Text style={styles.emailText}>{user.email || 'Managed by your sign-in provider'}</Text>
          </View>
        </View>
        <ActionRow
          label="Blocked accounts"
          icon="ban-outline"
          onPress={() => navigation.getParent()?.navigate('BlockedAccounts')}
        />
        {fundingSchemaReady ? (
          <ActionRow
            label="Expired report decisions"
            icon="calendar-outline"
            onPress={() => navigation.getParent()?.navigate('ExpiredReports')}
          />
        ) : null}
        {fundingEnabled ? (
          <>
            <ActionRow
              label="Cleanup payout setup"
              icon="wallet-outline"
              onPress={() => navigation.getParent()?.navigate('PayoutSetup')}
            />
            <ActionRow
              label="Contribution history"
              icon="receipt-outline"
              onPress={() => navigation.getParent()?.navigate('ContributionHistory')}
            />
          </>
        ) : null}
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
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F6F7' },
  identity: { alignItems: 'center', paddingHorizontal: 24, paddingTop: 30 },
  name: { marginTop: 15, color: '#202428', fontSize: 25, fontWeight: '800', textAlign: 'center' },
  username: { marginTop: 4, color: '#687178', fontSize: 15 },
  locationRow: { marginTop: 9, flexDirection: 'row', alignItems: 'center', gap: 4 },
  location: { color: '#59636A', fontSize: 14 },
  bio: { maxWidth: 360, marginTop: 12, color: '#4F5960', fontSize: 15, lineHeight: 22, textAlign: 'center' },
  joined: { marginTop: 10, color: '#7A8288', fontSize: 13 },
  editButton: { minHeight: 44, marginTop: 13, paddingHorizontal: 22, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#2F7D32', borderRadius: 22, backgroundColor: '#FFFFFF' },
  editButtonText: { color: '#2F7D32', fontSize: 15, fontWeight: '800' },
  statCard: { margin: 20, marginBottom: 2, paddingVertical: 18, alignItems: 'center', borderRadius: 16, backgroundColor: '#FFFFFF' },
  statValue: { color: '#245F2A', fontSize: 28, fontWeight: '800' },
  statLabel: { marginTop: 3, color: '#687178', fontSize: 14, fontWeight: '700' },
  sectionTitle: { marginHorizontal: 20, marginTop: 27, marginBottom: 9, color: '#30363B', fontSize: 17, fontWeight: '800' },
  subsectionTitle: { marginHorizontal: 20, marginTop: 16, marginBottom: 8, color: '#596168', fontSize: 14, fontWeight: '800' },
  card: { marginHorizontal: 16, overflow: 'hidden', borderRadius: 16, backgroundColor: '#FFFFFF' },
  cleanupStatsCard: { marginHorizontal: 16, flexDirection: 'row', overflow: 'hidden', borderRadius: 16, backgroundColor: '#FFFFFF' },
  cleanupStat: { flex: 1, minHeight: 86, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 6 },
  cleanupStatDivider: { borderLeftWidth: StyleSheet.hairlineWidth, borderLeftColor: '#DDE2DE' },
  cleanupStatValue: { color: '#245F2A', fontSize: 25, fontWeight: '800' },
  cleanupStatLabel: { minHeight: 34, marginTop: 4, color: '#687178', fontSize: 12, lineHeight: 16, fontWeight: '700', textAlign: 'center' },
  activeCleanupCard: { borderWidth: 1, borderColor: '#E7CF79', backgroundColor: '#FFF9DD' },
  activeCleanupRow: { minHeight: 124, padding: 16, flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFF9DD' },
  activeCleanupDivider: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: '#E7CF79' },
  activeCleanupIcon: { width: 46, height: 46, marginRight: 13, borderRadius: 23, alignItems: 'center', justifyContent: 'center', backgroundColor: '#F8E9A6' },
  activeCleanupCopy: { flex: 1, marginRight: 8 },
  activeCleanupTitle: { color: '#4F3A00', fontSize: 16, fontWeight: '800' },
  activeCleanupStatus: { marginTop: 4, color: '#755900', fontSize: 13, fontWeight: '800' },
  activeCleanupReward: { marginTop: 3, color: '#245F2A', fontSize: 13, fontWeight: '800' },
  activeCleanupDeadline: { marginTop: 3, color: '#806715', fontSize: 13, lineHeight: 18 },
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
  actionRow: { minHeight: 60, paddingHorizontal: 17, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: '#E0E3E5', backgroundColor: '#FFFFFF' },
  actionCopy: { flexDirection: 'row', alignItems: 'center', gap: 11 },
  actionText: { color: '#30363B', fontSize: 16 },
  destructiveText: { color: '#C62828' },
  emailRow: { minHeight: 68, paddingHorizontal: 17, justifyContent: 'center' },
  emailLabel: { color: '#727B82', fontSize: 12, fontWeight: '700' },
  emailText: { marginTop: 3, color: '#30363B', fontSize: 15 },
  deleteCard: { marginTop: 24 },
  disabled: { opacity: 0.6 },
  signedOutContent: { flexGrow: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 24, backgroundColor: '#F5F6F7' },
  signedOutIcon: { width: 92, height: 92, borderRadius: 46, alignItems: 'center', justifyContent: 'center', backgroundColor: '#E4EEE5' },
  signedOutTitle: { marginTop: 20, color: '#202428', fontSize: 24, fontWeight: '800', textAlign: 'center' },
  signedOutText: { maxWidth: 360, marginTop: 10, color: '#667078', fontSize: 15, lineHeight: 22, textAlign: 'center' },
  primaryButton: { width: '100%', maxWidth: 390, minHeight: 54, marginTop: 24, alignItems: 'center', justifyContent: 'center', borderRadius: 14, backgroundColor: '#2F7D32' },
  primaryButtonText: { color: '#FFFFFF', fontSize: 16, fontWeight: '800' },
  signedOutSupport: { width: '100%', maxWidth: 390, marginTop: 28, overflow: 'hidden', borderRadius: 14 },
});
