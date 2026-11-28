import { useEffect, useState } from 'react';
import { Alert, StyleSheet, Text, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { loadTipEligible } from '../lib/community';
import { hapticTap } from '../lib/haptics';
import { colors, fonts } from '../lib/theme';

/**
 * One "Leave a tip" button on a finished report, as on the website. With both the cleaner and the
 * reporter able to receive tips it asks who to tip; with one, it goes straight to their tip page.
 * Hidden when nobody here can be tipped (or the only person is you).
 */
export default function LeaveTipButton({ reportId, cleaner, reporter, currentUserId, visible = true, onTip, style }) {
  const [people, setPeople] = useState([]);
  const cleanerId = cleaner?.id ?? null;
  const reporterId = reporter?.id ?? null;

  useEffect(() => {
    let active = true;
    setPeople([]);
    if (!visible) return () => { active = false; };
    const candidates = [
      cleanerId && { id: cleanerId, name: cleaner?.display_name, role: 'cleaner' },
      reporterId && reporterId !== cleanerId && { id: reporterId, name: reporter?.display_name, role: 'reporter' },
    ].filter((person) => person && person.id !== currentUserId);
    if (!candidates.length) return () => { active = false; };
    loadTipEligible(candidates.map((person) => person.id))
      .then((eligible) => { if (active) setPeople(candidates.filter((person) => eligible.has(person.id))); })
      .catch(() => undefined);
    return () => { active = false; };
  }, [visible, reportId, cleanerId, reporterId, currentUserId, cleaner?.display_name, reporter?.display_name]);

  if (!people.length) return null;

  const press = () => {
    hapticTap();
    if (people.length === 1) { onTip(people[0]); return; }
    Alert.alert('Who would you like to tip?', undefined, [
      ...people.map((person) => ({
        text: `${person.role === 'cleaner' ? 'Cleaner' : 'Reporter'}: ${person.name || 'Member'}`,
        onPress: () => onTip(person),
      })),
      { text: 'Cancel', style: 'cancel' },
    ]);
  };

  return (
    <TouchableOpacity style={[styles.button, style]} onPress={press} accessibilityRole="button"
      accessibilityLabel={people.length === 1 ? `Leave a tip for ${people[0].name || 'this member'}` : 'Leave a tip'} testID="leave-tip">
      <Ionicons name="heart" size={17} color={colors.needsCleanup} />
      <Text style={styles.text}>Leave a tip</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    minHeight: 50, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    borderRadius: 14, borderWidth: 1.5, borderColor: '#F8D3D7', borderBottomWidth: 3, borderBottomColor: '#ED8F97', backgroundColor: '#FFF0F1',
  },
  text: { color: colors.needsCleanup, fontSize: 16, fontFamily: fonts.heading },
});
