import { useLayoutEffect } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Constants from 'expo-constants';
import { openSupport } from './lib/support';

const pages = {
  photos: {
    title: 'About photo review', icon: 'images-outline', heading: 'How your photos are reviewed',
    description: 'Photo checks help assess reports and cleanup progress. Here’s what happens after you upload.',
    sections: [
      ['Storage and file safety', 'Photos are stored by Litterbugs and checked by Cloudmersive for unsafe files.'],
      ['Report and cleanup checks', 'Report and cleanup photos may also be reviewed by Google Gemini for photo clarity, litter, hazards, and cleanup progress.'],
      ['AI has limits', 'AI can make mistakes; it does not send rewards.'],
    ],
  },
  help: {
    title: 'Get help', icon: 'help-circle-outline', heading: 'We’re here to help',
    description: 'Have a question or something isn’t working? Tell us what happened so we can help you take the next step.',
    sections: [
      ['What to include', 'Describe what you were trying to do and what happened. For a report or payment question, include the report title or reference if you have it.'],
      ['Keep your details private', 'Please don’t send passwords, bank account details, or full card numbers.'],
    ],
  },
  support: {
    title: 'Support Litterbugs', icon: 'heart-outline', heading: 'Help our community grow',
    description: 'Every report, cleanup, and shared story helps bring us closer to cleaner neighborhoods.',
    sections: [
      ['Spot litter', 'Your photos and local knowledge can help a neighbor find a place that needs care.'],
      ['Lend a hand', 'Find a nearby cleanup that feels right for you. Every little bit makes a difference.'],
      ['Spread the word', 'Share a report or a completed cleanup to help more people get involved.'],
    ],
  },
};

export default function SettingsInfoScreen({ navigation, route }) {
  const topic = pages[route.params?.topic] ? route.params.topic : 'help';
  const page = pages[topic];
  const insets = useSafeAreaInsets();
  useLayoutEffect(() => navigation.setOptions({ title: page.title }), [navigation, page.title]);
  return (
    <ScrollView style={styles.screen} contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 24 }]}>
      <View style={styles.icon}><Ionicons name={page.icon} size={26} color="#2F7D32" /></View>
      <Text style={styles.heading}>{page.heading}</Text>
      <Text style={styles.description}>{page.description}</Text>
      <View style={styles.panel}>
        {page.sections.map(([title, body], index) => (
          <View key={title} style={[styles.section, index > 0 && styles.divider]}>
            <Text style={styles.sectionTitle}>{title}</Text>
            <Text style={styles.body}>{body}</Text>
          </View>
        ))}
      </View>
      {topic === 'photos' ? <TouchableOpacity style={styles.secondary} accessibilityRole="button" onPress={() => navigation.push('SettingsInfo', { topic: 'help' })}><Text style={styles.secondaryText}>Have a question? Get help</Text><Ionicons name="chevron-forward" size={18} color="#2F7D32" /></TouchableOpacity> : null}
      {topic === 'help' ? <>
        <Text selectable style={styles.email}>support@litterbugs.app</Text>
        <TouchableOpacity style={styles.button} accessibilityRole="button" onPress={openSupport}><Ionicons name="mail-outline" size={19} color="#FFFFFF" /><Text style={styles.buttonText}>Email support</Text></TouchableOpacity>
        <Text style={styles.note}>Opens your email app. You can review your message before sending.</Text>
        <Text style={styles.note}>Litterbugs · Version {Constants.expoConfig?.version || 'unavailable'}</Text>
      </> : null}
      {topic === 'support' ? <>
        <TouchableOpacity style={styles.button} accessibilityRole="button" onPress={() => navigation.popTo('App', { screen: 'Map' })}><Text style={styles.buttonText}>Explore nearby cleanups</Text><Ionicons name="map-outline" size={18} color="#FFFFFF" /></TouchableOpacity>
      </> : null}
    </ScrollView>
  );
}
const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#FFFFFF' },
  content: { padding: 20 },
  icon: { width: 52, height: 52, borderRadius: 16, backgroundColor: '#EFF6EF', alignItems: 'center', justifyContent: 'center', marginBottom: 18 },
  heading: { fontSize: 24, lineHeight: 31, fontWeight: '600', color: '#26342A' },
  description: { fontSize: 14, lineHeight: 22, color: '#67746B', marginTop: 10, marginBottom: 24 },
  panel: { borderWidth: 1, borderColor: '#E2EAE3', borderRadius: 16, paddingHorizontal: 16 },
  section: { paddingVertical: 18 },
  divider: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: '#E2EAE3' },
  sectionTitle: { fontSize: 16, lineHeight: 22, fontWeight: '600', color: '#303B34', marginBottom: 6 },
  body: { fontSize: 14, lineHeight: 22, color: '#67746B' },
  button: { minHeight: 52, borderRadius: 13, backgroundColor: '#2F7D32', marginTop: 24, padding: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 9 },
  buttonText: { fontSize: 15, lineHeight: 21, fontWeight: '600', color: '#FFFFFF' },
  secondary: { minHeight: 52, marginTop: 16, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  secondaryText: { fontSize: 14, fontWeight: '600', color: '#2F7D32' },
  email: { marginTop: 24, color: '#303B34', fontSize: 15 },
  note: { marginTop: 12, fontSize: 12, lineHeight: 18, color: '#737E76', textAlign: 'center' },
});
