import React, { useEffect, useState } from 'react';
import { ExternalLink, Loader2, Minus, Plus, XCircle } from 'lucide-react';
import { Modal, ModalHeader, ModalBody, ModalFooter } from './Modal';
import {
  cancelCoachRestringingOrder,
  createCoachRestringingOrder,
  getCoachRestringingCatalog,
  getCoachRestringingOrders
} from '../../services/coach';
import {
  addOnUnitCents,
  buildCoachSelfPurchasePayload,
  estimateCoachPurchase,
  isCoachPurchase,
  newRestringingOrderItem,
  serviceTierRequiresOwnString
} from '../dashboard/sections/restringingOrderPayload';
import {
  RacketInput,
  ServiceSelect,
  StringSelection,
  TensionInput
} from '../dashboard/sections/RestringingSection';

const money = cents =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(
    Number(cents || 0) / 100
  );

const statusText = order => {
  if (order.fulfillment_status === 'cancelled') return 'Cancelled';
  if (order.payment_status !== 'paid') return 'Waiting for payment';
  if (order.fulfillment_status === 'ready_for_pickup') return 'Ready for pickup';
  if (order.fulfillment_status === 'picked_up' || order.fulfillment_status === 'fulfilled') return 'Picked up';
  if (order.fulfillment_status === 'pending') return 'Paid · drop off your rackets';
  return 'With the stringer';
};

// A coach buying restrings and the shop's goods for themselves, at the shop's
// coach discount. The order goes to the shop like any other; the coach pays on
// the pay link page, which opens in a new tab.
const CoachSuppliesModal = ({ isOpen, onClose }) => {
  const [catalog, setCatalog] = useState(null);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [rackets, setRackets] = useState([]);
  const [quantities, setQuantities] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [placed, setPlaced] = useState(null);
  const [cancellingOrderId, setCancellingOrderId] = useState(null);

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const [catalogResponse, ordersResponse] = await Promise.all([
        getCoachRestringingCatalog(),
        getCoachRestringingOrders()
      ]);
      setCatalog(catalogResponse);
      setOrders((ordersResponse?.orders || ordersResponse || []).filter(isCoachPurchase));
    } catch (err) {
      setError(err.message || 'Unable to load coach supplies.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!isOpen) return;
    setPlaced(null);
    load();
  }, [isOpen]);

  const tiers = catalog?.service_tiers || catalog?.tiers || [];
  const strings = catalog?.catalog || catalog?.strings || [];
  const addOns = catalog?.add_ons || [];
  const vendorId = catalog?.vendor?.id || catalog?.vendor_id || 1;
  const vendorName = catalog?.vendor?.name || 'The Tennis Garage';
  const coachDiscountPct = Number(catalog?.coach_discount_pct || 0);
  const estimate = estimateCoachPurchase({ rackets, tiers, addOns, quantities, coachDiscountPct });
  const hasSelection = rackets.length > 0 || addOns.some(offer => Number(quantities[offer.id] || 0) > 0);

  const updateRacket = (index, patch) =>
    setRackets(current => current.map((racket, i) => (i === index ? { ...racket, ...patch } : racket)));
  const updateServiceTier = (index, service_tier_id) => {
    const tier = tiers.find(entry => String(entry.id) === String(service_tier_id));
    updateRacket(index, {
      service_tier_id,
      own_string_text: '',
      string_id: '',
      gauge: '',
      string_selection: serviceTierRequiresOwnString(tier) ? 'player_supplied' : 'shop_choice'
    });
  };
  const setQty = (offerId, next) =>
    setQuantities(current => ({ ...current, [offerId]: Math.min(Math.max(0, next), 99) }));

  const submit = async event => {
    event.preventDefault();
    if (!hasSelection) return;
    // Opened now, while the tap still counts, so the browser doesn't block it;
    // pointed at the pay link once the order exists.
    const payWindow = window.open('', '_blank');
    setSubmitting(true);
    setError('');
    try {
      const result = await createCoachRestringingOrder(
        buildCoachSelfPurchasePayload({ rackets, addOns, quantities, vendorId })
      );
      const url = result?.paymentLink?.url || null;
      if (payWindow) {
        if (url) payWindow.location.href = url;
        else payWindow.close();
      }
      setPlaced({ order: result?.order, url });
      setRackets([]);
      setQuantities({});
      await load();
    } catch (err) {
      payWindow?.close();
      setError(err.message || 'Unable to place your order.');
    } finally {
      setSubmitting(false);
    }
  };

  const cancelOrder = async orderId => {
    setCancellingOrderId(orderId);
    setError('');
    try {
      await cancelCoachRestringingOrder(orderId);
      await load();
    } catch (err) {
      setError(err.message || 'Unable to cancel order.');
    } finally {
      setCancellingOrderId(null);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} placement="bottom" panelClassName="sm:max-w-2xl">
      <ModalHeader
        title="Coach supplies"
        description={
          coachDiscountPct > 0
            ? `Restrings and gear from ${vendorName}, ${coachDiscountPct}% off for coaches`
            : `Restrings and gear from ${vendorName}`
        }
        onClose={onClose}
      />
      <form onSubmit={submit}>
        <ModalBody className="space-y-5">
          {error && <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}

          {placed && (
            <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">
              <p className="font-semibold">Order #{placed.order?.id} placed with {vendorName}.</p>
              {placed.url ? (
                <p className="mt-1">
                  Checkout opened in a new tab.{' '}
                  <a href={placed.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 font-semibold underline">
                    Pay now <ExternalLink className="h-3.5 w-3.5" />
                  </a>
                </p>
              ) : (
                <p className="mt-1">Nothing to pay.</p>
              )}
            </div>
          )}

          {loading && !catalog ? (
            <p className="py-6 text-center text-sm text-gray-500">
              <Loader2 className="mx-auto mb-2 h-5 w-5 animate-spin text-purple-600" />
              Loading...
            </p>
          ) : (
            <>
              <section>
                <h4 className="text-sm font-semibold text-gray-900">Restrings</h4>
                <div className="mt-2 space-y-3">
                  {rackets.map((racket, index) => {
                    const tier = tiers.find(entry => String(entry.id) === String(racket.service_tier_id));
                    const ownStringRequired = serviceTierRequiresOwnString(tier);
                    const stocked = strings.filter(string => !tier?.string_category || string.category === tier.string_category);
                    const selectedString = stocked.find(string => String(string.id) === String(racket.string_id));
                    return (
                      <fieldset key={index} className="rounded-xl border border-gray-200 p-4">
                        <div className="flex items-center justify-between gap-3">
                          <legend className="font-semibold text-gray-900">Racket {index + 1}</legend>
                          <button
                            type="button"
                            onClick={() => setRackets(current => current.filter((_, i) => i !== index))}
                            className="text-sm font-medium text-red-600"
                          >
                            Remove
                          </button>
                        </div>
                        <div className="mt-3 grid gap-3 md:grid-cols-2">
                          <ServiceSelect tiers={tiers} value={racket.service_tier_id} onChange={value => updateServiceTier(index, value)} />
                          <RacketInput value={racket.racket_make_model} onChange={patch => updateRacket(index, patch)} />
                        </div>
                        {ownStringRequired && (
                          <div className="mt-3">
                            <label className="block text-sm font-medium text-gray-700">Your string</label>
                            <input
                              required
                              value={racket.own_string_text}
                              onChange={event => updateRacket(index, { own_string_text: event.target.value })}
                              placeholder="e.g. Solinco Hyper-G 16L"
                              className="mt-1 w-full rounded-lg border border-gray-200 p-3 text-sm"
                            />
                          </div>
                        )}
                        {!ownStringRequired && tier?.string_composition && (
                          <div className="mt-3 rounded-lg border border-violet-100 bg-violet-50 p-3 text-sm text-violet-800">
                            <span className="font-medium">String: Shop&apos;s choice.</span> This service includes a shop-selected composition.
                          </div>
                        )}
                        {!ownStringRequired && !tier?.string_composition && tier && (
                          <StringSelection
                            value={racket.string_selection}
                            strings={stocked}
                            selectedString={selectedString}
                            gauge={racket.gauge}
                            onChange={patch => updateRacket(index, patch)}
                          />
                        )}
                        <TensionInput item={racket} onChange={patch => updateRacket(index, patch)} />
                        <label className="mt-3 flex items-center gap-2 text-sm text-gray-600">
                          <input
                            type="checkbox"
                            checked={racket.advice_requested}
                            onChange={event => updateRacket(index, { advice_requested: event.target.checked })}
                          />
                          Let the stringer advise you at drop-off
                        </label>
                        <label className="mt-3 block text-sm font-medium text-gray-700">
                          Note for the shop
                          <textarea
                            value={racket.notes}
                            onChange={event => updateRacket(index, { notes: event.target.value })}
                            className="mt-1 w-full rounded-lg border border-gray-200 p-3 text-sm"
                            rows={2}
                          />
                        </label>
                      </fieldset>
                    );
                  })}
                </div>
                <button
                  type="button"
                  onClick={() => setRackets(current => [...current, newRestringingOrderItem()])}
                  className="mt-3 inline-flex items-center gap-2 rounded-lg border border-purple-200 px-4 py-2 text-sm font-semibold text-purple-700"
                >
                  <Plus className="h-4 w-4" /> {rackets.length ? 'Add another racket' : 'Add a racket'}
                </button>
              </section>

              {addOns.length > 0 && (
                <section>
                  <h4 className="text-sm font-semibold text-gray-900">From the shop</h4>
                  <div className="mt-2 space-y-2">
                    {addOns.map(offer => {
                      const qty = Number(quantities[offer.id] || 0);
                      return (
                        <div key={offer.id} className="flex items-center justify-between gap-3 rounded-xl border border-gray-200 p-3">
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-gray-900">{offer.name}</p>
                            {offer.description && <p className="text-xs text-gray-500">{offer.description}</p>}
                            <p className="text-xs text-gray-500">
                              {money(addOnUnitCents(offer, rackets.length > 0))}
                              {offer.coaches_only
                                ? ' coach price'
                                : rackets.length > 0 && Number(offer.regular_price_cents) > Number(offer.bundle_price_cents)
                                  ? ' with a restring'
                                  : ''}
                            </p>
                          </div>
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => setQty(offer.id, qty - 1)}
                              disabled={qty === 0}
                              aria-label={`Fewer ${offer.name}`}
                              className="flex h-8 w-8 items-center justify-center rounded-full border border-gray-200 text-gray-600 transition hover:bg-gray-50 disabled:opacity-40"
                            >
                              <Minus className="h-4 w-4" />
                            </button>
                            <span className="w-6 text-center text-sm font-semibold text-gray-900">{qty}</span>
                            <button
                              type="button"
                              onClick={() => setQty(offer.id, qty + 1)}
                              aria-label={`More ${offer.name}`}
                              className="flex h-8 w-8 items-center justify-center rounded-full border border-purple-200 text-purple-700 transition hover:bg-purple-50"
                            >
                              <Plus className="h-4 w-4" />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </section>
              )}

              {hasSelection && (
                <section className="space-y-1 rounded-xl bg-gray-50 p-4 text-sm">
                  <div className="flex justify-between text-gray-600">
                    <span>Subtotal</span>
                    <span>{money(estimate.subtotalCents)}</span>
                  </div>
                  {estimate.discountCents > 0 && (
                    <div className="flex justify-between text-emerald-700">
                      <span>Coach discount ({estimate.pct}%)</span>
                      <span>-{money(estimate.discountCents)}</span>
                    </div>
                  )}
                  <div className="flex justify-between font-semibold text-gray-900">
                    <span>Total</span>
                    <span>{money(estimate.totalBeforeTaxCents)}</span>
                  </div>
                  <p className="text-xs text-gray-500">
                    Plus sales tax on strings and goods, added at checkout. Drop off and pick up at {vendorName}.
                  </p>
                </section>
              )}

              {orders.length > 0 && (
                <section>
                  <h4 className="text-sm font-semibold text-gray-900">Your purchases</h4>
                  <div className="mt-2 space-y-2">
                    {orders.slice(0, 5).map(order => (
                      <div key={order.id} className="flex items-center justify-between gap-3 rounded-xl border border-gray-100 p-3 text-sm">
                        <div>
                          <p className="font-medium text-gray-900">
                            #{order.id} · {money(order.total_cents)}
                          </p>
                          <p className="text-xs text-gray-500">{statusText(order)}</p>
                        </div>
                        <div className="flex items-center gap-3">
                        {order.payment_link_url && (
                          <a
                            href={order.payment_link_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-xs font-semibold text-purple-700"
                          >
                            Pay <ExternalLink className="h-3.5 w-3.5" />
                          </a>
                        )}
                        {order.fulfillment_status === 'pending' && order.payment_status === 'unpaid' && (
                          <button
                            type="button"
                            disabled={cancellingOrderId === order.id}
                            onClick={() => cancelOrder(order.id)}
                            className="inline-flex items-center gap-1 text-xs font-medium text-red-600 disabled:opacity-60"
                          >
                            <XCircle className="h-3.5 w-3.5" />
                            {cancellingOrderId === order.id ? 'Cancelling...' : 'Cancel'}
                          </button>
                        )}
                        </div>
                      </div>
                    ))}
                  </div>
                </section>
              )}
            </>
          )}
        </ModalBody>
        <ModalFooter>
          <button
            type="submit"
            disabled={!hasSelection || submitting || !catalog}
            className="w-full rounded-lg bg-purple-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-purple-700 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
          >
            {submitting ? 'Placing order...' : 'Order & pay'}
          </button>
        </ModalFooter>
      </form>
    </Modal>
  );
};

export default CoachSuppliesModal;
