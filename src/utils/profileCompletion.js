const TRUE_COMPLETION_VALUES = new Set(['1', 'true', 'yes', 'y', 'complete', 'completed']);
const FALSE_COMPLETION_VALUES = new Set(['0', 'false', 'no', 'n', 'incomplete', 'pending', '']);

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
