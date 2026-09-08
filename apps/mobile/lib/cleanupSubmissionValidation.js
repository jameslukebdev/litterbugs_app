export const MAX_CLEANUP_PHOTOS = 3;
export const MAX_CLEANUP_DESCRIPTION_LENGTH = 500;
export const MAX_CLEANUP_WEIGHT_POUNDS = 10000;

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

const parseOptionalWeight = (value) => {
  const trimmed = String(value ?? '').trim();
  if (!trimmed) return { value: null };
  if (!/^(?:\d+|\d*\.\d{1,2})$/.test(trimmed)) {
    return { error: 'Weight removed must be a number with up to two decimal places.' };
  }

  const parsed = Number(trimmed);
  if (!Number.isFinite(parsed) || parsed < 0.1 || parsed > MAX_CLEANUP_WEIGHT_POUNDS) {
    return { error: `Weight removed must be between 0.1 and ${MAX_CLEANUP_WEIGHT_POUNDS.toLocaleString()} pounds.` };
  }

  return { value: parsed };
};

export function validateCleanupSubmission({
  photos,
  description,
  bagsOrItemsRemoved,
  weightPounds,
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

  const weight = parseOptionalWeight(weightPounds);
  if (weight.error) errors.weightPounds = weight.error;

  return {
    valid: Object.keys(errors).length === 0,
    errors,
    normalized: {
      description: normalizedDescription,
      bagsOrItemsRemoved: bags.value ?? null,
      weightPounds: weight.value ?? null,
    },
  };
}
