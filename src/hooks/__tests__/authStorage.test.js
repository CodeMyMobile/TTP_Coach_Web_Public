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

test('readStoredUser clears stored users and tokens with expired access tokens', () => {
  const expiredPayload = Buffer.from(JSON.stringify({ exp: 1 })).toString('base64url');
  const storedUser = {
    userId: 12,
    session: {
      access_token: `header.${expiredPayload}.signature`,
      refresh_token: 'refresh-token'
    }
  };
  const storage = createStorage({
    [AS_USER_KEY]: JSON.stringify(storedUser),
    access_token: storedUser.session.access_token,
    refresh_token: storedUser.session.refresh_token
  });

  assert.equal(readStoredUser(storage), null);
  assert.equal(storage.has(AS_USER_KEY), false);
  assert.equal(storage.has('access_token'), false);
  assert.equal(storage.has('refresh_token'), false);
});
