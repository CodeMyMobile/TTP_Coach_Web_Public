import test from 'node:test';
import assert from 'node:assert/strict';
import { filterCompedPlayerOptions } from '../compedPlayerSearch.js';

const roster = [
  { id: 1, full_name: 'Sam Smith', email: 'sam@example.com' },
  { id: 2, full_name: 'Samantha Jones', email: 'sj@example.com' },
  { id: 3, full_name: 'Jordan Lee', email: 'jordan@example.com' }
];

test('filterCompedPlayerOptions ranks prefix name matches before partial and email matches', () => {
  assert.deepEqual(
    filterCompedPlayerOptions(roster, 'sam', new Set()).map((player) => player.id),
    [1, 2]
  );
});

test('filterCompedPlayerOptions excludes existing lesson players and matches email', () => {
  assert.deepEqual(
    filterCompedPlayerOptions(roster, 'jordan@example', new Set([1])).map((player) => player.id),
    [3]
  );
});
