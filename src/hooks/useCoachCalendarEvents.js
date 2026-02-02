const resolveBaseUrl = () => {
  const meta = typeof import.meta !== 'undefined' ? import.meta.env || {} : {};
  const candidate = meta.VITE_API_BASE_URL || meta.VITE_API_URL || meta.API_BASE_URL || '';
  if (!candidate) {
    return '';
  }
  return candidate.endsWith('/') ? candidate.slice(0, -1) : candidate;
};

const API_BASE_URL = resolveBaseUrl();

const parseJsonSafely = async (response) => {
  const text = await response.text();
  if (!text) {
    return null;
  }
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
};

const request = async (path, token) => {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${token}`
    }
  });

  const data = await parseJsonSafely(response);
  if (!response.ok) {
    const message =
      data?.message || data?.error || response.statusText || 'Request failed.';
    const error = new Error(message);
    error.status = response.status;
    error.data = data;
    throw error;
  }

  return data;
};

export const useCoachCalendarEvents = () => {
  const getEvents = async ({ token, timeMin, timeMax }) => {
    const params = new URLSearchParams();
    if (timeMin) {
      params.set('timeMin', timeMin);
    }
    if (timeMax) {
      params.set('timeMax', timeMax);
    }
    const query = params.toString();
    const path = query
      ? `/coach/google-calendar/events?${query}`
      : '/coach/google-calendar/events';
    return request(path, token);
  };

  const getAuthUrl = async ({ token }) => request('/coach/google-calendar/auth-url', token);

  return {
    getEvents,
    getAuthUrl
  };
};

export default useCoachCalendarEvents;
