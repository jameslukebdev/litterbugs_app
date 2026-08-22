import { Ionicons } from '@expo/vector-icons';
import {
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import {
  BOTTOM_NAV_COLORS,
  BOTTOM_NAV_METRICS,
} from './lib/navigationLayout';

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
    const accessibilityLabel = options.tabBarAccessibilityLabel
      ?? options.title
      ?? route.name;

    const onPress = () => {
      const event = navigation.emit({
        type: 'tabPress',
        target: route.key,
        canPreventDefault: true,
      });

      if (!isFocused && !event.defaultPrevented) {
        navigation.navigate(route.name, route.params);
      }
    };

    const onLongPress = () => {
      navigation.emit({
        type: 'tabLongPress',
        target: route.key,
      });
    };

    return (
      <TouchableOpacity
        key={slot.key}
        style={styles.slot}
        onPress={onPress}
        onLongPress={onLongPress}
        activeOpacity={0.72}
        accessibilityRole="tab"
        accessibilityLabel={accessibilityLabel}
        accessibilityState={{ selected: isFocused }}
      >
        <View style={styles.tabContent}>
          <View style={[styles.iconBackdrop, isFocused && styles.iconBackdropSelected]}>
            <Ionicons
              name={slot.iconName}
              size={23}
              color={isFocused ? BOTTOM_NAV_COLORS.active : BOTTOM_NAV_COLORS.inactive}
              accessible={false}
              importantForAccessibility="no"
            />
          </View>
          <Text
            style={[styles.label, isFocused && styles.labelSelected]}
            maxFontSizeMultiplier={1.2}
          >
            {slot.label}
          </Text>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
      <View
        style={[
          styles.bar,
          {
            height: BOTTOM_NAV_METRICS.height + insets.bottom,
            paddingBottom: insets.bottom,
          },
        ]}
        accessibilityRole="tablist"
      >
        {BOTTOM_NAV_SLOTS.map(renderSlot)}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: BOTTOM_NAV_COLORS.surface,
  },
  slot: {
    flex: 1,
    minWidth: 44,
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabContent: {
    minWidth: 64,
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconBackdrop: {
    width: 46,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconBackdropSelected: {
    backgroundColor: BOTTOM_NAV_COLORS.selectedBackground,
  },
  label: {
    marginTop: 1,
    color: BOTTOM_NAV_COLORS.inactive,
    fontSize: 10,
    lineHeight: 11,
    fontWeight: '500',
  },
  labelSelected: {
    color: BOTTOM_NAV_COLORS.active,
    fontWeight: '700',
  },
});
