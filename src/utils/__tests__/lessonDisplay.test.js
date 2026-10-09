import test from 'node:test';
import assert from 'node:assert/strict';

import {
  getBookedGroupParticipants,
  getLessonMoments,
  getLessonParticipants
} from '../lessonDisplay.js';

test('getBookedGroupParticipants excludes pending group players from filled spots', () => {
  const lesson = {
    player_limit: 8,
    group_players: [
      {
        player_id: 1,
        full_name: 'Pending One',
        payment_status: 0,
        payment_method: null,
        status: 0
      },
      {
        player_id: 2,
        full_name: 'Confirmed One',
        payment_status: 1,
        payment_method: 'stripe',
        status: 1
      },
      {
        player_id: 3,
        full_name: 'Pending Two',
        payment_status: 0,
        payment_method: null,
        status: 0
      },
      {
        player_id: 4,
        full_name: 'Pay On Court',
        payment_status: 0,
        payment_method: 'pay_on_court',
        status: 1
      }
    ]
  };

  assert.deepEqual(
    getBookedGroupParticipants(lesson).map((player) => player.name),
    ['Confirmed One', 'Pay On Court']
  );
  assert.equal(getLessonParticipants(lesson).length, 4);
});

test('getLessonMoments reads a Z-stamped start as the court wall clock, with or without the _tz copy', () => {
  const summary = getLessonMoments({
    start_date_time: '2026-10-09T09:00:00.000Z',
    end_date_time: '2026-10-09T10:30:00.000Z'
  });
  assert.equal(summary.start.format('YYYY-MM-DD HH:mm'), '2026-10-09 09:00');
  assert.equal(summary.end.format('HH:mm'), '10:30');

  // The detail endpoint also sends the _tz columns, which are copies of the same wall clock.
  const detail = getLessonMoments({
    start_date_time: '2026-10-09T09:00:00.000Z',
    end_date_time: '2026-10-09T10:30:00.000Z',
    start_date_time_tz: '2026-10-09T09:00:00.000Z',
    end_date_time_tz: '2026-10-09T10:30:00.000Z'
  });
  assert.equal(detail.start.format('YYYY-MM-DD HH:mm'), '2026-10-09 09:00');
  assert.equal(detail.end.format('HH:mm'), '10:30');
});
