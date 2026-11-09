import test from 'node:test';
import assert from 'node:assert/strict';
import { QUIZ_QUESTIONS, categoryInFilter, quizComplete } from './stringQuiz.js';
import { stringPickGroups } from './restringingOrderPayload.js';

const tiers = [
  { id: 1, name: 'Restringing Only', price_cents: 2999, string_category: null },
  { id: 2, name: 'Restringing + Synthetic Gut', price_cents: 3999, string_category: 'syn_gut' },
  { id: 3, name: 'Restringing + Standard Multifilament', price_cents: 4499, string_category: 'std_multi' },
  { id: 6, name: 'Restringing + Premium Polyester', price_cents: 4999, string_category: 'prem_poly' },
];
const strings = [
  { id: 10, brand: 'Prince', name: 'Duraflex', category: 'syn_gut' },
  { id: 11, brand: 'Head', name: 'Velocity MLT', category: 'std_multi' },
  { id: 12, brand: 'Solinco', name: 'Hyper-G', category: 'prem_poly' },
  { id: 13, brand: 'Luxilon', name: 'ALU Power', category: 'prem_poly', string_price_cents: 2500, restring_price_cents: 5499 },
];

test('the five questions, level first, in the values the shared engine takes', () => {
  assert.deepEqual(QUIZ_QUESTIONS.map(question => question.key), ['level', 'arm', 'priority', 'frequency', 'breakage']);
  assert.deepEqual(QUIZ_QUESTIONS[4].options.map(option => option.value), ['rarely', 'sometimes', 'often']);
  assert.equal(quizComplete({ level: 'advanced', arm: 'no', priority: 'spin', frequency: 'few' }), false);
  assert.equal(quizComplete({ level: 'advanced', arm: 'no', priority: 'spin', frequency: 'few', breakage: 'often' }), true);
});

test('type chips narrow the string list, keeping the string already picked', () => {
  assert.equal(categoryInFilter('prem_poly', 'poly'), true);
  assert.equal(categoryInFilter('std_multi', 'poly'), false);
  const poly = stringPickGroups(tiers, strings, 'poly');
  assert.deepEqual(poly.slice(0, -1).map(group => group.label), ['Premium Polyester']);
  const keep = stringPickGroups(tiers, strings, 'poly', 'std_multi');
  assert.deepEqual(keep.slice(0, -1).map(group => group.label), ['Standard Multifilament', 'Premium Polyester']);
});
