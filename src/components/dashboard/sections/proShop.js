import { isCoachPurchase } from './restringingOrderPayload.js';

// The Pro Shop: what a coach orders from the shop for their players (restrings and new
// rackets, which earn them a commission) and for themselves (supplies, at coach price).
// All three are restringing orders underneath; these helpers tell them apart.

export const PRO_SHOP_PATH = '/pro-shop';
export const PRO_SHOP_TABS = ['restring', 'racket', 'supplies'];
export const DEFAULT_PRO_SHOP_TAB = 'restring';

/** The tab named by "?tab=", or the default for anything else. */
export const parseProShopTab = (search = '') => {
  const tab = new URLSearchParams(search).get('tab');
  return PRO_SHOP_TABS.includes(tab) ? tab : DEFAULT_PRO_SHOP_TAB;
};

export const proShopSearch = tab => `?tab=${PRO_SHOP_TABS.includes(tab) ? tab : DEFAULT_PRO_SHOP_TAB}`;

/** "supplies" for the coach's own purchase, "racket" for a racket sale, else "restring". */
export const proShopOrderType = order => {
  if (isCoachPurchase(order)) return 'supplies';
  if (Number(order?.racket_sale_count || 0) > 0) return 'racket';
  return 'restring';
};

const fulfillment = order => String(order?.fulfillment_status || '').toLowerCase();

export const isAwaitingDropOff = order => ['awaiting_drop_off', 'awaiting_dropoff'].includes(fulfillment(order));
export const isReadyForPickup = order => fulfillment(order) === 'ready_for_pickup';

const CLOSED = new Set(['cancelled', 'picked_up', 'fulfilled']);
export const isOpenOrder = order => !CLOSED.has(fulfillment(order));

export const isAwaitingPayment = order =>
  isOpenOrder(order) && String(order?.payment_status || '').toLowerCase() === 'unpaid';

export const PRO_SHOP_FILTERS = [
  { key: 'all', label: 'All', matches: () => true },
  { key: 'awaiting_drop_off', label: 'Awaiting drop-off', matches: isAwaitingDropOff },
  { key: 'ready', label: 'Ready', matches: isReadyForPickup }
];

export const filterProShopOrders = (orders = [], filterKey = 'all') => {
  const filter = PRO_SHOP_FILTERS.find(entry => entry.key === filterKey) || PRO_SHOP_FILTERS[0];
  return orders.filter(filter.matches);
};

/** The counts the Today page's Pro Shop section shows. */
export const proShopSummary = (orders = []) => {
  const summary = {
    openSupplies: 0,
    openRackets: 0,
    restringAwaitingDropOff: 0,
    restringReady: 0,
    awaitingDropOff: 0,
    ready: 0,
    awaitingPayment: 0,
    playerOrders: 0
  };
  orders.forEach(order => {
    const type = proShopOrderType(order);
    if (type !== 'supplies') summary.playerOrders += 1;
    if (type === 'supplies' && isOpenOrder(order)) summary.openSupplies += 1;
    if (type === 'racket' && isOpenOrder(order)) summary.openRackets += 1;
    if (type === 'restring' && isAwaitingDropOff(order)) summary.restringAwaitingDropOff += 1;
    if (type === 'restring' && isReadyForPickup(order)) summary.restringReady += 1;
    if (isAwaitingDropOff(order)) summary.awaitingDropOff += 1;
    if (isReadyForPickup(order)) summary.ready += 1;
    if (isAwaitingPayment(order)) summary.awaitingPayment += 1;
  });
  return summary;
};
