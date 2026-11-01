import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildCoachRestringingOrderPayload,
  estimateRacketCommission,
  initialRestringingForm,
  newRacketSaleItem,
  racketSaleReady,
  racketSaleSummary,
  racketSpecSummary,
  stringOnlyCents
} from './restringingOrderPayload.js';

const whiteout = {
  id: 5,
  brand: 'Solinco',
  name: 'Whiteout 305',
  specs: { head_size_sq_in: '98', unstrung_weight_g: '305', string_pattern: '18x20' },
  grip_sizes: ['4 1/4', '4 3/8'],
  price_cents: 24900,
  estimated_commission_cents: 4540
};
const tiers = [
  { id: 1, name: 'Labor only', price_cents: 2500, string_category: null },
  { id: 2, name: 'Premium polyester', price_cents: 4500, string_category: 'prem_poly' },
  { id: 3, name: 'Hybrid', price_cents: 6000, string_category: null, string_composition: 'poly_multi_hybrid' }
];

test('a string job with a new racket costs the string only', () => {
  assert.equal(stringOnlyCents(tiers[1], tiers), 2000);
  assert.equal(stringOnlyCents(tiers[2], tiers), 3500);
  assert.equal(stringOnlyCents(tiers[0], tiers), 0);
  assert.equal(stringOnlyCents(tiers[1], [tiers[1]]), 4500);
});

test('a racket order sends each racket, then its string job for that racket', () => {
  const form = {
    ...initialRestringingForm,
    order_kind: 'racket',
    player_user_id: '501',
    rackets: [
      { ...newRacketSaleItem(), racket_product_id: '5', grip_size: '4 3/8' },
      { ...newRacketSaleItem(), racket_product_id: '5', grip_size: '4 1/4', with_string: true, service_tier_id: '2', advice_requested: false, tension_lbs: '52' }
    ]
  };

  const payload = buildCoachRestringingOrderPayload({ form, vendorId: 1, catalogRackets: [whiteout] });

  assert.deepEqual(payload.items, [
    { item_type: 'racket', racket_product_id: 5, grip_size: '4 3/8', item_qty: 1 },
    { item_type: 'racket', racket_product_id: 5, grip_size: '4 1/4', item_qty: 1 },
    {
      item_type: 'restring',
      service_tier_id: 2,
      racket_make_model: 'Solinco Whiteout 305',
      advice_requested: false,
      string_selection: 'shop_choice',
      tension_lbs_mains: 52,
      tension_lbs_crosses: 52
    }
  ]);
  assert.equal(payload.player_user_id, 501);
});

test('a restring order is unchanged', () => {
  const payload = buildCoachRestringingOrderPayload({
    form: { ...initialRestringingForm, player_user_id: '501', items: [{ ...initialRestringingForm.items[0], service_tier_id: '2', racket_make_model: 'Blade 98' }] },
    vendorId: 1
  });
  assert.equal(payload.items.length, 1);
  assert.equal(payload.items[0].item_type, undefined);
});

test('a racket order is ready once each racket has a grip, and a service if strung', () => {
  const ready = { ...newRacketSaleItem(), racket_product_id: '5', grip_size: '4 3/8' };
  assert.equal(racketSaleReady([ready]), true);
  assert.equal(racketSaleReady([{ ...ready, grip_size: '' }]), false);
  assert.equal(racketSaleReady([{ ...ready, with_string: true }]), false);
  assert.equal(racketSaleReady([{ ...ready, with_string: true, service_tier_id: '2' }]), true);
  assert.equal(racketSaleReady([]), false);
});

test('the estimate adds up the rackets chosen', () => {
  const rackets = [{ racket_product_id: '5' }, { racket_product_id: '5' }, { racket_product_id: '' }];
  assert.equal(estimateRacketCommission(rackets, [whiteout]), 9080);
});

test('racket orders are named on the order list', () => {
  assert.equal(
    racketSaleSummary({ racket_sale_count: 1, racket_sale_label: 'Solinco Whiteout 305 (grip 4 3/8)' }),
    '1 new racket · Solinco Whiteout 305 (grip 4 3/8)'
  );
  assert.equal(racketSaleSummary({ racket_sale_count: 0, service_tier_name: 'Full restring' }), null);
  assert.equal(racketSpecSummary(whiteout.specs), 'Head 98 · 305 g · 18x20');
});
