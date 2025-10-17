import { API_URL } from '../../constants/urls';
import { getAccessToken } from '../../utils/tokenHelper';

const authorisedStripeRequest = async (path, { method = 'GET', body } = {}) => {
  const accessToken = await getAccessToken();
  const headers = {
    'Content-Type': 'application/json;charset=UTF-8'
  };

  if (accessToken) {
    headers.Authorization = `token ${accessToken}`;
  }

  return fetch(`${API_URL}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined
  });
};

export const createStripeOnboardingLink = async () =>
  authorisedStripeRequest('/stripe/onboard-user', {
    method: 'POST',
    body: {}
  });

export const refreshStripeOnboardingLink = async () =>
  authorisedStripeRequest('/stripe/onboard-user/refresh', {
    method: 'GET'
  });

export default {
  createStripeOnboardingLink,
  refreshStripeOnboardingLink
};
