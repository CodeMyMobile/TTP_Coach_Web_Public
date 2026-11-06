export const SIGN_IN_PATH = '/';
export const DASHBOARD_PATH = '/dashboard';

// Links in texts and emails open one lesson, player or request. A coach who has to sign in
// first is brought back to it instead of the dashboard.
const RETURNABLE_PATH = /^\/dashboard\/(lesson|players|requests)\/[^/]+\/?$/;
const RETURN_PATH_KEY = 'coachSignInReturnPath';

export const isReturnablePath = (path) => typeof path === 'string' && RETURNABLE_PATH.test(path);

const sessionStore = () => {
  try {
    return typeof window !== 'undefined' && window.sessionStorage ? window.sessionStorage : null;
  } catch (error) {
    return null;
  }
};

export const rememberReturnPath = (path) => {
  if (!isReturnablePath(path)) {
    return;
  }
  try {
    sessionStore()?.setItem(RETURN_PATH_KEY, path);
  } catch (error) {
    // Without storage the coach lands on the dashboard after signing in, as before.
  }
};

export const peekReturnPath = () => {
  try {
    const path = sessionStore()?.getItem(RETURN_PATH_KEY);
    return isReturnablePath(path) ? path : null;
  } catch (error) {
    return null;
  }
};

export const clearReturnPath = () => {
  try {
    sessionStore()?.removeItem(RETURN_PATH_KEY);
  } catch (error) {
    // Nothing to clear.
  }
};

export const resolveAuthRedirectPath = ({
  authInitialising,
  isAuthenticated,
  currentPath,
  allowedAuthenticatedRoutes = new Set(),
  returnPath = null
} = {}) => {
  if (authInitialising) {
    return null;
  }

  if (!isAuthenticated) {
    return currentPath === SIGN_IN_PATH ? null : SIGN_IN_PATH;
  }

  if (currentPath === SIGN_IN_PATH && isReturnablePath(returnPath)) {
    return returnPath;
  }

  return allowedAuthenticatedRoutes.has(currentPath) ? null : DASHBOARD_PATH;
};

export default {
  DASHBOARD_PATH,
  SIGN_IN_PATH,
  clearReturnPath,
  isReturnablePath,
  peekReturnPath,
  rememberReturnPath,
  resolveAuthRedirectPath
};
