// "Help me choose", answered by the coach for their client: the same four questions, level
// first, and the same recommendation as the player app's quiz (ttp-player-web
// src/restringing/quizV2.js), so a coach and their player get the same answer. Keep the two
// in step. The catalog says what category a string is, not how it plays, so the reasons
// are about the category, and the string is the shop's first in that category.

export const QUIZ_QUESTIONS = [
  {
    key: 'level',
    label: 'Their level?',
    options: [
      { value: 'getting_started', label: 'Getting started', hint: 'NTRP 2.5–3.0' },
      { value: 'intermediate', label: 'Intermediate', hint: 'NTRP 3.5–4.0' },
      { value: 'advanced', label: 'Advanced', hint: 'NTRP 4.5+' },
      { value: 'competitive', label: 'Competitive', hint: 'Tournaments, college, open' }
    ]
  },
  {
    key: 'arm',
    label: 'Any arm, elbow or shoulder discomfort?',
    options: [
      { value: 'no', label: 'No' },
      { value: 'sometimes', label: 'Sometimes' },
      { value: 'yes', label: 'Yes, right now' }
    ]
  },
  {
    key: 'priority',
    label: 'What matters most to them?',
    options: [
      { value: 'spin', label: 'Spin' },
      { value: 'control', label: 'Control' },
      { value: 'power', label: 'Power' },
      { value: 'comfort', label: 'Comfort' }
    ]
  },
  {
    key: 'frequency',
    label: 'How often do they play?',
    options: [
      { value: 'weekly', label: 'Once a week or less' },
      { value: 'few', label: '2–3 times a week' },
      { value: 'most_days', label: '4 or more times a week' }
    ]
  }
];

export const quizComplete = answers => QUIZ_QUESTIONS.every(question => Boolean(answers?.[question.key]));

const CATEGORY_LABELS = {
  syn_gut: 'Synthetic gut',
  std_multi: 'Standard multifilament',
  prem_multi: 'Premium multifilament',
  std_poly: 'Standard polyester',
  prem_poly: 'Premium polyester',
  poly_multi_hybrid: 'Poly / multi hybrid',
  natural_gut_hybrid: 'Natural gut hybrid',
  natural_gut: 'Natural gut'
};
const labelFor = category => CATEGORY_LABELS[category] || String(category || '').replaceAll('_', ' ');

const strongLevel = level => level === 'advanced' || level === 'competitive';

/** Categories to try, best first. The first one the shop can do is the pick; the next, the alternative. */
export function rankCategories({ level, arm, priority, frequency } = {}) {
  const spinOrControl = priority === 'spin' || priority === 'control';
  if (arm === 'yes') {
    // Never polyester with a sore arm now.
    return strongLevel(level) ? ['prem_multi', 'std_multi', 'natural_gut', 'syn_gut'] : ['std_multi', 'prem_multi', 'syn_gut'];
  }
  if (arm === 'sometimes') {
    if (spinOrControl && strongLevel(level)) return ['poly_multi_hybrid', 'prem_multi', 'std_multi'];
    return strongLevel(level) ? ['prem_multi', 'std_multi', 'poly_multi_hybrid'] : ['std_multi', 'prem_multi', 'syn_gut'];
  }
  if (level === 'getting_started') {
    return priority === 'comfort' || priority === 'power' ? ['std_multi', 'syn_gut'] : ['syn_gut', 'std_multi'];
  }
  if (spinOrControl || frequency === 'most_days') {
    return strongLevel(level) || frequency === 'most_days'
      ? ['prem_poly', 'std_poly', 'poly_multi_hybrid']
      : ['std_poly', 'prem_poly', 'syn_gut'];
  }
  return strongLevel(level) ? ['prem_multi', 'std_multi', 'prem_poly'] : ['std_multi', 'prem_multi', 'syn_gut'];
}

/** Why, in a sentence or two; about the category and the answers, never invented specs. */
export function reasonsFor(category, { level, arm, priority, frequency } = {}) {
  const reasons = [];
  const poly = category === 'std_poly' || category === 'prem_poly';
  const multi = category === 'std_multi' || category === 'prem_multi';
  if (arm === 'yes' || arm === 'sometimes') {
    reasons.push(category === 'poly_multi_hybrid'
      ? 'Multifilament crosses soften the bed while polyester mains keep control.'
      : 'Gentler on the arm than a full polyester bed.');
  }
  if (poly && (priority === 'spin' || priority === 'control')) {
    reasons.push(priority === 'spin' ? 'Polyester grips the ball for the most spin.' : 'Polyester gives the most control on full swings.');
  }
  if (multi && (priority === 'power' || priority === 'comfort')) {
    reasons.push(priority === 'power' ? 'Multifilament gives easy depth and power.' : 'Multifilament is the softest feel after natural gut.');
  }
  if (category === 'syn_gut') reasons.push('A dependable all-round string at the best price.');
  if (poly && frequency === 'most_days') reasons.push('Polyester lasts longest when they play most days.');
  if (category.startsWith('prem_') && strongLevel(level)) reasons.push('A premium string for their level.');
  if (level === 'getting_started' && !poly) reasons.push('Forgiving while they build their strokes.');
  if (!reasons.length) reasons.push(`${labelFor(category)} suits how they play.`);
  return reasons.slice(0, 3);
}

/** Starting tension: lower for polyester, and 2 lbs lower again with any arm discomfort. */
export function tensionFor(category, { arm } = {}) {
  const base = category === 'std_poly' || category === 'prem_poly' || category === 'poly_multi_hybrid' ? 50 : 54;
  return arm === 'yes' || arm === 'sometimes' ? base - 2 : base;
}

// The quiz names the hybrid and natural gut services by composition; in production they're
// string categories with stocked strings. Either matches.
const CATEGORY_ALIASES = {
  poly_multi_hybrid: 'poly_multi',
  natural_gut_hybrid: 'gut_poly',
  natural_gut: 'nat_gut'
};

const stringTitle = string => `${string?.brand || ''} ${string?.name || ''}`.trim();

/** One option for a category at this shop: its service and first string, or null when it can't. */
function optionFor(category, tiers, strings) {
  const codes = [category, CATEGORY_ALIASES[category]].filter(Boolean);
  const tier = (tiers || []).find(row => codes.includes(row.string_category) || row.string_composition === category);
  if (!tier) return null;
  if (tier.string_composition) return { category, label: labelFor(category), tier, string: null };
  const string = (strings || [])
    .filter(row => row && row.category === tier.string_category && row.in_stock !== false)
    .sort((left, right) => stringTitle(left).localeCompare(stringTitle(right)))[0];
  if (!string) return null;
  return { category, label: labelFor(category), tier, string };
}

/**
 * The result: { pick, alternative, reasons, tensionLbs, warning }. `pick` is the first ranked
 * category the shop can do, with its string; null when it can do none of them.
 */
export function recommendFromQuiz(answers, { tiers, strings }) {
  const options = rankCategories(answers).map(category => optionFor(category, tiers, strings)).filter(Boolean);
  if (!options.length) return null;
  const [pick, alternative = null] = options;
  return {
    pick,
    alternative,
    reasons: reasonsFor(pick.category, answers),
    tensionLbs: tensionFor(pick.category, answers),
    warning: answers?.arm === 'yes' ? 'Avoid full polyester while their arm is sore.' : null
  };
}

/** Type filter chips over the string list, and which categories each covers. */
export const STRING_TYPE_FILTERS = [
  { key: 'all', label: 'All' },
  { key: 'poly', label: 'Polyester', categories: ['std_poly', 'prem_poly'] },
  { key: 'multi', label: 'Multifilament', categories: ['std_multi', 'prem_multi'] },
  { key: 'syn', label: 'Synthetic gut', categories: ['syn_gut'] },
  { key: 'gut', label: 'Natural gut & hybrids', categories: ['poly_multi', 'gut_poly', 'nat_gut', 'poly_multi_hybrid', 'natural_gut_hybrid', 'natural_gut'] }
];

/** Whether a string category shows under a filter. */
export const categoryInFilter = (category, filterKey) => {
  const filter = STRING_TYPE_FILTERS.find(item => item.key === filterKey);
  return !filter?.categories || filter.categories.includes(category);
};
