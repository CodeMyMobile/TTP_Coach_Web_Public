import test from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'vite';

const originalFetch = global.fetch;
const vite = await createServer({
  configFile: false,
  server: { middlewareMode: true }
});
const { addPlayerToLesson } = await vite.ssrLoadModule('/src/api/coach.js');
const { addPlayerInCoachLesson } = await vite.ssrLoadModule('/src/api/CoachApi/schedule.js');

test.after(() => {
  global.fetch = originalFetch;
  return vite.close();
});

test('addPlayerToLesson sends an explicit comped payment method', async () => {
  let request;
  global.fetch = async (url, options) => {
    request = { url, options };
    return { ok: true };
  };

  await addPlayerToLesson({
    coachAccessToken: 'coach-token',
    lessonId: 42,
    playerId: 9,
    paymentMethod: 'comped'
  });

  assert.match(request.url, /\/coach\/lessons\/42\/addplayer$/);
  assert.deepEqual(JSON.parse(request.options.body), {
    player_id: 9,
    payment_method: 'comped'
  });
});

test('addPlayerInCoachLesson sends an explicit comped payment method', async () => {
  let request;
  global.fetch = async (url, options) => {
    request = { url, options };
    return { ok: true };
  };

  await addPlayerInCoachLesson('coach-token', 9, 42, 'comped');

  assert.match(request.url, /\/coach\/lessons\/42\/addplayer$/);
  assert.deepEqual(JSON.parse(request.options.body), {
    player_id: 9,
    payment_method: 'comped'
  });
});
