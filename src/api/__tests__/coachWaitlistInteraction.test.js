import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { act, create } from 'react-test-renderer';
import { createServer } from 'vite';

const vite = await createServer({ configFile: false, server: { middlewareMode: true, hmr: false } });
const { default: LessonDetailModal } = await vite.ssrLoadModule('/src/components/modals/LessonDetailModal.jsx');
const { createCoachLessonWaitlistController, createCoachLessonWaitlistCallbacks } =
  await vite.ssrLoadModule('/src/utils/waitlistActions.js');
const { addPlayerToLesson, removePlayerFromLessonWaitlist } = await vite.ssrLoadModule('/src/api/coach.js');
const { getCoachLessonById } = await vite.ssrLoadModule('/src/services/coach.js');
const originalFetch = global.fetch;
test.after(async () => { global.fetch = originalFetch; await vite.close(); });

const lesson = (id, playerId, name) => ({
  id, lessontype_id: 3, player_limit: 4, group_players: [], waitlist_count: 1,
  waitlist: [{ id: playerId, player_id: playerId, full_name: name, created_at: '2026-09-08T09:00:00.000Z' }]
});
const response = (body, status = 200) => new Response(JSON.stringify(body), {
  status, headers: { 'Content-Type': 'application/json' }
});
const deferred = () => {
  let resolve;
  const promise = new Promise((done) => { resolve = done; });
  return { promise, resolve };
};

// Only the network, native confirmation and schedule refresh are replaced. The
// modal buttons, App callback boundary, controller and HTTP wrappers are real.
const mount = async (initialLesson, events, confirmRemoval = () => true, refreshSchedule = async () => { events.push('schedule'); }) => {
  let renderer;
  let selectedLesson = initialLesson;
  const render = () => React.createElement(LessonDetailModal, {
    isOpen: true, lesson: selectedLesson, onClose: () => {}, onEditChange: () => {},
    ...createCoachLessonWaitlistCallbacks({
      controller, selectedLesson, coachAccessToken: 'coach-token', confirmRemoval,
      refreshSchedule
    })
  });
  const controller = createCoachLessonWaitlistController({
    fetchLessonDetail: getCoachLessonById, addPlayerToLesson, removePlayerFromLessonWaitlist,
    updateSelectedLesson: (update) => {
      selectedLesson = typeof update === 'function' ? update(selectedLesson) : update;
      if (renderer) renderer.update(render());
    }
  });
  controller.adoptLesson(initialLesson);
  await act(async () => { renderer = create(render()); });
  return {
    renderer,
    select: async (nextLesson) => { await act(async () => { controller.adoptLesson(nextLesson); }); },
    button: (label) => renderer.root.findAllByType('button').find((node) => node.children.includes(label)),
    payment: () => renderer.root.findByProps({ id: 'waitlist-promotion-payment-method' }),
    alerts: () => renderer.root.findAllByProps({ role: 'alert' }).map((node) => node.children.join(''))
  };
};

test('a pending mutation disables waitlist actions for every row', async (t) => {
  const pending = deferred();
  global.fetch = async (url, options) => options.method === 'DELETE' ? pending.promise : response([]);
  const initial = lesson(77, 501, 'First Waiter');
  initial.waitlist.push({ id: 502, player_id: 502, full_name: 'Second Waiter' });
  initial.waitlist_count = 2;
  const ui = await mount(initial, []);
  t.after(() => act(() => ui.renderer.unmount()));
  let action;
  act(() => { action = ui.button('Remove').props.onClick(); });
  const actionButtons = ui.renderer.root.findAllByType('button').filter(node => ['Remove', 'Promote', 'Working...'].some(label => node.children.includes(label)));
  assert.equal(actionButtons.length, 4);
  assert.ok(actionButtons.every(node => node.props.disabled));
  await act(async () => { pending.resolve(response({ detail: 'Rejected' }, 409)); await action; });
});

test('changing lessons resets promotion choice to payment link', async (t) => {
  global.fetch = async () => response([]);
  const ui = await mount(lesson(77, 501, 'First Waiter'), []);
  t.after(() => act(() => ui.renderer.unmount()));
  await act(async () => { ui.payment().props.onChange({ target: { value: 'comped' } }); });
  await ui.select(lesson(88, 502, 'Second Waiter'));
  assert.equal(ui.payment().props.value, 'payment_link');
});

for (const action of ['Remove', 'Promote']) {
  for (const failure of ['detail', 'schedule']) {
    test(`successful ${action} reports success with warning after ${failure} refresh failure`, async (t) => {
      const events = [];
      global.fetch = async (url, options) => {
        const path = new URL(url, 'https://coach.test').pathname;
        if (options.method === 'DELETE' || path.endsWith('/addplayer')) {
          events.push('mutation'); return response({});
        }
        if (path.endsWith('/coach/lesson/77')) {
          events.push('detail');
          return failure === 'detail' ? response({ detail: 'Offline' }, 500) : response({ id: 77, waitlist_count: 0, waitlist: [] });
        }
        return response([]);
      };
      const ui = await mount(lesson(77, 501, 'First Waiter'), events, () => true, async () => {
        events.push('schedule');
        if (failure === 'schedule') throw new Error('Schedule offline');
      });
      t.after(() => act(() => ui.renderer.unmount()));
      await act(async () => { await ui.button(action).props.onClick(); });
      assert.deepEqual(ui.alerts(), []);
      assert.ok(events.includes('detail'));
      assert.ok(events.includes('schedule'));
      const messages = ui.renderer.root.findAllByProps({ role: 'status' }).map(node => node.children.join('')).join(' ');
      assert.match(messages, action === 'Remove' ? /removed/i : /promoted/i);
      assert.match(messages, /refresh/i);
      assert.equal(ui.button(action), undefined, 'successful action must no longer be offered for the stale row');
    });
  }
}

for (const payment of ['payment_link', 'comped']) {
  test(`modal Promote uses App callback and real HTTP wrapper for ${payment}`, async (t) => {
    const events = [];
    const requests = [];
    global.fetch = async (url, options) => {
      const path = new URL(url, 'https://coach.test').pathname;
      if (path.endsWith('/addplayer')) {
        requests.push({ path, ...options }); events.push('promote');
        return response({});
      }
      if (path.endsWith('/coach/lesson/77')) {
        events.push('detail');
        return response({ id: 77, waitlist_count: 0, waitlist: [] });
      }
      return response([]); // Package usage rendered by the modal.
    };
    const ui = await mount(lesson(77, 501, 'First Waiter'), events);
    t.after(() => act(() => ui.renderer.unmount()));
    await act(async () => { ui.payment().props.onChange({ target: { value: payment } }); });
    await act(async () => { await ui.button('Promote').props.onClick(); });
    assert.deepEqual(ui.alerts(), []);
    assert.equal(requests.length, 1);
    assert.match(requests[0].path, /\/coach\/lessons\/77\/addplayer$/);
    assert.equal(requests[0].headers.Authorization, 'token coach-token');
    assert.deepEqual(JSON.parse(requests[0].body), payment === 'comped'
      ? { player_id: 501, payment_method: 'comped' } : { player_id: 501 });
    assert.deepEqual(events, ['promote', 'detail', 'schedule']);
    assert.equal(ui.button('Promote'), undefined);
  });
}

test('modal Remove respects confirmation, then deletes and refreshes through App callbacks', async (t) => {
  const events = [];
  let confirmed = false;
  let confirmation;
  global.fetch = async (url, options) => {
    const path = new URL(url, 'https://coach.test').pathname;
    if (options.method === 'DELETE') {
      assert.match(path, /\/coach\/lessons\/77\/waitlist\/501$/);
      assert.equal(options.headers.Authorization, 'token coach-token');
      events.push('remove'); return response({});
    }
    if (path.endsWith('/coach/lesson/77')) {
      events.push('detail'); return response({ id: 77, waitlist_count: 0, waitlist: [] });
    }
    return response([]);
  };
  const ui = await mount(lesson(77, 501, 'First Waiter'), events, (message) => {
    confirmation = message; return confirmed;
  });
  t.after(() => act(() => ui.renderer.unmount()));
  await act(async () => { await ui.button('Remove').props.onClick(); });
  assert.match(confirmation, /First Waiter/);
  assert.deepEqual(events, []);
  const cancelledMessages = ui.renderer.root.findAllByProps({ role: 'status' }).map((node) => node.children.join(''));
  assert.ok(!cancelledMessages.some((message) => /removed from the waitlist/i.test(message)));
  confirmed = true;
  await act(async () => { await ui.button('Remove').props.onClick(); });
  assert.deepEqual(ui.alerts(), []);
  assert.deepEqual(events, ['remove', 'detail', 'schedule']);
  assert.equal(ui.button('Remove'), undefined);
});

for (const action of ['Remove', 'Promote']) {
  test(`late failed ${action} for A cannot set B error or clear B pending action`, async (t) => {
    const events = [];
    const actionA = deferred();
    const actionB = deferred();
    global.fetch = async (url, options) => {
      const path = new URL(url, 'https://coach.test').pathname;
      if (options.method === 'DELETE' || path.endsWith('/addplayer')) {
        events.push(path);
        return path.includes('/77/') ? actionA.promise : actionB.promise;
      }
      return response([]);
    };
    const ui = await mount(lesson(77, 501, 'Lesson A Waiter'), events);
    t.after(() => act(() => ui.renderer.unmount()));
    let pendingA;
    act(() => { pendingA = ui.button(action).props.onClick(); });
    await ui.select(lesson(88, 502, 'Lesson B Waiter'));
    assert.equal(ui.payment().props.disabled, false, 'B must not inherit A pending state');
    let pendingB;
    act(() => { pendingB = ui.button(action).props.onClick(); });
    assert.equal(events.length, 2, 'B action must reach the HTTP boundary');
    await act(async () => {
      actionA.resolve(response({ detail: 'Lesson A failure' }, 409));
      await pendingA;
    });
    assert.deepEqual(ui.alerts(), []);
    assert.equal(ui.payment().props.disabled, true, 'A finally must not clear B pending state');
    await act(async () => {
      actionB.resolve(response({ detail: 'Lesson B failure' }, 409));
      await pendingB;
    });
    assert.deepEqual(ui.alerts(), ['Lesson B failure']);
    assert.equal(ui.payment().props.disabled, false);
    assert.equal(events.includes('schedule'), false);
  });
}
