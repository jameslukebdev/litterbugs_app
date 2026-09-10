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
      style={{ flex: 1, backgroundColor: '#FFFFFF' }}
      data={rows}
      refreshing={loading}
      onRefresh={load}
      ListHeaderComponent={<><Text style={styles.intro}>Manage the accounts you’ve blocked. You can unblock an account here at any time.</Text>{error ? <TouchableOpacity accessibilityRole="button" onPress={load} style={{ padding: 16, minHeight: 44 }}><Text>Couldn’t load blocked accounts. Tap to retry.</Text></TouchableOpacity> : null}</>}
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
            <Text style={[styles.unblockText, busyId === item.blocked_id && { opacity: 0 }]}>Unblock</Text>{busyId === item.blocked_id ? <ActivityIndicator style={StyleSheet.absoluteFill} color="#2F7D32" /> : null}
          </TouchableOpacity>
        </View>
      )}
      ListEmptyComponent={!error && !loading ? (
        <View style={styles.center}>
          <View style={styles.emptyIcon}><Ionicons name="shield-checkmark-outline" size={26} color="#49704D" /></View>
          <Text style={styles.emptyTitle}>No blocked accounts</Text>
          <Text style={styles.emptyText}>Accounts you block will appear here.</Text>
        </View>
      ) : loading && !rows.length ? <View style={styles.center}><ActivityIndicator color="#49704D" accessibilityLabel="Loading blocked accounts" /></View> : null}
    />
  );
}

const styles = StyleSheet.create({
  intro: { fontSize: 14, lineHeight: 22, color: '#67746B', marginBottom: 24 },
  emptyIcon: { width: 56, height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center', backgroundColor: '#EFF6EF', marginBottom: 14 },
  content: { padding: 20, backgroundColor: '#FFFFFF' },
  emptyContent: { flexGrow: 1 },
  center: { minHeight: 280, alignItems: 'center', justifyContent: 'center', padding: 24, backgroundColor: '#FFFFFF' },
  row: { minHeight: 78, marginBottom: 10, paddingHorizontal: 14, flexDirection: 'row', alignItems: 'center', borderRadius: 14, borderWidth: 1, borderColor: '#E2EAE3', backgroundColor: '#FFFFFF' },
  copy: { flex: 1, marginHorizontal: 12 },
  name: { color: '#30363B', fontSize: 16, fontWeight: '600' },
  username: { marginTop: 2, color: '#707980', fontSize: 13 },
  unblockButton: { minWidth: 78, minHeight: 44, paddingHorizontal: 13, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#2F7D32', borderRadius: 12 },
  unblockText: { color: '#2F7D32', fontSize: 14, fontWeight: '600' },
  emptyTitle: { color: '#30363B', fontSize: 17, fontWeight: '600' },
  emptyText: { marginTop: 7, color: '#707980', fontSize: 15 },
});
