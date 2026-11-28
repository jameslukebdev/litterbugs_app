import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { FlatList, Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import BrandBug from './components/BrandBug';
import { LoadFailure, PullRefresh, SecondaryButton } from './components/ui';
import LoadingBee from './components/LoadingBee';
import {
  BOARDS, BOARD_COPY, daysLeftLabel, defaultBoard, defaultPeriod, loadBoards, loadCommunities, loadMyCommunities,
  loadTipEligible, monthInfo, ordinal,
} from './lib/community';
import { hapticSelect } from './lib/haptics';
import { getBottomNavClearance } from './lib/navigationLayout';
import { getRankAsset } from './lib/rankAssets';
import { getRankForPoints } from './lib/ranking';
import { useSession } from './lib/session';
import { colors, fonts } from './lib/theme';

const VISIBLE = 10;
const GLOBAL = { slug: null, label: 'Global', time_zone: 'America/New_York' };

/** Each board takes its action's colour: Clean = lilac, Report = blue, Fund = yellow (as on the website). */
const TINTS = {
  clean: { soft: '#F7EFFC', strong: '#EAD6F5', edge: colors.cleanEdge, ink: colors.cleanInk },
  report: { soft: '#EEF4FF', strong: '#C2D8FF', edge: colors.reportEdge, ink: colors.reportInk },
  fund: { soft: '#FFF7D6', strong: colors.fundFill, edge: colors.fundEdge, ink: colors.fundInk },
};
const MEDALS = {
  1: { backgroundColor: '#FFDA61', borderBottomColor: '#D9AC19', color: '#3B2F0B' },
  2: { backgroundColor: '#E6E4EF', borderBottomColor: '#C3BFD3', color: '#45434D' },
  3: { backgroundColor: '#F6D3BA', borderBottomColor: '#DCA27E', color: '#5A3519' },
};

export default function CommunityScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const { user, isPermanentUser } = useSession();
  const userId = isPermanentUser ? user?.id : null;
  const [scope, setScope] = useState(GLOBAL);
  const [boards, setBoards] = useState(null);
  const [eligible, setEligible] = useState(() => new Set());
  const [failed, setFailed] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [board, setBoard] = useState('clean');
  const [period, setPeriod] = useState('month');
  const [showAll, setShowAll] = useState(false);
  const [picking, setPicking] = useState(false);
  const [hop, setHop] = useState(0);
  const request = useRef(0);

  const load = useCallback(async ({ pull = false, keepChoice = false } = {}) => {
    const id = request.current + 1;
    request.current = id;
    if (pull) setRefreshing(true);
    setFailed(false);
    try {
      const next = await loadBoards(scope.slug);
      const tipRows = [...next.clean.all, ...next.clean.month, ...next.report.all, ...next.report.month];
      const canTip = await loadTipEligible(tipRows.map((row) => row.profileId));
      if (request.current !== id) return;
      setBoards(next);
      setEligible(canTip);
      if (!keepChoice) {
        const first = defaultBoard(next);
        setBoard(first);
        setPeriod(defaultPeriod(next, first));
        setShowAll(false);
      }
    } catch {
      if (request.current === id) setFailed(true);
    } finally {
      if (request.current === id) setRefreshing(false);
    }
  }, [scope.slug]);

  useEffect(() => { setBoards(null); load(); }, [load]);
  // Coming back to the tab (after a tip or a cleanup) shows fresh standings without moving the board.
  const seen = useRef(false);
  useFocusEffect(useCallback(() => {
    if (seen.current) load({ keepChoice: true });
    seen.current = true;
    setHop((value) => value + 1);
  }, [load]));

  const copy = BOARD_COPY[board];
  const tint = TINTS[board];
  const unit = (n) => (n === 1 ? copy.one : copy.many);
  const rows = boards?.[board]?.[period] ?? [];
  const visible = showAll ? rows : rows.slice(0, VISIBLE);
  const month = useMemo(() => monthInfo(scope.time_zone || GLOBAL.time_zone), [scope.time_zone]);
  const where = scope.slug ? scope.name : 'Litterbugs';
  const raceName = period === 'month' ? `${month.monthName} race` : 'all-time race';

  const chooseBoard = (next) => {
    if (next === board) return;
    hapticSelect();
    setBoard(next);
    setPeriod(defaultPeriod(boards, next));
    setShowAll(false);
  };

  const openProfile = (row) => {
    if (row.profileId === userId) navigation.navigate('Profile');
    else navigation.getParent()?.navigate('PublicProfile', { profileId: row.profileId });
  };
  const openTip = (row) => navigation.getParent()?.navigate('Tip', {
    profileId: row.profileId, name: row.name, role: copy.role,
  });

  // Your standing comes from the same rows everyone sees.
  const me = userId ? rows.find((row) => row.profileId === userId) : null;
  const ahead = me ? [...rows].reverse().find((row) => row.score > me.score) : null;
  const gap = me && ahead ? ahead.score - me.score : 0;
  const aheadNames = ahead ? rows.filter((row) => row.score === ahead.score).map((row) => row.name) : [];
  const nextStep = !me ? '' : !ahead
    ? 'You’re in first place.'
    : `${gap} more ${gap === 1 ? copy.one : copy.many} ${gap === 1 ? 'ties' : 'tie'} ${aheadNames.slice(0, 2).join(' and ')}${aheadNames.length > 2 ? ' and others' : ''} for ${ordinal(ahead.place)}.`;

  const bottom = getBottomNavClearance(insets.bottom) + 16;

  return (
    <View style={styles.screen}>
      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: bottom }]}
        refreshControl={<PullRefresh refreshing={refreshing} onRefresh={() => load({ pull: true, keepChoice: true })} />}
      >
        <TouchableOpacity style={styles.scope} onPress={() => setPicking(true)} accessibilityRole="button"
          accessibilityLabel={`${scope.label} leaderboard. Change town`} testID="community-scope">
          <BrandBug kind="champion-beetle" size={40} playKey={hop} />
          <Text style={styles.scopeName} numberOfLines={1}>{scope.label}</Text>
          <Ionicons name="chevron-down" size={20} color={colors.muted} />
        </TouchableOpacity>

        <View style={styles.boardTabs} accessibilityRole="tablist">
          {BOARDS.map((key) => {
            const selected = key === board;
            const keyTint = TINTS[key];
            return (
              <TouchableOpacity key={key} onPress={() => chooseBoard(key)} accessibilityRole="tab" accessibilityState={{ selected }}
                style={[styles.boardTab, selected && { backgroundColor: keyTint.soft, borderColor: keyTint.edge }]} testID={`board-${key}`}>
                <BrandBug kind={BOARD_COPY[key].bug} size={26} active={selected} />
                <Text style={[styles.boardTabText, selected && { color: keyTint.ink }]} numberOfLines={1}>{BOARD_COPY[key].tab}</Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <View style={[styles.race, { borderColor: tint.strong, borderBottomColor: tint.edge }]}>
          <View style={styles.raceHead}>
            <View style={styles.raceTitleRow}>
              <Text style={styles.raceTitle}>{period === 'month' ? `${month.monthName} race` : 'All-time race'}</Text>
              {period === 'month' ? (
                <View style={[styles.daysLeft, { backgroundColor: tint.soft }]}><Text style={[styles.daysLeftText, { color: tint.ink }]}>{daysLeftLabel(month.daysLeft)}</Text></View>
              ) : null}
            </View>
            <View style={styles.periods} accessibilityRole="tablist">
              {[['month', 'This month'], ['all', 'All time']].map(([value, label]) => (
                <TouchableOpacity key={value} onPress={() => { if (value !== period) { hapticSelect(); setPeriod(value); setShowAll(false); } }}
                  style={[styles.period, period === value && styles.periodSelected]} accessibilityRole="tab" accessibilityState={{ selected: period === value }}>
                  <Text style={[styles.periodText, period === value && styles.periodTextSelected]}>{label}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {failed && !boards ? (
            <LoadFailure title="The leaderboard couldn’t load" onRetry={() => load()} style={styles.inset} />
          ) : !boards ? (
            <View style={styles.loading}><LoadingBee label="Loading the leaderboard" /></View>
          ) : rows.length ? (
            visible.map((row) => (
              <BoardRow key={row.profileId} row={row} unit={unit} global={!scope.slug}
                canTip={Boolean(copy.role) && eligible.has(row.profileId) && row.profileId !== userId}
                onOpen={() => openProfile(row)} onTip={() => openTip(row)} />
            ))
          ) : (
            <Text style={styles.empty}>{copy.none} {scope.slug ? `in ${where} ` : ''}yet{period === 'month' ? ' this month' : ''}.</Text>
          )}

          {rows.length > VISIBLE ? (
            <TouchableOpacity style={styles.showAll} onPress={() => setShowAll(!showAll)} accessibilityRole="button" accessibilityState={{ expanded: showAll }}>
              <Text style={styles.showAllText}>{showAll ? `Show top ${VISIBLE}` : `Show all ${rows.length} ${copy.tab.toLowerCase()}`}</Text>
            </TouchableOpacity>
          ) : null}
        </View>

        {boards ? (
          <View style={styles.standing}>
            {me ? (
              <>
                <Image source={getRankAsset(getRankForPoints(me.rankPoints))} style={styles.standingBug} contentFit="contain" accessible={false} />
                <View style={styles.standingCopy}>
                  <Text style={styles.standingTitle}>You’re {ordinal(me.place)} {scope.slug ? `in ${where}` : 'on Litterbugs'}</Text>
                  <Text style={styles.standingText}>{me.score} {unit(me.score)} in the {raceName}. {nextStep}</Text>
                </View>
              </>
            ) : userId ? (
              <>
                <BrandBug kind={copy.bug} size={40} style={styles.standingEmptyBug} />
                <View style={styles.standingCopy}>
                  <Text style={styles.standingTitle}>You’re not on this board yet</Text>
                  <Text style={styles.standingText}>{copy.join}{scope.slug ? ` in ${where}` : ''} to join the {raceName}.</Text>
                </View>
              </>
            ) : (
              <>
                <BrandBug kind={copy.bug} size={40} style={styles.standingEmptyBug} />
                <View style={styles.standingCopy}>
                  <Text style={styles.standingTitle}>See where you stand</Text>
                  <SecondaryButton label="Sign in" onPress={() => navigation.navigate('Auth')} style={styles.signIn} />
                </View>
              </>
            )}
          </View>
        ) : null}
      </ScrollView>

      <TownPicker visible={picking} current={scope} signedIn={Boolean(userId)} onClose={() => setPicking(false)}
        onPick={(next) => { setPicking(false); if (next.slug !== scope.slug) setScope(next); }} />
    </View>
  );
}

function BoardRow({ row, unit, global, canTip, onOpen, onTip }) {
  const rank = getRankForPoints(row.rankPoints);
  // The global board names each person's town; a town's own board shows their rank.
  const detail = global && row.communityName ? row.communityName : rank.name;
  const medal = MEDALS[row.place];
  return (
    <View style={styles.row}>
      <TouchableOpacity style={styles.rowMain} onPress={onOpen} accessibilityRole="button"
        accessibilityLabel={`${ordinal(row.place)}, ${row.name}, ${row.score} ${unit(row.score)}. View profile`}>
        <View style={[styles.place, medal && [styles.medal, { backgroundColor: medal.backgroundColor, borderBottomColor: medal.borderBottomColor }]]}>
          <Text style={[styles.placeText, medal && { color: medal.color }]}>{row.place}</Text>
        </View>
        <Image source={getRankAsset(rank)} style={styles.rowBug} contentFit="contain" accessible={false} />
        <View style={styles.who}>
          <Text style={styles.name} numberOfLines={1}>{row.name}</Text>
          <Text style={styles.detail} numberOfLines={1}>{detail}</Text>
        </View>
        <View style={styles.score}>
          <Text style={styles.scoreNumber}>{row.score}</Text>
          <Text style={styles.scoreUnit} numberOfLines={1}>{unit(row.score)}</Text>
        </View>
      </TouchableOpacity>
      {canTip ? (
        <TouchableOpacity style={styles.tip} onPress={onTip} accessibilityRole="button" accessibilityLabel={`Tip ${row.name}`}
          hitSlop={{ top: 8, bottom: 8, left: 4, right: 8 }} testID={`tip-${row.profileId}`}>
          <Ionicons name="heart" size={12} color={colors.needsCleanup} />
          <Text style={styles.tipText}>Tip</Text>
        </TouchableOpacity>
      ) : null}
    </View>
  );
}

function TownPicker({ visible, current, signedIn, onClose, onPick }) {
  const insets = useSafeAreaInsets();
  const [towns, setTowns] = useState(null);
  const [mine, setMine] = useState([]);
  const [failed, setFailed] = useState(false);
  const [query, setQuery] = useState('');
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (!visible) return undefined;
    let active = true;
    setQuery('');
    setFailed(false);
    Promise.all([loadCommunities(), signedIn ? loadMyCommunities() : Promise.resolve([])])
      .then(([all, own]) => {
        if (!active) return;
        setTowns(all);
        setMine(own.map((town) => all.find((item) => item.slug === town.slug)).filter(Boolean));
      })
      .catch(() => { if (active) setFailed(true); });
    return () => { active = false; };
  }, [visible, signedIn, attempt]);

  const needle = query.trim().toLowerCase();
  const matches = (towns ?? []).filter((town) => !needle || [town.name, town.area_name, town.region_name, town.region_code?.split('-')[1], town.country_name]
    .filter(Boolean).join(' ').toLowerCase().includes(needle));
  const sections = needle ? matches : [GLOBAL, ...mine, ...matches.filter((town) => !mine.some((own) => own.slug === town.slug))];

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View style={[styles.picker, { paddingBottom: insets.bottom }]}>
        <View style={styles.pickerHead}>
          <Text style={styles.pickerTitle}>Leaderboards</Text>
          <TouchableOpacity onPress={onClose} accessibilityRole="button" accessibilityLabel="Close" style={styles.pickerClose}>
            <Ionicons name="close" size={24} color={colors.ink} />
          </TouchableOpacity>
        </View>
        <View style={styles.search}>
          <Ionicons name="search" size={18} color={colors.muted} />
          <TextInput value={query} onChangeText={setQuery} placeholder="Town or county" placeholderTextColor={colors.subtle}
            style={styles.searchInput} autoCorrect={false} clearButtonMode="while-editing" returnKeyType="search" accessibilityLabel="Find a town" />
        </View>
        {failed ? <LoadFailure title="Towns couldn’t load" onRetry={() => { setTowns(null); setAttempt((value) => value + 1); }} />
          : !towns ? <View style={styles.loading}><LoadingBee label="Loading towns" /></View>
            : (
              <FlatList
                data={sections}
                keyExtractor={(town) => town.slug ?? 'global'}
                keyboardShouldPersistTaps="handled"
                ListEmptyComponent={<Text style={styles.empty}>No leaderboard for “{query.trim()}” yet.</Text>}
                renderItem={({ item, index }) => {
                  const selected = item.slug === current.slug;
                  const yours = !needle && mine.some((own) => own.slug === item.slug);
                  return (
                    <Pressable onPress={() => onPick(item)} accessibilityRole="button" accessibilityState={{ selected }}
                      style={({ pressed }) => [styles.townRow, index === 0 && styles.townRowFirst, pressed && styles.townRowPressed]}>
                      {item.slug ? <Ionicons name={yours ? 'home' : 'location-outline'} size={20} color={yours ? colors.primary : colors.muted} />
                        : <Ionicons name="earth" size={20} color={colors.primary} />}
                      <View style={styles.townCopy}>
                        <Text style={styles.townName} numberOfLines={1}>{item.label}</Text>
                        {item.slug ? <Text style={styles.townDetail} numberOfLines={1}>{townActivity(item)}</Text> : null}
                      </View>
                      {selected ? <Ionicons name="checkmark" size={22} color={colors.primary} /> : null}
                    </Pressable>
                  );
                }}
              />
            )}
      </View>
    </Modal>
  );
}

/** "3 cleanups this month", falling back to all-time numbers for quieter towns. */
function townActivity(town) {
  const plural = (n, word) => `${n} ${word}${n === 1 ? '' : 's'}`;
  if (town.month_cleanups > 0) return `${plural(town.month_cleanups, 'cleanup')} this month`;
  if (town.month_reports > 0) return `${plural(town.month_reports, 'report')} this month`;
  if (town.cleanups > 0) return plural(town.cleanups, 'cleanup');
  return plural(town.accepted_reports, 'report');
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.mist },
  content: { paddingHorizontal: 16, paddingTop: 14, gap: 14 },
  inset: { borderRadius: 18 },
  scope: { flexDirection: 'row', alignItems: 'center', gap: 10, alignSelf: 'flex-start', minHeight: 48, paddingRight: 8 },
  scopeName: { flexShrink: 1, color: colors.ink, fontSize: 28, lineHeight: 34, fontFamily: fonts.heading },
  boardTabs: { flexDirection: 'row', gap: 8 },
  boardTab: {
    flex: 1, minHeight: 50, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingHorizontal: 6,
    borderRadius: 16, borderWidth: 1.5, borderColor: colors.line, backgroundColor: colors.white,
  },
  boardTabText: { flexShrink: 1, color: colors.muted, fontSize: 14, fontWeight: '800' },
  race: { overflow: 'hidden', borderRadius: 20, borderWidth: 1.5, borderBottomWidth: 4, backgroundColor: colors.white },
  raceHead: { paddingHorizontal: 16, paddingTop: 14, paddingBottom: 10, gap: 10, borderBottomWidth: 1, borderBottomColor: colors.line },
  raceTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  raceTitle: { color: colors.ink, fontSize: 20, lineHeight: 26, fontFamily: fonts.heading },
  daysLeft: { paddingHorizontal: 9, paddingVertical: 3, borderRadius: 999 },
  daysLeftText: { fontSize: 12, fontWeight: '800' },
  periods: { flexDirection: 'row', padding: 3, gap: 3, borderRadius: 999, backgroundColor: colors.mist, alignSelf: 'flex-start' },
  period: { minHeight: 34, paddingHorizontal: 14, alignItems: 'center', justifyContent: 'center', borderRadius: 999 },
  periodSelected: { backgroundColor: colors.white, boxShadow: '0 1px 3px rgba(41, 41, 50, 0.16)' },
  periodText: { color: colors.muted, fontSize: 13, fontWeight: '700' },
  periodTextSelected: { color: colors.ink },
  loading: { minHeight: 220, alignItems: 'center', justifyContent: 'center' },
  empty: { paddingHorizontal: 18, paddingVertical: 28, color: colors.muted, fontSize: 15, lineHeight: 22, textAlign: 'center' },
  row: { flexDirection: 'row', alignItems: 'center', paddingRight: 12, borderBottomWidth: 1, borderBottomColor: '#EFEDF4' },
  rowMain: { flex: 1, minHeight: 64, flexDirection: 'row', alignItems: 'center', gap: 10, paddingLeft: 12, paddingRight: 8, paddingVertical: 8 },
  place: { width: 30, height: 30, alignItems: 'center', justifyContent: 'center' },
  medal: { borderRadius: 15, borderBottomWidth: 3 },
  placeText: { color: colors.muted, fontSize: 15, fontFamily: fonts.heading },
  rowBug: { width: 36, height: 36 },
  who: { flex: 1, minWidth: 0 },
  name: { color: colors.ink, fontSize: 16, fontWeight: '800' },
  detail: { marginTop: 1, color: colors.muted, fontSize: 13 },
  score: { alignItems: 'flex-end', maxWidth: 96 },
  scoreNumber: { color: colors.ink, fontSize: 18, lineHeight: 22, fontFamily: fonts.heading },
  scoreUnit: { color: colors.muted, fontSize: 12, lineHeight: 15 },
  tip: {
    flexDirection: 'row', alignItems: 'center', gap: 5, minHeight: 32, paddingHorizontal: 12,
    borderRadius: 999, borderWidth: 1, borderColor: '#F8D3D7', backgroundColor: '#FFF0F1',
  },
  tipText: { color: colors.needsCleanup, fontSize: 13, fontFamily: fonts.heading },
  showAll: { minHeight: 48, alignItems: 'center', justifyContent: 'center' },
  showAllText: { color: colors.primary, fontSize: 15, fontWeight: '700' },
  standing: {
    flexDirection: 'row', alignItems: 'center', gap: 12, padding: 16, borderRadius: 20,
    borderWidth: 1.5, borderColor: colors.line, borderBottomWidth: 4, borderBottomColor: colors.edge, backgroundColor: colors.white,
  },
  standingBug: { width: 48, height: 48 },
  standingEmptyBug: { opacity: 0.55 },
  standingCopy: { flex: 1, gap: 4 },
  standingTitle: { color: colors.ink, fontSize: 18, lineHeight: 23, fontFamily: fonts.heading },
  standingText: { color: colors.body, fontSize: 14, lineHeight: 20 },
  signIn: { minHeight: 44, marginTop: 6, alignSelf: 'flex-start', paddingHorizontal: 22 },
  picker: { flex: 1, backgroundColor: colors.white },
  pickerHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 18, paddingBottom: 8 },
  pickerTitle: { color: colors.ink, fontSize: 22, fontFamily: fonts.heading },
  pickerClose: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center', marginRight: -10 },
  search: {
    flexDirection: 'row', alignItems: 'center', gap: 8, marginHorizontal: 16, marginBottom: 6, paddingHorizontal: 14, minHeight: 48,
    borderRadius: 14, borderWidth: 1.5, borderColor: colors.line, backgroundColor: colors.soft,
  },
  searchInput: { flex: 1, color: colors.ink, fontSize: 16, paddingVertical: 10 },
  townRow: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 60, paddingHorizontal: 20, borderTopWidth: 1, borderTopColor: '#EFEDF4' },
  townRowFirst: { borderTopWidth: 0 },
  townRowPressed: { backgroundColor: colors.soft },
  townCopy: { flex: 1, minWidth: 0 },
  townName: { color: colors.ink, fontSize: 16, fontWeight: '700' },
  townDetail: { marginTop: 1, color: colors.muted, fontSize: 13 },
});

export { townActivity };
