export const SIGN_IN_PATH = '/';
export const DASHBOARD_PATH = '/dashboard';

export const resolveAuthRedirectPath = ({
  authInitialising,
  isAuthenticated,
  currentPath,
  allowedAuthenticatedRoutes = new Set()
} = {}) => {
  if (authInitialising) {
    return null;
  }

  if (!isAuthenticated) {
    return currentPath === SIGN_IN_PATH ? null : SIGN_IN_PATH;
  }

  return allowedAuthenticatedRoutes.has(currentPath) ? null : DASHBOARD_PATH;
};

export default {
  DASHBOARD_PATH,
  SIGN_IN_PATH,
  resolveAuthRedirectPath
};
