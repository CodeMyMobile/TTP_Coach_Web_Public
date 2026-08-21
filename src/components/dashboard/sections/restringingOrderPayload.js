export const initialRestringingForm = {
  player_mode: 'roster',
  player_user_id: '',
  new_player_name: '',
  new_player_phone: '',
  player_query: '',
  service_tier_id: '',
  racket_make_model: '',
  own_string_text: '',
  advice_requested: true
};

export const playerLabel = player =>
  String(player?.display_name || player?.name || 'Unnamed player').trim();

export const filterRosterPlayers = (players = [], query = '') => {
  const normalizedQuery = String(query || '').trim().toLowerCase();
  if (!normalizedQuery) return players;

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

export const serviceTierRequiresOwnString = tier =>
  tier?.string_category === null && !tier?.string_composition;

export const buildCoachRestringingOrderPayload = ({ form, vendorId }) => {
  const item = {
    service_tier_id: Number(form.service_tier_id),
    racket_make_model: String(form.racket_make_model || '').trim(),
    advice_requested: Boolean(form.advice_requested)
  };
  const ownStringText = String(form.own_string_text || '').trim();
  if (ownStringText) {
    item.own_string_text = ownStringText;
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
