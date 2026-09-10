import { useCallback, useLayoutEffect, useRef, useState } from 'react';
import {
  Alert,
  Modal,
  Platform,
  ScrollView,
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import CompactRankBadge from './CompactRankBadge';
import BrandedLoadingState from './BrandedLoadingState';
import ProfileAvatar from './ProfileAvatar';
import ProfileReportList from './ProfileReportList';
import { useProfile } from './lib/profile';
import { isPermanentUser } from './lib/reportAccess';
import { useReports } from './lib/reports';
import { useSession } from './lib/session';
import { loadPublicMember, loadPublicMemberReports } from './lib/publicMember';
import useFocusedResource from './lib/useFocusedResource';

export default function PublicProfileScreen({ navigation, route }) {
  const profileId = route.params?.profileId;
  const sourceReportId = route.params?.sourceReportId ?? null;
  const { user } = useSession();
  const permanent = isPermanentUser(user);
  const { blockedIds, blockUser } = useProfile();
  const { refreshReports } = useReports();
  const [actionsOpen, setActionsOpen] = useState(false);
  const pendingAction = useRef(null);
  const [view, setView] = useState('active');
  const blocked = blockedIds.includes(profileId);
  const member = useFocusedResource(useCallback(() => loadPublicMember(profileId), [profileId, user?.id]), { enabled: Boolean(profileId) && !blocked });
  const profile = member.data;
  const activity = useFocusedResource(useCallback(cursor => loadPublicMemberReports({ profileId, view, cursor }), [profileId, view, user?.id]), { paged: true, enabled: Boolean(profile) && !blocked });

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

  const openActions = () => setActionsOpen(true);
  const selectAction = (action) => {
    if (Platform.OS === 'ios') pendingAction.current = action;
    setActionsOpen(false);
    if (Platform.OS !== 'ios') action();
  };

  useLayoutEffect(() => {
    navigation.setOptions({
      title: 'Profile',
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

  if (member.loading && !profile) return <BrandedLoadingState title="Loading profile…" message="Gathering this member’s community impact." />;
  if (member.error && !profile) return <View style={styles.center}>
    <Text style={styles.stateTitle}>Couldn’t load this profile</Text>
    <Text style={styles.stateText}>Check your connection and try again.</Text>
    <TouchableOpacity accessibilityRole="button" style={styles.manageButton} onPress={member.refresh}><Text style={styles.manageText}>Retry profile</Text></TouchableOpacity>
  </View>;
  if (!profile) return <View style={styles.center}>
    <Text style={styles.stateTitle}>Profile unavailable</Text>
    <Text style={styles.stateText}>This profile is not available to view.</Text>
  </View>;

  return (
    <><FlatList data={activity.data} keyExtractor={report => report.id} renderItem={({ item }) => <ProfileReportList reports={[item]} onReportPress={report => navigation.popTo('App', { screen: 'Map', params: { reportId: report.id } })} />} style={styles.container} contentContainerStyle={styles.content} refreshControl={<RefreshControl refreshing={member.loading || activity.loading} onRefresh={() => { member.refresh(); activity.refresh(); }} />} ListHeaderComponent={<>
      {member.error ? <Text style={styles.stateText}>Couldn’t refresh this profile. Pull down to try again.</Text> : null}
      <View style={styles.identity}>
        <View style={styles.identityTop}><View style={styles.avatarFrame}><ProfileAvatar profile={profile} size={72} /></View><View style={styles.identityCopy}>
        <Text style={styles.name}>{profile.display_name}</Text>
        <CompactRankBadge userId={profile.id} style={styles.rankBadge} /></View></View>
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
        <Text style={styles.statValue}>{profile.visible_report_count ?? '—'}</Text>
        <Text style={styles.statLabel}>Reports on this profile</Text>
      </View>

      <Text style={styles.sectionTitle}>Reports</Text>
      <View style={styles.tabs}>
        {['active', 'completed'].map(value => <TouchableOpacity key={value} accessibilityRole="tab" accessibilityState={{ selected: view === value }} onPress={() => setView(value)} style={[styles.tab, view === value && styles.selectedTab]}><Text style={styles.tabText}>{value === 'active' ? 'Active reports' : 'Completed reports'}</Text></TouchableOpacity>)}
      </View>
      {activity.error ? <TouchableOpacity accessibilityRole="button" style={styles.retry} onPress={activity.refresh}><Text>Couldn’t refresh these reports. Retry.</Text></TouchableOpacity> : null}
      </>}
      ListEmptyComponent={activity.loading ? <BrandedLoadingState compact title="Loading reports…" /> : !activity.error ? <ProfileReportList reports={[]} emptyTitle={view === 'completed' ? 'No completed reports' : 'No active reports'} /> : null}
      ListFooterComponent={<>
        {activity.moreError ? <Text style={styles.notice}>Couldn’t load older reports. Your current list is still available.</Text> : null}
        {activity.nextCursor ? <TouchableOpacity disabled={activity.loading || activity.loadingMore} accessibilityRole="button" style={styles.retry} onPress={activity.loadMore}><Text style={styles.tabText}>{activity.loadingMore ? 'Loading older reports…' : activity.moreError ? 'Retry older reports' : 'Load older reports'}</Text></TouchableOpacity> : null}
      </>}
    />
      <Modal visible={actionsOpen} transparent animationType="fade" onRequestClose={() => setActionsOpen(false)} onDismiss={() => { const action = pendingAction.current; pendingAction.current = null; action?.(); }}>
        <View style={styles.actionBackdrop} accessibilityViewIsModal onAccessibilityEscape={() => setActionsOpen(false)}>
          <TouchableOpacity style={StyleSheet.absoluteFill} accessible accessibilityRole="button" accessibilityLabel="Dismiss profile actions" onPress={() => setActionsOpen(false)} />
          <View style={styles.actionSheet}>
            <Text style={styles.actionTitle}>Profile actions</Text>
            <TouchableOpacity style={styles.actionOption} accessibilityRole="button" onPress={() => selectAction(() => navigation.navigate('ReportUser', { profileId, displayName: profile?.display_name, sourceReportId }))}>
              <Ionicons name="flag-outline" size={21} color="#49704D" /><Text style={styles.actionText}>Report account</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.actionOption} accessibilityRole="button" onPress={() => selectAction(confirmBlock)}>
              <Ionicons name="ban-outline" size={21} color="#A33A32" /><Text style={[styles.actionText, { color: '#A33A32' }]}>Block account</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.actionOption} accessibilityRole="button" onPress={() => setActionsOpen(false)}><Text style={styles.actionText}>Cancel</Text></TouchableOpacity>
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  actionBackdrop: { flex: 1, backgroundColor: 'rgba(22,32,25,0.28)', justifyContent: 'center', padding: 24 },
  actionSheet: { borderRadius: 18, padding: 16, backgroundColor: '#FFFFFF', width: '100%', maxWidth: 400, alignSelf: 'center' },
  actionTitle: { fontSize: 18, lineHeight: 24, fontWeight: '600', color: '#303B34', marginBottom: 12 },
  actionOption: { minHeight: 52, flexDirection: 'row', alignItems: 'center', gap: 12, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: '#E2EAE3' },
  actionText: { fontSize: 15, lineHeight: 22, color: '#303B34' },
  tabs: { flexDirection: 'row', marginHorizontal: 20, marginBottom: 14, padding: 4, gap: 4, borderRadius: 13, backgroundColor: '#F2F5F2' },
  tab: { flex: 1, padding: 12, minHeight: 44, justifyContent: 'center', alignItems: 'center', borderRadius: 10 },
  selectedTab: { backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#DCE7DD' },
  tabText: { color: '#245F2A', fontWeight: '700', textAlign: 'center' },
  notice: { padding: 16, color: '#687178' },
  retry: { minHeight: 44, padding: 12, justifyContent: 'center', alignItems: 'center' },
  container: { flex: 1, backgroundColor: '#FFFFFF' },
  content: { paddingBottom: 36 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 30, backgroundColor: '#FFFFFF' },
  headerAction: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  identityTop: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  avatarFrame: { padding: 3, borderWidth: 1, borderColor: '#DCE7DD', borderRadius: 40 },
  identityCopy: { flex: 1 },
  identity: { paddingHorizontal: 20, paddingTop: 24 },
  name: { color: '#202428', fontSize: 23, lineHeight: 29, fontWeight: '600' },
  rankBadge: { marginTop: 7, alignSelf: 'flex-start' },
  username: { marginTop: 4, color: '#687178', fontSize: 15 },
  locationRow: { marginTop: 9, flexDirection: 'row', alignItems: 'center', gap: 4 },
  location: { color: '#59636A', fontSize: 14 },
  bio: { maxWidth: 360, marginTop: 12, color: '#4F5960', fontSize: 15, lineHeight: 22 },
  joined: { marginTop: 10, color: '#7A8288', fontSize: 13 },
  statCard: { margin: 20, marginBottom: 2, padding: 16, flexDirection: 'row', alignItems: 'center', gap: 12, borderRadius: 14, borderWidth: 1, borderColor: '#E0EAE1', backgroundColor: '#F4F8F4' },
  statValue: { color: '#245F2A', fontSize: 24, lineHeight: 31, fontWeight: '600' },
  statLabel: { marginTop: 3, color: '#687178', fontSize: 14, fontWeight: '700' },
  sectionTitle: { marginHorizontal: 20, marginTop: 27, marginBottom: 9, color: '#30363B', fontSize: 17, fontWeight: '600' },
  card: { marginHorizontal: 16, overflow: 'hidden', borderRadius: 16, backgroundColor: '#FFFFFF' },
  stateTitle: { marginTop: 16, color: '#30363B', fontSize: 21, fontWeight: '600', textAlign: 'center' },
  stateText: { maxWidth: 340, marginTop: 8, color: '#6C757C', fontSize: 15, lineHeight: 22, textAlign: 'center' },
  manageButton: { minHeight: 48, marginTop: 18, paddingHorizontal: 20, alignItems: 'center', justifyContent: 'center', borderRadius: 13, backgroundColor: '#2F7D32' },
  manageText: { color: '#FFFFFF', fontSize: 15, fontWeight: '600' },
});
