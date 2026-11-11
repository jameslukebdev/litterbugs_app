import useFocusedResource from './lib/useFocusedResource';
import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

import ProfileAvatar from './ProfileAvatar';
import { Ionicons } from '@expo/vector-icons';
import { PUBLIC_PROFILE_FIELDS, useProfile } from './lib/profile';
import { useReports } from './lib/reports';
import { useSession } from './lib/session';
import { supabase } from './lib/supabase';
import LoadingBee from './components/LoadingBee';
import { EmptyState, PullRefresh, TextLink } from './components/ui';
import { colors } from './lib/theme';

export default function BlockedAccountsScreen() {
  const { user } = useSession();
  const { unblockUser } = useProfile();
  const { refreshReports } = useReports();
  const [busyId, setBusyId] = useState(null);
  const resource = useFocusedResource(useCallback(async () => {
    const { data, error } = await supabase.from('user_blocks')
      .select(`blocked_id, blocked:profiles!user_blocks_blocked_id_fkey(${PUBLIC_PROFILE_FIELDS})`)
      .eq('blocker_id', user.id).order('created_at', { ascending: false });
    if (error) throw error;
    return data ?? [];
  }, [user?.id]), { enabled: Boolean(user?.id) });
  const { loading, error, refresh: load } = resource;
  const rows = resource.data ?? [];

  const unblock = async (profileId) => {
    if (busyId) return;
    try {
      setBusyId(profileId);
      await unblockUser(profileId);
      await load();
      await refreshReports();
    } catch (error) {
      Alert.alert('Couldn’t unblock account', 'Check your connection and try again.');
    } finally {
      setBusyId(null);
    }
  };



  return (
    <FlatList
      style={{ flex: 1, backgroundColor: colors.white }}
      data={rows}
      refreshControl={<PullRefresh refreshing={loading && rows.length > 0} onRefresh={load} />}
      ListHeaderComponent={<><Text style={styles.intro}>Manage the accounts you’ve blocked. You can unblock an account here at any time.</Text>{error ? <TextLink align="start" label="Couldn’t load blocked accounts. Tap to retry." onPress={load} style={styles.retry} /> : null}</>}
      keyExtractor={({ blocked_id }) => blocked_id}
      contentContainerStyle={[styles.content, rows.length === 0 && styles.emptyContent]}
      renderItem={({ item }) => (
        <View style={styles.row}>
          <ProfileAvatar profile={item.blocked} size={52} />
          <View style={styles.copy}>
            <Text style={styles.name}>{item.blocked?.display_name || 'Profile unavailable'}</Text>
            {item.blocked?.username ? <Text style={styles.username}>@{item.blocked.username}</Text> : null}
          </View>
          <TouchableOpacity accessibilityRole="button" accessibilityLabel={`Unblock ${item.blocked?.display_name || 'account'}`} accessibilityState={{ busy: busyId === item.blocked_id, disabled: Boolean(busyId) }} style={styles.unblockButton} onPress={() => unblock(item.blocked_id)} disabled={Boolean(busyId)}>
            <Text style={[styles.unblockText, busyId === item.blocked_id && { opacity: 0 }]}>Unblock</Text>{busyId === item.blocked_id ? <ActivityIndicator style={StyleSheet.absoluteFill} color={colors.primary} /> : null}
          </TouchableOpacity>
        </View>
      )}
      ListEmptyComponent={!error && !loading ? (
        <EmptyState icon={<Ionicons name="shield-checkmark-outline" size={34} color={colors.subtle} />} title="No blocked accounts" text="Accounts you block will appear here." style={styles.center} />
      ) : loading && !rows.length ? <LoadingBee label="Loading blocked accounts" /> : null}
    />
  );
}

const styles = StyleSheet.create({
  intro: { fontSize: 14, lineHeight: 22, color: colors.muted, marginBottom: 24 },
  retry: { marginBottom: 12 },
  content: { padding: 20, backgroundColor: colors.white },
  emptyContent: { flexGrow: 1 },
  center: { minHeight: 280 },
  row: { minHeight: 78, marginBottom: 10, paddingHorizontal: 14, flexDirection: 'row', alignItems: 'center', borderRadius: 14, borderWidth: 1, borderColor: colors.line, backgroundColor: colors.white },
  copy: { flex: 1, marginHorizontal: 12 },
  name: { color: colors.ink, fontSize: 16, fontWeight: '600' },
  username: { marginTop: 2, color: colors.muted, fontSize: 13 },
  unblockButton: { minWidth: 78, minHeight: 44, paddingHorizontal: 13, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: colors.primary, borderRadius: 12 },
  unblockText: { color: colors.primary, fontSize: 14, fontWeight: '600' },
});
