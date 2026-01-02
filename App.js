// App.js
import { useEffect, useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { StyleSheet, Text, View, Image, TouchableOpacity, useWindowDimensions, Alert, Linking } from 'react-native';

import AuthScreen from './AuthScreen';
import MapScreen from './MapScreen';
import { supabase } from './lib/supabase';

const Stack = createNativeStackNavigator();

const PATREON_URL = "https://patreon.com/litterbugs?utm_medium=unknown&utm_source=join_link&utm_campaign=creatorshare_creator&utm_content=copyLink"; // <-- paste your real link


const openPatreon = async () => {
  try {
    const supported = await Linking.canOpenURL(PATREON_URL);
    if (!supported) {
      Alert.alert("Can't open link", "Unable to open Patreon on this device.");
      return;
    }
    await Linking.openURL(PATREON_URL);
  } catch (e) {
    console.log("Patreon link error:", e);
    Alert.alert("Link error", "Something went wrong opening Patreon.");
  }
};
/* -------------------------
   Home / Welcome Screen
------------------------- */
function HomeScreen({ navigation }) {
  const { width, height } = useWindowDimensions();
  const logoSize = Math.min(width * 0.5, height * 0.55, 640);


  return (
    <View style={styles.container}>
      <Image
        source={require('./assets/LB_Logo_PNG.png')}
        style={[styles.logo, { width: logoSize, height: logoSize }]}
        resizeMode="contain"
      />

      <Text style={styles.title}>Welcome to Litterbugs!</Text>
      <Text style={styles.subtitle}>
        Clean your community one report at a time
      </Text>

      <TouchableOpacity
        style={styles.button}
        onPress={() => navigation.navigate('Auth')}
      >
        <Text style={styles.buttonText}>Get Started</Text>
      </TouchableOpacity>

       {/* Support Litterbugs Button */}
        <TouchableOpacity
          style={styles.supportLitterbugsButton}
          onPress={openPatreon}
          accessibilityRole="button"
          accessibilityLabel="Support Litterbugs on Patreon"
        >
          <Text style={styles.supportLitterbugsButtonText}>Support Litterbugs</Text>
        </TouchableOpacity> 


      <StatusBar hidden={false} />
    </View>
  );
}

/* -------------------------
   App Root
------------------------- */
export default function App() {
  const [session, setSession] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);

  useEffect(() => {
    // 1️⃣ Restore session on app load
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setAuthLoading(false);
    });

    // 2️⃣ Listen for auth changes (login / logout)
    const { data: subscription } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setSession(session);
      }
    );

    return () => {
      subscription.subscription.unsubscribe();
    };
  }, []);

  // ⛔ Don’t render navigation until session is known
  if (authLoading) return null;

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {session ? (
          /* -------------------------
             Logged-in flow
          ------------------------- */
          <Stack.Screen
            name="Map"
            component={MapScreen}
            options={{
              headerShown: true,
              headerTitle: () => (
                <Image
                  source={require('./assets/LB_Logo_PNG.png')}
                  style={{ width: 120, height: 40, resizeMode: "contain" }}
                />
              ),
              headerTitleAlign: "center",
              headerBackTitleVisible: false,
            }}
          />
        ) : (
          /* -------------------------
             Logged-out flow
          ------------------------- */
          <>
            <Stack.Screen name="Home" component={HomeScreen} />
            <Stack.Screen
              name="Auth"
              component={AuthScreen}
              options={{
                headerShown: true,
                title: '',
                headerShadowVisible: false,
                headerTintColor: '#2F7D32',
                headerStyle: { backgroundColor: '#F5F6F7' },
                headerBackTitleVisible: false,
              }}
            />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}


const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F6F7',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 10,
  },
  logo: { marginBottom: 15, },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 10,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    paddingHorizontal: 40,
    marginBottom: 40,
  },
  button: {
    backgroundColor: '#81C784', // friendly green
    paddingVertical: 16,
    paddingHorizontal: 48,
    borderRadius: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 3.84,
    elevation: 5,
  },
  buttonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  supportLitterbugsButton: {
    marginTop: 12,
    backgroundColor: "#E57373", // matches your app’s red family
    paddingVertical: 16,
    paddingHorizontal: 25,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 3.84,
    elevation: 5,

  },
  
  supportLitterbugsButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
  },
  
});
