import { AS_USER_KEY } from '../constants/urls.js';
import { ACCESS_TOKEN_KEY, REFRESH_TOKEN_KEY } from '../utils/tokenHelper.js';

const hasAccessToken = (payload) => Boolean(payload?.session?.access_token);

const decodeJwtPayload = (token) => {
  const payload = token?.split?.('.')?.[1];

  if (!payload) {
    return null;
  }

  try {
    if (typeof Buffer !== 'undefined') {
      return JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
    }

    const base64 = payload.replace(/-/g, '+').replace(/_/g, '/');
    const padded = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), '=');
    return JSON.parse(window.atob(padded));
  } catch (error) {
    return null;
  }
};

const isExpiredAccessToken = (token) => {
  const payload = decodeJwtPayload(token);

  if (!payload || typeof payload.exp !== 'number') {
    return false;
  }

  return payload.exp * 1000 <= Date.now();
};

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
      clearStoredAuth(resolvedStorage);
      return null;
    }

    if (isExpiredAccessToken(parsed.session.access_token)) {
      clearStoredAuth(resolvedStorage);
      return null;
    }

    return parsed;
  } catch (error) {
    console.error('Failed to parse stored auth state', error);
    clearStoredAuth(resolvedStorage);
    return null;
  }
};

export const clearStoredUser = (storage) => {
  const resolvedStorage = resolveStorage(storage);

  if (!resolvedStorage) {
    return;
  }

  resolvedStorage.removeItem(AS_USER_KEY);
};

export const clearStoredAuth = (storage) => {
  const resolvedStorage = resolveStorage(storage);

  if (!resolvedStorage) {
    return;
  }

  resolvedStorage.removeItem(AS_USER_KEY);
  resolvedStorage.removeItem(ACCESS_TOKEN_KEY);
  resolvedStorage.removeItem(REFRESH_TOKEN_KEY);
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
