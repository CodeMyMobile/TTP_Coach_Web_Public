import { AS_USER_KEY } from '../constants/urls.js';

const hasAccessToken = (payload) => Boolean(payload?.session?.access_token);

const resolveStorage = (storage) => {
  if (storage) {
    return storage;
  }

  if (typeof window === 'undefined' || !window.localStorage) {
    return null;
  }

  return window.localStorage;
};

export const readStoredUser = (storage) => {
  const resolvedStorage = resolveStorage(storage);

  if (!resolvedStorage) {
    return null;
  }

  try {
    const raw = resolvedStorage.getItem(AS_USER_KEY);
    const parsed = raw ? JSON.parse(raw) : null;

    if (!parsed) {
      return null;
    }

    if (!hasAccessToken(parsed)) {
      resolvedStorage.removeItem(AS_USER_KEY);
      return null;
    }

    return parsed;
  } catch (error) {
    console.error('Failed to parse stored auth state', error);
    resolvedStorage.removeItem(AS_USER_KEY);
    return null;
  }
};

export const writeStoredUser = (payload, storage) => {
  const resolvedStorage = resolveStorage(storage);

  if (!resolvedStorage) {
    return;
  }

  if (!payload) {
    resolvedStorage.removeItem(AS_USER_KEY);
    return;
  }

  resolvedStorage.setItem(AS_USER_KEY, JSON.stringify(payload));
};
