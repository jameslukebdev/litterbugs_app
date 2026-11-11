import { useCallback, useLayoutEffect, useRef, useState } from 'react';
import {
  Alert,
  Modal,
  Platform,
  ScrollView,
  FlatList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import LoadingBee from './components/LoadingBee';
import { EmptyState, LoadFailure, PillTabs, PullRefresh, TextLink } from './components/ui';
import RankCard from './components/RankCard';
import PointsExplanation from './components/PointsExplanation';
import { loadRanking } from './lib/rankingService';
import ProfileAvatar from './ProfileAvatar';
import ProfileReportList from './ProfileReportList';
import { useProfile } from './lib/profile';
import { isPermanentUser } from './lib/reportAccess';
import { useReports } from './lib/reports';
import { useSession } from './lib/session';
import { loadPublicMember, loadPublicMemberReports } from './lib/publicMember';
import useFocusedResource from './lib/useFocusedResource';
import { colors, fonts } from './lib/theme';

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
  const rank = useFocusedResource(useCallback(() => loadRanking(profileId), [profileId]), { enabled: Boolean(profileId) && !blocked, cacheKey: `rank:${profileId}` });
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
          <Ionicons name="ellipsis-horizontal" size={24} color={colors.primary} />
        </TouchableOpacity>
      ) : undefined,
    });
  }, [blocked, navigation, permanent, profile, profileId, user?.id]);

  if (blocked) {
    return (
      <View style={styles.center}>
        <EmptyState icon={<Ionicons name="ban-outline" size={36} color={colors.subtle} />} title="You blocked this account" text="Unblock this account to view its profile again." action={{ label: 'Manage blocked accounts', onPress: () => navigation.navigate('BlockedAccounts') }} />
      </View>
    );
  }

  if (member.loading && !profile) return <LoadingBee label="Loading profile" style={styles.center} />;
  if (member.error && !profile) return <View style={styles.center}><LoadFailure title="Couldn’t load this profile" onRetry={member.refresh} /></View>;
  if (!profile) return <View style={styles.center}>
    <Text style={styles.stateTitle}>Profile unavailable</Text>
    <Text style={styles.stateText}>This profile is not available to view.</Text>
  </View>;

  return (
    <><FlatList data={activity.data} keyExtractor={report => report.id} renderItem={({ item }) => <ProfileReportList reports={[item]} onReportPress={report => navigation.popTo('App', { screen: 'Map', params: { reportId: report.id } })} />} style={styles.container} contentContainerStyle={styles.content} refreshControl={<PullRefresh refreshing={member.loading || activity.loading} onRefresh={() => { member.refresh(); activity.refresh(); }} />} ListHeaderComponent={<>
      {member.error ? <Text style={styles.stateText}>Couldn’t refresh this profile. Pull down to try again.</Text> : null}
      {/* Website member page: photo, name, place, joined date and bio, then the rank block. */}
      <View style={styles.identity}>
        <View style={styles.identityTop}>
          <ProfileAvatar profile={profile} size={64} />
          <View style={styles.identityCopy}>
            <Text style={styles.name}>{profile.display_name}</Text>
            {profile.username ? <Text style={styles.username}>@{profile.username}</Text> : null}
            {profile.location ? (
              <View style={styles.locationRow}>
                <Ionicons name="location-outline" size={15} color={colors.muted} />
                <Text style={styles.location}>{profile.location}</Text>
              </View>
            ) : null}
            <Text style={styles.joined}>
              Joined {new Date(profile.created_at).toLocaleDateString(undefined, { month: 'long', year: 'numeric' })}
            </Text>
          </View>
        </View>
        {profile.bio ? <Text style={styles.bio}>{profile.bio}</Text> : null}
      </View>

      <View style={styles.rankBlock}>
        <RankCard ranking={rank.data} loading={rank.loading} error={rank.error} onRetry={rank.refresh} own={false} />
        <PointsExplanation ranking={rank.data} appearance="row" />
      </View>

      <Text style={styles.sectionTitle}>Reports</Text>
      <PillTabs style={styles.tabs} value={view} onChange={setView} options={[['active', 'Active reports'], ['completed', 'Completed reports']]} />
      {activity.error ? <TextLink label="Couldn’t refresh these reports. Retry." onPress={activity.refresh} /> : null}
      </>}
      ListEmptyComponent={activity.loading ? <LoadingBee label="Loading reports" /> : !activity.error ? <ProfileReportList reports={[]} emptyTitle={view === 'completed' ? 'No completed reports' : 'No active reports'} /> : null}
      ListFooterComponent={<>
        {activity.moreError ? <Text style={styles.notice}>Couldn’t load older reports. Your current list is still available.</Text> : null}
        {activity.nextCursor ? <TextLink disabled={activity.loading || activity.loadingMore} label={activity.loadingMore ? 'Loading older reports…' : activity.moreError ? 'Retry older reports' : 'Load older reports'} onPress={activity.loadMore} /> : null}
      </>}
    />
      <Modal visible={actionsOpen} transparent animationType="fade" onRequestClose={() => setActionsOpen(false)} onDismiss={() => { const action = pendingAction.current; pendingAction.current = null; action?.(); }}>
        <View style={styles.actionBackdrop} accessibilityViewIsModal onAccessibilityEscape={() => setActionsOpen(false)}>
          <TouchableOpacity style={StyleSheet.absoluteFill} accessible accessibilityRole="button" accessibilityLabel="Dismiss profile actions" onPress={() => setActionsOpen(false)} />
          <View style={styles.actionSheet}>
            <Text style={styles.actionTitle}>Profile actions</Text>
            <TouchableOpacity style={styles.actionOption} accessibilityRole="button" onPress={() => selectAction(() => navigation.navigate('ReportUser', { profileId, displayName: profile?.display_name, sourceReportId }))}>
              <Ionicons name="flag-outline" size={21} color={colors.primaryDark} /><Text style={styles.actionText}>Report account</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.actionOption} accessibilityRole="button" onPress={() => selectAction(confirmBlock)}>
              <Ionicons name="ban-outline" size={21} color={colors.red} /><Text style={[styles.actionText, { color: colors.red }]}>Block account</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.actionOption} accessibilityRole="button" onPress={() => setActionsOpen(false)}><Text style={styles.actionText}>Cancel</Text></TouchableOpacity>
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  actionBackdrop: { flex: 1, backgroundColor: 'rgba(41, 41, 50, 0.28)', justifyContent: 'center', padding: 24 },
  actionSheet: { borderRadius: 18, padding: 16, backgroundColor: colors.white, width: '100%', maxWidth: 400, alignSelf: 'center' },
  actionTitle: { fontSize: 18, lineHeight: 24, fontFamily: fonts.heading, color: colors.ink, marginBottom: 12 },
  actionOption: { minHeight: 52, flexDirection: 'row', alignItems: 'center', gap: 12, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.line },
  actionText: { fontSize: 15, lineHeight: 22, color: colors.ink },
  tabs: { marginHorizontal: 20, marginBottom: 14 },
  notice: { padding: 16, color: colors.muted },
  container: { flex: 1, backgroundColor: colors.white },
  content: { paddingBottom: 36 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 30, backgroundColor: colors.white },
  headerAction: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  identityTop: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  identityCopy: { flex: 1 },
  identity: { paddingHorizontal: 20, paddingTop: 24 },
  name: { color: colors.ink, fontSize: 23, lineHeight: 29, fontFamily: fonts.heading },
  username: { marginTop: 4, color: colors.muted, fontSize: 15 },
  locationRow: { marginTop: 9, flexDirection: 'row', alignItems: 'center', gap: 4 },
  location: { color: colors.body, fontSize: 14 },
  bio: { maxWidth: 360, marginTop: 12, color: colors.body, fontSize: 15, lineHeight: 22 },
  joined: { marginTop: 4, color: colors.muted, fontSize: 14 },
  rankBlock: { marginHorizontal: 20, marginTop: 22 },
  sectionTitle: { marginHorizontal: 20, marginTop: 24, marginBottom: 10, color: colors.ink, fontSize: 20, fontFamily: fonts.heading },
  card: { marginHorizontal: 16, overflow: 'hidden', borderRadius: 16, backgroundColor: colors.white },
  stateTitle: { marginTop: 16, color: colors.ink, fontSize: 21, fontFamily: fonts.heading, textAlign: 'center' },
  stateText: { maxWidth: 340, marginTop: 8, color: colors.muted, fontSize: 15, lineHeight: 22, textAlign: 'center' },
});
