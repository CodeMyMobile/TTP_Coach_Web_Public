import test from 'node:test';
import assert from 'node:assert/strict';
import {
  filterProShopOrders,
  parseProShopTab,
  proShopOrderType,
  proShopSearch,
  proShopSummary
} from './proShop.js';
import { normalizeRestringingEarnings } from './restringingOrderPayload.js';

const order = (id, extra = {}) => ({ id, fulfillment_status: 'pending', payment_status: 'unpaid', ...extra });

test('the tab comes from ?tab=, and anything else is the restring tab', () => {
  assert.equal(parseProShopTab('?tab=racket'), 'racket');
  assert.equal(parseProShopTab('?tab=supplies&x=1'), 'supplies');
  assert.equal(parseProShopTab('?tab=nope'), 'restring');
  assert.equal(parseProShopTab(''), 'restring');
  assert.equal(proShopSearch('racket'), '?tab=racket');
  assert.equal(proShopSearch('nope'), '?tab=restring');
});

test('orders are supplies, racket sales or restrings', () => {
  assert.equal(proShopOrderType(order(1, { is_coach_purchase: true, racket_sale_count: 1 })), 'supplies');
  assert.equal(proShopOrderType(order(2, { racket_sale_count: 1 })), 'racket');
  assert.equal(proShopOrderType(order(3)), 'restring');
});

test('the summary counts open orders by type and status', () => {
  const orders = [
    order(1, { fulfillment_status: 'awaiting_drop_off' }),
    order(2, { fulfillment_status: 'ready_for_pickup', payment_status: 'paid' }),
    order(3, { racket_sale_count: 1 }),
    order(4, { racket_sale_count: 1, fulfillment_status: 'picked_up', payment_status: 'paid' }),
    order(5, { is_coach_purchase: true }),
    order(6, { is_coach_purchase: true, fulfillment_status: 'cancelled' })
  ];
  assert.deepEqual(proShopSummary(orders), {
    openSupplies: 1,
    openRackets: 1,
    restringAwaitingDropOff: 1,
    restringReady: 1,
    awaitingDropOff: 1,
    ready: 1,
    // 1, 3 and 5 are unpaid and open; 6 is cancelled.
    awaitingPayment: 3,
    playerOrders: 4
  });
});

test('the order filters', () => {
  const orders = [order(1, { fulfillment_status: 'awaiting_dropoff' }), order(2, { fulfillment_status: 'ready_for_pickup' }), order(3)];
  assert.deepEqual(filterProShopOrders(orders, 'all').map(o => o.id), [1, 2, 3]);
  assert.deepEqual(filterProShopOrders(orders, 'awaiting_drop_off').map(o => o.id), [1]);
  assert.deepEqual(filterProShopOrders(orders, 'ready').map(o => o.id), [2]);
});

test('earnings read the API response as it comes, wrapped in "earnings"', () => {
  const totals = { total_commission_cents: 1250, pending_commission_cents: 300 };
  assert.deepEqual(normalizeRestringingEarnings({ earnings: totals }), { earned_cents: 1250, pending_cents: 300 });
  assert.deepEqual(normalizeRestringingEarnings(totals), { earned_cents: 1250, pending_cents: 300 });
  assert.deepEqual(normalizeRestringingEarnings(null), { earned_cents: 0, pending_cents: 0 });
});
