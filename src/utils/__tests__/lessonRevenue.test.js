import test from 'node:test';
import assert from 'node:assert/strict';
import { getExpectedGroupRevenue } from '../lessonRevenue.js';

test('expected group revenue excludes comped participants while capacity counts them separately', () => {
  const participants = [
    { holdsSpot: true, paymentMethod: 'card' },
    { holdsSpot: true, paymentMethod: 'comped' },
    { holdsSpot: true, paymentMethod: 'pay_on_court' },
    { holdsSpot: false, paymentMethod: 'card' }
  ];

  assert.deepEqual(getExpectedGroupRevenue({ pricePerPerson: 30, participants }), {
    participantCount: 2,
    expectedRevenue: 60
  });
});
