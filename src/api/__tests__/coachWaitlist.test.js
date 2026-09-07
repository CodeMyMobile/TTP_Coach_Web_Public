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
const { default: LessonDetailCard } = await vite.ssrLoadModule('/src/components/dashboard/LessonDetailCard.jsx');
const {
  createCoachLessonWaitlistController,
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
  let promotionRequest;
  const promoteWaitlistPlayer = async (request) => {
    promotionRequest = request;
    events.push('promote');
    return { ok: true };
  };
  const detail = await runCoachWaitlistAction({
    action: () =>
      promoteWaitlistPlayer({
        lessonId: 77,
        playerId: 501,
        paymentMethod: getWaitlistPromotionPaymentMethod('comped')
      }),
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
  assert.deepEqual(promotionRequest, { lessonId: 77, playerId: 501, paymentMethod: 'comped' });
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

test('selection controller ignores a stale lesson detail response after another lesson opens', async () => {
  const deferredDetails = new Map();
  let selectedLesson;
  const controller = createCoachLessonWaitlistController({
    fetchLessonDetail: ({ lessonId }) =>
      new Promise((resolve) => {
        deferredDetails.set(lessonId, resolve);
      }),
    updateSelectedLesson: (nextLesson) => {
      selectedLesson = typeof nextLesson === 'function' ? nextLesson(selectedLesson) : nextLesson;
    },
    removePlayerFromLessonWaitlist: async () => ({ ok: true }),
    addPlayerToLesson: async () => ({ ok: true })
  });

  const firstSelection = controller.select({ id: 77, title: 'Lesson A' });
  const secondSelection = controller.select({ id: 88, title: 'Lesson B' });

  deferredDetails.get(88)({ id: 88, waitlist_count: 1, waitlist: [{ full_name: 'Lesson B Waiter' }] });
  await secondSelection;
  deferredDetails.get(77)({ id: 77, waitlist_count: 1, waitlist: [{ full_name: 'Lesson A Waiter' }] });
  await firstSelection;

  assert.equal(selectedLesson.id, 88);
  assert.deepEqual(selectedLesson.waitlist.map((waiter) => waiter.full_name), ['Lesson B Waiter']);
});

test('waitlist controller does not merge an action response after the coach opens another lesson', async () => {
  const detailRequests = [];
  let selectedLesson;
  let promotionRequest;
  let scheduleRefreshes = 0;
  let resolvePromotion;
  const controller = createCoachLessonWaitlistController({
    fetchLessonDetail: ({ lessonId }) =>
      new Promise((resolve) => {
        detailRequests.push({ lessonId, resolve });
      }),
    updateSelectedLesson: (nextLesson) => {
      selectedLesson = typeof nextLesson === 'function' ? nextLesson(selectedLesson) : nextLesson;
    },
    removePlayerFromLessonWaitlist: async () => ({ ok: true }),
    addPlayerToLesson: async (request) => {
      promotionRequest = request;
      return new Promise((resolve) => {
        resolvePromotion = resolve;
      });
    }
  });

  const selectA = controller.select({ id: 77, title: 'Lesson A' });
  detailRequests[0].resolve({ id: 77, waitlist_count: 1, waitlist: [{ full_name: 'Lesson A Waiter' }] });
  await selectA;

  const promoteA = controller.promoteWaitlistPlayer({
    coachAccessToken: 'coach-token',
    lessonId: 77,
    playerId: 501,
    paymentMethod: 'comped',
    refreshSchedule: async () => {
      scheduleRefreshes += 1;
    }
  });
  controller.adoptLesson({
    id: 88,
    title: 'Lesson B',
    waitlist_count: 1,
    waitlist: [{ full_name: 'Lesson B Waiter' }]
  });

  resolvePromotion({ ok: true });
  for (let microtask = 0; microtask < 4 && detailRequests.length < 2; microtask += 1) {
    await Promise.resolve();
  }
  detailRequests[1].resolve({ id: 77, waitlist_count: 0, waitlist: [] });
  await promoteA;

  assert.deepEqual(promotionRequest, {
    coachAccessToken: 'coach-token',
    lessonId: 77,
    playerId: 501,
    paymentMethod: 'comped'
  });
  assert.equal(selectedLesson.id, 88);
  assert.deepEqual(selectedLesson.waitlist.map((waiter) => waiter.full_name), ['Lesson B Waiter']);
  assert.equal(scheduleRefreshes, 1);
});

test('waitlist controller dispatches Remove and returns backend detail to the modal callback', async () => {
  let removalRequest;
  let scheduleRefreshed = false;
  const controller = createCoachLessonWaitlistController({
    fetchLessonDetail: async () => {
      throw new Error('detail fetch should not run after a failed remove');
    },
    updateSelectedLesson: () => {},
    removePlayerFromLessonWaitlist: async (request) => {
      removalRequest = request;
      return {
        ok: false,
        json: async () => ({ detail: 'Player is not on this waitlist.' })
      };
    },
    addPlayerToLesson: async () => ({ ok: true })
  });

  await assert.rejects(
    controller.removeWaitlistPlayer({
      coachAccessToken: 'coach-token',
      lessonId: 77,
      playerId: 501,
      refreshSchedule: async () => {
        scheduleRefreshed = true;
      }
    }),
    /Player is not on this waitlist\./
  );

  assert.deepEqual(removalRequest, { coachAccessToken: 'coach-token', lessonId: 77, playerId: 501 });
  assert.equal(scheduleRefreshed, false);
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

test('runCoachWaitlistAction dispatches the selected waiter to Remove before refreshing', async () => {
  let removalRequest;
  let scheduleRefreshed = false;
  const removeWaitlistPlayer = async (request) => {
    removalRequest = request;
    return { ok: true };
  };

  await runCoachWaitlistAction({
    action: () => removeWaitlistPlayer({ lessonId: 77, playerId: 501 }),
    fetchLessonDetail: async ({ lessonId }) => ({ id: lessonId, waitlist_count: 0, waitlist: [] }),
    lessonId: 77,
    updateSelectedLesson: () => {},
    refreshSchedule: async () => {
      scheduleRefreshed = true;
    },
    fallbackMessage: 'Unable to remove this player from the waitlist.'
  });

  assert.deepEqual(removalRequest, { lessonId: 77, playerId: 501 });
  assert.equal(scheduleRefreshed, true);
});

test('getWaitlistPromotionPaymentMethod preserves payment-link promotions and comped promotions', () => {
  assert.equal(getWaitlistPromotionPaymentMethod('payment_link'), undefined);
  assert.equal(getWaitlistPromotionPaymentMethod('comped'), 'comped');
});

test('group summary card displays waitlist count even without booked participants', () => {
  const markup = renderToStaticMarkup(React.createElement(LessonDetailCard, { lesson: {
    id: 77, lessontype_id: 3, player_limit: 4, group_players: [], waitlist_count: 2,
  } }));
  assert.match(markup, /2 waiting/);
});

test('initial detail selection exposes loading then an actionable roster error', async () => {
  let selectedLesson;
  let rejectDetail;
  const controller = createCoachLessonWaitlistController({
    fetchLessonDetail: () => new Promise((resolve, reject) => { rejectDetail = reject; }),
    updateSelectedLesson: update => { selectedLesson = typeof update === 'function' ? update(selectedLesson) : update; },
  });
  const pending = controller.select({ id: 77, lessontype_id: 3, player_limit: 4 });
  const render = () => renderToStaticMarkup(React.createElement(LessonDetailModal, {
    isOpen: true, lesson: selectedLesson, onClose() {}, onEditChange() {},
  }));
  assert.match(render(), /Loading participants and waitlist/);
  assert.doesNotMatch(render(), /No active participants yet/);
  rejectDetail(new Error('Network unavailable'));
  await assert.rejects(pending, /Network unavailable/);
  assert.match(render(), /Unable to load participants and waitlist/);
  assert.doesNotMatch(render(), /No active participants yet/);
});

test('regular comped add cannot merge an old lesson after selection changes', async () => {
  let selected;
  let finishAdd;
  const controller = createCoachLessonWaitlistController({
    fetchLessonDetail: async ({ lessonId }) => ({ id: lessonId, waitlist: [] }),
    addPlayerToLesson: () => new Promise(resolve => { finishAdd = resolve; }),
    updateSelectedLesson: update => { selected = typeof update === 'function' ? update(selected) : update; },
  });
  controller.adoptLesson({ id: 77 });
  const pending = controller.addCompedPlayer({ lessonId: 77, playerId: 501, refreshSchedule: async () => {} });
  controller.adoptLesson({ id: 88, waitlist: [{ player_id: 502 }] });
  finishAdd({ ok: true });
  await pending;
  assert.equal(selected.id, 88);
  assert.deepEqual(selected.waitlist, [{ player_id: 502 }]);
});
