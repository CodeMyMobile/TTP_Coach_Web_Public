import { API_URL } from '../constants/urls';
import { storeTokens, getAccessToken, getRefreshToken, removeTokens } from '../utils/tokenHelper';

export const apiRequest = async (url, options = {}) => {
  let accessToken = await getAccessToken();

  const config = { ...options };
  config.headers = { ...(options.headers || {}) };

  if (accessToken && !config.headers.Authorization) {
    config.headers.Authorization = `token ${accessToken}`;
  }

  const endpoint = url.startsWith('/') ? `${API_URL}${url}` : `${API_URL}/${url}`;

  let response = await fetch(endpoint, config);

  if (response.status === 401) {
    const newTokens = await refreshAccessToken();

    if (!newTokens) {
      await removeTokens();
      return null;
    }

    accessToken = newTokens.access_token;

    if (accessToken) {
      config.headers.Authorization = `token ${accessToken}`;
    } else {
      delete config.headers.Authorization;
    }

    response = await fetch(endpoint, config);
  }

  return response;
};

const refreshAccessToken = async () => {
  const refreshToken = await getRefreshToken();
  if (!refreshToken) {
    return null;
  }

  const response = await fetch(`${API_URL}/auth/refresh-token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refresh_token: refreshToken })
  });

  if (!response.ok) {
    await removeTokens();
    return null;
  }

  const data = await response.json();
  await storeTokens(data.access_token, data.refresh_token);
  return data;
};

export default apiRequest;
