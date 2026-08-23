import { StyleSheet, Text, View } from 'react-native';
import { Image } from 'expo-image';

import { getProfileAvatarUrl, getProfileInitials } from './lib/profile';

export default function ProfileAvatar({ profile, size = 72, previewUri = null }) {
  const uri = previewUri || getProfileAvatarUrl(profile);
  const initials = getProfileInitials(profile?.display_name);

  if (uri) {
    return (
      <Image
        source={uri}
        contentFit="cover"
        cachePolicy="memory-disk"
        transition={150}
        style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: '#E4E8E4' }}
        accessibilityLabel={`${profile?.display_name || 'User'} profile photo`}
      />
    );
  }

  return (
    <View
      style={[
        styles.fallback,
        { width: size, height: size, borderRadius: size / 2 },
      ]}
      accessibilityLabel={`${profile?.display_name || 'User'} initials`}
    >
      <Text style={[styles.initials, { fontSize: Math.max(16, size * 0.34) }]}>
        {initials}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  fallback: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#DCE8DD',
  },
  initials: {
    color: '#245B2A',
    fontWeight: '800',
  },
});
