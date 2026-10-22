import test from 'node:test';
import assert from 'node:assert/strict';
import { getAccessToken, removeTokens, storeTokens } from '../../utils/tokenHelper.js';

process.env.VITE_API_URL = 'https://api.example.com';

test('apiRequest keeps the coach signed in when an action is refused', async () => {
  await storeTokens('coach-token', 'refresh-token');

  let assignedPath = '';
  global.window = {
    location: {
      pathname: '/dashboard',
      assign: (path) => {
        assignedPath = path;
      }
    }
  };

  global.fetch = async () => ({
    ok: false,
    status: 403,
    statusText: 'Forbidden',
    text: async () => JSON.stringify({ error: 'forbidden' })
  });

  const { apiRequest } = await import('../apiRequest.js');
  const response = await apiRequest('/coach/packages');

  assert.equal(response.status, 403);
  assert.equal(assignedPath, '');
  assert.equal(await getAccessToken(), 'coach-token');

  delete global.window;
  await removeTokens();
});

test('apiRequest redirects to sign in on a 403 sent because there was no token', async () => {
  await removeTokens();

  let assignedPath = '';
  global.window = {
    location: {
      pathname: '/dashboard',
      assign: (path) => {
        assignedPath = path;
      }
    }
  };

  global.fetch = async () => ({
    ok: false,
    status: 403,
    statusText: 'Forbidden',
    text: async () => JSON.stringify({ error: 'Please provide a valid token' })
  });

  const { apiRequest } = await import('../apiRequest.js');
  const response = await apiRequest('/coach/packages');

  assert.equal(response.status, 403);
  assert.equal(assignedPath, '/');
  assert.equal(await getAccessToken(), null);

  delete global.window;
  await removeTokens();
});
