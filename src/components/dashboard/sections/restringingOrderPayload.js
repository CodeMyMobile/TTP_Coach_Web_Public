export const newRestringingOrderItem = () => ({
  service_tier_id: '',
  racket_make_model: '',
  own_string_text: '',
  string_selection: 'shop_choice',
  string_id: '',
  gauge: '',
  advice_requested: true,
  notes: ''
});

export const initialRestringingForm = {
  player_mode: 'roster',
  player_user_id: '',
  new_player_name: '',
  new_player_phone: '',
  player_query: '',
  items: [newRestringingOrderItem()]
};

export const playerLabel = player =>
  String(player?.display_name || player?.name || 'Unnamed player').trim();

export const vendorImageUrl = catalog =>
  String(catalog?.vendor?.image_url || '').trim();

export const filterRosterPlayers = (players = [], query = '') => {
  const normalizedQuery = String(query || '').trim().toLowerCase();
  if (!normalizedQuery) return [];

  return players.filter(player => {
    const searchable = [
      playerLabel(player),
      player?.phone,
      player?.status === 'invited' ? 'invited' : '',
    ]
      .filter(Boolean)
      .join(' ')
      .toLowerCase();

    return searchable.includes(normalizedQuery);
  });
};

export const normalizeRestringingEarnings = (earnings = {}) => {
  const summary = earnings || {};
  return {
    earned_cents: summary.total_commission_cents ?? summary.earned_cents ?? summary.earned ?? 0,
    pending_cents: summary.pending_commission_cents ?? summary.pending_cents ?? summary.pending ?? 0
  };
};

export const serviceTierRequiresOwnString = tier =>
  tier?.string_category === null && !tier?.string_composition;

export const formatCoachCommission = cents =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(
    Number(cents || 0) / 100
  );

export const coachCommissionStatusText = order => {
  const amount = formatCoachCommission(order?.coach_commission_cents);
  if (order?.payment_status === 'paid') {
    return order?.coach_transfer_id
      ? `Earned ${amount}`
      : `Paid · transfer pending ${amount}`;
  }
  return `You earn ${amount} when paid`;
};

export const getRestringingOrderSummary = (orders = []) =>
  orders.reduce(
    (summary, order) => {
      const status = String(order?.fulfillment_status || '').toLowerCase();
      if (status === 'awaiting_drop_off' || status === 'awaiting_dropoff') {
        summary.awaitingDropOff += 1;
      }
      if (status === 'ready_for_pickup') {
        summary.ready += 1;
      }
      return summary;
    },
    { awaitingDropOff: 0, ready: 0 }
  );

export const buildCoachRestringingOrderPayload = ({ form, vendorId }) => {
  const formItems = Array.isArray(form.items) && form.items.length ? form.items : [form];
  const items = formItems.map(formItem => {
    const item = {
      service_tier_id: Number(formItem.service_tier_id),
      racket_make_model: String(formItem.racket_make_model || '').trim(),
      advice_requested: Boolean(formItem.advice_requested)
    };
    const ownStringText = String(formItem.own_string_text || '').trim();
    const stringSelection = String(formItem.string_selection || '').trim() || (
      ownStringText ? 'player_supplied' : ''
    );
    if (stringSelection) {
      item.string_selection = stringSelection;
    }
    if (ownStringText) {
      item.own_string_text = ownStringText;
    }
    if (stringSelection === 'specified') {
      const stringId = Number(formItem.string_id);
      if (Number.isInteger(stringId) && stringId > 0) item.string_id = stringId;
      const gauge = String(formItem.gauge || '').trim();
      if (gauge) item.gauge = gauge;
    }
    const notes = String(formItem.notes || '').trim();
    if (notes) item.notes = notes;
    return item;
  });

  const payload = {
    vendor_id: Number(vendorId),
    items
  };

  if (form.player_mode === 'new') {
    payload.new_player = {
      display_name: String(form.new_player_name || '').trim(),
      phone: String(form.new_player_phone || '').trim()
    };
    return payload;
  }

  payload.player_user_id = Number(form.player_user_id);
  return payload;
};
