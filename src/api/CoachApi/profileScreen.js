import { apiRequest } from '../apiRequest';

const buildProfilePayload = ({
  fullName = null,
  aboutMe = null,
  hourlyRate = 0,
  profilePicture = null,
  includeAvatar = true
} = {}) => {
  const payload = {};

  if (fullName !== null && fullName !== undefined) {
    payload.full_name = fullName;
  }

  if (aboutMe !== null && aboutMe !== undefined) {
    payload.about_me = aboutMe;
  }

  if (hourlyRate !== null && hourlyRate !== undefined) {
    payload.hourly_rate = hourlyRate;
  }

  if (includeAvatar && profilePicture !== undefined) {
    payload.profile_picture = profilePicture ?? '';
  }

  return payload;
};

const buildHeaders = (token) => {
  const headers = {
    'Content-Type': 'application/json;charset=UTF-8'
  };

  if (token) {
    headers.Authorization = `token ${token}`;
  }

  return headers;
};

export const getCoachProfile = async () =>
  apiRequest('/coach/profile', {
    method: 'GET'
  });

export const addCoachProfile = async ({
  accessToken = null,
  fullName = null,
  aboutMe = null,
  hourlyRate = 0,
  profilePicture = null
} = {}) =>
  apiRequest('/coach/profile', {
    method: 'POST',
    headers: buildHeaders(accessToken),
    body: JSON.stringify(
      buildProfilePayload({
        fullName,
        aboutMe: aboutMe ?? '',
        hourlyRate: hourlyRate ?? 0,
        profilePicture: profilePicture ?? '',
        includeAvatar: true
      })
    )
  });

const normaliseModifyArgs = (args) => {
  if (args.length === 1 && typeof args[0] === 'object' && args[0] !== null && !Array.isArray(args[0])) {
    return args[0];
  }

  const [coach, id, fullName, aboutMe, hourlyRate = 0, profilePicture = null] = args;
  return { coach, id, fullName, aboutMe, hourlyRate, profilePicture };
};

export const modifyProfileDetails = async (...args) => {
  const { coach = null, id = null, fullName = null, aboutMe = null, hourlyRate = 0, profilePicture = null } =
    normaliseModifyArgs(args);

  if (!id) {
    throw new Error('A profile id is required to update profile details.');
  }

  return apiRequest(`/coach/profile/${id}`, {
    method: 'PATCH',
    headers: buildHeaders(coach),
    body: JSON.stringify(
      buildProfilePayload({
        fullName,
        aboutMe,
        hourlyRate,
        profilePicture,
        includeAvatar: true
      })
    )
  });
};

export const updateProfileDetails = async ({
  coachAccesstoken = null,
  id = null,
  fullName = null,
  aboutMe = null,
  hourlyRate = 0
} = {}) => {
  if (!id) {
    throw new Error('A profile id is required to update profile details.');
  }

  return apiRequest(`/coach/profile/${id}`, {
    method: 'PATCH',
    headers: buildHeaders(coachAccesstoken),
    body: JSON.stringify(
      buildProfilePayload({
        fullName,
        aboutMe,
        hourlyRate,
        includeAvatar: false
      })
    )
  });
};

export default {
  getCoachProfile,
  addCoachProfile,
  modifyProfileDetails,
  updateProfileDetails
};
