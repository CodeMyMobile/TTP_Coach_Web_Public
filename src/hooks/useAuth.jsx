import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { coachSignup, logIn } from '../api/auth';
import { AS_USER_KEY } from '../constants/urls';
import { USER_TYPES } from '../constants';
import { removeTokens, storeTokens } from '../utils/tokenHelper';

const AuthContext = createContext(null);

const readStoredUser = () => {
  if (typeof window === 'undefined' || !window.localStorage) {
    return null;
  }

  try {
    const raw = window.localStorage.getItem(AS_USER_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch (error) {
    console.error('Failed to parse stored auth state', error);
    return null;
  }
};

const writeStoredUser = (payload) => {
  if (typeof window === 'undefined' || !window.localStorage) {
    return;
  }

  if (!payload) {
    window.localStorage.removeItem(AS_USER_KEY);
    return;
  }

  window.localStorage.setItem(AS_USER_KEY, JSON.stringify(payload));
};

const normaliseUserPayload = (data) => ({
  session: data,
  userType: data?.user_type ?? null,
  userId: data?.user_id ?? null,
  onboardingComplete: Boolean(data?.onboarding_complete ?? data?.is_complete),
  profile: data?.profile ?? null
});

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => readStoredUser());
  const [initialising, setInitialising] = useState(true);
  const [authError, setAuthError] = useState(null);
  const [authLoading, setAuthLoading] = useState(false);

  useEffect(() => {
    setInitialising(false);
  }, []);

  const logout = useCallback(async () => {
    setAuthLoading(false);
    setAuthError(null);
    setUser(null);
    writeStoredUser(null);
    await removeTokens();
  }, []);

  const login = useCallback(async (email, password) => {
    setAuthError(null);
    setAuthLoading(true);

    try {
      const result = await logIn(email, password);

      if (!result.ok) {
        let message = 'Unable to log in with the provided credentials.';

        if (result.status === 404) {
          message = 'No user found with this email address.';
        } else if (result.status === 403) {
          message = 'Incorrect password.';
        }

        throw new Error(message);
      }

      if (!result.data) {
        throw new Error('Login response did not include user data.');
      }

      if (result.data.user_type !== USER_TYPES.coach) {
        throw new Error('This portal is only available to coaches.');
      }

      await storeTokens(result.data.access_token, result.data.refresh_token);

      const nextUser = normaliseUserPayload(result.data);
      setUser(nextUser);
      writeStoredUser(nextUser);
      setAuthError(null);
      return { data: nextUser };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unexpected error while logging in.';
      setAuthError(message);
      await removeTokens();
      return { error: message };
    } finally {
      setAuthLoading(false);
    }
  }, []);

  const signup = useCallback(async (payload) => {
    setAuthError(null);
    setAuthLoading(true);

    try {
      const result = await coachSignup(payload);

      if (!result.ok) {
        let message = 'Unable to create the account with the provided details.';

        if (result.status === 400) {
          message = 'Please review your details and try again.';
        } else if (result.status === 409) {
          message = 'An account with this email already exists.';
        }

        throw new Error(message);
      }

      if (!result.data) {
        throw new Error('Signup response did not include user data.');
      }

      if (result.data.user_type !== USER_TYPES.coach) {
        throw new Error('This portal only supports coach accounts.');
      }

      await storeTokens(result.data.access_token, result.data.refresh_token);

      const nextUser = normaliseUserPayload(result.data);
      setUser(nextUser);
      writeStoredUser(nextUser);
      setAuthError(null);
      return { data: nextUser };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unexpected error while creating the account.';
      setAuthError(message);
      await removeTokens();
      return { error: message };
    } finally {
      setAuthLoading(false);
    }
  }, []);

  const value = useMemo(
    () => ({
      user,
      authLoading,
      authError,
      initialising,
      login,
      signup,
      logout
    }),
    [user, authLoading, authError, initialising, login, signup, logout]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export default useAuth;
