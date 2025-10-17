import { useCallback, useEffect, useMemo, useState } from 'react';
import { addCoachProfile, getCoachProfile, modifyProfileDetails } from '../api/CoachApi/profileScreen';
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

  const fullName = pickDefined(profileCandidate?.full_name, profileCandidate?.fullName, profileCandidate?.name);
  if (fullName !== undefined) {
    resolvedProfile.name = fullName;
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
    container?.hourly_rate
  );
  if (hourlyRate !== undefined) {
    resolvedProfile.price_private = toNumberOrDefault(hourlyRate, mergedFallback.price_private);
  }

  const avatar = pickDefined(
    profileCandidate?.profile_picture,
    profileCandidate?.profilePicture,
    profileCandidate?.avatar,
    container?.profile_picture
  );
  if (avatar !== undefined) {
    resolvedProfile.profileImage = avatar;
  }

  if (Array.isArray(profileCandidate?.home_courts)) {
    resolvedProfile.home_courts = profileCandidate.home_courts;
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

  if (Array.isArray(profileCandidate?.groupClasses)) {
    resolvedProfile.groupClasses = profileCandidate.groupClasses;
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

const buildProfilePayload = (formData = {}) => {
  const hourlyRateCandidate = pickDefined(
    formData.hourlyRate,
    formData.price_private,
    formData.pricePrivate,
    formData.rate
  );

  return {
    fullName: formData.name ?? null,
    aboutMe: formData.bio ?? null,
    hourlyRate: hourlyRateCandidate !== undefined ? toNumberOrDefault(hourlyRateCandidate, 0) : 0,
    profilePicture: formData.profileImage ?? null
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
      const response = await getCoachProfile();

      if (!response) {
        setHasFetched(true);
        setIsComplete(false);
        setProfile(createDefaultProfile());
        setProfileId(null);
        return null;
      }

      if (!response.ok) {
        const message = `Failed to fetch coach profile (${response.status})`;
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
      const normalisedError = err instanceof Error ? err : new Error('Failed to fetch coach profile');
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
      const payload = buildProfilePayload(formData);

      try {
        const requestConfig = {
          fullName: payload.fullName,
          aboutMe: payload.aboutMe,
          hourlyRate: payload.hourlyRate,
          profilePicture: payload.profilePicture
        };

        const response = profileId
          ? await modifyProfileDetails({ id: profileId, ...requestConfig })
          : await addCoachProfile(requestConfig);

        if (!response) {
          throw new Error('Failed to save coach profile');
        }

        if (!response.ok) {
          let errorMessage = 'Failed to save coach profile';
          try {
            const errorBody = await response.json();
            errorMessage = errorBody?.message || errorBody?.error || errorMessage;
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
        const normalisedError = err instanceof Error ? err : new Error('Failed to save coach profile');
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
