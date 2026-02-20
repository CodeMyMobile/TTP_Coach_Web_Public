const splitRecipients = (value) => {
  if (typeof value !== 'string') {
    return [];
  }

  return value
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
};

const normalizeEmailKey = (value) => value.toLowerCase();

const normalizePhoneKey = (value) => {
  const normalized = value.replace(/[^\d+]/g, '').replace(/(?!^)\+/g, '');
  const digitsOnly = normalized.replace(/\D/g, '');
  if (digitsOnly.length === 11 && digitsOnly.startsWith('1')) {
    return digitsOnly.slice(1);
  }
  return digitsOnly || normalized.toLowerCase();
};

const dedupeRecipients = (values, normalizeKey) => {
  const seen = new Set();
  const deduped = [];

  values.forEach((value) => {
    const key = normalizeKey(value);
    if (!key || seen.has(key)) {
      return;
    }

    seen.add(key);
    deduped.push(value);
  });

  return deduped;
};

export const parseInviteRecipients = ({ emails = '', phones = '' } = {}) => {
  const parsedEmails = dedupeRecipients(splitRecipients(emails), normalizeEmailKey);
  const parsedPhones = dedupeRecipients(splitRecipients(phones), normalizePhoneKey);

  return {
    emails: parsedEmails,
    phone_numbers: parsedPhones
  };
};

export const __testUtils = {
  splitRecipients,
  normalizeEmailKey,
  normalizePhoneKey,
  dedupeRecipients
};

export default parseInviteRecipients;
