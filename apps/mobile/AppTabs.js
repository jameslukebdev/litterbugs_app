import { StyleSheet } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';

import FloatingBottomTabBar from './FloatingBottomTabBar';
import MapScreen from './MapScreen';
import ProfileScreen from './ProfileScreen';
import ReportsScreen from './ReportsScreen';

const Tab = createBottomTabNavigator();

export default function AppTabs({ onLaunchReady }) {
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
            title: 'Reports nearby',
            headerStyle: { backgroundColor: '#FFFFFF' },
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
            headerStyle: { backgroundColor: '#FFFFFF' },
            headerTitleStyle: styles.profileHeaderTitle,
            tabBarAccessibilityLabel: 'Profile',
          }}
        />
    </Tab.Navigator>
  );
}

const styles = StyleSheet.create({
  profileHeaderTitle: {
    color: '#1F2328',
    fontSize: 20,
    fontWeight: '700',
  },
});
