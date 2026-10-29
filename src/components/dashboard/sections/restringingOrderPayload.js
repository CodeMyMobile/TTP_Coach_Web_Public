export const newRestringingOrderItem = () => ({
  service_tier_id: '',
  racket_make_model: '',
  own_string_text: '',
  string_selection: 'shop_choice',
  string_id: '',
  gauge: '',
  advice_requested: true,
  tension_lbs: '',
  split_tension: false,
  tension_lbs_crosses: '',
  notes: ''
});

// Same range the API accepts (validateTensionLbs).
export const MIN_TENSION_LBS = 40;
export const MAX_TENSION_LBS = 70;

export const parseTensionLbs = value => {
  if (value === '' || value === null || value === undefined) return null;
  const tension = Number(value);
  return Number.isFinite(tension) && tension >= MIN_TENSION_LBS && tension <= MAX_TENSION_LBS
    ? tension
    : null;
};

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

// The API's restring items for the rackets on a form.
export const buildRestringItems = formItems =>
  formItems.map(formItem => {
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
    // The stringer sets the tension at drop-off when advice is requested, and
    // the API ignores any tension sent with it.
    const mains = item.advice_requested ? null : parseTensionLbs(formItem.tension_lbs);
    if (mains !== null) {
      const crosses = formItem.split_tension ? parseTensionLbs(formItem.tension_lbs_crosses) : null;
      item.tension_lbs_mains = mains;
      item.tension_lbs_crosses = crosses ?? mains;
    }
    const notes = String(formItem.notes || '').trim();
    if (notes) item.notes = notes;
    return item;
  });

export const buildCoachRestringingOrderPayload = ({ form, vendorId }) => {
  const formItems = Array.isArray(form.items) && form.items.length ? form.items : [form];
  const items = buildRestringItems(formItems);

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

// ─── A coach buying for themselves ──────────────────────────────────────

// Add-ons cost their bundle price in an order with a restring, and their
// regular price on their own: the API's rule.
export const addOnUnitCents = (offer, withRestring) => {
  const regular = Number(offer?.regular_price_cents);
  const bundle = Number(offer?.bundle_price_cents);
  // A coaches-only offer has one price, the coach's.
  if ((!withRestring || offer?.coaches_only) && Number.isInteger(regular) && regular > 0) return regular;
  return Number.isFinite(bundle) ? bundle : 0;
};

// What the coach pays before sales tax, which the checkout adds: tier prices
// for the rackets, add-ons as above, less the shop's coach discount. The
// discount doesn't come off coaches-only offers, whose price is already the coach's.
export const estimateCoachPurchase = ({ rackets = [], tiers = [], addOns = [], quantities = {}, coachDiscountPct = 0 }) => {
  const withRestring = rackets.length > 0;
  const racketCents = rackets.reduce((sum, racket) => {
    const tier = tiers.find(entry => String(entry.id) === String(racket.service_tier_id));
    return sum + Number(tier?.price_cents || 0);
  }, 0);
  const addOnCents = addOns.reduce(
    (sum, offer) => sum + addOnUnitCents(offer, withRestring) * Number(quantities[offer.id] || 0),
    0
  );
  const coachPricedCents = addOns
    .filter(offer => offer.coaches_only)
    .reduce((sum, offer) => sum + addOnUnitCents(offer, withRestring) * Number(quantities[offer.id] || 0), 0);
  const subtotalCents = racketCents + addOnCents;
  const pct = Math.min(Math.max(Number(coachDiscountPct) || 0, 0), 100);
  // Same rounding as the API: half up.
  const discountCents = Math.floor((subtotalCents - coachPricedCents) * pct / 100 + 0.5);
  return { subtotalCents, discountCents, totalBeforeTaxCents: subtotalCents - discountCents, pct };
};

export const buildCoachSelfPurchasePayload = ({ rackets = [], addOns = [], quantities = {}, vendorId }) => ({
  for_self: true,
  vendor_id: Number(vendorId),
  items: [
    ...buildRestringItems(rackets),
    ...addOns
      .filter(offer => Number(quantities[offer.id] || 0) > 0)
      .map(offer => ({
        item_type: 'add_on',
        add_on_offer_id: Number(offer.id),
        item_qty: Number(quantities[offer.id])
      }))
  ]
});

// A coach buying for themselves knows their tension, so their racket starts
// with the tension box open rather than left to the stringer.
export const newCoachSupplyRacket = () => ({ ...newRestringingOrderItem(), advice_requested: false });

// A racket with neither a tension nor the stringer asked to advise. The API
// would take it, leaving the shop with no tension to string at.
export const racketNeedsTension = racket => {
  if (!racket || racket.advice_requested) return false;
  if (parseTensionLbs(racket.tension_lbs) === null) return true;
  return Boolean(racket.split_tension) && parseTensionLbs(racket.tension_lbs_crosses) === null;
};

// A coach's own purchases, apart from the orders they placed for players.
export const isCoachPurchase = order => order?.is_coach_purchase === true;
