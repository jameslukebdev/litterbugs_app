import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Image, StyleSheet, View, useWindowDimensions } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';

import FloatingBottomTabBar from './FloatingBottomTabBar';
import MapScreen from './MapScreen';
import ProfileScreen from './ProfileScreen';
import ReportsScreen from './ReportsScreen';

const Tab = createBottomTabNavigator();

export default function AppTabs({ onLaunchReady }) {
  const { fontScale } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  return (
    <Tab.Navigator
        initialRouteName="Map"
        backBehavior="initialRoute"
        tabBar={(props) => <FloatingBottomTabBar {...props} />}
        screenOptions={{
          headerTitleAlign: 'center',
          headerBackVisible: false,
          tabBarShowLabel: false,
          sceneStyle: { backgroundColor: '#F5F6F7' },
        }}
      >
        <Tab.Screen
          name="Reports"
          component={ReportsScreen}
          options={{
            title: 'Reports',
            headerLeft: () => (
              <View style={styles.headerLogoArea} pointerEvents="none">
                <Image
                  source={require('./assets/LB_Logo_PNG.png')}
                  resizeMode="contain"
                  style={styles.headerLogo}
                  accessible={false}
                />
              </View>
            ),
            headerStyle: { backgroundColor: '#FFFFFF', height: insets.top + Math.max(56, 34 * fontScale + 24) },
            headerTitleStyle: styles.profileHeaderTitle,
            tabBarAccessibilityLabel: 'Reports',
          }}
        />
        <Tab.Screen
          name="Map"
          options={{
            headerShown: false,
            tabBarAccessibilityLabel: 'Map',
          }}
        >
          {(screenProps) => (
            <MapScreen {...screenProps} onLaunchReady={onLaunchReady} />
          )}
        </Tab.Screen>
        <Tab.Screen
          name="Profile"
          component={ProfileScreen}
          options={{
            title: 'Profile',
            headerLeft: () => (
              <View style={styles.headerLogoArea} pointerEvents="none">
                <Image
                  source={require('./assets/LB_Logo_PNG.png')}
                  resizeMode="contain"
                  style={styles.headerLogo}
                  accessible={false}
                />
              </View>
            ),
            headerStyle: { backgroundColor: '#FFFFFF', height: insets.top + Math.max(56, 34 * fontScale + 24) },
            headerTitleStyle: styles.profileHeaderTitle,
            tabBarAccessibilityLabel: 'Profile',
          }}
        />
    </Tab.Navigator>
  );
}

const styles = StyleSheet.create({
  headerLogoArea: {
    width: 52,
    height: 44,
    marginLeft: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerLogo: {
    width: 42,
    height: 34,
  },
  profileHeaderTitle: {
    color: '#1F2328',
    fontSize: 20,
    fontWeight: '700',
  },
});
