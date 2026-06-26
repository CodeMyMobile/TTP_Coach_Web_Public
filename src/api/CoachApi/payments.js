import { API_URL } from '../../constants/urls.js';
import { redirectToSignInOnForbidden } from '../../utils/authRedirect.js';
import { getAccessToken } from '../../utils/tokenHelper.js';

const authorisedStripeRequest = async (path, { method = 'GET', body } = {}) => {
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
  return response;
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
