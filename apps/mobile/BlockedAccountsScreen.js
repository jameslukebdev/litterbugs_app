import { useCallback, useEffect, useState } from 'react';
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
import { PUBLIC_PROFILE_FIELDS, useProfile } from './lib/profile';
import { useReports } from './lib/reports';
import { useSession } from './lib/session';
import { supabase } from './lib/supabase';

export default function BlockedAccountsScreen() {
  const { user } = useSession();
  const { unblockUser } = useProfile();
  const { refreshReports } = useReports();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('user_blocks')
      .select(`blocked_id, blocked:profiles!user_blocks_blocked_id_fkey(${PUBLIC_PROFILE_FIELDS})`)
      .eq('blocker_id', user.id)
      .order('created_at', { ascending: false });

    if (error) {
      console.log('Blocked accounts load error:', error);
      Alert.alert('Couldn’t load blocked accounts', 'Check your connection and try again.');
    } else {
      setRows(data ?? []);
    }
    setLoading(false);
  }, [user.id]);

  useEffect(() => { load(); }, [load]);

  const unblock = async (profileId) => {
    try {
      setBusyId(profileId);
      await unblockUser(profileId);
      setRows((current) => current.filter(({ blocked_id }) => blocked_id !== profileId));
      await refreshReports();
    } catch (error) {
      Alert.alert('Couldn’t unblock account', 'Check your connection and try again.');
    } finally {
      setBusyId(null);
    }
  };

  if (loading) return <View style={styles.center}><ActivityIndicator size="large" color="#2F7D32" /></View>;

  return (
    <FlatList
      data={rows}
      keyExtractor={({ blocked_id }) => blocked_id}
      contentContainerStyle={[styles.content, rows.length === 0 && styles.emptyContent]}
      renderItem={({ item }) => (
        <View style={styles.row}>
          <ProfileAvatar profile={item.blocked} size={52} />
          <View style={styles.copy}>
            <Text style={styles.name}>{item.blocked?.display_name || 'Profile unavailable'}</Text>
            {item.blocked?.username ? <Text style={styles.username}>@{item.blocked.username}</Text> : null}
          </View>
          <TouchableOpacity style={styles.unblockButton} onPress={() => unblock(item.blocked_id)} disabled={busyId === item.blocked_id}>
            {busyId === item.blocked_id ? <ActivityIndicator size="small" color="#2F7D32" /> : <Text style={styles.unblockText}>Unblock</Text>}
          </TouchableOpacity>
        </View>
      )}
      ListEmptyComponent={(
        <View style={styles.center}>
          <Text style={styles.emptyTitle}>No blocked accounts</Text>
          <Text style={styles.emptyText}>Accounts you block will appear here.</Text>
        </View>
      )}
    />
  );
}

const styles = StyleSheet.create({
  content: { padding: 16, backgroundColor: '#F5F6F7' },
  emptyContent: { flexGrow: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 28, backgroundColor: '#F5F6F7' },
  row: { minHeight: 78, marginBottom: 10, paddingHorizontal: 14, flexDirection: 'row', alignItems: 'center', borderRadius: 15, backgroundColor: '#FFFFFF' },
  copy: { flex: 1, marginHorizontal: 12 },
  name: { color: '#30363B', fontSize: 16, fontWeight: '800' },
  username: { marginTop: 2, color: '#707980', fontSize: 13 },
  unblockButton: { minWidth: 78, minHeight: 42, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#2F7D32', borderRadius: 21 },
  unblockText: { color: '#2F7D32', fontSize: 14, fontWeight: '800' },
  emptyTitle: { color: '#30363B', fontSize: 20, fontWeight: '800' },
  emptyText: { marginTop: 7, color: '#707980', fontSize: 15 },
});
