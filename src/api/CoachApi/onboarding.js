import { apiRequest } from '../apiRequest';
import { DAYS_OF_WEEK, createDefaultProfile } from '../../constants/profile';

const isObject = (value) => value !== null && typeof value === 'object' && !Array.isArray(value);
const isNonEmptyString = (value) => typeof value === 'string' && value.trim().length > 0;

const normaliseStringArray = (value = []) =>
  Array.isArray(value)
    ? value
        .map((entry) => (typeof entry === 'string' ? entry.trim() : String(entry || '')).trim())
        .filter((entry) => entry.length > 0)
    : [];

const normaliseAvailability = (availability = {}) => {
  if (!isObject(availability)) {
    return createDefaultProfile().availability;
  }

  const normalised = {};

  for (const day of Object.keys(availability)) {
    const slots = Array.isArray(availability[day]) ? availability[day] : [];
    normalised[day] = slots
      .map((slot) => (typeof slot === 'string' ? slot.trim() : ''))
      .filter((slot) => slot.length > 0);
  }

  // Ensure all expected days exist so the backend can rely on the shape.
  for (const day of DAYS_OF_WEEK) {
    if (!normalised[day]) {
      normalised[day] = [];
    }
  }

  return normalised;
};

const normaliseAvailabilityLocations = (locations = {}, availability = {}) => {
  if (!isObject(locations)) {
    return createDefaultProfile().availabilityLocations;
  }

  const normalised = {};

  for (const [day, mapping] of Object.entries(locations)) {
    if (!isObject(mapping)) {
      continue;
    }

    const resolvedDay = day;
    const slots = Array.isArray(availability[resolvedDay]) ? new Set(availability[resolvedDay]) : new Set();

    const dayMapping = {};
    for (const [slot, locationValue] of Object.entries(mapping)) {
      if (!isNonEmptyString(slot)) {
        continue;
      }

      const trimmedLocation =
        typeof locationValue === 'string' ? locationValue.trim() : String(locationValue || '').trim();

      if (!trimmedLocation) {
        continue;
      }

      if (slots.has(slot)) {
        dayMapping[slot] = trimmedLocation;
      }
    }

    normalised[resolvedDay] = dayMapping;
  }

  for (const day of DAYS_OF_WEEK) {
    if (!normalised[day]) {
      normalised[day] = {};
    }
  }

  return normalised;
};

const normaliseGroupClasses = (groupClasses = []) => {
  if (!Array.isArray(groupClasses)) {
    return [];
  }

  return groupClasses
    .map((entry) => {
      if (!isObject(entry)) {
        return null;
      }

      const name = isNonEmptyString(entry.name) ? entry.name.trim() : '';
      const day = isNonEmptyString(entry.day) ? entry.day.trim() : '';
      const time = isNonEmptyString(entry.time) ? entry.time.trim() : '';
      const duration = Number(entry.duration);
      const price = Number(entry.price);
      const levels = normaliseStringArray(entry.levels);

      if (!name || !day || !time || !Number.isFinite(duration) || duration <= 0 || !Number.isFinite(price)) {
        return null;
      }

      const payload = {
        name,
        day,
        time,
        duration,
        price,
        levels
      };

      if (isNonEmptyString(entry.description)) {
        payload.description = entry.description.trim();
      }

      if (Number.isFinite(entry.maxStudents) && entry.maxStudents > 0) {
        payload.maxStudents = Number(entry.maxStudents);
      }

      if (isNonEmptyString(entry.court)) {
        payload.court = entry.court.trim();
      }

      return payload;
    })
    .filter(Boolean);
};

const buildOnboardingPayload = (formData = {}) => {
  const availability = normaliseAvailability(formData.availability);
  const availabilityLocations = normaliseAvailabilityLocations(formData.availabilityLocations, availability);

  const payload = {
    name: isNonEmptyString(formData.name) ? formData.name.trim() : '',
    email: isNonEmptyString(formData.email) ? formData.email.trim() : '',
    bio: typeof formData.bio === 'string' ? formData.bio.trim() : '',
    experience_years:
      typeof formData.experience_years === 'string' ? formData.experience_years : formData.experience_years ?? '',
    phone: isNonEmptyString(formData.phone) ? formData.phone.trim() : '',
    certifications:
      typeof formData.certifications === 'string' ? formData.certifications.trim() : formData.certifications ?? '',
    home_courts: normaliseStringArray(formData.home_courts),
    levels: normaliseStringArray(formData.levels),
    specialties: normaliseStringArray(formData.specialties),
    formats: normaliseStringArray(formData.formats),
    languages: normaliseStringArray(formData.languages),
    otherLanguage: typeof formData.otherLanguage === 'string' ? formData.otherLanguage.trim() : '',
    price_private: Number.isFinite(Number(formData.price_private)) ? Number(formData.price_private) : 0,
    price_semi: Number.isFinite(Number(formData.price_semi)) ? Number(formData.price_semi) : 0,
    price_group: Number.isFinite(Number(formData.price_group)) ? Number(formData.price_group) : 0,
    availability,
    availabilityLocations,
    groupClasses: normaliseGroupClasses(formData.groupClasses),
    packages: Array.isArray(formData.packages) ? formData.packages : [],
    stripe_account_id: formData.stripe_account_id ?? null,
    charges_enabled: Boolean(formData.charges_enabled),
    charges_disabled_reason:
      typeof formData.charges_disabled_reason === 'string' ? formData.charges_disabled_reason.trim() : ''
  };

  if (
    typeof formData.profileImage === 'string' &&
    formData.profileImage &&
    !formData.profileImage.startsWith('data:') &&
    !formData.profileImage.startsWith('blob:')
  ) {
    payload.profileImage = formData.profileImage.trim();
  }

  // Remove undefined values while keeping empty strings/arrays where intentional.
  Object.keys(payload).forEach((key) => {
    if (payload[key] === undefined) {
      delete payload[key];
    }
  });

  return payload;
};

export const requestCoachAvatarUploadUrl = async (fileType) => {
  if (!fileType) {
    throw new Error('A file type is required to request an upload URL.');
  }

  const encodedType = encodeURIComponent(fileType);
  return apiRequest(`/coach/avatars/?file_type=${encodedType}`, {
    method: 'GET'
  });
};

export const uploadCoachAvatar = async (uploadUrl, file, contentType) => {
  if (!uploadUrl || !file) {
    throw new Error('Upload URL and file are required to upload an avatar.');
  }

  const headers = {};
  if (contentType) {
    headers['Content-Type'] = contentType;
  }

  return fetch(uploadUrl, {
    method: 'PUT',
    headers,
    body: file
  });
};

export const getCoachOnboarding = async () =>
  apiRequest('/coach/onboarding', {
    method: 'GET'
  });

export const saveCoachOnboarding = async (formData = {}) =>
  apiRequest('/coach/onboarding', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json;charset=UTF-8' },
    body: JSON.stringify(buildOnboardingPayload(formData))
  });

export default {
  requestCoachAvatarUploadUrl,
  uploadCoachAvatar,
  getCoachOnboarding,
  saveCoachOnboarding
};
