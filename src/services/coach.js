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

import { getAccessToken } from '../utils/tokenHelper';

const request = async (path, options = {}) => {
  const { headers = {}, body, method = 'GET', ...rest } = options;
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
    resolvedHeaders.Authorization = `Bearer ${accessToken}`;
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

export const getCoachLessons = () => request('/coach/lessons');

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

export const getCoachAvailability = () => request('/coach/availability');

export const createCoachAvailability = (payload) =>
  request('/coach/availability', {
    method: 'POST',
    body: payload
  });

export const deleteCoachAvailability = (availabilityId) => {
  if (!availabilityId) {
    throw new Error('An availability id is required to delete a slot.');
  }

  return request(`/coach/availability/${availabilityId}`, {
    method: 'DELETE'
  });
};

export const getCoachStats = () => request('/coach/stats');

export default {
  getCoachStudents,
  getCoachLessons,
  getActivePlayerPackages,
  updateCoachPlayer,
  updateCoachLesson,
  getCoachAvailability,
  createCoachAvailability,
  deleteCoachAvailability,
  getCoachStats
};
