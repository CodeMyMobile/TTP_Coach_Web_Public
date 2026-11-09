import test from 'node:test';
import assert from 'node:assert/strict';
import { QUIZ_QUESTIONS, categoryInFilter, quizComplete, rankCategories, recommendFromQuiz } from './stringQuiz.js';
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

test('the questions start with the player\'s level', () => {
  assert.equal(QUIZ_QUESTIONS[0].key, 'level');
  assert.deepEqual(QUIZ_QUESTIONS.map(question => question.key), ['level', 'arm', 'priority', 'frequency']);
  assert.equal(quizComplete({ level: 'advanced', arm: 'no', priority: 'spin' }), false);
});

test('level changes the pick: a beginner gets synthetic gut, an advanced spin player premium poly', () => {
  assert.equal(rankCategories({ level: 'getting_started', arm: 'no', priority: 'spin', frequency: 'weekly' })[0], 'syn_gut');
  assert.equal(rankCategories({ level: 'advanced', arm: 'no', priority: 'spin', frequency: 'few' })[0], 'prem_poly');
  // A sore arm never gets polyester, whatever the level.
  assert.ok(rankCategories({ level: 'competitive', arm: 'yes', priority: 'spin', frequency: 'few' }).every(category => !category.includes('poly')));
});

test('the result is the shop\'s first string in the category, with an alternative', () => {
  const result = recommendFromQuiz({ level: 'advanced', arm: 'no', priority: 'spin', frequency: 'few' }, { tiers, strings });
  assert.equal(result.pick.tier.id, 6);
  assert.equal(result.pick.string.name, 'ALU Power'); // Luxilon before Solinco
  assert.equal(result.tensionLbs, 50);
  assert.equal(result.alternative, null); // no standard poly or hybrid at this shop
  assert.equal(recommendFromQuiz({ level: 'advanced', arm: 'no', priority: 'spin', frequency: 'few' }, { tiers: [], strings }), null);
});

test('type chips narrow the string list, keeping the string already picked', () => {
  assert.equal(categoryInFilter('prem_poly', 'poly'), true);
  assert.equal(categoryInFilter('std_multi', 'poly'), false);
  const poly = stringPickGroups(tiers, strings, 'poly');
  assert.deepEqual(poly.slice(0, -1).map(group => group.label), ['Premium Polyester']);
  const keep = stringPickGroups(tiers, strings, 'poly', 'std_multi');
  assert.deepEqual(keep.slice(0, -1).map(group => group.label), ['Standard Multifilament', 'Premium Polyester']);
});
