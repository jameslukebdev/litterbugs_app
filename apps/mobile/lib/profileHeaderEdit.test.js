import { readFileSync } from 'node:fs';

import { describe, expect, it } from 'vitest';

const profileScreenSource = readFileSync(
  new URL('../ProfileScreen.js', import.meta.url),
  'utf8'
);

describe('profile edit action', () => {
  it('keeps the centered profile identity clear by placing edit in the header', () => {
    expect(profileScreenSource).toContain("headerRight: permanent && section === 'overview' ? () => (");
    expect(profileScreenSource).toContain('style={styles.headerEditButton}');
    expect(profileScreenSource).toContain('accessibilityLabel="Edit profile"');

    const identityStart = profileScreenSource.indexOf('<View style={styles.identity}>');
    const identityEnd = profileScreenSource.indexOf('<RankingCard', identityStart);
    const identitySource = profileScreenSource.slice(identityStart, identityEnd);
    expect(identitySource).not.toContain('accessibilityLabel="Edit profile"');
  });
});
