import test from 'node:test';
import assert from 'node:assert/strict';
import { removeTokens, storeTokens } from '../../utils/tokenHelper.js';

process.env.VITE_API_BASE_URL = 'https://api.example.com';

const jsonResponse = (payload) => ({
  ok: true,
  status: 200,
  statusText: 'OK',
  text: async () => JSON.stringify(payload)
});

test('sendLessonInvites posts payload with token auth header', async () => {
  await storeTokens('coach-token', 'refresh-token');

  let calledUrl = '';
  let calledOptions = null;

  global.fetch = async (url, options = {}) => {
    calledUrl = url;
    calledOptions = options;
    return jsonResponse({ results: [] });
  };

  const { sendLessonInvites } = await import('../coach.js');

  const payload = {
    emails: ['athlete@example.com'],
    phone_numbers: ['+15551112222'],
    expires_in_days: 7
  };

  await sendLessonInvites(123, payload);

  assert.equal(calledUrl, 'https://api.example.com/coach/lessons/123/invites');
  assert.equal(calledOptions?.method, 'POST');
  assert.equal(calledOptions?.headers?.Authorization, 'token coach-token');
  assert.equal(calledOptions?.headers?.['Content-Type'], 'application/json');
  assert.deepEqual(JSON.parse(calledOptions?.body), payload);

  await removeTokens();
});

test('createLessonShareLink posts payload with token auth header', async () => {
  await storeTokens('coach-token', 'refresh-token');

  let calledUrl = '';
  let calledOptions = null;

  global.fetch = async (url, options = {}) => {
    calledUrl = url;
    calledOptions = options;
    return jsonResponse({ claim_link: 'https://app.example.com/claim/abc' });
  };

  const { createLessonShareLink } = await import('../coach.js');

  const payload = { expires_in_days: 14 };
  await createLessonShareLink(456, payload);

  assert.equal(calledUrl, 'https://api.example.com/coach/lessons/456/share-link');
  assert.equal(calledOptions?.method, 'POST');
  assert.equal(calledOptions?.headers?.Authorization, 'token coach-token');
  assert.equal(calledOptions?.headers?.['Content-Type'], 'application/json');
  assert.deepEqual(JSON.parse(calledOptions?.body), payload);

  await removeTokens();
});
