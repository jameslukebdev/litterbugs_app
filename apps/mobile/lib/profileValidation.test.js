import { describe, expect, it } from 'vitest';

import { validateProfileDraft } from './profileValidation';

describe('validateProfileDraft', () => {
  it('normalizes the editable public profile fields', () => {
    const result = validateProfileDraft({
      displayName: '  Cleanup Friend  ',
      username: '  Cleanup.Hero  ',
      bio: '  Keeping our neighborhood clean.  ',
      location: '  Asheville, NC  ',
    });

    expect(result).toEqual({
      valid: true,
      errors: {},
      values: {
        display_name: 'Cleanup Friend',
        username: 'cleanup.hero',
        bio: 'Keeping our neighborhood clean.',
        location: 'Asheville, NC',
      },
    });
  });

  it('requires a display name', () => {
    const result = validateProfileDraft({ displayName: '   ' });

    expect(result.valid).toBe(false);
    expect(result.errors.displayName).toBe('Display name is required.');
  });

  it.each(['admin', 'moderator', 'support', 'official', 'litterbugs'])(
    'rejects reserved username %s',
    (username) => {
      const result = validateProfileDraft({ displayName: 'User', username });

      expect(result.valid).toBe(false);
      expect(result.errors.username).toBe('That username is reserved.');
    }
  );

  it('rejects invalid username characters and boundary punctuation', () => {
    expect(validateProfileDraft({ displayName: 'User', username: '.user' }).valid).toBe(false);
    expect(validateProfileDraft({ displayName: 'User', username: 'user-' }).valid).toBe(false);
    expect(validateProfileDraft({ displayName: 'User', username: 'user name' }).valid).toBe(false);
  });

  it('enforces the public profile character limits', () => {
    const result = validateProfileDraft({
      displayName: 'a'.repeat(61),
      username: 'a'.repeat(31),
      bio: 'a'.repeat(161),
      location: 'a'.repeat(81),
    });

    expect(result.valid).toBe(false);
    expect(result.errors).toEqual({
      displayName: 'Use 60 characters or fewer.',
      username: 'Use between 3 and 30 characters.',
      bio: 'Use 160 characters or fewer.',
      location: 'Use 80 characters or fewer.',
    });
  });
});
