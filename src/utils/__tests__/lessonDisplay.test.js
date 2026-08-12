import test from 'node:test';
import assert from 'node:assert/strict';

import {
  getBookedGroupParticipants,
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
