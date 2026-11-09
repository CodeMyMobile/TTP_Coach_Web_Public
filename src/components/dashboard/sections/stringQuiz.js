// "Help me choose", answered by the coach for their client: the player app's five questions,
// in the values the API's recommendation engine takes (POST /restringing/recommendations).
// The engine is shared with the player app, so a coach and their client get the same pick,
// alternatives and reasons.

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
  },
  {
    key: 'breakage',
    label: 'How often do they break strings?',
    options: [
      { value: 'rarely', label: 'Rarely or never' },
      { value: 'sometimes', label: 'Every couple of months' },
      { value: 'often', label: 'Every few weeks or more' }
    ]
  }
];

export const quizComplete = answers => QUIZ_QUESTIONS.every(question => Boolean(answers?.[question.key]));

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
