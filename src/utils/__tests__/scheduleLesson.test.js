import test from 'node:test';
import assert from 'node:assert/strict';
import { findRosterCapableLesson } from '../scheduleLesson.js';

test('findRosterCapableLesson uses an upcoming group row when the current-day refresh is incomplete', () => {
  const lesson = findRosterCapableLesson({
    lessons: [{ id: 42 }],
    upcomingLessons: [
      {
        id: 42,
        group_players: [{ player_id: 9, payment_method: 'comped' }]
      }
    ]
  }, 42);

  assert.deepEqual(lesson, {
    id: 42,
    group_players: [{ player_id: 9, payment_method: 'comped' }]
  });
});
