export const initialRestringingForm = {
  player_mode: 'roster',
  player_user_id: '',
  new_player_name: '',
  new_player_phone: '',
  player_query: '',
  service_tier_id: '',
  racket_make_model: '',
  own_string_text: '',
  string_selection: 'shop_choice',
  string_id: '',
  gauge: '',
  advice_requested: true
};

export const playerLabel = player =>
  String(player?.display_name || player?.name || 'Unnamed player').trim();

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

export const normalizeRestringingEarnings = (earnings = {}) => ({
  earned_cents: earnings.total_commission_cents ?? earnings.earned_cents ?? earnings.earned ?? 0,
  pending_cents: earnings.pending_commission_cents ?? earnings.pending_cents ?? earnings.pending ?? 0
});

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

export const buildCoachRestringingOrderPayload = ({ form, vendorId }) => {
  const item = {
    service_tier_id: Number(form.service_tier_id),
    racket_make_model: String(form.racket_make_model || '').trim(),
    advice_requested: Boolean(form.advice_requested)
  };
  const ownStringText = String(form.own_string_text || '').trim();
  const stringSelection = String(form.string_selection || '').trim() || (
    ownStringText ? 'player_supplied' : ''
  );
  if (stringSelection) {
    item.string_selection = stringSelection;
  }
  if (ownStringText) {
    item.own_string_text = ownStringText;
  }
  if (stringSelection === 'specified') {
    const stringId = Number(form.string_id);
    if (Number.isInteger(stringId) && stringId > 0) item.string_id = stringId;
    const gauge = String(form.gauge || '').trim();
    if (gauge) item.gauge = gauge;
  }

  const payload = {
    vendor_id: Number(vendorId),
    items: [item]
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
