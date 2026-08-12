import test from 'node:test';
import assert from 'node:assert/strict';

import { splitParticipantsByBookingState } from '../participantSections.js';

test('splitParticipantsByBookingState keeps active players ahead of pending players', () => {
  const sections = splitParticipantsByBookingState([
    { name: 'Pending One', status: 'Pending', holdsSpot: false },
    { name: 'Booked One', status: 'Confirmed', holdsSpot: true },
    { name: 'Pending Two', status: 'Pending', holdsSpot: false },
    { name: 'Booked Two', status: 'Booked · pay on the day', holdsSpot: true }
  ]);

  assert.deepEqual(sections.active.map((player) => player.name), ['Booked One', 'Booked Two']);
  assert.deepEqual(sections.pending.map((player) => player.name), ['Pending One', 'Pending Two']);
  assert.deepEqual(sections.other, []);
});
