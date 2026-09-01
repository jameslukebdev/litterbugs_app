import { useEffect, useLayoutEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import CompactRankBadge from './CompactRankBadge';
import ProfileAvatar from './ProfileAvatar';
import ProfileReportList from './ProfileReportList';
import { PUBLIC_PROFILE_FIELDS, useProfile } from './lib/profile';
import { isPermanentUser } from './lib/reportAccess';
import { useReports } from './lib/reports';
import { useSession } from './lib/session';
import { supabase } from './lib/supabase';

export default function PublicProfileScreen({ navigation, route }) {
  const profileId = route.params?.profileId;
  const sourceReportId = route.params?.sourceReportId ?? null;
  const { user } = useSession();
  const permanent = isPermanentUser(user);
  const { blockedIds, blockUser } = useProfile();
  const { reports, refreshReports } = useReports();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [missing, setMissing] = useState(false);
  const blocked = blockedIds.includes(profileId);

  useEffect(() => {
    let active = true;
    const load = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from('profiles')
        .select(PUBLIC_PROFILE_FIELDS)
        .eq('id', profileId)
        .maybeSingle();

      if (!active) return;
      if (error) console.log('Public profile load error:', error);
      setProfile(data ?? null);
      setMissing(Boolean(error || !data));
      setLoading(false);
    };
    load();
    return () => { active = false; };
  }, [profileId]);

  const activeReports = useMemo(
    () => reports.filter((report) => report.user_id === profileId),
    [profileId, reports]
  );

  const confirmBlock = () => {
    Alert.alert(
      `Block ${profile?.display_name || 'this user'}?`,
      'Their profile and reports will be hidden from your signed-in experience. They won’t be notified.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Block',
          style: 'destructive',
          onPress: async () => {
            try {
              await blockUser(profileId);
              await refreshReports();
              navigation.goBack();
            } catch (error) {
              Alert.alert('Couldn’t block user', 'Check your connection and try again.');
            }
          },
        },
      ]
    );
  };

  const openActions = () => {
    Alert.alert(profile?.display_name || 'Profile actions', undefined, [
      {
        text: 'Report User',
        onPress: () => navigation.navigate('ReportUser', {
          profileId,
          displayName: profile?.display_name,
          sourceReportId,
        }),
      },
      {
        text: 'Block User',
        style: 'destructive',
        onPress: () => setTimeout(confirmBlock, 250),
      },
      { text: 'Cancel', style: 'cancel' },
    ]);
  };

  useLayoutEffect(() => {
    navigation.setOptions({
      title: profile?.display_name || 'Profile',
      headerRight: permanent && user?.id !== profileId && !blocked && profile ? () => (
        <TouchableOpacity
          style={styles.headerAction}
          onPress={openActions}
          accessibilityRole="button"
          accessibilityLabel="Profile actions"
        >
          <Ionicons name="ellipsis-horizontal" size={24} color="#2F7D32" />
        </TouchableOpacity>
      ) : undefined,
    });
  }, [blocked, navigation, permanent, profile, profileId, user?.id]);

  if (loading) {
    return <View style={styles.center}><ActivityIndicator size="large" color="#2F7D32" /></View>;
  }

  if (missing) {
    return (
      <View style={styles.center}>
        <Ionicons name="person-outline" size={48} color="#7A848A" />
        <Text style={styles.stateTitle}>Profile unavailable</Text>
        <Text style={styles.stateText}>This reporter no longer has a public profile.</Text>
      </View>
    );
  }

  if (blocked) {
    return (
      <View style={styles.center}>
        <Ionicons name="ban-outline" size={48} color="#6D767C" />
        <Text style={styles.stateTitle}>You blocked this account</Text>
        <Text style={styles.stateText}>Manage blocked accounts from your Profile tab to view this content again.</Text>
        <TouchableOpacity style={styles.manageButton} onPress={() => navigation.navigate('BlockedAccounts')}>
          <Text style={styles.manageText}>Manage blocked accounts</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.identity}>
        <ProfileAvatar profile={profile} size={104} />
        <Text style={styles.name}>{profile.display_name}</Text>
        <CompactRankBadge userId={profile.id} style={styles.rankBadge} />
        {profile.username ? <Text style={styles.username}>@{profile.username}</Text> : null}
        {profile.location ? (
          <View style={styles.locationRow}>
            <Ionicons name="location-outline" size={16} color="#677178" />
            <Text style={styles.location}>{profile.location}</Text>
          </View>
        ) : null}
        {profile.bio ? <Text style={styles.bio}>{profile.bio}</Text> : null}
        <Text style={styles.joined}>
          Joined {new Date(profile.created_at).toLocaleDateString(undefined, { month: 'long', year: 'numeric' })}
        </Text>
      </View>

      <View style={styles.statCard}>
        <Text style={styles.statValue}>{profile.reports_created_count ?? 0}</Text>
        <Text style={styles.statLabel}>Reports submitted</Text>
      </View>

      <Text style={styles.sectionTitle}>Active reports</Text>
      <View style={styles.card}>
        <ProfileReportList
          reports={activeReports}
          onReportPress={(report) => navigation.navigate('App', {
            screen: 'Map',
            params: { reportId: report.id },
          })}
        />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F6F7' },
  content: { paddingBottom: 36 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 30, backgroundColor: '#F5F6F7' },
  headerAction: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  identity: { alignItems: 'center', paddingHorizontal: 24, paddingTop: 30 },
  name: { marginTop: 15, color: '#202428', fontSize: 25, fontWeight: '800', textAlign: 'center' },
  rankBadge: { marginTop: 9, alignSelf: 'center' },
  username: { marginTop: 4, color: '#687178', fontSize: 15 },
  locationRow: { marginTop: 9, flexDirection: 'row', alignItems: 'center', gap: 4 },
  location: { color: '#59636A', fontSize: 14 },
  bio: { maxWidth: 360, marginTop: 12, color: '#4F5960', fontSize: 15, lineHeight: 22, textAlign: 'center' },
  joined: { marginTop: 10, color: '#7A8288', fontSize: 13 },
  statCard: { margin: 20, marginBottom: 2, paddingVertical: 18, alignItems: 'center', borderRadius: 16, backgroundColor: '#FFFFFF' },
  statValue: { color: '#245F2A', fontSize: 28, fontWeight: '800' },
  statLabel: { marginTop: 3, color: '#687178', fontSize: 14, fontWeight: '700' },
  sectionTitle: { marginHorizontal: 20, marginTop: 27, marginBottom: 9, color: '#30363B', fontSize: 17, fontWeight: '800' },
  card: { marginHorizontal: 16, overflow: 'hidden', borderRadius: 16, backgroundColor: '#FFFFFF' },
  stateTitle: { marginTop: 16, color: '#30363B', fontSize: 21, fontWeight: '800', textAlign: 'center' },
  stateText: { maxWidth: 340, marginTop: 8, color: '#6C757C', fontSize: 15, lineHeight: 22, textAlign: 'center' },
  manageButton: { minHeight: 48, marginTop: 18, paddingHorizontal: 20, alignItems: 'center', justifyContent: 'center', borderRadius: 24, backgroundColor: '#2F7D32' },
  manageText: { color: '#FFFFFF', fontSize: 15, fontWeight: '800' },
});
