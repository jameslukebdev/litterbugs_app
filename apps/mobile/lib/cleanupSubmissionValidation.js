export const MAX_CLEANUP_PHOTOS = 3;
export const MAX_CLEANUP_DESCRIPTION_LENGTH = 500;
export const MAX_CLEANUP_DURATION_MINUTES = 1440;

const parseOptionalInteger = (value, { label, min, max }) => {
  const trimmed = String(value ?? '').trim();
  if (!trimmed) return { value: null };
  if (!/^\d+$/.test(trimmed)) {
    return { error: `${label} must be a whole number.` };
  }

  const parsed = Number(trimmed);
  if (!Number.isSafeInteger(parsed) || parsed < min || parsed > max) {
    return { error: `${label} must be between ${min} and ${max}.` };
  }

  return { value: parsed };
};

export function validateCleanupSubmission({
  photos,
  description,
  bagsOrItemsRemoved,
  durationMinutes,
}) {
  const errors = {};
  const photoCount = photos?.length ?? 0;
  const normalizedDescription = String(description ?? '').trim();

  if (photoCount < 1 || photoCount > MAX_CLEANUP_PHOTOS) {
    errors.photos = 'Add between 1 and 3 after-cleanup photos.';
  }

  if (!normalizedDescription) {
    errors.description = 'Describe what you cleaned up.';
  } else if (normalizedDescription.length > MAX_CLEANUP_DESCRIPTION_LENGTH) {
    errors.description = `Keep the description under ${MAX_CLEANUP_DESCRIPTION_LENGTH} characters.`;
  }

  const bags = parseOptionalInteger(bagsOrItemsRemoved, {
    label: 'Bags or items removed',
    min: 0,
    max: 9999,
  });
  if (bags.error) errors.bagsOrItemsRemoved = bags.error;

  const duration = parseOptionalInteger(durationMinutes, {
    label: 'Cleanup duration',
    min: 1,
    max: MAX_CLEANUP_DURATION_MINUTES,
  });
  if (duration.error) errors.durationMinutes = duration.error;

  return {
    valid: Object.keys(errors).length === 0,
    errors,
    normalized: {
      description: normalizedDescription,
      bagsOrItemsRemoved: bags.value ?? null,
      durationMinutes: duration.value ?? null,
    },
  };
}
