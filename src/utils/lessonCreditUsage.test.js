import assert from 'node:assert/strict';
import test from 'node:test';

import { formatParticipantCreditLabel, mapCreditUsageByPlayer } from './lessonCreditUsage.js';

test('mapCreditUsageByPlayer keys each player to their own usage', () => {
  const usage = mapCreditUsageByPlayer([
    { player_id: 7, usage_status: 'confirmed', credits_total: 3, credits_used: 1, credits_remaining: 2 },
    { player_id: 9, usage_status: 'pending', credits_total: 3, credits_used: 0, credits_remaining: 3 }
  ]);

  assert.deepEqual(usage.get('7'), { isPending: false, creditsRemaining: 2, creditsTotal: 3 });
  assert.deepEqual(usage.get('9'), { isPending: true, creditsRemaining: 3, creditsTotal: 3 });
  assert.equal(usage.has('11'), false);
});

test('mapCreditUsageByPlayer ignores a restored credit and keeps the newest live one', () => {
  const cancelled = mapCreditUsageByPlayer([
    { player_id: 7, usage_status: 'restored', credits_total: 3, credits_used: 0 }
  ]);
  assert.equal(cancelled.has('7'), false);

  const rebooked = mapCreditUsageByPlayer([
    { player_id: 7, usage_status: 'confirmed', credits_total: 5, credits_used: 2 },
    { player_id: 7, usage_status: 'restored', credits_total: 3, credits_used: 0 },
    { player_id: 7, usage_status: 'confirmed', credits_total: 3, credits_used: 3 }
  ]);
  assert.deepEqual(rebooked.get('7'), { isPending: false, creditsRemaining: 3, creditsTotal: 5 });
});

test('mapCreditUsageByPlayer reads the status from usage metadata when it is not flattened', () => {
  const usage = mapCreditUsageByPlayer([
    { player_id: 7, usage_metadata: { status: 'restored' }, credits_total: 3, credits_used: 0 }
  ]);
  assert.equal(usage.has('7'), false);
});

test('formatParticipantCreditLabel says how the player booked and what is left', () => {
  assert.equal(formatParticipantCreditLabel(null), '');
  assert.equal(
    formatParticipantCreditLabel({ isPending: false, creditsRemaining: 2, creditsTotal: 3 }),
    'Booked with credit · 2 of 3 left'
  );
  assert.equal(
    formatParticipantCreditLabel({ isPending: true, creditsRemaining: 3, creditsTotal: 3 }),
    'Credit pending · 3 of 3 left'
  );
  assert.equal(
    formatParticipantCreditLabel({ isPending: false, creditsRemaining: null, creditsTotal: null }),
    'Booked with credit'
  );
});
