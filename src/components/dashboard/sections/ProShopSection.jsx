import React, { useEffect, useMemo, useRef, useState } from 'react';
import { CircleDot, ExternalLink, Hand, Loader2, Package, ShoppingBag, XCircle } from 'lucide-react';
import CoachSuppliesModal from '../../modals/CoachSuppliesModal';
import PlayerOrderForm from './PlayerOrderForm';
import {
  cancelCoachRestringingOrder,
  getCoachRestringingCatalog,
  getCoachRestringingEarnings,
  getCoachRestringingOrders,
  getCoachRestringingPlayers
} from '../../../services/coach';
import {
  coachCommissionStatusText,
  normalizeRestringingEarnings,
  racketSaleSummary,
  vendorImageUrl
} from './restringingOrderPayload';
import {
  filterProShopOrders,
  PRO_SHOP_FILTERS,
  PRO_SHOP_TABS,
  proShopOrderType
} from './proShop';

const money = cents =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(
    Number(cents || 0) / 100
  );

const TAB_LABELS = { restring: 'Restring', racket: 'Racket', supplies: 'Supplies' };

// The same accent per type as the Today page's Pro Shop cards.
const TYPE_TAGS = {
  restring: { label: 'Restring', className: 'bg-[#E3F5F1] text-[#0F766E]', Icon: CircleDot },
  racket: { label: 'Racket', className: 'bg-[#FFF1DC] text-[#B45309]', Icon: Package },
  supplies: { label: 'Supplies', className: 'bg-[#F3EEFF] text-[#6D28D9]', Icon: ShoppingBag }
};

const statusLabel = order => String(order.fulfillment_status || '').replaceAll('_', ' ');

// Restring, racket sale and coach supplies orders from the shop, in one place. Each tab is
// the form that already made that kind of order; `tab` comes from "?tab=" in the URL.
const ProShopSection = ({ tab = 'restring', onTabChange = () => {} }) => {
  const [data, setData] = useState({ catalog: null, players: [], orders: [], earnings: null });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [cancellingOrderId, setCancellingOrderId] = useState(null);
  const [filter, setFilter] = useState('all');
  const tabRefs = useRef({});

  const load = async ({ quiet = false } = {}) => {
    if (!quiet) setLoading(true);
    setError('');
    try {
      const [catalog, players, orders, earnings] = await Promise.all([
        getCoachRestringingCatalog(),
        getCoachRestringingPlayers(),
        getCoachRestringingOrders(),
        getCoachRestringingEarnings()
      ]);
      setData({
        catalog,
        players: players.players || players || [],
        orders: orders.orders || orders || [],
        earnings
      });
    } catch (err) {
      setError(err.message || 'Unable to load the Pro Shop.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const earnings = normalizeRestringingEarnings(data.earnings);
  // Player sales are what the coach earns on; their own supplies are listed but not counted.
  const playerOrderCount = data.orders.filter(order => proShopOrderType(order) !== 'supplies').length;
  const visibleOrders = useMemo(() => filterProShopOrders(data.orders, filter), [data.orders, filter]);
  const vendorImage = vendorImageUrl(data.catalog);
  const vendorName = data.catalog?.vendor?.name || 'The Tennis Garage';

  const cancelOrder = async orderId => {
    setCancellingOrderId(orderId);
    setError('');
    try {
      await cancelCoachRestringingOrder(orderId);
      await load({ quiet: true });
    } catch (err) {
      setError(err.message || 'Unable to cancel order.');
    } finally {
      setCancellingOrderId(null);
    }
  };

  // Arrow keys move between tabs, as a tablist should.
  const onTabKeyDown = event => {
    const index = PRO_SHOP_TABS.indexOf(tab);
    let next = null;
    if (event.key === 'ArrowRight') next = PRO_SHOP_TABS[(index + 1) % PRO_SHOP_TABS.length];
    if (event.key === 'ArrowLeft') next = PRO_SHOP_TABS[(index - 1 + PRO_SHOP_TABS.length) % PRO_SHOP_TABS.length];
    if (event.key === 'Home') next = PRO_SHOP_TABS[0];
    if (event.key === 'End') next = PRO_SHOP_TABS[PRO_SHOP_TABS.length - 1];
    if (!next) return;
    event.preventDefault();
    onTabChange(next);
    tabRefs.current[next]?.focus();
  };

  return (
    <section className="mt-6 space-y-5">
      <header className="flex items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">Pro Shop</h2>
          <p className="text-sm text-gray-600">Restrings, rackets and supplies from {vendorName}.</p>
        </div>
        {vendorImage && (
          <img src={vendorImage} alt={`${vendorName} logo`} className="h-10 w-10 shrink-0 rounded-xl object-cover" />
        )}
      </header>

      {error && <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}

      <div className="grid grid-cols-3 divide-x divide-gray-100 rounded-2xl border border-gray-200 bg-white">
        {[
          { label: 'Earned', value: money(earnings.earned_cents) },
          { label: 'Awaiting payment', value: money(earnings.pending_cents) },
          { label: 'Orders', value: playerOrderCount }
        ].map(cell => (
          <div key={cell.label} className="p-4">
            <p className="text-lg font-semibold tabular-nums text-gray-900 sm:text-2xl">{loading ? '–' : cell.value}</p>
            <p className="text-xs text-gray-600">{cell.label}</p>
          </div>
        ))}
      </div>

      <div
        role="tablist"
        aria-label="Pro Shop"
        className="grid grid-cols-3 gap-1 rounded-xl border border-gray-200 bg-gray-50 p-1"
      >
        {PRO_SHOP_TABS.map(key => {
          const selected = key === tab;
          return (
            <button
              key={key}
              ref={element => {
                tabRefs.current[key] = element;
              }}
              type="button"
              role="tab"
              id={`pro-shop-tab-${key}`}
              aria-selected={selected}
              aria-controls={selected ? `pro-shop-panel-${key}` : undefined}
              tabIndex={selected ? 0 : -1}
              onClick={() => onTabChange(key)}
              onKeyDown={onTabKeyDown}
              className={`min-h-[44px] rounded-lg px-3 text-sm font-semibold transition focus:outline-none focus-visible:ring-2 focus-visible:ring-purple-500 ${
                selected ? 'bg-white text-purple-700 shadow-sm' : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              {TAB_LABELS[key]}
            </button>
          );
        })}
      </div>

      <div role="tabpanel" id={`pro-shop-panel-${tab}`} aria-labelledby={`pro-shop-tab-${tab}`}>
        {tab === 'supplies' ? (
          <CoachSuppliesModal inline onOrdered={() => load({ quiet: true })} />
        ) : loading ? (
          <div className="rounded-2xl border border-gray-200 bg-white p-8 text-center text-sm text-gray-600">
            <Loader2 className="mx-auto mb-2 h-5 w-5 animate-spin text-purple-600" />
            Loading...
          </div>
        ) : (
          <PlayerOrderForm
            catalog={data.catalog}
            players={data.players}
            orderKind={tab}
            onCreated={() => load({ quiet: true })}
          />
        )}
      </div>

      <div className="rounded-2xl border border-gray-200 bg-white p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h3 className="text-base font-semibold text-gray-900">All orders</h3>
          <div className="flex flex-wrap gap-2" role="group" aria-label="Filter orders">
            {PRO_SHOP_FILTERS.map(entry => (
              <button
                key={entry.key}
                type="button"
                aria-pressed={filter === entry.key}
                onClick={() => setFilter(entry.key)}
                className={`min-h-[44px] rounded-full border px-4 text-sm font-medium ${
                  filter === entry.key
                    ? 'border-purple-600 bg-purple-600 text-white'
                    : 'border-gray-200 bg-white text-gray-700 hover:border-purple-200'
                }`}
              >
                {entry.label}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-4 space-y-3">
          {loading ? null : visibleOrders.length ? (
            visibleOrders.map(order => {
              const type = proShopOrderType(order);
              const tag = TYPE_TAGS[type];
              const supplies = type === 'supplies';
              return (
                <div
                  key={order.id}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-gray-100 p-4"
                >
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold ${tag.className}`}>
                        <tag.Icon className="h-3 w-3" aria-hidden="true" />
                        {tag.label}
                      </span>
                      <p className="font-medium text-gray-900">
                        {supplies ? 'Your supplies' : order.player_name || order.display_name || 'Player'}{' '}
                        <span className="text-xs font-normal text-gray-600">#{order.id}</span>
                      </p>
                    </div>
                    <p className="mt-1 text-sm text-gray-600">
                      {supplies
                        ? money(order.total_cents)
                        : racketSaleSummary(order) || (
                            <>
                              {Number(order.item_count || order.items?.length || 1)} racket{Number(order.item_count || order.items?.length || 1) === 1 ? '' : 's'} ·{' '}
                              {order.service_tier_name || order.items?.[0]?.service_tier_name || 'Restringing'}
                            </>
                          )}{' '}
                      · {statusLabel(order)}
                    </p>
                    {!supplies && order.contact_party === 'coach' && (
                      <p className="mt-1 inline-flex items-center gap-1 rounded-full bg-purple-50 px-2 py-0.5 text-xs font-medium text-purple-700">
                        <Hand className="h-3 w-3" aria-hidden="true" />
                        You drop off and collect
                      </p>
                    )}
                  </div>
                  <div className="text-right">
                    {!supplies && (
                      <p className="text-sm font-semibold text-emerald-800">{coachCommissionStatusText(order)}</p>
                    )}
                    <p className="text-xs text-gray-600">{order.payment_status}</p>
                    <div className="mt-1 flex justify-end gap-3">
                      {supplies && order.payment_link_url && order.payment_status !== 'paid' && (
                        <a
                          href={order.payment_link_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex min-h-[44px] items-center gap-1 text-xs font-semibold text-purple-700"
                        >
                          Pay <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
                        </a>
                      )}
                      {order.fulfillment_status === 'pending' && order.payment_status === 'unpaid' && (
                        <button
                          type="button"
                          disabled={cancellingOrderId === order.id}
                          onClick={() => cancelOrder(order.id)}
                          className="inline-flex min-h-[44px] items-center gap-1 text-xs font-medium text-red-700 disabled:opacity-60"
                        >
                          <XCircle className="h-3.5 w-3.5" aria-hidden="true" />
                          {cancellingOrderId === order.id ? 'Cancelling...' : 'Cancel order'}
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          ) : (
            <p className="py-5 text-center text-sm text-gray-600">
              {filter === 'all' ? 'No orders yet.' : 'No orders here.'}
            </p>
          )}
        </div>
      </div>
    </section>
  );
};

export default ProShopSection;
