import { useCallback, useEffect, useMemo, useState } from 'react';
import { getCoachOnboarding, saveCoachOnboarding } from '../api/CoachApi/onboarding';
import { createDefaultProfile } from '../constants/profile';

const isObject = (value) => value !== null && typeof value === 'object' && !Array.isArray(value);

const pickDefined = (...candidates) => {
  for (const candidate of candidates) {
    if (candidate !== undefined && candidate !== null) {
      return candidate;
    }
  }
  return undefined;
};

const toNumberOrDefault = (value, fallback) => {
  if (typeof value === 'number' && !Number.isNaN(value)) {
    return value;
  }
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const normaliseProfileResponse = (raw, fallbackProfile = null, fallbackId = null) => {
  const baseProfile = createDefaultProfile();
  const mergedFallback = fallbackProfile ? { ...baseProfile, ...fallbackProfile } : baseProfile;
  const container = isObject(raw) ? raw : {};
  const profileCandidate =
    container.profile ||
    container.data?.profile ||
    container.data ||
    container.result ||
    container.coach ||
    container;

  const resolvedId = pickDefined(
    profileCandidate?.id,
    profileCandidate?.profile_id,
    profileCandidate?.coach_profile_id,
    container?.id,
    fallbackId,
    mergedFallback.id
  );

  const resolvedProfile = {
    ...mergedFallback,
    id: resolvedId ?? null,
    profileImageFile: null
  };

  const fullName = pickDefined(
    profileCandidate?.full_name,
    profileCandidate?.fullName,
    profileCandidate?.name
  );
  if (fullName !== undefined) {
    resolvedProfile.name = fullName;
  }

  const experienceYears = pickDefined(
    profileCandidate?.experience_years,
    profileCandidate?.experienceYears,
    container?.experience_years
  );
  if (experienceYears !== undefined) {
    resolvedProfile.experience_years = experienceYears;
  }

  const aboutMe = pickDefined(profileCandidate?.about_me, profileCandidate?.aboutMe, profileCandidate?.bio);
  if (aboutMe !== undefined) {
    resolvedProfile.bio = aboutMe;
  }

  const email = pickDefined(profileCandidate?.email, container?.email);
  if (email !== undefined) {
    resolvedProfile.email = email;
  }

  const phone = pickDefined(profileCandidate?.phone, profileCandidate?.phone_number, container?.phone);
  if (phone !== undefined) {
    resolvedProfile.phone = phone;
  }

  const hourlyRate = pickDefined(
    profileCandidate?.hourly_rate,
    profileCandidate?.hourlyRate,
    profileCandidate?.rate,
    profileCandidate?.price_private,
    container?.hourly_rate,
    container?.price_private
  );
  if (hourlyRate !== undefined) {
    resolvedProfile.price_private = toNumberOrDefault(hourlyRate, mergedFallback.price_private);
  }

  const priceSemi = pickDefined(
    profileCandidate?.price_semi,
    profileCandidate?.priceSemi,
    container?.price_semi,
    container?.priceSemi
  );
  if (priceSemi !== undefined) {
    resolvedProfile.price_semi = toNumberOrDefault(priceSemi, mergedFallback.price_semi);
  }

  const priceGroup = pickDefined(
    profileCandidate?.price_group,
    profileCandidate?.priceGroup,
    container?.price_group,
    container?.priceGroup
  );
  if (priceGroup !== undefined) {
    resolvedProfile.price_group = toNumberOrDefault(priceGroup, mergedFallback.price_group);
  }

  const avatar = pickDefined(
    profileCandidate?.profile_picture,
    profileCandidate?.profilePicture,
    profileCandidate?.profile_image,
    profileCandidate?.profileImage,
    profileCandidate?.avatar,
    container?.profile_picture
  );
  if (avatar !== undefined) {
    resolvedProfile.profileImage = avatar;
  }

  if (Array.isArray(profileCandidate?.home_courts)) {
    resolvedProfile.home_courts = profileCandidate.home_courts;
  }

  if (Array.isArray(profileCandidate?.homeCourts)) {
    resolvedProfile.home_courts = profileCandidate.homeCourts;
  }

  if (Array.isArray(profileCandidate?.levels)) {
    resolvedProfile.levels = profileCandidate.levels;
  }

  if (Array.isArray(profileCandidate?.specialties)) {
    resolvedProfile.specialties = profileCandidate.specialties;
  }

  if (Array.isArray(profileCandidate?.formats)) {
    resolvedProfile.formats = profileCandidate.formats;
  }

  if (Array.isArray(profileCandidate?.packages)) {
    resolvedProfile.packages = profileCandidate.packages;
  }

  if (Array.isArray(profileCandidate?.languages)) {
    resolvedProfile.languages = profileCandidate.languages;
  }

  if (typeof profileCandidate?.otherLanguage === 'string') {
    resolvedProfile.otherLanguage = profileCandidate.otherLanguage;
  }

  if (typeof profileCandidate?.other_language === 'string') {
    resolvedProfile.otherLanguage = profileCandidate.other_language;
  }

  if (isObject(profileCandidate?.availability)) {
    resolvedProfile.availability = {
      ...resolvedProfile.availability,
      ...profileCandidate.availability
    };
  }

  if (isObject(profileCandidate?.availabilityLocations)) {
    resolvedProfile.availabilityLocations = {
      ...resolvedProfile.availabilityLocations,
      ...profileCandidate.availabilityLocations
    };
  }

  if (isObject(profileCandidate?.availability_locations)) {
    resolvedProfile.availabilityLocations = {
      ...resolvedProfile.availabilityLocations,
      ...profileCandidate.availability_locations
    };
  }

  if (Array.isArray(profileCandidate?.groupClasses)) {
    resolvedProfile.groupClasses = profileCandidate.groupClasses;
  }

  if (Array.isArray(profileCandidate?.group_classes)) {
    resolvedProfile.groupClasses = profileCandidate.group_classes;
  }

  if (profileCandidate?.stripe_account_id !== undefined) {
    resolvedProfile.stripe_account_id = profileCandidate.stripe_account_id;
  }

  if (profileCandidate?.charges_enabled !== undefined) {
    resolvedProfile.charges_enabled = Boolean(profileCandidate.charges_enabled);
  }

  if (profileCandidate?.charges_disabled_reason !== undefined) {
    resolvedProfile.charges_disabled_reason = profileCandidate.charges_disabled_reason;
  }

  const isComplete = Boolean(
    pickDefined(
      container?.is_complete,
      container?.isCompleted,
      container?.onboarding_complete,
      profileCandidate?.is_complete,
      profileCandidate?.isCompleted,
      profileCandidate?.is_completed,
      profileCandidate?.onboarding_complete
    ) ?? (resolvedProfile.name && resolvedProfile.bio)
  );

  return {
    id: resolvedProfile.id,
    profile: resolvedProfile,
    isComplete,
    raw
  };
};

export const useCoachProfile = ({ enabled = true } = {}) => {
  const [profile, setProfile] = useState(() => createDefaultProfile());
  const [profileId, setProfileId] = useState(null);
  const [loading, setLoading] = useState(Boolean(enabled));
  const [error, setError] = useState(null);
  const [isComplete, setIsComplete] = useState(false);
  const [hasFetched, setHasFetched] = useState(false);

  const fetchProfile = useCallback(async () => {
    if (!enabled) {
      setLoading(false);
      return null;
    }

    setLoading(true);
    setError(null);
    try {
      const response = await getCoachOnboarding();

      if (!response) {
        setHasFetched(true);
        setIsComplete(false);
        setProfile(createDefaultProfile());
        setProfileId(null);
        return null;
      }

      if (!response.ok) {
        let message = `Failed to fetch coach onboarding (${response.status})`;
        try {
          const errorBody = await response.json();
          message = errorBody?.detail || errorBody?.message || errorBody?.error || message;
        } catch (parseError) {
          // ignore JSON parse issues
        }
        throw new Error(message);
      }

      const payload = response.status === 204 ? null : await response.json().catch(() => null);
      const normalised = normaliseProfileResponse(payload);
      setProfile(normalised.profile);
      setProfileId(normalised.id ?? null);
      setIsComplete(normalised.isComplete);
      setHasFetched(true);
      return normalised;
    } catch (err) {
      const normalisedError =
        err instanceof Error ? err : new Error('Failed to fetch coach onboarding');
      setError(normalisedError);
      setHasFetched(true);
      setIsComplete(false);
      setProfile(createDefaultProfile());
      setProfileId(null);
      return null;
    } finally {
      setLoading(false);
    }
  }, [enabled]);

  useEffect(() => {
    if (enabled) {
      fetchProfile();
    } else {
      setProfile(createDefaultProfile());
      setProfileId(null);
      setIsComplete(false);
      setHasFetched(false);
      setError(null);
      setLoading(false);
    }
  }, [enabled, fetchProfile]);

  const saveProfile = useCallback(
    async (formData) => {
      setLoading(true);
      setError(null);

      try {
        const response = await saveCoachOnboarding(formData);

        if (!response) {
          throw new Error('Failed to save coach onboarding');
        }

        if (!response.ok) {
          let errorMessage = 'Failed to save coach onboarding';
          try {
            const errorBody = await response.json();
            errorMessage = errorBody?.detail || errorBody?.message || errorBody?.error || errorMessage;
          } catch (parseError) {
            // ignore JSON parse issues
          }
          throw new Error(errorMessage);
        }

        const responseBody = response.status === 204 ? null : await response.json().catch(() => null);
        const normalised = normaliseProfileResponse(responseBody, formData, profileId);

        setProfile(normalised.profile);
        setProfileId(normalised.id ?? normalised.profile?.id ?? profileId);
        setIsComplete(normalised.isComplete ?? true);
        setHasFetched(true);

        return normalised;
      } catch (err) {
        const normalisedError =
          err instanceof Error ? err : new Error('Failed to save coach onboarding');
        setError(normalisedError);
        throw normalisedError;
      } finally {
        setLoading(false);
      }
    },
    [profileId]
  );

  const status = useMemo(
    () => ({
      loading,
      error,
      isComplete,
      profileId,
      hasFetched
    }),
    [loading, error, isComplete, profileId, hasFetched]
  );

  return {
    profile,
    profileId,
    isComplete,
    loading,
    error,
    hasFetched,
    status,
    refreshProfile: fetchProfile,
    saveProfile,
    setProfile
  };
};

export default useCoachProfile;
