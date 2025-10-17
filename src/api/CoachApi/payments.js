import { apiRequest } from '../apiRequest';

export const createStripeOnboardingLink = async () =>
  apiRequest('/coach/stripe/onboarding', {
    method: 'POST'
  });

export const getStripeOnboardingStatus = async () =>
  apiRequest('/coach/stripe/onboarding/status', {
    method: 'GET'
  });

export default {
  createStripeOnboardingLink,
  getStripeOnboardingStatus
};
