// @vitest-environment jsdom
import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';

vi.mock('react-native', () => ({
  View: ({ children }) => <div>{children}</div>,
  ScrollView: ({ children }) => <div>{children}</div>,
  FlatList: ({ data, renderItem }) => <div>{data.map((item, index) => <div key={index}>{renderItem({ item, index })}</div>)}</div>,
  Modal: ({ visible, children }) => (visible ? <div data-modal>{children}</div> : null),
  Pressable: ({ children, onPress }) => <button onClick={onPress}>{typeof children === 'function' ? children({ pressed: false }) : children}</button>,
  Text: ({ children }) => <span>{children}</span>,
  TextInput: () => <input />,
  TouchableOpacity: ({ children, onPress, accessibilityLabel, testID }) => <button onClick={onPress} aria-label={accessibilityLabel} data-testid={testID}>{children}</button>,
  StyleSheet: { create: (value) => value },
}));
vi.mock('@expo/vector-icons', () => ({ Ionicons: () => null }));
vi.mock('expo-image', () => ({ Image: () => null }));
vi.mock('@react-navigation/native', () => ({ useFocusEffect: () => {} }));
vi.mock('react-native-safe-area-context', () => ({ useSafeAreaInsets: () => ({ bottom: 0, top: 0 }) }));
vi.mock('./components/BrandBug', () => ({ default: () => null }));
vi.mock('./components/LoadingBee', () => ({ default: ({ label }) => <div>{label}</div> }));
vi.mock('./components/ui', () => ({
  LoadFailure: ({ title }) => <div>{title}</div>,
  PullRefresh: () => null,
  SecondaryButton: ({ label, onPress }) => <button onClick={onPress}>{label}</button>,
}));
vi.mock('./lib/haptics', () => ({ hapticSelect: () => {} }));
vi.mock('./lib/rankAssets', () => ({ getRankAsset: () => 1 }));
let session = { user: { id: 'me' }, isPermanentUser: true };
vi.mock('./lib/session', () => ({ useSession: () => session }));
vi.mock('./lib/community', async (importOriginal) => {
  const actual = await importOriginal();
  return { ...actual, loadBoards: vi.fn(), loadTipEligible: vi.fn(), loadCommunities: vi.fn(async () => []), loadMyCommunities: vi.fn(async () => []) };
});
vi.mock('./lib/supabase', () => ({ supabase: {} }));

import CommunityScreen from './CommunityScreen';
import { loadBoards, loadTipEligible } from './lib/community';

globalThis.IS_REACT_ACT_ENVIRONMENT = true;
let root, host;
const navigate = vi.fn();
const parentNavigate = vi.fn();
const navigation = { navigate, getParent: () => ({ navigate: parentNavigate }) };
const row = (place, profileId, name, score, communityName = 'Boone') => ({ place, profileId, name, score, rankPoints: 13, communityName });
const boards = {
  clean: {
    month: [row(1, 'maya', 'Maya R.', 5), row(2, 'me', 'Grant G.', 3), row(3, 'sam', 'Sam T.', 1)],
    all: [row(1, 'maya', 'Maya R.', 9)],
  },
  report: { month: [], all: [row(1, 'sam', 'Sam T.', 4)] },
  fund: { month: [], all: [row(1, 'lee', 'Lee P.', 2)] },
};

beforeEach(() => {
  vi.clearAllMocks();
  session = { user: { id: 'me' }, isPermanentUser: true };
  loadBoards.mockResolvedValue(boards);
  loadTipEligible.mockResolvedValue(new Set(['maya', 'me', 'lee']));
  host = document.createElement('div');
  root = createRoot(host);
});
afterEach(async () => { await act(() => root.unmount()); });

const render = async () => { await act(async () => { root.render(<CommunityScreen navigation={navigation} />); }); await act(async () => {}); };
const button = (label) => [...host.querySelectorAll('button')].find((node) => node.getAttribute('aria-label') === label || node.textContent === label);

it('opens on the Global cleaners race for this month, with your place and who is next', async () => {
  await render();
  expect(loadBoards).toHaveBeenCalledWith(null);
  expect(host.textContent).toContain('Global');
  expect(host.textContent).toMatch(/\w+ race/);
  expect(host.textContent).toContain('Maya R.');
  expect(host.textContent).toContain('You’re 2nd on Litterbugs');
  expect(host.textContent).toContain('2 more cleanups tie Maya R. for 1st.');
});

it('shows Tip only for cleaners and reporters who can be paid, never for yourself or funders', async () => {
  await render();
  expect(button('Tip Maya R.')).toBeTruthy();
  expect(button('Tip Grant G.')).toBeFalsy();
  expect(button('Tip Sam T.')).toBeFalsy();
  await act(async () => { button('Funders').click(); });
  expect(host.textContent).toContain('Lee P.');
  expect(button('Tip Lee P.')).toBeFalsy();
});

it('opens the tip page and profiles from a row', async () => {
  await render();
  await act(async () => { button('Tip Maya R.').click(); });
  expect(parentNavigate).toHaveBeenCalledWith('Tip', { profileId: 'maya', name: 'Maya R.', role: 'cleaner' });
  await act(async () => { button('1st, Maya R., 5 cleanups. View profile').click(); });
  expect(parentNavigate).toHaveBeenCalledWith('PublicProfile', { profileId: 'maya' });
  await act(async () => { button('2nd, Grant G., 3 cleanups. View profile').click(); });
  expect(navigate).toHaveBeenCalledWith('Profile');
});

it('a quiet month board opens on All time, and signed-out people get a sign in', async () => {
  session = { user: null, isPermanentUser: false };
  await render();
  await act(async () => { button('Reporters').click(); });
  expect(host.textContent).toContain('All-time race');
  expect(host.textContent).toContain('Sam T.');
  expect(host.textContent).toContain('See where you stand');
  await act(async () => { button('Sign in').click(); });
  expect(navigate).toHaveBeenCalledWith('Auth');
});

it('says when the leaderboard could not load', async () => {
  loadBoards.mockRejectedValue(new Error('offline'));
  await render();
  expect(host.textContent).toContain('The leaderboard couldn’t load');
});
