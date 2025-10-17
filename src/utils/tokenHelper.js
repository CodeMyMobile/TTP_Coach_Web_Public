const ACCESS_TOKEN_KEY = 'access_token';
const REFRESH_TOKEN_KEY = 'refresh_token';

const memoryStore = new Map();

const storage = typeof window !== 'undefined' && window?.localStorage
  ? window.localStorage
  : {
      getItem: (key) => (memoryStore.has(key) ? memoryStore.get(key) : null),
      setItem: (key, value) => {
        memoryStore.set(key, value);
      },
      removeItem: (key) => {
        memoryStore.delete(key);
      }
    };

export const storeTokens = async (accessToken, refreshToken) => {
  if (accessToken) {
    storage.setItem(ACCESS_TOKEN_KEY, accessToken);
  }
  if (refreshToken) {
    storage.setItem(REFRESH_TOKEN_KEY, refreshToken);
  }
};

export const getAccessToken = async () => storage.getItem(ACCESS_TOKEN_KEY);

export const getRefreshToken = async () => storage.getItem(REFRESH_TOKEN_KEY);

export const removeTokens = async () => {
  storage.removeItem(ACCESS_TOKEN_KEY);
  storage.removeItem(REFRESH_TOKEN_KEY);
};

export default {
  storeTokens,
  getAccessToken,
  getRefreshToken,
  removeTokens
};
