import assert from 'node:assert/strict';
import test from 'node:test';

import { readStoredUser } from '../authStorage.js';
import { AS_USER_KEY } from '../../constants/urls.js';

const createStorage = (initialEntries = {}) => {
  const values = new Map(Object.entries(initialEntries));

  return {
    getItem: (key) => (values.has(key) ? values.get(key) : null),
    setItem: (key, value) => values.set(key, value),
    removeItem: (key) => values.delete(key),
    has: (key) => values.has(key)
  };
};

test('readStoredUser returns null and clears stale stored users without access tokens', () => {
  const storage = createStorage({
    [AS_USER_KEY]: JSON.stringify({
      userId: 12,
      session: {
        refresh_token: 'refresh-token'
      }
    })
  });

  assert.equal(readStoredUser(storage), null);
  assert.equal(storage.has(AS_USER_KEY), false);
});

test('readStoredUser returns stored users with access tokens', () => {
  const storedUser = {
    userId: 12,
    session: {
      access_token: 'access-token',
      refresh_token: 'refresh-token'
    }
  };
  const storage = createStorage({
    [AS_USER_KEY]: JSON.stringify(storedUser)
  });

  assert.deepEqual(readStoredUser(storage), storedUser);
  assert.equal(storage.has(AS_USER_KEY), true);
});
