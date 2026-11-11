import { Ionicons } from '@expo/vector-icons';
import {
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import {
  BOTTOM_NAV_COLORS,
  BOTTOM_NAV_METRICS,
  getBottomNavBottom,
} from './lib/navigationLayout';
import { hapticSelect } from './lib/haptics';
import ProfileAvatar from './ProfileAvatar';
import { useProfile } from './lib/profile';
import { useSession } from './lib/session';
import { useUnreadUpdates } from './lib/unreadUpdates';
import { colors } from './lib/theme';

export const BOTTOM_NAV_SLOTS = Object.freeze([
  {
    key: 'reports',
    routeName: 'Reports',
    iconName: 'list-outline',
    label: 'Reports',
  },
  {
    key: 'map',
    routeName: 'Map',
    iconName: 'map-outline',
    label: 'Map',
  },
  {
    key: 'profile',
    routeName: 'Profile',
    iconName: 'person-outline',
    label: 'Profile',
  },
]);

export default function FloatingBottomTabBar({
  state,
  descriptors,
  navigation,
}) {
  const insets = useSafeAreaInsets();
  const { fontScale } = useWindowDimensions();
  // A signed-in member's own photo marks the Profile tab, like the website's header.
  const { profile } = useProfile();
  const { user } = useSession();
  // A dot on the Profile tab says there are unopened updates.
  const unreadUpdates = useUnreadUpdates(profile?.profile_completed_at ? user?.id : null);
  // Apply the existing compact-label cap explicitly: Android can retain stale
  // native text metrics when system scaling changes while this bar is mounted.
  const labelScale = Math.min(fontScale, 1.2);
  const focusedOptions = descriptors[state.routes[state.index]?.key]?.options ?? {};

  if (focusedOptions.tabBarStyle?.display === 'none') return null;

  const renderSlot = (slot) => {
    if (!slot.routeName) {
      return (
        <View
          key={slot.key}
          style={styles.slot}
          onStartShouldSetResponder={() => true}
          accessible={false}
          importantForAccessibility="no-hide-descendants"
        />
      );
    }

    const route = state.routes.find(({ name }) => name === slot.routeName);
    if (!route) {
      return (
        <View
          key={slot.key}
          style={styles.slot}
          onStartShouldSetResponder={() => true}
          accessible={false}
        />
      );
    }

    const routeIndex = state.routes.indexOf(route);
    const isFocused = state.index === routeIndex;
    const options = descriptors[route.key]?.options ?? {};
    const baseLabel = options.tabBarAccessibilityLabel
      ?? options.title
      ?? route.name;
    const accessibilityLabel = slot.key === 'profile' && unreadUpdates > 0
      ? `${baseLabel}, ${unreadUpdates} unread ${unreadUpdates === 1 ? 'update' : 'updates'}`
      : baseLabel;

    const onPress = () => {
      const event = navigation.emit({
        type: 'tabPress',
        target: route.key,
        canPreventDefault: true,
      });

      if (!isFocused && !event.defaultPrevented) {
        hapticSelect();
        navigation.navigate(route.name, route.params);
      }
    };

    const onLongPress = () => {
      navigation.emit({
        type: 'tabLongPress',
        target: route.key,
      });
    };

    const showsAvatar = slot.key === 'profile' && Boolean(profile?.profile_completed_at);

    return (
      <TouchableOpacity
        key={slot.key}
        style={styles.slot}
        onPress={onPress}
        onLongPress={onLongPress}
        activeOpacity={0.72}
        testID={`navigation-${slot.key}`}
        accessibilityRole="tab"
        accessibilityLabel={accessibilityLabel}
        accessibilityState={{ selected: isFocused }}
      >
        <View style={[styles.tabContent, isFocused && styles.tabContentSelected]}>
          <View style={[styles.iconBackdrop, showsAvatar && styles.avatarBackdrop]}>
            {showsAvatar ? (
              <View style={[styles.avatarRing, isFocused && { borderColor: BOTTOM_NAV_COLORS.active }]} accessible={false} importantForAccessibility="no-hide-descendants">
                <ProfileAvatar profile={profile} size={44} />
                {unreadUpdates > 0 ? <View style={styles.unreadDot} /> : null}
              </View>
            ) : (
              <Ionicons
                name={isFocused ? slot.iconName.replace('-outline', '') : slot.iconName}
                size={23}
                color={isFocused ? BOTTOM_NAV_COLORS.active : BOTTOM_NAV_COLORS.inactive}
                accessible={false}
                importantForAccessibility="no"
              />
            )}
          </View>
          {/* The member's own photo fills the slot; it needs no caption. */}
          {showsAvatar ? null : (
            <Text
              style={[styles.label, { fontSize: 10 * labelScale, lineHeight: 13 * labelScale }, isFocused && styles.labelSelected]}
              allowFontScaling={false}
            >
              {slot.label}
            </Text>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
      <View
        style={[
          styles.barDock,
          {
            bottom: getBottomNavBottom(insets.bottom),
            paddingHorizontal: BOTTOM_NAV_METRICS.horizontalInset,
          },
        ]}
        pointerEvents="box-none"
      >
        <View style={styles.bar} accessibilityRole="tablist">
          {BOTTOM_NAV_SLOTS.map(renderSlot)}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  barDock: {
    position: 'absolute',
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  bar: {
    width: '100%',
    maxWidth: BOTTOM_NAV_METRICS.maximumWidth,
    height: BOTTOM_NAV_METRICS.height,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 6,
    borderWidth: 1,
    borderColor: BOTTOM_NAV_COLORS.border,
    borderRadius: BOTTOM_NAV_METRICS.radius,
    borderCurve: 'continuous',
    backgroundColor: BOTTOM_NAV_COLORS.surface,
    boxShadow: '0 8px 24px rgba(41, 41, 50, 0.18)',
  },
  slot: {
    flex: 1,
    minWidth: 44,
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabContent: {
    width: '92%',
    minHeight: 50,
    borderRadius: 21,
    borderCurve: 'continuous',
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabContentSelected: {
    backgroundColor: BOTTOM_NAV_COLORS.activeSurface,
  },
  iconBackdrop: {
    width: 38,
    height: 27,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarBackdrop: { width: 50, height: 50 },
  avatarRing: { width: 50, height: 50, borderRadius: 25, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: 'transparent' },
  unreadDot: { position: 'absolute', top: 0, right: 0, width: 14, height: 14, borderRadius: 7, borderWidth: 2, borderColor: colors.white, backgroundColor: colors.severityHigh },
  label: {
    marginTop: 2,
    color: BOTTOM_NAV_COLORS.inactive,
    fontSize: 10,
    lineHeight: 11,
    fontWeight: '600',
  },
  labelSelected: {
    color: BOTTOM_NAV_COLORS.active,
    fontWeight: '700',
  },
});
