import React, { useEffect, useMemo, useState } from 'react';
import { CircleDot, Gift, Hand, Loader2, Maximize2, Package, Plus, Send, User, UserPlus, Users, Wallet, Wrench, X, XCircle } from 'lucide-react';
import {
  createCoachRestringingOrder,
  cancelCoachRestringingOrder,
  getCoachRestringingCatalog,
  getCoachRestringingEarnings,
  getCoachRestringingOrders,
  getCoachRestringingPlayers,
  getRestringingStringRecommendation,
  quoteCoachRacketOrder
} from '../../../services/coach';
import {
  buildCoachRestringingOrderPayload,
  coachCommissionStatusText,
  filterRosterPlayers,
  normalizeRestringingEarnings,
  playerLabel,
  serviceTierRequiresOwnString,
  serviceTierForCategory,
  serviceTierStringsText,
  STRING_QUIZ_QUESTIONS,
  stringQuizComplete,
  initialRestringingForm,
  isCoachPurchase,
  isTextablePhone,
  MAX_TENSION_LBS,
  MIN_TENSION_LBS,
  newRacketSaleItem,
  newRestringingOrderItem,
  estimateRacketCommission,
  racketName,
  racketSaleReady,
  racketSaleSummary,
  racketSpecSummary,
  stringOnlyCents,
  vendorImageUrl
} from './restringingOrderPayload';

const money = cents =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(
    Number(cents || 0) / 100
  );

const RestringingSection = () => {
  const [data, setData] = useState({
    catalog: null,
    players: [],
    orders: [],
    earnings: null
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [creating, setCreating] = useState(false);
  const [cancellingOrderId, setCancellingOrderId] = useState(null);
  const [form, setForm] = useState(initialRestringingForm);
  // Set once the coach leaves the phone field or tries to send, so the hint
  // doesn't appear while they're still typing.
  const [phoneChecked, setPhoneChecked] = useState(false);

  const load = async () => {
    setLoading(true);
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
      setError(err.message || 'Unable to load restringing.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const tiers = data.catalog?.service_tiers || data.catalog?.tiers || [];
  const catalogRackets = data.catalog?.rackets || [];
  const sellingRacket = form.order_kind === 'racket';
  const vendorImage = vendorImageUrl(data.catalog);
  const earnings = normalizeRestringingEarnings(data.earnings);
  // A coach's own purchases live under Coach supplies, not with their players' orders.
  const orderRows = useMemo(() => data.orders.filter(order => !isCoachPurchase(order)), [data.orders]);
  const filteredPlayers = useMemo(
    () => filterRosterPlayers(data.players, form.player_query),
    [data.players, form.player_query]
  );
  const selectedRosterPlayer = data.players.find(
    player => String(player.player_user_id || player.id) === String(form.player_user_id)
  );
  const coachDropOff = form.contact_party === 'coach';
  const commissionPct = Number(data.catalog?.commission?.pct ?? 10);
  const racketCommissionPct = Number(data.catalog?.racket_commission_pct ?? 50);
  const givingCommission = form.commission_choice === 'player';
  const racketEstimateCents = estimateRacketCommission(form.rackets, catalogRackets);
  const enabled =
    data.catalog?.eligible !== false && data.catalog?.can_create_restring_orders !== false;
  const vendorId = data.catalog?.vendor?.id || data.catalog?.vendor_id || 1;
  const [racketQuote, setRacketQuote] = useState(null);
  const [quoteError, setQuoteError] = useState('');
  const racketOrderReady = sellingRacket && racketSaleReady(form.rackets);
  // What the order comes to, as the API will price it: asked again whenever the
  // rackets, string jobs or commission choice change, once the order is complete.
  const quotePayload = racketOrderReady
    ? JSON.stringify(buildCoachRestringingOrderPayload({ form: { ...form, player_user_id: '0' }, vendorId, catalogRackets }))
    : '';
  useEffect(() => {
    if (!quotePayload) {
      setRacketQuote(null);
      setQuoteError('');
      return undefined;
    }
    let current = true;
    const timer = setTimeout(async () => {
      try {
        const { vendor_id, items, commission_choice } = JSON.parse(quotePayload);
        const response = await quoteCoachRacketOrder({ vendor_id, items, commission_choice });
        if (!current) return;
        setRacketQuote(response?.quote || null);
        setQuoteError('');
      } catch (err) {
        if (!current) return;
        setRacketQuote(null);
        setQuoteError(err.message || 'Unable to price this order.');
      }
    }, 300);
    return () => {
      current = false;
      clearTimeout(timer);
    };
  }, [quotePayload]);
  const newPlayerPhoneInvalid =
    form.player_mode === 'new' && !isTextablePhone(form.new_player_phone);

  const updateForm = patch => setForm(current => ({ ...current, ...patch }));
  const updateRacket = (index, patch) => {
    setForm(current => ({
      ...current,
      items: current.items.map((item, itemIndex) => itemIndex === index ? { ...item, ...patch } : item)
    }));
  };
  const updateServiceTier = (index, service_tier_id) => {
    const tier = tiers.find(entry => String(entry.id) === String(service_tier_id));
    updateRacket(index, {
      service_tier_id,
      own_string_text: '',
      string_id: '',
      gauge: '',
      string_selection: serviceTierRequiresOwnString(tier)
        ? 'player_supplied'
        : tier?.string_composition ? 'shop_choice' : 'shop_choice'
    });
  };
  const addRacket = () => setForm(current => ({
    ...current,
    items: [...current.items, newRestringingOrderItem()]
  }));
  const removeRacket = index => setForm(current => ({
    ...current,
    items: current.items.filter((_, itemIndex) => itemIndex !== index)
  }));
  const updateRacketSale = (index, patch) => setForm(current => ({
    ...current,
    rackets: current.rackets.map((item, itemIndex) => itemIndex === index ? { ...item, ...patch } : item)
  }));
  const updateRacketSaleTier = (index, service_tier_id) => {
    const tier = tiers.find(entry => String(entry.id) === String(service_tier_id));
    updateRacketSale(index, {
      service_tier_id,
      own_string_text: '',
      string_id: '',
      gauge: '',
      string_selection: serviceTierRequiresOwnString(tier) ? 'player_supplied' : 'shop_choice'
    });
  };

  const submit = async event => {
    event.preventDefault();
    if (newPlayerPhoneInvalid) {
      setPhoneChecked(true);
      return;
    }
    setCreating(true);
    setError('');

    try {
      await createCoachRestringingOrder(
        buildCoachRestringingOrderPayload({ form, vendorId, catalogRackets })
      );
      // Every order starts with the coach keeping their commission ("Keep it").
      setForm({ ...initialRestringingForm, order_kind: form.order_kind });
      setPhoneChecked(false);
      await load();
    } catch (err) {
      setError(err.message || 'Unable to send order.');
    } finally {
      setCreating(false);
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

  if (loading) {
    return (
      <section className="mt-6 rounded-2xl bg-white p-8 text-center text-sm text-gray-500">
        <Loader2 className="mx-auto mb-2 h-5 w-5 animate-spin text-purple-600" />
        Loading restringing...
      </section>
    );
  }

  return (
    <section className="mt-6 space-y-5">
      {error && <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}

      <div className="rounded-2xl bg-gradient-to-br from-violet-700 to-purple-600 p-4 text-white shadow-sm sm:p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold sm:text-2xl">Restringing</h2>
            <p className="mt-1 text-sm text-violet-100">
              Order from The Tennis Garage for your players.
            </p>
          </div>
          {vendorImage ? (
            <img
              src={vendorImage}
              alt={`${data.catalog?.vendor?.name || 'Vendor'} profile`}
              className="h-10 w-10 shrink-0 rounded-xl object-cover sm:h-12 sm:w-12"
            />
          ) : (
            <CircleDot className="h-7 w-7 shrink-0 sm:h-8 sm:w-8" />
          )}
        </div>

        <div className="mt-4 grid grid-cols-3 gap-3 sm:mt-5">
          <div>
            <p className="text-lg font-bold sm:text-2xl">
              {money(earnings.earned_cents)}
            </p>
            <p className="text-xs text-violet-100">Earned</p>
          </div>
          <div>
            <p className="text-lg font-bold sm:text-2xl">
              {money(earnings.pending_cents)}
            </p>
            <p className="text-xs text-violet-100">Awaiting payment</p>
          </div>
          <div>
            <p className="text-lg font-bold sm:text-2xl">{orderRows.length}</p>
            <p className="text-xs text-violet-100">Orders</p>
          </div>
        </div>
      </div>

      {enabled ? (
        <form onSubmit={submit} className="rounded-2xl bg-white p-5 shadow-sm">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-2">
                <Plus className="h-5 w-5 text-purple-600" />
                <h3 className="font-semibold text-gray-900">{sellingRacket ? 'New racket order' : 'New restring order'}</h3>
              </div>
              {catalogRackets.length > 0 && (
                <div className="inline-flex rounded-lg border border-gray-200 bg-gray-50 p-1 text-sm">
                  {[
                    { value: 'restring', label: 'Restring', Icon: Wrench },
                    { value: 'racket', label: 'New racket', Icon: Package }
                  ].map(({ value, label, Icon }) => (
                    <button
                      key={value}
                      type="button"
                      aria-pressed={form.order_kind === value}
                      onClick={() => updateForm({ order_kind: value })}
                      className={`inline-flex items-center gap-2 rounded-md px-3 py-2 font-medium ${
                        form.order_kind === value ? 'bg-white text-purple-700 shadow-sm' : 'text-gray-600'
                      }`}
                    >
                      <Icon className="h-4 w-4" />
                      {label}
                    </button>
                  ))}
                </div>
              )}
            </div>
            <div className="inline-flex rounded-lg border border-gray-200 bg-gray-50 p-1 text-sm">
              <button
                type="button"
                aria-pressed={form.player_mode === 'roster'}
                onClick={() =>
                  updateForm({
                    player_mode: 'roster',
                    new_player_name: '',
                    new_player_phone: ''
                  })
                }
                className={`inline-flex items-center gap-2 rounded-md px-3 py-2 font-medium ${
                  form.player_mode === 'roster'
                    ? 'bg-white text-purple-700 shadow-sm'
                    : 'text-gray-600'
                }`}
              >
                <Users className="h-4 w-4" />
                Roster
              </button>
              <button
                type="button"
                aria-pressed={form.player_mode === 'new'}
                onClick={() => {
                  updateForm({ player_mode: 'new', player_user_id: '' });
                  setPhoneChecked(false);
                }}
                className={`inline-flex items-center gap-2 rounded-md px-3 py-2 font-medium ${
                  form.player_mode === 'new'
                    ? 'bg-white text-purple-700 shadow-sm'
                    : 'text-gray-600'
                }`}
              >
                <UserPlus className="h-4 w-4" />
                New player
              </button>
            </div>
          </div>

          {form.player_mode === 'roster' ? (
            <div className="grid gap-3 md:grid-cols-3">
              <RosterPlayerPicker
                players={filteredPlayers}
                query={form.player_query}
                selectedPlayer={selectedRosterPlayer}
                onQueryChange={player_query => updateForm({ player_query, player_user_id: '' })}
                onSelect={player =>
                  updateForm({
                    player_user_id: String(player.player_user_id || player.id),
                    player_query: playerLabel(player)
                  })
                }
              />
            </div>
          ) : (
            <div className="grid gap-3 md:grid-cols-4">
              <input
                required
                value={form.new_player_name}
                onChange={event => updateForm({ new_player_name: event.target.value })}
                placeholder="Player name"
                className="rounded-lg border border-gray-200 p-3 text-sm"
              />
              <div>
                <input
                  required
                  type="tel"
                  value={form.new_player_phone}
                  onChange={event => updateForm({ new_player_phone: event.target.value })}
                  onBlur={() => setPhoneChecked(true)}
                  placeholder="Mobile number"
                  aria-invalid={phoneChecked && newPlayerPhoneInvalid}
                  aria-describedby={phoneChecked && newPlayerPhoneInvalid ? 'restring-phone-hint' : undefined}
                  className={`w-full rounded-lg border p-3 text-sm ${
                    phoneChecked && newPlayerPhoneInvalid ? 'border-red-400' : 'border-gray-200'
                  }`}
                />
                {phoneChecked && newPlayerPhoneInvalid && (
                  <p id="restring-phone-hint" className="mt-1 text-xs text-red-600">
                    Enter a 10-digit mobile number. The pay link is sent by text.
                  </p>
                )}
              </div>
            </div>
          )}

          {sellingRacket ? (
            <>
              <div className="mt-5 space-y-4">
                {form.rackets.map((item, index) => (
                  <RacketSaleFields
                    key={index}
                    index={index}
                    item={item}
                    rackets={catalogRackets}
                    tiers={tiers}
                    strings={data.catalog?.catalog || data.catalog?.strings || []}
                    removable={form.rackets.length > 1}
                    onChange={patch => updateRacketSale(index, patch)}
                    onTierChange={value => updateRacketSaleTier(index, value)}
                    onRemove={() => setForm(current => ({
                      ...current,
                      rackets: current.rackets.filter((_, itemIndex) => itemIndex !== index)
                    }))}
                  />
                ))}
              </div>
              <button type="button" onClick={() => setForm(current => ({ ...current, rackets: [...current.rackets, newRacketSaleItem()] }))} className="mt-4 inline-flex items-center gap-2 rounded-lg border border-purple-200 px-4 py-2 text-sm font-semibold text-purple-700">
                <Plus className="h-4 w-4" /> Add another racket
              </button>
              <RacketQuoteSummary quote={racketQuote} error={quoteError} ready={racketOrderReady} />
            </>
          ) : (
          <>
          <div className="mt-5 space-y-4">
            {form.items.map((item, index) => {
              const selectedServiceTier = tiers.find(tier => String(tier.id) === String(item.service_tier_id));
              const ownStringRequired = serviceTierRequiresOwnString(selectedServiceTier);
              const compositionTier = Boolean(selectedServiceTier?.string_composition);
              const stockedStrings = (data.catalog?.catalog || data.catalog?.strings || []).filter(string =>
                !selectedServiceTier?.string_category || string.category === selectedServiceTier.string_category
              );
              const selectedString = stockedStrings.find(string => String(string.id) === String(item.string_id));
              return (
                <fieldset key={index} className="rounded-xl border border-gray-200 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <legend className="font-semibold text-gray-900">Racket {index + 1}</legend>
                    {form.items.length > 1 && (
                      <button type="button" onClick={() => removeRacket(index)} className="text-sm font-medium text-red-600">
                        Remove
                      </button>
                    )}
                  </div>
                  <div className="mt-3 grid gap-3 md:grid-cols-2">
                    <ServiceSelect tiers={tiers} value={item.service_tier_id} onChange={value => updateServiceTier(index, value)} />
                    <RacketInput value={item.racket_make_model} onChange={patch => updateRacket(index, patch)} />
                  </div>
                  <ServiceTierStrings
                    tiers={tiers}
                    strings={data.catalog?.catalog || data.catalog?.strings || []}
                    selectedTier={selectedServiceTier}
                    onUseRecommendation={({ tierId, tensionLbs }) => {
                      updateServiceTier(index, String(tierId));
                      if (tensionLbs) updateRacket(index, { tension_lbs: String(tensionLbs), advice_requested: false });
                    }}
                  />

                  {ownStringRequired && (
                    <div className="mt-3">
                      <label className="block text-sm font-medium text-gray-700">Player&apos;s string</label>
                      <input required value={item.own_string_text} onChange={event => updateRacket(index, { own_string_text: event.target.value })} placeholder="e.g. Solinco Hyper-G 16L" className="mt-1 w-full rounded-lg border border-gray-200 p-3 text-sm" />
                    </div>
                  )}

                  {!ownStringRequired && compositionTier && (
                    <div className="mt-3 rounded-lg border border-violet-100 bg-violet-50 p-3 text-sm text-violet-800"><span className="font-medium">String: Shop&apos;s choice.</span> This service includes a shop-selected composition.</div>
                  )}

                  {!ownStringRequired && !compositionTier && selectedServiceTier && (
                    <StringSelection value={item.string_selection} strings={stockedStrings} selectedString={selectedString} gauge={item.gauge} onChange={patch => updateRacket(index, patch)} />
                  )}

                  <TensionInput item={item} onChange={patch => updateRacket(index, patch)} />

                  <label className="mt-3 flex items-center gap-2 text-sm text-gray-600">
                    <input type="checkbox" checked={item.advice_requested} onChange={event => updateRacket(index, { advice_requested: event.target.checked })} />
                    {coachDropOff
                      ? 'Let the stringer advise you at drop-off'
                      : 'Let the stringer advise at drop-off'}
                  </label>
                  <label className="mt-3 block text-sm font-medium text-gray-700">
                    Note for vendor
                    <textarea value={item.notes} onChange={event => updateRacket(index, { notes: event.target.value })} placeholder="e.g. Check grommets or add a stencil" className="mt-1 w-full rounded-lg border border-gray-200 p-3 text-sm" rows={2} />
                  </label>
                </fieldset>
              );
            })}
          </div>

          <button type="button" onClick={addRacket} className="mt-4 inline-flex items-center gap-2 rounded-lg border border-purple-200 px-4 py-2 text-sm font-semibold text-purple-700">
            <Plus className="h-4 w-4" /> Add another racket
          </button>
          </>
          )}

          <div className="mt-5">
            <p className="text-sm font-medium text-gray-700">{sellingRacket ? 'Who picks it up?' : 'Who brings the rackets in?'}</p>
            <div className="mt-2 inline-flex rounded-lg border border-gray-200 bg-gray-50 p-1 text-sm">
              {[
                { value: 'player', label: sellingRacket ? 'Player picks up' : 'Player drops off', Icon: User },
                { value: 'coach', label: sellingRacket ? 'I pick up' : 'I drop off', Icon: Hand }
              ].map(({ value, label, Icon }) => (
                <button
                  key={value}
                  type="button"
                  aria-pressed={form.contact_party === value}
                  onClick={() => updateForm({ contact_party: value })}
                  className={`inline-flex items-center gap-2 rounded-md px-3 py-2 font-medium ${
                    form.contact_party === value
                      ? 'bg-white text-purple-700 shadow-sm'
                      : 'text-gray-600'
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  {label}
                </button>
              ))}
            </div>
            <p className="mt-1 text-xs text-gray-500">
              {coachDropOff
                ? sellingRacket
                  ? 'The shop tells you when it is ready, and you collect it. The invoice still goes to your player.'
                  : 'The shop deals with you: drop-off, ready and pickup all come to you. The invoice still goes to your player.'
                : 'The shop deals with your player directly, invoice included.'}
            </p>
          </div>

          <div className="mt-5">
            <p className="text-sm font-medium text-gray-700">
              {sellingRacket ? `Your commission: ${racketCommissionPct}% of the profit` : `Your ${commissionPct}% commission`}
            </p>
            <div className="mt-2 inline-flex rounded-lg border border-gray-200 bg-gray-50 p-1 text-sm">
              {[
                { value: 'keep', label: 'Keep it', Icon: Wallet },
                { value: 'player', label: 'Give it to my player', Icon: Gift }
              ].map(({ value, label, Icon }) => (
                <button
                  key={value}
                  type="button"
                  aria-pressed={form.commission_choice === value}
                  onClick={() => updateForm({ commission_choice: value })}
                  className={`inline-flex items-center gap-2 rounded-md px-3 py-2 font-medium ${
                    form.commission_choice === value
                      ? 'bg-white text-purple-700 shadow-sm'
                      : 'text-gray-600'
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  {label}
                </button>
              ))}
            </div>
            <p className="mt-1 text-xs text-gray-500">
              {sellingRacket
                ? givingCommission
                  ? `Your player gets ${racketQuote ? money(racketQuote.coach_discount_cents) : `about ${money(racketEstimateCents)}`} off, and you earn nothing on it.`
                  : `You earn ${racketQuote ? money(racketQuote.coach_commission_cents) : `about ${money(racketEstimateCents)}`} when your player pays and picks up: ${racketCommissionPct}% of the profit after the racket's cost and the card fee.`
                : givingCommission
                  ? `Your player gets ${commissionPct}% off this order, and you earn nothing on it.`
                  : `You earn ${commissionPct}% of the order, before tax, when your player pays.`}
            </p>
          </div>

          <button
            disabled={
              creating ||
              (form.player_mode === 'roster' && !form.player_user_id) ||
              (sellingRacket && !racketSaleReady(form.rackets))
            }
            className="mt-4 inline-flex items-center gap-2 rounded-lg bg-purple-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
          >
            <Send className="h-4 w-4" />
            {creating ? 'Sending...' : 'Send order & pay link'}
          </button>
        </form>
      ) : (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
          Restringing is not enabled for this coach account yet.
        </div>
      )}

      <div className="rounded-2xl bg-white p-5 shadow-sm">
        <h3 className="font-semibold text-gray-900">Your orders</h3>
        <div className="mt-4 space-y-3">
          {orderRows.length ? (
            orderRows.map(order => (
              <div
                key={order.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-gray-100 p-4"
              >
                <div>
                  <p className="font-medium text-gray-900">
                    {order.player_name || order.display_name || 'Player'}{' '}
                    <span className="text-xs font-normal text-gray-500">#{order.id}</span>
                  </p>
                  <p className="text-sm text-gray-500">
                    {racketSaleSummary(order) || (
                      <>
                        {Number(order.item_count || order.items?.length || 1)} racket{Number(order.item_count || order.items?.length || 1) === 1 ? '' : 's'} ·{' '}
                        {order.service_tier_name || order.items?.[0]?.service_tier_name || 'Restringing'}
                      </>
                    )}{' '}·{' '}
                    {order.fulfillment_status?.replaceAll('_', ' ')}
                  </p>
                  {order.contact_party === 'coach' && (
                    <p className="mt-1 inline-flex items-center gap-1 rounded-full bg-purple-50 px-2 py-0.5 text-xs font-medium text-purple-700">
                      <Hand className="h-3 w-3" />
                      You drop off and collect
                    </p>
                  )}
                </div>
                <div className="text-right">
                  <p className="text-sm font-semibold text-emerald-700">
                    {coachCommissionStatusText(order)}
                  </p>
                  <p className="text-xs text-gray-500">{order.payment_status}</p>
                  {order.fulfillment_status === 'pending' && order.payment_status === 'unpaid' && (
                    <button
                      type="button"
                      disabled={cancellingOrderId === order.id}
                      onClick={() => cancelOrder(order.id)}
                      className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-red-600 disabled:opacity-60"
                    >
                      <XCircle className="h-3.5 w-3.5" />
                      {cancellingOrderId === order.id ? 'Cancelling...' : 'Cancel order'}
                    </button>
                  )}
                </div>
              </div>
            ))
          ) : (
            <p className="py-5 text-center text-sm text-gray-500">
              No restringing orders yet.
            </p>
          )}
        </div>
      </div>
    </section>
  );
};

const RosterPlayerPicker = ({
  players,
  query,
  selectedPlayer,
  onQueryChange,
  onSelect
}) => {
  // Suggestion popover, not a permanent list: it opens while the coach types and
  // closes on selection. Rendered unconditionally it covers the fields below it.
  const [isOpen, setIsOpen] = useState(false);
  const showSuggestions = isOpen && Boolean(String(query || '').trim());

  const selectPlayer = player => {
    onSelect(player);
    setIsOpen(false);
  };

  return (
    <div className="relative">
      <input
        value={query}
        onChange={event => {
          onQueryChange(event.target.value);
          setIsOpen(true);
        }}
        onFocus={() => setIsOpen(true)}
        onBlur={() => setIsOpen(false)}
        onKeyDown={event => {
          if (event.key === 'Escape') setIsOpen(false);
        }}
        role="combobox"
        aria-expanded={showSuggestions}
        aria-autocomplete="list"
        placeholder="Search roster player"
        className="w-full rounded-lg border border-gray-200 p-3 text-sm"
      />
      {showSuggestions && (
        <div
          role="listbox"
          className="absolute z-20 mt-1 max-h-56 w-full overflow-y-auto rounded-lg border border-gray-200 bg-white shadow-lg"
        >
          {players.length ? (
            players.slice(0, 8).map(player => {
              const playerId = player.player_user_id || player.id;
              const selected = String(selectedPlayer?.player_user_id || selectedPlayer?.id || '') === String(playerId);

              return (
                <button
                  key={playerId}
                  type="button"
                  role="option"
                  aria-selected={selected}
                  // Hold focus so onBlur does not close the list before the click lands.
                  onMouseDown={event => event.preventDefault()}
                  onClick={() => selectPlayer(player)}
                  className={`flex w-full items-center justify-between gap-3 px-3 py-2 text-left text-sm hover:bg-purple-50 ${
                    selected ? 'bg-purple-50 text-purple-800' : 'text-gray-800'
                  }`}
                >
                  <span className="font-medium">{playerLabel(player)}</span>
                  {player.status === 'invited' && (
                    <span className="text-xs text-gray-500">Invited</span>
                  )}
                </button>
              );
            })
          ) : (
            <p className="px-3 py-3 text-sm text-gray-500">No roster matches</p>
          )}
        </div>
      )}
    </div>
  );
};

// The order as the player will pay for it, from the API's quote: each line,
// sales tax, the total, and what the coach earns or gives away.
const RacketQuoteSummary = ({ quote, error, ready }) => {
  if (!ready) return null;
  if (error) return <p className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>;
  if (!quote) {
    return (
      <p className="mt-4 flex items-center gap-2 text-sm text-gray-500">
        <Loader2 className="h-4 w-4 animate-spin" /> Working out the total...
      </p>
    );
  }
  const row = (label, value, className = '') => (
    <div className={`flex justify-between gap-3 ${className}`}>
      <span>{label}</span>
      <span className="tabular-nums">{value}</span>
    </div>
  );
  return (
    <div className="mt-4 space-y-1.5 rounded-xl border border-gray-200 bg-gray-50 p-4 text-sm text-gray-700">
      <p className="mb-2 font-semibold text-gray-900">What your player pays</p>
      {quote.items.map((item, index) => (
        <React.Fragment key={index}>
          {row(
            item.item_type === 'racket'
              ? `${item.label}${item.item_qty > 1 ? ` × ${item.item_qty}` : ''}`
              : `String for ${item.racket_make_model}${item.labor_waived ? ' (labor free)' : ''}`,
            money(item.unit_price_cents * item.item_qty)
          )}
        </React.Fragment>
      ))}
      {quote.coach_discount_cents > 0 && row('Your commission, given to them', `-${money(quote.coach_discount_cents)}`, 'text-emerald-700')}
      {row('Sales tax', money(quote.tax_cents))}
      {row('Total', money(quote.total_cents), 'border-t border-gray-200 pt-2 text-base font-semibold text-gray-900')}
      {quote.commission_choice === 'player'
        ? row('You earn', money(0), 'pt-1 font-medium text-gray-500')
        : row('You earn', money(quote.coach_commission_cents), 'pt-1 font-semibold text-emerald-700')}
    </div>
  );
};

// The racket's photo filling the screen, so the coach can show it to a player.
const RacketPhotoViewer = ({ racket, onClose }) => {
  useEffect(() => {
    const onKey = event => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);
  const specs = racketSpecSummary(racket.specs);
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={racketName(racket)}
      onClick={onClose}
      className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black/90 p-4"
    >
      <button type="button" onClick={onClose} aria-label="Close photo" className="absolute right-4 top-4 rounded-full bg-white/10 p-2 text-white">
        <X className="h-6 w-6" />
      </button>
      <img
        src={racket.image_url}
        alt={racketName(racket)}
        onClick={event => event.stopPropagation()}
        className="max-h-[75vh] w-full max-w-xl rounded-2xl bg-white object-contain"
      />
      <div className="mt-4 text-center text-white">
        <p className="text-lg font-semibold">{racketName(racket)} · {money(racket.price_cents)}</p>
        {specs && <p className="text-sm text-white/70">{specs}</p>}
        {racket.description && <p className="mx-auto mt-1 max-w-md text-sm text-white/70">{racket.description}</p>}
      </div>
    </div>
  );
};

// One racket the coach is selling: which racket and grip, and an optional string
// job at the string price only, since labor is free with a new racket.
const RacketSaleFields = ({ index, item, rackets, tiers, strings, removable, onChange, onTierChange, onRemove }) => {
  const racket = rackets.find(entry => String(entry.id) === String(item.racket_product_id));
  const tier = tiers.find(entry => String(entry.id) === String(item.service_tier_id));
  const ownStringRequired = serviceTierRequiresOwnString(tier);
  const stockedStrings = strings.filter(string => !tier?.string_category || string.category === tier.string_category);
  const selectedString = stockedStrings.find(string => String(string.id) === String(item.string_id));
  const specs = racket ? racketSpecSummary(racket.specs) : '';
  const [viewingPhoto, setViewingPhoto] = useState(false);

  return (
    <fieldset className="rounded-xl border border-gray-200 p-4">
      <div className="flex items-center justify-between gap-3">
        <legend className="font-semibold text-gray-900">Racket {index + 1}</legend>
        {removable && (
          <button type="button" onClick={onRemove} className="text-sm font-medium text-red-600">
            Remove
          </button>
        )}
      </div>
      <div className="mt-3 grid gap-3 md:grid-cols-2">
        <select
          required
          value={item.racket_product_id}
          onChange={event => onChange({ racket_product_id: event.target.value, grip_size: '' })}
          className="w-full min-w-0 rounded-lg border border-gray-200 p-3 text-sm"
        >
          <option value="">Choose a racket</option>
          {rackets.map(entry => (
            <option key={entry.id} value={entry.id}>
              {racketName(entry)} - {money(entry.price_cents)}
            </option>
          ))}
        </select>
        <select
          required
          disabled={!racket}
          value={item.grip_size}
          onChange={event => onChange({ grip_size: event.target.value })}
          className="w-full min-w-0 rounded-lg border border-gray-200 p-3 text-sm disabled:bg-gray-50"
        >
          <option value="">Grip size</option>
          {(racket?.grip_sizes || []).map(size => <option key={size} value={size}>{size}</option>)}
        </select>
      </div>

      {racket && (
        <div className="mt-3 flex gap-3 rounded-lg border border-gray-100 bg-gray-50 p-3">
          {racket.image_url ? (
            <button
              type="button"
              onClick={() => setViewingPhoto(true)}
              aria-label={`Show ${racketName(racket)} full screen`}
              className="relative shrink-0"
            >
              <img src={racket.image_url} alt={racketName(racket)} className="h-32 w-32 rounded-lg bg-white object-contain" />
              <span className="absolute bottom-1 right-1 rounded-md bg-black/60 p-1 text-white">
                <Maximize2 className="h-3.5 w-3.5" />
              </span>
            </button>
          ) : null}
          <div className="min-w-0 text-sm">
            <p className="font-semibold text-gray-900">{racketName(racket)} · {money(racket.price_cents)}</p>
            {specs && <p className="text-xs text-gray-600">{specs}</p>}
            {racket.description && <p className="mt-1 text-xs text-gray-600">{racket.description}</p>}
            <p className="mt-1 text-xs font-medium text-emerald-700">
              You earn about {money(racket.estimated_commission_cents)} on this racket
            </p>
            {racket.image_url && (
              <button type="button" onClick={() => setViewingPhoto(true)} className="mt-2 text-xs font-medium text-purple-700">
                Show your player
              </button>
            )}
          </div>
        </div>
      )}
      {viewingPhoto && racket?.image_url && (
        <RacketPhotoViewer racket={racket} onClose={() => setViewingPhoto(false)} />
      )}

      <label className="mt-3 flex items-center gap-2 text-sm text-gray-700">
        <input
          type="checkbox"
          checked={item.with_string}
          onChange={event => onChange({ with_string: event.target.checked })}
        />
        String it before pickup (labor is free, they pay for the string)
      </label>

      {item.with_string && (
        <>
          <select
            required
            value={item.service_tier_id}
            onChange={event => onTierChange(event.target.value)}
            className="mt-3 w-full min-w-0 rounded-lg border border-gray-200 p-3 text-sm"
          >
            <option value="">Choose a string service</option>
            {tiers.map(entry => (
              <option key={entry.id} value={entry.id}>
                {entry.name} - {stringOnlyCents(entry, tiers) ? `${money(stringOnlyCents(entry, tiers))} for the string` : 'free'}
              </option>
            ))}
          </select>
          <ServiceTierStrings tiers={tiers} strings={strings} selectedTier={tier} />

          {ownStringRequired && (
            <div className="mt-3">
              <label className="block text-sm font-medium text-gray-700">Player&apos;s string</label>
              <input required value={item.own_string_text} onChange={event => onChange({ own_string_text: event.target.value })} placeholder="e.g. Solinco Hyper-G 16L" className="mt-1 w-full rounded-lg border border-gray-200 p-3 text-sm" />
            </div>
          )}
          {!ownStringRequired && tier && !tier.string_composition && (
            <StringSelection value={item.string_selection} strings={stockedStrings} selectedString={selectedString} gauge={item.gauge} onChange={onChange} />
          )}
          <TensionInput item={item} onChange={onChange} advisePlaceholder="The stringer sets it" />
          <label className="mt-3 flex items-center gap-2 text-sm text-gray-600">
            <input type="checkbox" checked={item.advice_requested} onChange={event => onChange({ advice_requested: event.target.checked })} />
            Let the stringer choose the tension
          </label>
        </>
      )}
    </fieldset>
  );
};

export const ServiceSelect = ({ tiers, value, onChange }) => (
  <select
    required
    value={value}
    onChange={event => onChange(event.target.value)}
    className="w-full min-w-0 rounded-lg border border-gray-200 p-3 text-sm"
  >
    <option value="">Choose a service</option>
    {tiers.map(tier => (
      <option key={tier.id} value={tier.id}>
        {tier.name} - {money(tier.price_cents)}
      </option>
    ))}
  </select>
);

// Service names like "Standard polyester" don't say which strings they mean, so
// show the chosen service's strings, and every service side by side on request.
// Own-string and shop's-choice services already explain themselves below.
export const ServiceTierStrings = ({ tiers, strings, selectedTier, onUseRecommendation }) => {
  const [comparing, setComparing] = useState(false);
  const [quizOpen, setQuizOpen] = useState(false);
  const selectedText =
    selectedTier && !selectedTier.string_composition && !serviceTierRequiresOwnString(selectedTier)
      ? serviceTierStringsText(selectedTier, strings)
      : null;

  return (
    <div className="mt-2 text-xs text-gray-600">
      {selectedText && (
        <p>
          <span className="font-medium text-gray-700">{selectedTier.name} strings:</span> {selectedText}
        </p>
      )}
      <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1">
        {tiers.length > 1 && (
          <button
            type="button"
            aria-expanded={comparing}
            onClick={() => setComparing(current => !current)}
            className="font-medium text-purple-700"
          >
            {comparing ? 'Hide services' : 'Compare services'}
          </button>
        )}
        {onUseRecommendation && (
          <button
            type="button"
            aria-expanded={quizOpen}
            onClick={() => setQuizOpen(current => !current)}
            className="font-medium text-purple-700"
          >
            {quizOpen ? 'Close questions' : 'Help me choose'}
          </button>
        )}
      </div>
      {quizOpen && (
        <StringQuiz
          tiers={tiers}
          strings={strings}
          onUse={recommendation => {
            onUseRecommendation(recommendation);
            setQuizOpen(false);
          }}
        />
      )}
      {comparing && (
        <dl className="mt-2 divide-y divide-gray-100 rounded-lg border border-gray-200 bg-gray-50">
          {tiers.map(tier => (
            <div key={tier.id} className="px-3 py-2">
              <dt className="font-medium text-gray-900">
                {tier.name} · {money(tier.price_cents)}
              </dt>
              <dd className="mt-0.5">
                {serviceTierStringsText(tier, strings) || 'Ask the shop which strings this includes.'}
              </dd>
            </div>
          ))}
        </dl>
      )}
    </div>
  );
};

// The player string questionnaire, answered by the coach. Its recommendation
// fills in the matching service and a suggested tension, both still editable.
const StringQuiz = ({ tiers, strings, onUse }) => {
  const [answers, setAnswers] = useState({});
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const complete = stringQuizComplete(answers);
  const tier = result ? serviceTierForCategory(tiers, result.category) : null;
  const tierStrings = tier ? serviceTierStringsText(tier, strings) : null;

  const answer = (key, value) => {
    setAnswers(current => ({ ...current, [key]: value }));
    setResult(null);
  };

  const recommend = async () => {
    setLoading(true);
    setError('');
    try {
      setResult(await getRestringingStringRecommendation(answers));
    } catch (err) {
      setError(err.message || 'Unable to get a recommendation.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mt-2 space-y-3 rounded-lg border border-purple-100 bg-purple-50/40 p-3">
      {STRING_QUIZ_QUESTIONS.map(question => (
        <div key={question.key} role="radiogroup" aria-label={question.label}>
          <p className="font-medium text-gray-800">{question.label}</p>
          <div className="mt-1 flex flex-wrap gap-2">
            {question.options.map(option => {
              const selected = answers[question.key] === option.value;
              return (
                <button
                  key={option.value}
                  type="button"
                  role="radio"
                  aria-checked={selected}
                  onClick={() => answer(question.key, option.value)}
                  className={`rounded-full border px-3 py-1 ${
                    selected ? 'border-purple-600 bg-purple-600 text-white' : 'border-gray-200 bg-white text-gray-700'
                  }`}
                >
                  {option.label}
                </button>
              );
            })}
          </div>
        </div>
      ))}

      {!result && (
        <button
          type="button"
          disabled={!complete || loading}
          onClick={recommend}
          className="rounded-lg bg-purple-600 px-3 py-2 font-semibold text-white disabled:opacity-50"
        >
          {loading ? 'Finding a string...' : 'Recommend a string'}
        </button>
      )}
      {error && <p className="text-red-600">{error}</p>}

      {result && (
        <div className="rounded-lg border border-gray-200 bg-white p-3">
          <p className="text-sm font-semibold text-gray-900">
            {result.categoryLabel || result.category}
            {result.defaultTensionLbs ? ` · ${result.defaultTensionLbs} lbs` : ''}
          </p>
          {result.rationale && <p className="mt-1">{result.rationale}</p>}
          {result.warning && <p className="mt-1 text-amber-700">{result.warning}</p>}
          {tier ? (
            <>
              {tierStrings && <p className="mt-1">{tier.name} strings: {tierStrings}</p>}
              <button
                type="button"
                onClick={() => onUse({ tierId: tier.id, tensionLbs: result.defaultTensionLbs })}
                className="mt-2 rounded-lg bg-purple-600 px-3 py-2 font-semibold text-white"
              >
                Use {tier.name}
              </button>
            </>
          ) : (
            <p className="mt-1 text-amber-700">
              The shop has no {result.categoryLabel || 'matching'} service. Pick the closest one above.
            </p>
          )}
        </div>
      )}
    </div>
  );
};

export const RacketInput = ({ value, onChange }) => (
  <input
    required
    value={value}
    onChange={event => onChange({ racket_make_model: event.target.value })}
    placeholder="Racket, e.g. Blade 98"
    className="w-full min-w-0 rounded-lg border border-gray-200 p-3 text-sm"
  />
);

// Typing a tension means the coach knows the setup, so it turns off "let the
// stringer advise". Ticking that box again greys the tension out instead of
// clearing it, so nothing typed is lost.
export const TensionInput = ({ item, onChange, advisePlaceholder = 'Set at drop-off' }) => {
  const disabled = item.advice_requested;
  const setTension = (key, value) => onChange({ [key]: value, ...(value ? { advice_requested: false } : {}) });
  const tensionField = (key, label) => (
    <label className="block text-sm font-medium text-gray-700">
      {label}
      <input
        type="number"
        inputMode="decimal"
        min={MIN_TENSION_LBS}
        max={MAX_TENSION_LBS}
        step="0.5"
        required={!disabled}
        disabled={disabled}
        value={disabled ? '' : item[key]}
        onChange={event => setTension(key, event.target.value)}
        placeholder={disabled ? advisePlaceholder : 'e.g. 52'}
        className="mt-1 w-full rounded-lg border border-gray-200 p-3 text-sm disabled:bg-gray-50 disabled:text-gray-400"
      />
    </label>
  );

  return (
    <div className="mt-3">
      <div className="grid gap-3 md:grid-cols-2">
        {tensionField('tension_lbs', item.split_tension ? 'Tension, mains (lbs)' : 'Tension (lbs)')}
        {item.split_tension && !disabled && tensionField('tension_lbs_crosses', 'Tension, crosses (lbs)')}
      </div>
      {!disabled && (
        <label className="mt-2 flex items-center gap-2 text-sm text-gray-600">
          <input
            type="checkbox"
            checked={item.split_tension}
            onChange={event => onChange({
              split_tension: event.target.checked,
              tension_lbs_crosses: item.tension_lbs_crosses || item.tension_lbs
            })}
          />
          Different mains / crosses tension
        </label>
      )}
    </div>
  );
};

export const StringSelection = ({ value, strings, selectedString, gauge, onChange }) => (
  <fieldset className="mt-3 rounded-lg border border-gray-200 p-3">
    <legend className="px-1 text-sm font-medium text-gray-700">String choice</legend>
    <div className="flex flex-wrap gap-4 text-sm text-gray-700">
      <label className="flex items-center gap-2">
        <input
          type="radio"
          checked={value === 'specified'}
          onChange={() => onChange({ string_selection: 'specified' })}
        />
        Choose a string
      </label>
      <label className="flex items-center gap-2">
        <input
          type="radio"
          checked={value === 'shop_choice'}
          onChange={() => onChange({ string_selection: 'shop_choice', string_id: '', gauge: '' })}
        />
        Shop&apos;s choice
      </label>
    </div>
    {value === 'specified' && (
      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        <select
          required
          value={selectedString ? selectedString.id : ''}
          onChange={event => onChange({ string_id: event.target.value, gauge: '' })}
          className="w-full min-w-0 rounded-lg border border-gray-200 p-3 text-sm"
        >
          <option value="">Choose a stocked string</option>
          {strings.map(string => (
            <option key={string.id} value={string.id}>{string.brand} {string.name}</option>
          ))}
        </select>
        {selectedString?.gauges_stocked?.length ? (
          <select
            value={gauge}
            onChange={event => onChange({ gauge: event.target.value })}
            className="w-full min-w-0 rounded-lg border border-gray-200 p-3 text-sm"
          >
            <option value="">Gauge (stringer can advise)</option>
            {selectedString.gauges_stocked.map(option => <option key={option} value={option}>{option}</option>)}
          </select>
        ) : null}
      </div>
    )}
  </fieldset>
);

export default RestringingSection;
