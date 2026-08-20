export const initialRestringingForm = {
  player_mode: 'roster',
  player_user_id: '',
  new_player_name: '',
  new_player_phone: '',
  service_tier_id: '',
  racket_make_model: '',
  advice_requested: true
};

export const buildCoachRestringingOrderPayload = ({ form, vendorId }) => {
  const payload = {
    vendor_id: Number(vendorId),
    items: [
      {
        service_tier_id: Number(form.service_tier_id),
        racket_make_model: String(form.racket_make_model || '').trim(),
        advice_requested: Boolean(form.advice_requested)
      }
    ]
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
