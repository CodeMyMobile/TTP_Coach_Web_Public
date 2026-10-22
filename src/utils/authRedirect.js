import { clearStoredUser } from '../hooks/authStorage.js';
import { getAccessToken, removeTokens } from './tokenHelper.js';

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

// Only a failed sign-in ends the session. The API answers 401 for a bad or
// expired token, and 403 for a request that carried no token at all. Any other
// 403 is the API refusing this one action (e.g. coach_restringing_not_enabled)
// for a coach who is still signed in, and the caller shows that error. Signing
// out on those sent a coach from "Send order & pay link" to the sign-in page
// without ever saying why.
export const redirectToSignInOnForbidden = async (response) => {
  if (response?.status === 401) {
    await redirectToSignIn();
    return;
  }
  if (response?.status === 403 && !(await getAccessToken())) {
    await redirectToSignIn();
  }
};

export default {
  redirectToSignIn,
  redirectToSignInOnForbidden
};
