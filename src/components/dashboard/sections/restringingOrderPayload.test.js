import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildCoachRestringingOrderPayload,
  filterRosterPlayers,
  serviceTierRequiresOwnString
} from './restringingOrderPayload.js';

test('buildCoachRestringingOrderPayload sends new player details instead of a roster id', () => {
  const payload = buildCoachRestringingOrderPayload({
    form: {
      player_mode: 'new',
      new_player_name: 'Alex Lee',
      new_player_phone: '+1 512 555 0123',
      service_tier_id: '3',
      racket_make_model: 'Blade 98',
      advice_requested: true
    },
    vendorId: 1
  });

  assert.deepEqual(payload, {
    new_player: {
      display_name: 'Alex Lee',
      phone: '+1 512 555 0123'
    },
    vendor_id: 1,
    items: [
      {
        service_tier_id: 3,
        racket_make_model: 'Blade 98',
        advice_requested: true
      }
    ]
  });
  assert.equal('player_user_id' in payload, false);
});

test('buildCoachRestringingOrderPayload sends selected roster player id by default', () => {
  const payload = buildCoachRestringingOrderPayload({
    form: {
      player_mode: 'roster',
      player_user_id: '501',
      service_tier_id: '3',
      racket_make_model: 'Blade 98',
      advice_requested: false
    },
    vendorId: 1
  });

  assert.deepEqual(payload, {
    player_user_id: 501,
    vendor_id: 1,
    items: [
      {
        service_tier_id: 3,
        racket_make_model: 'Blade 98',
        advice_requested: false
      }
    ]
  });
  assert.equal('new_player' in payload, false);
});

test('buildCoachRestringingOrderPayload sends player supplied string text', () => {
  const payload = buildCoachRestringingOrderPayload({
    form: {
      player_mode: 'roster',
      player_user_id: '501',
      service_tier_id: '5',
      racket_make_model: 'Ezone 100',
      advice_requested: true,
      own_string_text: 'Solinco Hyper-G 16L'
    },
    vendorId: 1
  });

  assert.deepEqual(payload.items[0], {
    service_tier_id: 5,
    racket_make_model: 'Ezone 100',
    advice_requested: true,
    own_string_text: 'Solinco Hyper-G 16L'
  });
});

test('serviceTierRequiresOwnString detects player supplied string tiers', () => {
  assert.equal(
    serviceTierRequiresOwnString({ string_category: null, string_composition: null }),
    true
  );
  assert.equal(
    serviceTierRequiresOwnString({ string_category: 'std_poly', string_composition: null }),
    false
  );
  assert.equal(
    serviceTierRequiresOwnString({ string_category: null, string_composition: 'hybrid' }),
    false
  );
});

test('filterRosterPlayers matches roster entries by typed name or phone', () => {
  const players = [
    { player_user_id: 501, display_name: 'Alex Lee', phone: '+1 512 555 0123', status: 'invited' },
    { player_user_id: 502, display_name: 'Sarah Chen', phone: '+1 512 555 0456', status: 'linked' },
    { player_user_id: 503, display_name: 'Jordan Miles', phone: '+1 310 555 0123', status: 'linked' }
  ];

  assert.deepEqual(
    filterRosterPlayers(players, 'sarah').map(player => player.player_user_id),
    [502]
  );
  assert.deepEqual(
    filterRosterPlayers(players, '310').map(player => player.player_user_id),
    [503]
  );
  assert.deepEqual(
    filterRosterPlayers(players, '').map(player => player.player_user_id),
    [501, 502, 503]
  );
});
