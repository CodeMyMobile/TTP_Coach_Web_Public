import { API_URL } from '../../constants/urls.js';
import { redirectToSignInOnForbidden } from '../../utils/authRedirect.js';
import { getAccessToken } from '../../utils/tokenHelper.js';

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

const payoutRequest = async (path, { method = 'GET', body } = {}) => {
  const accessToken = await getAccessToken();
  const headers = {
    'Content-Type': 'application/json;charset=UTF-8'
  };

  if (accessToken) {
    headers.Authorization = `token ${accessToken}`;
  }

  const response = await fetch(`${API_URL}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined
  });

  await redirectToSignInOnForbidden(response);
  const payload = await parseJsonSafely(response);

  if (!response.ok) {
    const message =
      payload?.detail ||
      payload?.message ||
      payload?.error ||
      response.statusText ||
      'Payout setup request failed.';
    throw new Error(message);
  }

  return payload;
};

export const getPayoutSetupStatus = async () =>
  payoutRequest('/coach/payout-setup/status');

export const createPayoutSetupLink = async () =>
  payoutRequest('/coach/payout-setup/account-link', {
    method: 'POST',
    body: {}
  });

export default {
  createPayoutSetupLink,
  getPayoutSetupStatus
};
