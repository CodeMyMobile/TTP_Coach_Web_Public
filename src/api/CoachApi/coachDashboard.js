import { apiRequest } from '../apiRequest';

const buildQuery = (params = {}) => {
  const entries = Object.entries(params).filter(([, value]) => value !== undefined && value !== null && value !== '');
  if (entries.length === 0) {
    return '';
  }

  const query = entries
    .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(value)}`)
    .join('&');
  return `?${query}`;
};

const parseResponse = async (response) => {
  if (!response) {
    throw new Error('Your session has expired. Please sign in again.');
  }

  if (!response.ok) {
    let message = 'Request failed.';
    try {
      const errorBody = await response.json();
      message = errorBody?.message || errorBody?.error || errorBody?.errors?.[0] || message;
    } catch {
      // Ignore JSON parsing errors.
    }
    throw new Error(message);
  }

  if (response.status === 204) {
    return null;
  }

  return response.json().catch(() => null);
};

export const getCoachPlayersList = async ({ perPage = 5, page = 1, search = '' } = {}) => {
  const query = buildQuery({ perPage, page, search });
  const response = await apiRequest(`/coach/players${query}`, { method: 'GET' });
  return parseResponse(response);
};

export const updateCoachPlayer = async (playerId, payload = {}) => {
  if (!playerId) {
    throw new Error('A player id is required to update a player.');
  }

  const response = await apiRequest(`/coach/players/${playerId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json;charset=UTF-8' },
    body: JSON.stringify(payload)
  });
  return parseResponse(response);
};

export const getCoachUpcomingLessons = async ({ perPage = 5, page = 1 } = {}) => {
  const query = buildQuery({ perPage, page });
  const response = await apiRequest(`/coach/lessons${query}`, { method: 'GET' });
  return parseResponse(response);
};

export const updateCoachLesson = async (lessonId, payload = {}) => {
  if (!lessonId) {
    throw new Error('A lesson id is required to update a lesson.');
  }

  const response = await apiRequest(`/coach/lesson/${lessonId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json;charset=UTF-8' },
    body: JSON.stringify(payload)
  });
  return parseResponse(response);
};

export const coachStripePaymentIntent = async ({ lessonId, lesson_id } = {}) => {
  const resolvedLessonId = lesson_id ?? lessonId;
  if (!resolvedLessonId) {
    throw new Error('A lesson id is required to charge a lesson.');
  }

  const response = await apiRequest('/coach/stripe/paymentintent', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json;charset=UTF-8' },
    body: JSON.stringify({ lesson_id: resolvedLessonId })
  });
  return parseResponse(response);
};

export const getPlayerUpcomingLessons = async ({ playerId, perPage = 10, page = 1 } = {}) => {
  if (!playerId) {
    throw new Error('A player id is required to load upcoming lessons.');
  }

  const query = buildQuery({ perPage, page });
  const response = await apiRequest(`/coach/player_upcoming_lessons/${playerId}${query}`, {
    method: 'GET'
  });
  return parseResponse(response);
};

export const getPlayerPreviousLessons = async ({ playerId, perPage = 10, page = 1 } = {}) => {
  if (!playerId) {
    throw new Error('A player id is required to load lesson history.');
  }

  const query = buildQuery({ perPage, page });
  const response = await apiRequest(`/coach/player_previous_lessons/${playerId}${query}`, {
    method: 'GET'
  });
  return parseResponse(response);
};

export const getSingleCoachPlayer = async (playerId) => {
  if (!playerId) {
    throw new Error('A player id is required to load player details.');
  }

  const response = await apiRequest(`/coach/players/${playerId}`, { method: 'GET' });
  return parseResponse(response);
};

export default {
  getCoachPlayersList,
  updateCoachPlayer,
  getCoachUpcomingLessons,
  updateCoachLesson,
  coachStripePaymentIntent,
  getPlayerUpcomingLessons,
  getPlayerPreviousLessons,
  getSingleCoachPlayer
};
