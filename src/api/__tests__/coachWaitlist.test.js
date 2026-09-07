import test from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'vite';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

const originalFetch = global.fetch;
const vite = await createServer({
  configFile: false,
  server: { middlewareMode: true }
});
const { addPlayerToLesson, removePlayerFromLessonWaitlist } = await vite.ssrLoadModule('/src/api/coach.js');
const { default: LessonDetailModal } = await vite.ssrLoadModule('/src/components/modals/LessonDetailModal.jsx');
const {
  getWaitlistPromotionPaymentMethod,
  loadCoachLessonDetail,
  runCoachWaitlistAction
} = await vite.ssrLoadModule('/src/utils/waitlistActions.js');

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

test('LessonDetailModal renders ordered waiter details after pending participants', () => {
  const markup = renderToStaticMarkup(
    React.createElement(LessonDetailModal, {
      isOpen: true,
      lesson: {
        id: 77,
        lessontype_id: 3,
        player_limit: 4,
        group_players: [
          { player_id: 12, full_name: 'Booked Player', status: 'Confirmed' },
          { player_id: 13, full_name: 'Pending Player', status: 'Pending' }
        ],
        waitlist_count: 2,
        waitlist: [
          { id: 1, player_id: 501, full_name: 'First Waiter', created_at: '2026-09-08T09:00:00.000Z' },
          { id: 2, player_id: 502, full_name: 'Second Waiter', created_at: '2026-09-08T10:00:00.000Z' }
        ]
      },
      onClose: () => {},
      onEditChange: () => {},
      onRemoveWaitlistPlayer: () => {},
      onPromoteWaitlistPlayer: () => {}
    })
  );

  assert.match(markup, /Waitlist \(2\)/);
  assert.ok(markup.indexOf('First Waiter') < markup.indexOf('Second Waiter'));
  assert.match(markup, /Sep 8, 2026/);
  assert.ok(markup.indexOf('Pending players (1)') < markup.indexOf('Waitlist (2)'));
});

test('runCoachWaitlistAction refreshes detail and schedule after a successful promotion', async () => {
  const events = [];
  let mergedLesson;
  const detail = await runCoachWaitlistAction({
    action: async () => {
      events.push('promote');
      return { ok: true };
    },
    fetchLessonDetail: async ({ lessonId }) => {
      events.push(`detail:${lessonId}`);
      return {
        id: lessonId,
        waitlist_count: 1,
        waitlist: [{ player_id: 502, full_name: 'Second Waiter', created_at: '2026-09-08T10:00:00.000Z' }]
      };
    },
    lessonId: 77,
    updateSelectedLesson: (updater) => {
      events.push('selected');
      mergedLesson = updater({ id: 77, startTime: '10:00 am' });
    },
    refreshSchedule: async () => {
      events.push('schedule');
    },
    fallbackMessage: 'Unable to promote this player from the waitlist.'
  });

  assert.deepEqual(events, ['promote', 'detail:77', 'selected', 'schedule']);
  assert.equal(detail.waitlist_count, 1);
  assert.equal(mergedLesson.startTime, '10:00 am');
  assert.deepEqual(mergedLesson.waitlist.map((waiter) => waiter.full_name), ['Second Waiter']);
});

test('loadCoachLessonDetail merges waitlist data into the selected schedule summary', async () => {
  let mergedLesson;

  await loadCoachLessonDetail({
    lessonId: 77,
    fetchLessonDetail: async ({ lessonId }) => ({
      id: lessonId,
      waitlist_count: 1,
      waitlist: [{ player_id: 501, full_name: 'First Waiter', created_at: '2026-09-08T09:00:00.000Z' }]
    }),
    updateSelectedLesson: (updater) => {
      mergedLesson = updater({ id: 77, startTime: '10:00 am' });
    }
  });

  assert.equal(mergedLesson.startTime, '10:00 am');
  assert.equal(mergedLesson.waitlist_count, 1);
  assert.deepEqual(mergedLesson.waitlist.map((waiter) => waiter.full_name), ['First Waiter']);
});

test('runCoachWaitlistAction surfaces server detail without refreshing after a failed remove', async () => {
  let fetchedDetail = false;
  let refreshedSchedule = false;

  await assert.rejects(
    runCoachWaitlistAction({
      action: async () => ({
        ok: false,
        json: async () => ({ detail: 'Player is not on this waitlist.' })
      }),
      fetchLessonDetail: async () => {
        fetchedDetail = true;
      },
      lessonId: 77,
      updateSelectedLesson: () => {},
      refreshSchedule: async () => {
        refreshedSchedule = true;
      },
      fallbackMessage: 'Unable to remove this player from the waitlist.'
    }),
    /Player is not on this waitlist\./
  );

  assert.equal(fetchedDetail, false);
  assert.equal(refreshedSchedule, false);
});

test('getWaitlistPromotionPaymentMethod preserves payment-link promotions and comped promotions', () => {
  assert.equal(getWaitlistPromotionPaymentMethod('payment_link'), undefined);
  assert.equal(getWaitlistPromotionPaymentMethod('comped'), 'comped');
});
