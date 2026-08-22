import { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { deleteCurrentAccount, signOut } from './lib/auth';
import { getBottomNavClearance } from './lib/navigationLayout';
import { useSession } from './lib/session';

export default function ProfileScreen() {
  const { isGuest } = useSession();
  const insets = useSafeAreaInsets();
  const [signingOut, setSigningOut] = useState(false);
  const [deletingAccount, setDeletingAccount] = useState(false);
  const accountBusy = signingOut || deletingAccount;

  const handleSignOut = () => {
    if (accountBusy) return;

    const message = isGuest
      ? 'Are you sure you want to sign out? This guest account cannot be recovered or transferred.'
      : 'Are you sure you want to sign out?';

    Alert.alert('Sign Out', message, [
      { text: 'No', style: 'cancel' },
      {
        text: 'Yes',
        style: 'destructive',
        onPress: async () => {
          setSigningOut(true);
          const { error } = await signOut();

          if (error) {
            setSigningOut(false);
            Alert.alert('Couldn’t sign out', 'Check your connection and try again.');
          }
        },
      },
    ]);
  };

  const handleDeleteAccount = () => {
    if (accountBusy) return;

    Alert.alert(
      'Delete Account',
      'This permanently deletes your account and uploaded photos. Community report locations, categories, severity, status, and dates will remain without your identity. This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete Account',
          style: 'destructive',
          onPress: async () => {
            try {
              setDeletingAccount(true);
              await deleteCurrentAccount();
            } catch (error) {
              Alert.alert(
                'Couldn’t delete account',
                'No additional changes were made. Check your connection and try again.'
              );
            } finally {
              setDeletingAccount(false);
            }
          },
        },
      ]
    );
  };

  return (
    <View style={styles.container}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.content,
          { paddingBottom: getBottomNavClearance(insets.bottom) + 8 },
        ]}
      >
        <View style={styles.identity}>
          <View style={styles.avatar}>
            <Ionicons
              name="person-outline"
              size={56}
              color="#1F2933"
              accessible={false}
              importantForAccessibility="no"
            />
          </View>

          <Text style={styles.status}>
            {isGuest ? 'Guest account' : 'Signed in'}
          </Text>

          <Text style={styles.description}>
            {isGuest
              ? 'Guest mode is read-only. You can browse the map and open reports.'
              : 'Profile details will be added in the next Version 2 step.'}
          </Text>
        </View>

        <View style={styles.accountSection}>
          <Text style={styles.sectionTitle}>Account</Text>
          <TouchableOpacity
            style={[styles.actionRow, accountBusy && styles.actionDisabled]}
            onPress={handleSignOut}
            disabled={accountBusy}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityLabel={signingOut ? 'Signing out' : 'Sign out'}
          >
            <Text style={styles.actionText}>
              {signingOut ? 'Signing out…' : 'Sign out'}
            </Text>
            {signingOut ? (
              <ActivityIndicator size="small" color="#4B5563" />
            ) : (
              <Ionicons name="chevron-forward" size={22} color="#9AA1A8" />
            )}
          </TouchableOpacity>
        </View>

        <View style={styles.flexSpacer} />

        <TouchableOpacity
          style={[styles.deleteRow, accountBusy && styles.actionDisabled]}
          onPress={handleDeleteAccount}
          disabled={accountBusy}
          activeOpacity={0.7}
          accessibilityRole="button"
          accessibilityLabel={deletingAccount ? 'Deleting account' : 'Delete Account'}
        >
          <Text style={styles.deleteText}>
            {deletingAccount ? 'Deleting account…' : 'Delete Account'}
          </Text>
          {deletingAccount ? (
            <ActivityIndicator size="small" color="#C62828" />
          ) : (
            <Ionicons name="chevron-forward" size={22} color="#C62828" />
          )}
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F6F7',
  },
  content: {
    flexGrow: 1,
    paddingTop: 32,
  },
  identity: {
    alignItems: 'center',
    paddingHorizontal: 28,
  },
  avatar: {
    width: 96,
    height: 96,
    borderRadius: 48,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#E6E8EA',
  },
  status: {
    marginTop: 18,
    color: '#1F2328',
    fontSize: 25,
    fontWeight: '700',
    textAlign: 'center',
  },
  description: {
    maxWidth: 310,
    marginTop: 12,
    color: '#767D84',
    fontSize: 16,
    lineHeight: 23,
    textAlign: 'center',
  },
  accountSection: {
    marginTop: 48,
  },
  sectionTitle: {
    marginHorizontal: 20,
    marginBottom: 12,
    color: '#202428',
    fontSize: 17,
    fontWeight: '600',
  },
  actionRow: {
    minHeight: 64,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderColor: '#D9DDE0',
  },
  actionText: {
    color: '#202428',
    fontSize: 17,
    fontWeight: '400',
  },
  flexSpacer: {
    flex: 1,
    minHeight: 44,
  },
  deleteRow: {
    minHeight: 64,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderColor: '#E2C4C1',
  },
  deleteText: {
    color: '#C62828',
    fontSize: 17,
    fontWeight: '400',
  },
  actionDisabled: {
    opacity: 0.6,
  },
});
