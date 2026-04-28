const TRUE_COMPLETION_VALUES = new Set(['1', 'true', 'yes', 'y', 'complete', 'completed']);
const FALSE_COMPLETION_VALUES = new Set(['0', 'false', 'no', 'n', 'incomplete', 'pending', '']);

const hasNonEmptyString = (value) => typeof value === 'string' && value.trim().length > 0;
const hasNonEmptyArray = (value) => Array.isArray(value) && value.length > 0;

const hasAvailability = (availability = {}) => {
  if (!availability || typeof availability !== 'object' || Array.isArray(availability)) {
    return false;
  }

  return Object.values(availability).some((slots) => Array.isArray(slots) && slots.length > 0);
};

export const parseCompletionValue = (value) => {
  if (typeof value === 'boolean') {
    return value;
  }

  if (typeof value === 'number' && Number.isFinite(value)) {
    if (value === 1) return true;
    if (value === 0) return false;
  }

  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase();

    if (TRUE_COMPLETION_VALUES.has(normalized)) {
      return true;
    }

    if (FALSE_COMPLETION_VALUES.has(normalized)) {
      return false;
    }
  }

  return undefined;
};

export const resolveCompletionValue = (...candidates) => {
  for (const candidate of candidates) {
    if (candidate === undefined || candidate === null) {
      continue;
    }

    const parsed = parseCompletionValue(candidate);
    if (parsed !== undefined) {
      return parsed;
    }
  }

  return undefined;
};

export const deriveOnboardingCompletion = (profile = {}) => {
  const privatePrice = Number(profile.price_private ?? profile.hourly_rate);
  const semiPrice = Number(profile.price_semi);
  const groupPrice = Number(profile.price_group);
  const formats = Array.isArray(profile.formats) ? profile.formats : [];

  const hasRequiredPricing =
    Number.isFinite(privatePrice) &&
    privatePrice >= 40 &&
    (!formats.includes('semi') || (Number.isFinite(semiPrice) && semiPrice > 0)) &&
    (!formats.includes('group') || (Number.isFinite(groupPrice) && groupPrice > 0));

  return Boolean(
    hasNonEmptyString(profile.profileImage || profile.profile_picture || profile.profile_image) &&
      hasNonEmptyString(profile.name || profile.full_name) &&
      hasNonEmptyString(profile.email) &&
      hasNonEmptyString(profile.bio || profile.about_me) &&
      String(profile.bio || profile.about_me || '').trim().length >= 100 &&
      hasNonEmptyString(profile.experience_years) &&
      hasNonEmptyArray(profile.home_courts) &&
      hasNonEmptyArray(profile.levels) &&
      hasRequiredPricing &&
      (hasAvailability(profile.availability) || hasNonEmptyArray(profile.groupClasses || profile.group_classes))
  );
};
