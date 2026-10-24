import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildCoachRestringingOrderPayload,
  coachCommissionStatusText,
  initialRestringingForm,
  isTextablePhone,
  filterRosterPlayers,
  normalizeRestringingEarnings,
  vendorImageUrl,
  getRestringingOrderSummary,
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
    contact_party: 'player',
    commission_choice: 'keep',
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
    contact_party: 'player',
    commission_choice: 'keep',
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
    string_selection: 'player_supplied',
    own_string_text: 'Solinco Hyper-G 16L'
  });
});

test('buildCoachRestringingOrderPayload sends a specified stocked string', () => {
  const payload = buildCoachRestringingOrderPayload({
    form: {
      player_mode: 'roster', player_user_id: '501', service_tier_id: '3',
      racket_make_model: 'Blade 98', advice_requested: true,
      string_selection: 'specified', string_id: '8', gauge: '16L'
    },
    vendorId: 1
  });

  assert.deepEqual(payload.items[0], {
    service_tier_id: 3,
    racket_make_model: 'Blade 98',
    advice_requested: true,
    string_selection: 'specified',
    string_id: 8,
    gauge: '16L'
  });
});

test('buildCoachRestringingOrderPayload sends multiple rackets with vendor notes', () => {
  const payload = buildCoachRestringingOrderPayload({
    form: {
      player_mode: 'roster',
      player_user_id: '501',
      items: [
        {
          service_tier_id: '3',
          racket_make_model: 'Blade 98',
          advice_requested: false,
          string_selection: 'specified',
          string_id: '8',
          gauge: '16L',
          notes: 'Check grommets before restringing'
        },
        {
          service_tier_id: '5',
          racket_make_model: 'Ezone 100',
          advice_requested: true,
          string_selection: 'player_supplied',
          own_string_text: 'Hyper-G 16L',
          notes: 'Add stencil if possible'
        }
      ]
    },
    vendorId: 1
  });

  assert.deepEqual(payload.items, [
    {
      service_tier_id: 3,
      racket_make_model: 'Blade 98',
      advice_requested: false,
      string_selection: 'specified',
      string_id: 8,
      gauge: '16L',
      notes: 'Check grommets before restringing'
    },
    {
      service_tier_id: 5,
      racket_make_model: 'Ezone 100',
      advice_requested: true,
      string_selection: 'player_supplied',
      own_string_text: 'Hyper-G 16L',
      notes: 'Add stencil if possible'
    }
  ]);
});

test('buildCoachRestringingOrderPayload sends shop choice independently from advice', () => {
  const payload = buildCoachRestringingOrderPayload({
    form: {
      player_mode: 'roster', player_user_id: '501', service_tier_id: '3',
      racket_make_model: 'Blade 98', advice_requested: false,
      string_selection: 'shop_choice'
    },
    vendorId: 1
  });

  assert.equal(payload.items[0].string_selection, 'shop_choice');
  assert.equal('string_id' in payload.items[0], false);
});

test('buildCoachRestringingOrderPayload marks an order the coach drops off', () => {
  const payload = buildCoachRestringingOrderPayload({
    form: {
      player_mode: 'roster',
      player_user_id: '501',
      contact_party: 'coach',
      items: [{ service_tier_id: '3', racket_make_model: 'Blade 98', advice_requested: true }]
    },
    vendorId: 1
  });

  assert.equal(payload.contact_party, 'coach');
});

test('buildCoachRestringingOrderPayload falls back to the player as the contact', () => {
  const payload = buildCoachRestringingOrderPayload({
    form: {
      player_mode: 'roster',
      player_user_id: '501',
      contact_party: 'someone_else',
      items: [{ service_tier_id: '3', racket_make_model: 'Blade 98', advice_requested: true }]
    },
    vendorId: 1
  });

  assert.equal(payload.contact_party, 'player');
});

test('buildCoachRestringingOrderPayload sends a coach giving their commission to the player', () => {
  const payload = buildCoachRestringingOrderPayload({
    form: {
      player_mode: 'roster',
      player_user_id: '501',
      commission_choice: 'player',
      items: [{ service_tier_id: '3', racket_make_model: 'Blade 98', advice_requested: true }]
    },
    vendorId: 1
  });

  assert.equal(payload.commission_choice, 'player');
});

test('buildCoachRestringingOrderPayload keeps the commission unless the coach gives it away', () => {
  const payload = buildCoachRestringingOrderPayload({
    form: {
      player_mode: 'roster',
      player_user_id: '501',
      commission_choice: 'something_else',
      items: [{ service_tier_id: '3', racket_make_model: 'Blade 98', advice_requested: true }]
    },
    vendorId: 1
  });

  assert.equal(payload.commission_choice, 'keep');
});

test('initialRestringingForm starts with the coach keeping the commission', () => {
  assert.equal(initialRestringingForm.commission_choice, 'keep');
});

test('coachCommissionStatusText shows what the player saves when the coach gives the commission', () => {
  assert.equal(
    coachCommissionStatusText({ coach_commission_choice: 'player', coach_discount_cents: 450, payment_status: 'unpaid' }),
    'Player gets $4.50 off'
  );
  assert.equal(
    coachCommissionStatusText({ coach_commission_choice: 'player', coach_discount_cents: 450, payment_status: 'paid' }),
    'Player saved $4.50'
  );
});

test('initialRestringingForm starts with the player dropping off', () => {
  assert.equal(initialRestringingForm.contact_party, 'player');
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

test('coachCommissionStatusText distinguishes paid transfer state', () => {
  assert.equal(
    coachCommissionStatusText({
      payment_status: 'paid',
      coach_transfer_id: 'tr_coach',
      coach_commission_cents: 450
    }),
    'Earned $4.50'
  );
  assert.equal(
    coachCommissionStatusText({
      payment_status: 'paid',
      coach_transfer_id: null,
      coach_commission_cents: 450
    }),
    'Paid · transfer pending $4.50'
  );
  assert.equal(
    coachCommissionStatusText({
      payment_status: 'unpaid',
      coach_commission_cents: 450
    }),
    'You earn $4.50 when paid'
  );
});

test('getRestringingOrderSummary counts drop-offs and ready orders', () => {
  const summary = getRestringingOrderSummary([
    { fulfillment_status: 'awaiting_drop_off' },
    { fulfillment_status: 'awaiting_dropoff' },
    { fulfillment_status: 'ready_for_pickup' },
    { fulfillment_status: 'completed' }
  ]);

  assert.deepEqual(summary, {
    awaitingDropOff: 2,
    ready: 1
  });
});

test('filterRosterPlayers only returns matches after the coach types a query', () => {
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
    []
  );
});

test('normalizeRestringingEarnings reads the API commission total', () => {
  assert.deepEqual(
    normalizeRestringingEarnings({
      total_commission_cents: 1350,
      pending_commission_cents: 450
    }),
    { earned_cents: 1350, pending_cents: 450 }
  );
});

test('normalizeRestringingEarnings handles an unavailable earnings response', () => {
  assert.deepEqual(
    normalizeRestringingEarnings(null),
    { earned_cents: 0, pending_cents: 0 }
  );
});

test('vendorImageUrl returns the saved vendor profile image', () => {
  assert.equal(
    vendorImageUrl({ vendor: { image_url: 'https://images.example.test/tennis-garage.png' } }),
    'https://images.example.test/tennis-garage.png'
  );
  assert.equal(vendorImageUrl({ vendor: { image_url: '' } }), '');
});

test('isTextablePhone accepts numbers the pay link text can reach', () => {
  for (const phone of ['(310) 709-6545', '310.709.6545', '1 310 709 6545', '+1 310 709 6545', '+44 7911 123456']) {
    assert.equal(isTextablePhone(phone), true, phone);
  }
});

test('isTextablePhone rejects numbers the API would refuse as player_phone_invalid', () => {
  for (const phone of ['', '   ', '555 1234', '310 709 654', '+1 555 1234', '2 310 709 6545', '+12']) {
    assert.equal(isTextablePhone(phone), false, phone);
  }
});

const tensionForm = item => ({
  player_mode: 'roster',
  player_user_id: '7',
  items: [{ service_tier_id: '3', racket_make_model: 'Blade 98', ...item }]
});

test('buildCoachRestringingOrderPayload sends the coach-entered tension for mains and crosses', () => {
  const [item] = buildCoachRestringingOrderPayload({
    form: tensionForm({ advice_requested: false, tension_lbs: '52' }),
    vendorId: 1
  }).items;

  assert.equal(item.tension_lbs_mains, 52);
  assert.equal(item.tension_lbs_crosses, 52);
});

test('buildCoachRestringingOrderPayload sends a separate crosses tension when split', () => {
  const [item] = buildCoachRestringingOrderPayload({
    form: tensionForm({ advice_requested: false, tension_lbs: '55', split_tension: true, tension_lbs_crosses: '52.5' }),
    vendorId: 1
  }).items;

  assert.equal(item.tension_lbs_mains, 55);
  assert.equal(item.tension_lbs_crosses, 52.5);
});

test('buildCoachRestringingOrderPayload leaves tension to the stringer when advice is requested', () => {
  const [item] = buildCoachRestringingOrderPayload({
    form: tensionForm({ advice_requested: true, tension_lbs: '52' }),
    vendorId: 1
  }).items;

  assert.equal('tension_lbs_mains' in item, false);
  assert.equal('tension_lbs_crosses' in item, false);
});

test('buildCoachRestringingOrderPayload drops tension outside the 40-70 lbs range', () => {
  const [item] = buildCoachRestringingOrderPayload({
    form: tensionForm({ advice_requested: false, tension_lbs: '90' }),
    vendorId: 1
  }).items;

  assert.equal('tension_lbs_mains' in item, false);
});
