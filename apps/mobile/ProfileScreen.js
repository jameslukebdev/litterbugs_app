import { useMemo, useState } from 'react';
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
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import ProfileAvatar from './ProfileAvatar';
import ProfileReportList from './ProfileReportList';
import { deleteCurrentAccount, signOut } from './lib/auth';
import { getBottomNavClearance } from './lib/navigationLayout';
import { useProfile } from './lib/profile';
import { isPermanentUser } from './lib/reportAccess';
import { useReports } from './lib/reports';
import { useSession } from './lib/session';

const PATREON_URL = 'https://patreon.com/litterbugs?utm_medium=unknown&utm_source=join_link&utm_campaign=creatorshare_creator&utm_content=copyLink';

const openPatreon = async () => {
  try {
    await Linking.openURL(PATREON_URL);
  } catch (error) {
    Alert.alert('Can’t open link', 'Unable to open Patreon on this device.');
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
  const accountBusy = signingOut || deletingAccount;
  const bottomPadding = getBottomNavClearance(insets.bottom) + 18;

  const activeReports = useMemo(
    () => reports.filter((report) => report.user_id === user?.id),
    [reports, user?.id]
  );

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
    ]);
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={{ paddingBottom: bottomPadding }}
      showsVerticalScrollIndicator={false}
      refreshControl={<RefreshControl refreshing={loading} onRefresh={refresh} tintColor="#2F7D32" />}
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
  card: { marginHorizontal: 16, overflow: 'hidden', borderRadius: 16, backgroundColor: '#FFFFFF' },
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
