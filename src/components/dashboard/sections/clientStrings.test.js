import test from 'node:test';
import assert from 'node:assert/strict';
import { clientLevelLine, clientStringLines, quizAnswersFromProfile, setupName } from './clientStrings.js';

const rated = {
  order_item_id: 101,
  racket_make_model: 'Pure Aero',
  string: { id: 11, brand: 'Solinco', name: 'Hyper-G' },
  crosses_string: null,
  gauge: '16L',
  tension_lbs_mains: 52,
  tension_lbs_crosses: 52,
  picked_up_at: '2026-10-27T17:00:00Z',
  can_rate: true,
  feedback: { overall: 2, feel: 'too_stiff', again: 'no', arm_discomfort: true, comment: 'Elbow sore after' }
};

test('a past setup in a line, with the player’s rating in their words', () => {
  const [line] = clientStringLines([rated]);
  assert.deepEqual(line, {
    key: 101,
    title: 'Solinco Hyper-G · 16L · 52 lbs',
    detail: 'Pure Aero · Oct 27',
    rating: '2/5 · Too stiff · Wouldn’t get again · Arm discomfort',
    rated: true,
    comment: 'Elbow sore after'
  });
});

test('unrated and own-string rackets say only what is known', () => {
  const [unrated, own] = clientStringLines([
    { ...rated, order_item_id: 102, feedback: null, tension_lbs_crosses: 50 },
    { order_item_id: 103, string: null, own_string_text: 'Luxilon Alu 16L', can_rate: false, feedback: null }
  ]);
  assert.equal(unrated.title, 'Solinco Hyper-G · 16L · 52/50 lbs');
  assert.equal(unrated.rating, 'Not rated yet');
  assert.equal(own.title, 'Own string: Luxilon Alu 16L');
  assert.equal(own.rating, '');
});

test('a hybrid names both strings, and the list is capped', () => {
  assert.equal(setupName({ string: { brand: 'Babolat', name: 'RPM Blast' }, crosses_string: { brand: 'Wilson', name: 'NXT' } }), 'Babolat RPM Blast / Wilson NXT');
  assert.equal(clientStringLines(Array.from({ length: 6 }, (_, i) => ({ ...rated, order_item_id: i }))).length, 4);
  assert.deepEqual(clientStringLines(null), []);
});

test('the profile prefills only the quiz’s own questions and options', () => {
  assert.deepEqual(
    quizAnswersFromProfile({ level: 'advanced', arm: 'no', priority: 'spin', frequency: 'few', breakage: 'often', swing: 'full' }),
    { level: 'advanced', arm: 'no', priority: 'spin', frequency: 'few', breakage: 'often' }
  );
  assert.deepEqual(quizAnswersFromProfile({ level: 'pro', arm: null }), {});
  assert.deepEqual(quizAnswersFromProfile(null), {});
});

test('the client’s level says where it came from, and is absent when unknown', () => {
  assert.equal(clientLevelLine({ level: 'intermediate', ntrp: 3.5, level_source: 'results' }), 'Intermediate · NTRP 3.5, from match results');
  assert.equal(clientLevelLine({ level: 'advanced', ntrp: 4.5, level_source: 'self_rated' }), 'Advanced · NTRP 4.5, self-rated');
  assert.equal(clientLevelLine({ level: 'competitive', ntrp: null, level_source: 'answered' }), 'Competitive · answered');
  assert.equal(clientLevelLine({ level: null }), null);
  assert.equal(clientLevelLine(null), null);
});
