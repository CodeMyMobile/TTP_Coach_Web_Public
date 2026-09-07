import test from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'vite';

const originalFetch = global.fetch;
const vite = await createServer({
  configFile: false,
  server: { middlewareMode: true }
});
const { addPlayerToLesson, removePlayerFromLessonWaitlist } = await vite.ssrLoadModule('/src/api/coach.js');

test.after(() => {
  global.fetch = originalFetch;
  return vite.close();
});

test('removePlayerFromLessonWaitlist deletes the named waiter with coach authentication', async () => {
  let request;
  global.fetch = async (url, options) => {
    request = { url, options };
    return { ok: true };
  };

  await removePlayerFromLessonWaitlist({
    coachAccessToken: 'coach-token',
    lessonId: 77,
    playerId: 501
  });

  assert.match(request.url, /\/coach\/lessons\/77\/waitlist\/501$/);
  assert.equal(request.options.method, 'DELETE');
  assert.equal(request.options.headers.Authorization, 'token coach-token');
});

test('addPlayerToLesson omits payment method to preserve the payment-link invite flow', async () => {
  let request;
  global.fetch = async (url, options) => {
    request = { url, options };
    return { ok: true };
  };

  await addPlayerToLesson({
    coachAccessToken: 'coach-token',
    lessonId: 77,
    playerId: 501
  });

  assert.deepEqual(JSON.parse(request.options.body), { player_id: 501 });
});

test('addPlayerToLesson sends comped payment method for a free promotion', async () => {
  let request;
  global.fetch = async (url, options) => {
    request = { url, options };
    return { ok: true };
  };

  await addPlayerToLesson({
    coachAccessToken: 'coach-token',
    lessonId: 77,
    playerId: 501,
    paymentMethod: 'comped'
  });

  assert.deepEqual(JSON.parse(request.options.body), {
    player_id: 501,
    payment_method: 'comped'
  });
});
