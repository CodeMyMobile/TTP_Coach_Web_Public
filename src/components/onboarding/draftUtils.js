const SERVER_MANAGED_ONBOARDING_FIELDS = new Set(['charges_enabled', 'charges_disabled_reason']);

export const isObject = (value) => value !== null && typeof value === 'object' && !Array.isArray(value);

export const mergeOnboardingWithDraft = (onboarding = {}, draftPayload = {}) => {
  if (!isObject(draftPayload) || Object.keys(draftPayload).length === 0) {
    return onboarding;
  }

  const merge = (base, override) => {
    if (Array.isArray(base) || Array.isArray(override)) {
      return override === undefined ? base : override;
    }

    if (!isObject(base) || !isObject(override)) {
      return override === undefined ? base : override;
    }

    const merged = { ...base };
    for (const [key, value] of Object.entries(override)) {
      if (value === undefined) {
        continue;
      }
      merged[key] = isObject(value) && isObject(base[key]) ? merge(base[key], value) : value;
    }
    return merged;
  };

  return merge(onboarding, draftPayload);
};

const hasMeaningfulValue = (value) => {
  if (value === undefined || value === null) return false;
  if (typeof value === 'string') return value.trim().length > 0;
  if (Array.isArray(value)) return value.length > 0;
  if (isObject(value)) return Object.keys(value).length > 0;
  return true;
};

export const buildDraftPartialPayload = (previous = {}, current = {}) =>
  Object.keys(current).reduce((accumulator, key) => {
    if (SERVER_MANAGED_ONBOARDING_FIELDS.has(key)) {
      return accumulator;
    }

    if (previous[key] === current[key]) {
      return accumulator;
    }

    if (hasMeaningfulValue(current[key])) {
      accumulator[key] = current[key];
    }

    return accumulator;
  }, {});

export const resetDraftUiState = () => ({
  autosaveStatus: 'idle',
  autosaveError: null,
  hasUnsavedChanges: false
});
