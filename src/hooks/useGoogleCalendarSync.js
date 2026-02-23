const resolveBaseUrl = () => {
  const meta = typeof import.meta !== 'undefined' ? import.meta.env || {} : {};
  const candidate = meta.VITE_API_BASE_URL || meta.VITE_API_URL || meta.API_BASE_URL || '';
  if (!candidate) {
    return '';
  }
  return candidate.endsWith('/') ? candidate.slice(0, -1) : candidate;
};

const API_BASE_URL = resolveBaseUrl();

const buildUrl = (path) => {
  if (!path) {
    throw new Error('A path is required.');
  }
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  if (!API_BASE_URL) {
    return normalizedPath;
  }
  const pathForBase = API_BASE_URL.endsWith('/api') && normalizedPath.startsWith('/api/')
    ? normalizedPath.slice(4)
    : normalizedPath;
  return `${API_BASE_URL}${pathForBase}`;
};

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

const request = async (path, token, method = 'GET') => {
  const response = await fetch(buildUrl(path), {
    method,
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
    error.code = data?.code || null;
    error.data = data;
    throw error;
  }

  return data;
};

export const useGoogleCalendarSync = () => {
  const getAuthUrl = async ({ token }) => {
    if (!token) {
      throw new Error('Auth token is required.');
    }
    return request('/api/coach/google-calendar/auth-url', token);
  };

  const syncEvents = async ({ token, timeMin, timeMax }) => {
    if (!token) {
      throw new Error('Auth token is required.');
    }
    const params = new URLSearchParams();
    if (timeMin) {
      params.set('timeMin', timeMin);
    }
    if (timeMax) {
      params.set('timeMax', timeMax);
    }
    const query = params.toString();
    const path = query
      ? `/api/coach/google-calendar/sync?${query}`
      : '/api/coach/google-calendar/sync';
    return request(path, token, 'POST');
  };

  const getSyncedEvents = async ({ token, timeMin, timeMax }) => {
    if (!token) {
      throw new Error('Auth token is required.');
    }
    const params = new URLSearchParams();
    if (timeMin) {
      params.set('timeMin', timeMin);
    }
    if (timeMax) {
      params.set('timeMax', timeMax);
    }
    const query = params.toString();
    const path = query
      ? `/api/coach/google-calendar/synced-events?${query}`
      : '/api/coach/google-calendar/synced-events';
    return request(path, token);
  };

  return {
    getAuthUrl,
    syncEvents,
    getSyncedEvents
  };
};

export default useGoogleCalendarSync;
