export const RESERVED_USERNAMES = new Set([
  'admin',
  'administrator',
  'litterbugs',
  'moderator',
  'official',
  'support',
]);

export const validateProfileDraft = ({ displayName, username, bio, location }) => {
  const values = {
    display_name: String(displayName || '').trim(),
    username: String(username || '').trim().toLowerCase() || null,
    bio: String(bio || '').trim() || null,
    location: String(location || '').trim() || null,
  };
  const errors = {};

  if (!values.display_name) errors.displayName = 'Display name is required.';
  else if (values.display_name.length > 60) errors.displayName = 'Use 60 characters or fewer.';

  if (values.username) {
    if (values.username.length < 3 || values.username.length > 30) {
      errors.username = 'Use between 3 and 30 characters.';
    } else if (!/^[a-z0-9][a-z0-9._]*[a-z0-9]$/.test(values.username)) {
      errors.username = 'Use letters, numbers, periods, or underscores, beginning and ending with a letter or number.';
    } else if (RESERVED_USERNAMES.has(values.username)) {
      errors.username = 'That username is reserved.';
    }
  }

  if (values.bio && values.bio.length > 160) errors.bio = 'Use 160 characters or fewer.';
  if (values.location && values.location.length > 80) errors.location = 'Use 80 characters or fewer.';

  return { values, errors, valid: Object.keys(errors).length === 0 };
};
