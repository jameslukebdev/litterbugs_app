import { Image, StyleSheet } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';

import FloatingBottomTabBar from './FloatingBottomTabBar';
import MapScreen from './MapScreen';
import ProfileScreen from './ProfileScreen';
import ReportsScreen from './ReportsScreen';
import { ReportsProvider } from './lib/reports';

const Tab = createBottomTabNavigator();

function MapHeaderLogo() {
  return (
    <Image
      source={require('./assets/LB_Logo_PNG.png')}
      style={styles.logo}
      resizeMode="contain"
    />
  );
}

export default function AppTabs() {
  return (
    <ReportsProvider>
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
          component={MapScreen}
          options={{
            headerTitle: MapHeaderLogo,
            headerStyle: { backgroundColor: '#FFFFFF' },
            headerTitleContainerStyle: styles.mapHeaderTitleContainer,
            tabBarAccessibilityLabel: 'Map',
          }}
        />
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
    </ReportsProvider>
  );
}

const styles = StyleSheet.create({
  mapHeaderTitleContainer: {
    paddingBottom: 6,
  },
  logo: {
    width: 120,
    height: 40,
  },
  profileHeaderTitle: {
    color: '#1F2328',
    fontSize: 20,
    fontWeight: '700',
  },
});
