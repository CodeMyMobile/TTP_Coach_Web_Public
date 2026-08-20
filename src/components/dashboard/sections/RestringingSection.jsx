import React, { useEffect, useMemo, useState } from 'react';
import { CircleDot, Loader2, Plus, Send, UserPlus, Users } from 'lucide-react';
import {
  createCoachRestringingOrder,
  getCoachRestringingCatalog,
  getCoachRestringingEarnings,
  getCoachRestringingOrders,
  getCoachRestringingPlayers
} from '../../../services/coach';
import {
  buildCoachRestringingOrderPayload,
  initialRestringingForm
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
  const [form, setForm] = useState(initialRestringingForm);

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
  const earnings = data.earnings || {};
  const orderRows = useMemo(() => data.orders, [data.orders]);
  const enabled =
    data.catalog?.eligible !== false && data.catalog?.can_create_restring_orders !== false;
  const vendorId = data.catalog?.vendor?.id || data.catalog?.vendor_id || 1;

  const updateForm = patch => setForm(current => ({ ...current, ...patch }));

  const submit = async event => {
    event.preventDefault();
    setCreating(true);
    setError('');

    try {
      await createCoachRestringingOrder(
        buildCoachRestringingOrderPayload({ form, vendorId })
      );
      setForm(initialRestringingForm);
      await load();
    } catch (err) {
      setError(err.message || 'Unable to send order.');
    } finally {
      setCreating(false);
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
          <CircleDot className="h-8 w-8" />
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-3">
          <div>
            <p className="text-2xl font-bold">
              {money(earnings.earned_cents || earnings.earned)}
            </p>
            <p className="text-xs text-violet-100">Earned</p>
          </div>
          <div>
            <p className="text-2xl font-bold">
              {money(earnings.pending_cents || earnings.pending)}
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
                onClick={() => updateForm({ player_mode: 'new', player_user_id: '' })}
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
              <select
                required
                value={form.player_user_id}
                onChange={event => updateForm({ player_user_id: event.target.value })}
                className="rounded-lg border border-gray-200 p-3 text-sm"
              >
                <option value="">Choose a roster player</option>
                {data.players.map(player => (
                  <option key={player.player_user_id || player.id} value={player.player_user_id || player.id}>
                    {player.display_name || player.name} {player.status === 'invited' ? '- Invited' : ''}
                  </option>
                ))}
              </select>
              <ServiceSelect tiers={tiers} value={form.service_tier_id} onChange={updateForm} />
              <RacketInput value={form.racket_make_model} onChange={updateForm} />
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
              <input
                required
                type="tel"
                value={form.new_player_phone}
                onChange={event => updateForm({ new_player_phone: event.target.value })}
                placeholder="Mobile number"
                className="rounded-lg border border-gray-200 p-3 text-sm"
              />
              <ServiceSelect tiers={tiers} value={form.service_tier_id} onChange={updateForm} />
              <RacketInput value={form.racket_make_model} onChange={updateForm} />
            </div>
          )}

          <label className="mt-3 flex items-center gap-2 text-sm text-gray-600">
            <input
              type="checkbox"
              checked={form.advice_requested}
              onChange={event => updateForm({ advice_requested: event.target.checked })}
            />
            Let the stringer advise at drop-off
          </label>
          <button
            disabled={creating}
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
                    {order.items?.[0]?.racket_make_model || 'Racket'} -{' '}
                    {order.fulfillment_status?.replaceAll('_', ' ')}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-semibold text-emerald-700">
                    {order.payment_status === 'paid'
                      ? `Earned ${money(order.coach_commission_cents)}`
                      : `You earn ${money(order.coach_commission_cents)} when paid`}
                  </p>
                  <p className="text-xs text-gray-500">{order.payment_status}</p>
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

const ServiceSelect = ({ tiers, value, onChange }) => (
  <select
    required
    value={value}
    onChange={event => onChange({ service_tier_id: event.target.value })}
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

export default RestringingSection;
