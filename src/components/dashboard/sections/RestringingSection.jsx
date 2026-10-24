import React, { useEffect, useMemo, useState } from 'react';
import { CircleDot, Gift, Hand, Loader2, Plus, Send, User, UserPlus, Users, Wallet, XCircle } from 'lucide-react';
import {
  createCoachRestringingOrder,
  cancelCoachRestringingOrder,
  getCoachRestringingCatalog,
  getCoachRestringingEarnings,
  getCoachRestringingOrders,
  getCoachRestringingPlayers
} from '../../../services/coach';
import {
  buildCoachRestringingOrderPayload,
  coachCommissionStatusText,
  filterRosterPlayers,
  normalizeRestringingEarnings,
  playerLabel,
  serviceTierRequiresOwnString,
  initialRestringingForm,
  isTextablePhone,
  MAX_TENSION_LBS,
  MIN_TENSION_LBS,
  newRestringingOrderItem,
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

  const load = async ({ initial = false } = {}) => {
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
      if (initial) {
        // Start from what the coach chose on their last order.
        const lastChoice = catalog?.commission?.last_choice === 'player' ? 'player' : 'keep';
        setForm(current => ({ ...current, commission_choice: lastChoice }));
      }
    } catch (err) {
      setError(err.message || 'Unable to load restringing.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load({ initial: true });
  }, []);

  const tiers = data.catalog?.service_tiers || data.catalog?.tiers || [];
  const vendorImage = vendorImageUrl(data.catalog);
  const earnings = normalizeRestringingEarnings(data.earnings);
  const orderRows = useMemo(() => data.orders, [data.orders]);
  const filteredPlayers = useMemo(
    () => filterRosterPlayers(data.players, form.player_query),
    [data.players, form.player_query]
  );
  const selectedRosterPlayer = data.players.find(
    player => String(player.player_user_id || player.id) === String(form.player_user_id)
  );
  const coachDropOff = form.contact_party === 'coach';
  const commissionPct = Number(data.catalog?.commission?.pct ?? 10);
  const givingCommission = form.commission_choice === 'player';
  const enabled =
    data.catalog?.eligible !== false && data.catalog?.can_create_restring_orders !== false;
  const vendorId = data.catalog?.vendor?.id || data.catalog?.vendor_id || 1;
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
        buildCoachRestringingOrderPayload({ form, vendorId })
      );
      // The next order starts from the choice the coach just made.
      setForm({ ...initialRestringingForm, commission_choice: form.commission_choice });
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

      <div className="rounded-2xl bg-gradient-to-br from-violet-700 to-purple-600 p-6 text-white shadow-sm">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold">Restringing</h2>
            <p className="mt-1 text-sm text-violet-100">
              Order from The Tennis Garage for your players.
            </p>
          </div>
          {vendorImage ? (
            <img
              src={vendorImage}
              alt={`${data.catalog?.vendor?.name || 'Vendor'} profile`}
              className="h-12 w-12 rounded-xl object-cover"
            />
          ) : (
            <CircleDot className="h-8 w-8" />
          )}
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-3">
          <div>
            <p className="text-2xl font-bold">
              {money(earnings.earned_cents)}
            </p>
            <p className="text-xs text-violet-100">Earned</p>
          </div>
          <div>
            <p className="text-2xl font-bold">
              {money(earnings.pending_cents)}
            </p>
            <p className="text-xs text-violet-100">Awaiting payment</p>
          </div>
          <div>
            <p className="text-2xl font-bold">{orderRows.length}</p>
            <p className="text-xs text-violet-100">Orders</p>
          </div>
        </div>
      </div>

      {enabled ? (
        <form onSubmit={submit} className="rounded-2xl bg-white p-5 shadow-sm">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Plus className="h-5 w-5 text-purple-600" />
              <h3 className="font-semibold text-gray-900">New restring order</h3>
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

          <div className="mt-5">
            <p className="text-sm font-medium text-gray-700">Who brings the rackets in?</p>
            <div className="mt-2 inline-flex rounded-lg border border-gray-200 bg-gray-50 p-1 text-sm">
              {[
                { value: 'player', label: 'Player drops off', Icon: User },
                { value: 'coach', label: 'I drop off', Icon: Hand }
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
                ? 'The shop deals with you: drop-off, ready and pickup all come to you. The invoice still goes to your player.'
                : 'The shop deals with your player directly, invoice included.'}
            </p>
          </div>

          <div className="mt-5">
            <p className="text-sm font-medium text-gray-700">Your {commissionPct}% commission</p>
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
              {givingCommission
                ? `Your player gets ${commissionPct}% off this order, and you earn nothing on it.`
                : `You earn ${commissionPct}% of the order, before tax, when your player pays.`}
            </p>
          </div>

          <button
            disabled={creating || (form.player_mode === 'roster' && !form.player_user_id)}
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
                    {Number(order.item_count || order.items?.length || 1)} racket{Number(order.item_count || order.items?.length || 1) === 1 ? '' : 's'} ·{' '}
                    {order.service_tier_name || order.items?.[0]?.service_tier_name || 'Restringing'} ·{' '}
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
}) => (
  <div className="relative">
    <input
      value={query}
      onChange={event => onQueryChange(event.target.value)}
      placeholder="Search roster player"
      className="w-full rounded-lg border border-gray-200 p-3 text-sm"
    />
    <div className="absolute z-20 mt-1 max-h-56 w-full overflow-y-auto rounded-lg border border-gray-200 bg-white shadow-lg">
      {players.length ? (
        players.slice(0, 8).map(player => {
          const playerId = player.player_user_id || player.id;
          const selected = String(selectedPlayer?.player_user_id || selectedPlayer?.id || '') === String(playerId);

          return (
            <button
              key={playerId}
              type="button"
              onClick={() => onSelect(player)}
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
  </div>
);

const ServiceSelect = ({ tiers, value, onChange }) => (
  <select
    required
    value={value}
    onChange={event => onChange(event.target.value)}
    className="rounded-lg border border-gray-200 p-3 text-sm"
  >
    <option value="">Choose a service</option>
    {tiers.map(tier => (
      <option key={tier.id} value={tier.id}>
        {tier.name} - {money(tier.price_cents)}
      </option>
    ))}
  </select>
);

const RacketInput = ({ value, onChange }) => (
  <input
    required
    value={value}
    onChange={event => onChange({ racket_make_model: event.target.value })}
    placeholder="Racket, e.g. Blade 98"
    className="rounded-lg border border-gray-200 p-3 text-sm"
  />
);

// Typing a tension means the coach knows the setup, so it turns off "let the
// stringer advise". Ticking that box again greys the tension out instead of
// clearing it, so nothing typed is lost.
const TensionInput = ({ item, onChange }) => {
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
        placeholder={disabled ? 'Set at drop-off' : 'e.g. 52'}
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

const StringSelection = ({ value, strings, selectedString, gauge, onChange }) => (
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
          className="rounded-lg border border-gray-200 p-3 text-sm"
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
            className="rounded-lg border border-gray-200 p-3 text-sm"
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
