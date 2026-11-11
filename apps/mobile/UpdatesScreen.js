import { useCallback, useState } from 'react';
import { Alert, FlatList, Linking, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import LoadingBee from './components/LoadingBee';
import { EmptyState, LoadFailure, PillTabs, PullRefresh } from './components/ui';
import { acknowledgeCleanupNotifications, loadCleanupNotifications } from './lib/cleanup';
import { cleanupNotificationDestination, cleanupNotificationPresentation } from './lib/cleanupNotifications';
import { useSession } from './lib/session';
import { colors } from './lib/theme';
import useFocusedResource from './lib/useFocusedResource';

const when = (value) => new Date(value).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });

// The website's Updates inbox (apps/web components/notification-inbox.tsx): every
// update with its report, newest first, with an Unread filter. Opening an update
// marks it read and goes to the screen it is about.
export default function UpdatesScreen({ navigation }) {
  const { user } = useSession();
  const insets = useSafeAreaInsets();
  const [filter, setFilter] = useState('all');
  const [pulling, setPulling] = useState(false);
  const resource = useFocusedResource(
    useCallback(() => loadCleanupNotifications({ userId: user?.id, unreadOnly: filter === 'unread' }), [user?.id, filter]),
    { enabled: Boolean(user?.id) },
  );
  const notices = resource.data ?? [];

  const open = async (notice) => {
    const destination = cleanupNotificationDestination(notice);
    if (!notice.read_at) {
      acknowledgeCleanupNotifications([notice.id]).then(resource.refresh).catch(() => {});
    }
    if (!destination) return;
    if (destination.url) {
      Linking.openURL(destination.url).catch(() => Alert.alert('Couldn’t open the inbox', 'Visit litterbugs.app/admin to review community reports.'));
    } else if (destination.name === 'App') {
      navigation.popTo('App', destination.params);
    } else {
      navigation.navigate(destination.name, destination.params);
    }
  };

  return (
    <FlatList
      style={styles.screen}
      contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 28 }]}
      data={notices}
      keyExtractor={(notice) => notice.id}
      refreshControl={<PullRefresh refreshing={pulling} onRefresh={async () => { setPulling(true); await resource.refresh(); setPulling(false); }} />}
      ListHeaderComponent={<PillTabs style={styles.tabs} fill={false} value={filter} onChange={setFilter} options={[['all', 'All updates'], ['unread', 'Unread']]} />}
      ListEmptyComponent={resource.error ? <LoadFailure title="Couldn’t load updates" onRetry={resource.refresh} />
        : !resource.hasLoaded ? <LoadingBee label="Loading updates" />
        : <EmptyState bug="flower" title={filter === 'unread' ? 'You’re all caught up' : 'No updates yet'} text="Updates about your reports, cleanups and contributions appear here." />}
      renderItem={({ item, index }) => {
        const copy = cleanupNotificationPresentation([item]);
        const destination = cleanupNotificationDestination(item);
        return (
          <TouchableOpacity
            style={[styles.row, index === 0 && styles.firstRow, index === notices.length - 1 && styles.lastRow]}
            onPress={() => open(item)}
            activeOpacity={0.72}
            accessibilityRole="button"
            accessibilityLabel={`${item.read_at ? '' : 'Unread. '}${copy.title}. ${item.report?.title || ''}. ${copy.message}`}
          >
            <View style={styles.copy}>
              <View style={styles.titleRow}>
                {item.read_at ? null : <View style={styles.unreadDot} />}
                <Text style={styles.title}>{copy.title}</Text>
              </View>
              {item.report?.title ? <Text style={styles.report} numberOfLines={2}>{item.report.title}</Text> : null}
              <Text style={styles.message}>{copy.message}</Text>
              <Text style={styles.when}>{when(item.created_at)}</Text>
            </View>
            {destination ? <Ionicons name="chevron-forward" size={18} color={colors.subtle} /> : null}
          </TouchableOpacity>
        );
      }}
    />
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.white },
  content: { flexGrow: 1, paddingHorizontal: 20, paddingTop: 16 },
  tabs: { marginBottom: 16 },
  row: { paddingHorizontal: 18, paddingVertical: 14, flexDirection: 'row', alignItems: 'center', gap: 12, borderWidth: 1, borderTopWidth: 0, borderColor: colors.line, backgroundColor: colors.white },
  firstRow: { borderTopWidth: 1, borderTopLeftRadius: 18, borderTopRightRadius: 18 },
  lastRow: { borderBottomLeftRadius: 18, borderBottomRightRadius: 18 },
  copy: { flex: 1, gap: 3 },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  unreadDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.primary },
  title: { flexShrink: 1, color: colors.ink, fontSize: 15, lineHeight: 20, fontWeight: '800' },
  report: { color: colors.primaryDark, fontSize: 14, lineHeight: 19, fontWeight: '700' },
  message: { color: colors.body, fontSize: 14, lineHeight: 20 },
  when: { marginTop: 2, color: colors.muted, fontSize: 12 },
});
