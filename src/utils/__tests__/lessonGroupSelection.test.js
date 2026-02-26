import test from 'node:test';
import assert from 'node:assert/strict';
import {
  getUniqueSelectedPlayerIds,
  validatePrivateLessonSelection
} from '../lessonGroupSelection.js';

test('getUniqueSelectedPlayerIds dedupes manual and group-derived players', () => {
  const groups = [
    { id: 11, player_ids: [1, 2, 3] },
    { id: 12, players: [{ player_id: 3 }, { id: 4 }] }
  ];

  const result = getUniqueSelectedPlayerIds({
    playerIds: [2, 5],
    groupIds: [11, 12],
    groups
  });

  assert.deepEqual(result, [2, 5, 1, 3, 4]);
});

test('validatePrivateLessonSelection enforces exactly one resolved player', () => {
  const groups = [{ id: 21, player_ids: [9] }, { id: 22, player_ids: [9, 10] }];

  const valid = validatePrivateLessonSelection({
    playerIds: [],
    groupIds: [21],
    groups,
    invitees: []
  });
  assert.equal(valid.isValid, true);
  assert.equal(valid.total, 1);

  const invalid = validatePrivateLessonSelection({
    playerIds: [],
    groupIds: [22],
    groups,
    invitees: []
  });
  assert.equal(invalid.isValid, false);
  assert.equal(invalid.total, 2);
});
