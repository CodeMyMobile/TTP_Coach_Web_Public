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
  contact_party: 'player',
  // 'keep': the coach earns the commission. 'player': the player gets it as
  // a discount instead.
  commission_choice: 'keep',
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
  if (order?.coach_commission_choice === 'player') {
    const saved = formatCoachCommission(order?.coach_discount_cents);
    return order?.payment_status === 'paid'
      ? `Player saved ${saved}`
      : `Player gets ${saved} off`;
  }
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

// The pay link is texted to this number, so it has to be one a text can reach.
// Same rule as the API's player_phone_invalid: a US number (10 digits, or 11
// starting with 1) or an international one written with "+".
export const isTextablePhone = value => {
  const raw = String(value || '').trim();
  const digits = raw.replace(/\D/g, '');
  if (digits.length === 10 || (digits.length === 11 && digits.startsWith('1'))) return true;
  return raw.startsWith('+') && !digits.startsWith('1') && digits.length >= 8 && digits.length <= 15;
};

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
    // Who the shop deals with about the rackets. The pay link goes to the
    // player either way.
    contact_party: form.contact_party === 'coach' ? 'coach' : 'player',
    commission_choice: form.commission_choice === 'player' ? 'player' : 'keep',
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
