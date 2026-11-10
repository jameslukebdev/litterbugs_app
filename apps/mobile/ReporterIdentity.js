import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import CompactRankBadge from './CompactRankBadge';
import ProfileAvatar from './ProfileAvatar';
import { colors } from './lib/theme';

export default function ReporterIdentity({ profile, onPress }) {
  if (!profile?.id) {
    return (
      <View style={styles.row} accessibilityLabel="Reporter unavailable">
        <ProfileAvatar profile={null} size={48} />
        <View style={styles.copy}>
          <Text style={styles.label}>Reported by</Text>
          <Text style={styles.name}>Reporter unavailable</Text>
        </View>
      </View>
    );
  }

  return (
    <TouchableOpacity
      style={styles.row}
      onPress={onPress}
      disabled={!onPress}
      activeOpacity={0.72}
      accessibilityRole={onPress ? 'button' : undefined}
      accessibilityLabel={`View ${profile.display_name || 'reporter'} profile`}
    >
      <ProfileAvatar profile={profile} size={48} />
      <View style={styles.copy}>
        <Text style={styles.label}>Reported by</Text>
        <Text style={styles.name}>{profile.display_name || 'Profile unavailable'}</Text>
        <View style={styles.rankSlot}><CompactRankBadge userId={profile.id} appearance="profileCard" /></View>
        {profile.username ? <Text style={styles.username}>@{profile.username}</Text> : null}
      </View>
      {onPress ? <Ionicons name="chevron-forward" size={18} color={colors.muted} /> : null}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  row: {
    minHeight: 68,
    flexDirection: 'row',
    alignItems: 'center',
  },
  copy: {
    flex: 1,
    marginLeft: 14,
    marginRight: 10,
  },
  label: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: '400',
  },
  name: {
    marginTop: 3,
    color: colors.ink,
    fontSize: 16,
    lineHeight: 21,
    fontWeight: '600',
  },
  rankSlot: { minHeight: 32, marginTop: 4 },
  username: {
    marginTop: 1,
    color: colors.muted,
    fontSize: 13,
  },
});
