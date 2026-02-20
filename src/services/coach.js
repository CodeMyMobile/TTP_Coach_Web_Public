const resolveBaseUrl = () => {
  const browserCandidate =
    typeof import.meta !== 'undefined' && import.meta.env
      ? import.meta.env.VITE_API_BASE_URL || import.meta.env.VITE_API_URL
      : '';

  const nodeCandidate =
    typeof process !== 'undefined' && process.env
      ? process.env.VITE_API_BASE_URL || process.env.VITE_API_URL
      : '';

  const candidate = browserCandidate || nodeCandidate || '';

  if (!candidate) {
    return '';
  }

  return candidate.endsWith('/') ? candidate.slice(0, -1) : candidate;
};

const BASE_URL = resolveBaseUrl();

const buildUrl = (path) => {
  if (!path) {
    throw new Error('A path must be provided when making a service request.');
  }

  if (!BASE_URL) {
    return path.startsWith('/') ? path : `/${path}`;
  }

  return `${BASE_URL}${path.startsWith('/') ? '' : '/'}${path}`;
};

const parseJsonSafely = async (response) => {
  const text = await response.text();
  if (!text) {
    return null;
  }

  try {
    return JSON.parse(text);
  } catch (error) {
    return text;
  }
};

import { getAccessToken } from '../utils/tokenHelper.js';

const normalizeScheduleTime = (value) => {
  if (!value) {
    return value;
  }

  const raw = String(value).trim();
  if (/^\d{2}:\d{2}$/.test(raw)) {
    return `${raw}:00`;
  }
  return raw;
};

const buildSchedulePayload = (payload = {}) => {
  const dayValue = payload.day || payload.dayOfWeek;
  const dateValue = payload.date;
  let day = dayValue ? String(dayValue).toUpperCase() : '';

  if (!day && dateValue) {
    const parsed = new Date(dateValue);
    if (!Number.isNaN(parsed.getTime())) {
      day = parsed.toLocaleDateString('en-US', { weekday: 'long' }).toUpperCase();
    }
  }

  const normalized = {
    from: normalizeScheduleTime(payload.from || payload.start || payload.startTime),
    to: normalizeScheduleTime(payload.to || payload.end || payload.endTime || payload.finish),
    day,
    location_id:
      payload.location_id ??
      payload.locationId ??
      payload.location?.id ??
      payload.location?.location_id,
    court: payload.court ?? payload.courtId ?? payload.court_id ?? null
  };

  Object.keys(normalized).forEach((key) => {
    if (normalized[key] === undefined || normalized[key] === '') {
      delete normalized[key];
    }
  });

  return normalized;
};

const request = async (path, options = {}) => {
  const { headers = {}, body, method = 'GET', authType = 'bearer', ...rest } = options;
  const accessToken = await getAccessToken();

  const isFormData = typeof FormData !== 'undefined' && body instanceof FormData;
  const payload =
    body && typeof body === 'object' && !isFormData && !(body instanceof ArrayBuffer)
      ? JSON.stringify(body)
      : body;
  const resolvedHeaders = {
    ...(payload && !isFormData ? { 'Content-Type': 'application/json' } : {}),
    ...headers
  };

  if (accessToken && !('Authorization' in resolvedHeaders) && !('authorization' in resolvedHeaders)) {
    resolvedHeaders.Authorization = authType === 'token' ? `token ${accessToken}` : `Bearer ${accessToken}`;
  }

  const response = await fetch(buildUrl(path), {
    method,
    body: payload,
    headers: resolvedHeaders,
    ...rest
  });

  if (!response.ok) {
    const errorBody = await parseJsonSafely(response);
    const message =
      errorBody?.message ||
      errorBody?.error ||
      response.statusText ||
      'An unknown error occurred while communicating with the server.';
    const error = new Error(message);
    error.status = response.status;
    error.body = errorBody;
    throw error;
  }

  if (response.status === 204) {
    return null;
  }

  return parseJsonSafely(response);
};

export const getCoachStudents = ({ perPage, page, search } = {}) => {
  const params = new URLSearchParams();

  if (typeof perPage === 'number') {
    params.set('perPage', String(perPage));
  }

  if (typeof page === 'number') {
    params.set('page', String(page));
  }

  if (search) {
    params.set('search', search);
  }

  const query = params.toString();
  const path = query ? `/coach/players?${query}` : '/coach/players';
  return request(path);
};

export const getCoachStudentsAll = ({ perPage, page, search } = {}) => {
  const params = new URLSearchParams();

  if (typeof perPage === 'number') {
    params.set('perPage', String(perPage));
  }

  if (typeof page === 'number') {
    params.set('page', String(page));
  }

  if (search) {
    params.set('search', search);
  }

  const query = params.toString();
  const path = query ? `/coach/players/all?${query}` : '/coach/players/all';
  return request(path);
};

export const getCoachPlayerById = ({ playerId } = {}) => {
  if (!playerId) {
    throw new Error('A player id is required to fetch player details.');
  }

  return request(`/coach/players/${playerId}`);
};

export const getCoachLessons = ({ perPage = 50, page = 1, date } = {}) => {
  if (date) {
    return request(`/coach/lessons/${date}`);
  }

  const params = new URLSearchParams();
  if (typeof perPage === 'number') {
    params.set('perPage', String(perPage));
  }
  if (typeof page === 'number') {
    params.set('page', String(page));
  }

  const query = params.toString();
  const path = query ? `/coach/lessons?${query}` : '/coach/lessons';
  return request(path);
};

export const getCoachPlayerPreviousLessons = ({ playerId, perPage, page } = {}) => {
  if (!playerId) {
    throw new Error('A player id is required to fetch previous lessons.');
  }

  const params = new URLSearchParams();
  if (typeof perPage === 'number') {
    params.set('perPage', String(perPage));
  }
  if (typeof page === 'number') {
    params.set('page', String(page));
  }

  const query = params.toString();
  const path = query
    ? `/coach/player_previous_lessons/${playerId}?${query}`
    : `/coach/player_previous_lessons/${playerId}`;
  return request(path);
};

export const getActivePlayerPackages = ({ playerId, player_id, search, perPage, page } = {}) => {
  const params = new URLSearchParams();
  const resolvedPlayerId = playerId ?? player_id;

  if (resolvedPlayerId !== undefined && resolvedPlayerId !== null && resolvedPlayerId !== '') {
    params.set('playerId', String(resolvedPlayerId));
  }

  if (search) {
    params.set('search', search);
  }

  if (typeof perPage === 'number') {
    params.set('perPage', String(perPage));
  }

  if (typeof page === 'number') {
    params.set('page', String(page));
  }

  const query = params.toString();
  const path = query ? `/players/packages/active?${query}` : '/players/packages/active';
  return request(path);
};

export const getCoachPlayerPackageUsage = ({
  playerId,
  player_id,
  purchaseId,
  purchase_id,
  lessonId,
  lesson_id,
  usageStatus,
  usage_status,
  search,
  perPage,
  page
} = {}) => {
  const params = new URLSearchParams();
  const resolvedPlayerId = playerId ?? player_id;
  const resolvedPurchaseId = purchaseId ?? purchase_id;
  const resolvedLessonId = lessonId ?? lesson_id;
  const resolvedUsageStatus = usageStatus ?? usage_status;

  if (resolvedPlayerId !== undefined && resolvedPlayerId !== null && resolvedPlayerId !== '') {
    params.set('playerId', String(resolvedPlayerId));
  }

  if (resolvedPurchaseId !== undefined && resolvedPurchaseId !== null && resolvedPurchaseId !== '') {
    params.set('purchaseId', String(resolvedPurchaseId));
  }

  if (resolvedLessonId !== undefined && resolvedLessonId !== null && resolvedLessonId !== '') {
    params.set('lessonId', String(resolvedLessonId));
  }

  if (resolvedUsageStatus) {
    params.set('usageStatus', String(resolvedUsageStatus));
  }

  if (search) {
    params.set('search', String(search));
  }

  if (typeof perPage === 'number') {
    params.set('perPage', String(perPage));
  }

  if (typeof page === 'number') {
    params.set('page', String(page));
  }

  const query = params.toString();
  const path = query ? `/coach/players/packages/usage?${query}` : '/coach/players/packages/usage';
  return request(path);
};

export const updateCoachPlayer = ({ playerId, status = 'PENDING', discountPercentage } = {}) => {
  if (!playerId) {
    throw new Error('A player id is required to update roster status.');
  }

  const payload = {
    status
  };

  if (typeof discountPercentage === 'number') {
    payload.discount_percentage = discountPercentage;
  }

  return request(`/coach/players/${playerId}`, {
    method: 'PATCH',
    body: payload
  });
};

export const updateCoachLesson = (lessonId, payload) => {
  if (!lessonId) {
    throw new Error('A lesson id is required to update a lesson.');
  }

  return request(`/coach/lessons/${lessonId}`, {
    method: 'PUT',
    body: payload
  });
};

export const getCoachAvailability = () => request('/coach/schedule');

export const createCoachAvailability = (payload) =>
  request('/coach/schedule', {
    method: 'POST',
    body: buildSchedulePayload(payload)
  });

export const createCoachAvailabilityBulk = (payload = []) => {
  if (!Array.isArray(payload) || payload.length === 0) {
    return Promise.resolve([]);
  }

  return request('/coach/schedule/bulk', {
    method: 'POST',
    body: payload.map((item) => buildSchedulePayload(item))
  });
};

export const updateCoachAvailability = (scheduleId, payload = {}) => {
  if (!scheduleId) {
    throw new Error('A schedule id is required to update availability.');
  }

  return request(`/coach/schedule/${scheduleId}`, {
    method: 'PATCH',
    body: buildSchedulePayload(payload)
  });
};

export const replaceCoachAvailability = (scheduleId, payload = {}) => {
  if (!scheduleId) {
    throw new Error('A schedule id is required to replace availability.');
  }

  return request(`/coach/schedule/${scheduleId}`, {
    method: 'PUT',
    body: buildSchedulePayload(payload)
  });
};

export const deleteCoachAvailability = (availabilityId) => {
  if (!availabilityId) {
    throw new Error('An availability id is required to delete a slot.');
  }

  return request(`/coach/schedule/${availabilityId}`, {
    method: 'DELETE'
  });
};

export const getCoachStats = () => request('/coach/stats');

export const getGoogleCalendarSyncedEvents = ({ timeMin, timeMax } = {}) => {
  const params = new URLSearchParams();
  if (timeMin) {
    params.set('timeMin', timeMin);
  }
  if (timeMax) {
    params.set('timeMax', timeMax);
  }
  const query = params.toString();
  const path = query
    ? `/coach/google-calendar/synced-events?${query}`
    : '/coach/google-calendar/synced-events';
  return request(path);
};

export const sendLessonInvites = (lessonId, payload = {}) => {
  if (!lessonId) {
    throw new Error('A lesson id is required to send invites.');
  }

  return request(`/coach/lessons/${lessonId}/invites`, {
    method: 'POST',
    authType: 'token',
    body: payload
  });
};

export const createLessonShareLink = (lessonId, payload = {}) => {
  if (!lessonId) {
    throw new Error('A lesson id is required to create a share link.');
  }

  return request(`/coach/lessons/${lessonId}/share-link`, {
    method: 'POST',
    authType: 'token',
    body: payload
  });
};

export default {
  getCoachStudents,
  getCoachLessons,
  getActivePlayerPackages,
  getCoachPlayerPackageUsage,
  createCoachAvailability,
  createCoachAvailabilityBulk,
  updateCoachAvailability,
  replaceCoachAvailability,
  updateCoachPlayer,
  updateCoachLesson,
  getCoachAvailability,
  deleteCoachAvailability,
  getCoachStats,
  getGoogleCalendarSyncedEvents,
  sendLessonInvites,
  createLessonShareLink
};
