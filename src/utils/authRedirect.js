import { clearStoredUser } from '../hooks/authStorage.js';
import { removeTokens } from './tokenHelper.js';

export const redirectToSignIn = async () => {
  clearStoredUser();
  await removeTokens();

  if (typeof window === 'undefined' || !window.location) {
    return;
  }

  if (window.location.pathname === '/') {
    return;
  }

  if (typeof window.location.assign === 'function') {
    window.location.assign('/');
    return;
  }

  window.location.href = '/';
};

export const redirectToSignInOnForbidden = async (response) => {
  if (response?.status === 401 || response?.status === 403) {
    await redirectToSignIn();
  }
};

export default {
  redirectToSignIn,
  redirectToSignInOnForbidden
};
