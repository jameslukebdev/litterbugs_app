import { useEffect, useState } from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import * as AppleAuthentication from 'expo-apple-authentication';

const enabled = process.env.EXPO_PUBLIC_APPLE_SIGN_IN_ENABLED === 'true';

export default function AppleSignInButton({ onPress, disabled, loading }) {
  const [available, setAvailable] = useState(false);
  useEffect(() => {
    if (!enabled) return;
    let mounted = true;
    AppleAuthentication.isAvailableAsync().then((value) => {
      if (mounted) setAvailable(value);
    }).catch(() => {});
    return () => { mounted = false; };
  }, []);
  if (!enabled || !available) return null;
  return (
    <View style={styles.container} pointerEvents={disabled ? 'none' : 'auto'}
      accessibilityState={{ disabled, busy: loading }}>
      <AppleAuthentication.AppleAuthenticationButton
        buttonType={AppleAuthentication.AppleAuthenticationButtonType.CONTINUE}
        buttonStyle={AppleAuthentication.AppleAuthenticationButtonStyle.BLACK}
        cornerRadius={14}
        style={styles.button}
        onPress={() => { if (!disabled) onPress(); }}
      />
      {loading && <ActivityIndicator color="#fff" style={styles.spinner} />}
    </View>
  );
}
const styles = StyleSheet.create({
  container: { height: 52, marginBottom: 11 },
  button: { width: '100%', height: 52 },
  spinner: { position: 'absolute', right: 14, top: 16 },
});
