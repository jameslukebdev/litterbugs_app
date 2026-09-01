import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import CompactRankBadge from './CompactRankBadge';
import ProfileAvatar from './ProfileAvatar';

export default function ReporterIdentity({ profile, onPress }) {
  if (!profile?.id) {
    return (
      <View style={styles.row} accessibilityLabel="Reporter unavailable">
        <ProfileAvatar profile={null} size={44} />
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
      <ProfileAvatar profile={profile} size={44} />
      <View style={styles.copy}>
        <Text style={styles.label}>Reported by</Text>
        <Text style={styles.name}>{profile.display_name || 'Profile unavailable'}</Text>
        <CompactRankBadge userId={profile.id} />
        {profile.username ? <Text style={styles.username}>@{profile.username}</Text> : null}
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  row: {
    minHeight: 58,
    flexDirection: 'row',
    alignItems: 'center',
  },
  copy: {
    flex: 1,
    marginLeft: 12,
  },
  label: {
    color: '#777F86',
    fontSize: 12,
    fontWeight: '600',
  },
  name: {
    marginTop: 2,
    color: '#202428',
    fontSize: 16,
    fontWeight: '800',
  },
  username: {
    marginTop: 1,
    color: '#687178',
    fontSize: 13,
  },
});
