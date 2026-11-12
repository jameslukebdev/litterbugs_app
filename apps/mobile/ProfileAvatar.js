import { StyleSheet, Text, View } from 'react-native';
import SmoothImage from './components/SmoothImage';

import { getProfileAvatarUrl, getProfileInitials } from './lib/profile';
import { colors } from './lib/theme';

export default function ProfileAvatar({ profile, size = 72, previewUri = null }) {
  const uri = previewUri || getProfileAvatarUrl(profile);
  const initials = getProfileInitials(profile?.display_name);

  if (uri) {
    return (
      <SmoothImage
        source={uri}
        contentFit="cover"
        cachePolicy="memory-disk"
        style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: colors.line }}
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
      <Text style={[styles.initials, { fontSize: Math.max(size < 32 ? 10 : 16, size * 0.34) }]}>
        {initials}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  fallback: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primaryBorder,
  },
  initials: {
    color: colors.primaryDark,
    fontWeight: '800',
  },
});
