import test from 'node:test';
import assert from 'node:assert/strict';

import { answerErrorMessage, answerRows, hasPreferredTime, requestHeadline } from '../newPlayerRequest.js';

const view = (request = {}) => ({
  player: { name: 'Sam R.' },
  request: {
    who_for: 'my_child',
    experience: 'beginner',
    goals: ['basics', 'fitness'],
    times_of_day: ['weekday_evenings', 'weekends'],
    note: null,
    ...request
  },
  open_times: []
});

test('the headline reads from the coach side', () => {
  assert.equal(requestHeadline(view()), 'Sam R. would like lessons for their child');
  assert.equal(requestHeadline(view({ who_for: 'myself' })), 'Sam R. would like lessons');
  assert.equal(requestHeadline(view({ who_for: 'someone_else' })), 'Sam R. would like lessons for someone else');
});

test('the answers read as labels, with the note only when there is one', () => {
  assert.deepEqual(answerRows(view()), [
    ['Lessons for', "Sam's child"],
    ['Experience', 'Beginner'],
    ['Looking to', 'Learn the basics, Fitness & fun'],
    ['Best times', 'Weekday evenings, Weekends']
  ]);
  assert.deepEqual(answerRows(view({ who_for: 'myself', note: 'Left-handed' }))[0], ['Lessons for', 'Sam R.']);
  assert.deepEqual(answerRows(view({ note: 'Left-handed' })).at(-1), ['Note', 'Left-handed']);
});

test('knows when an open time suits the player', () => {
  assert.equal(hasPreferredTime(view()), false);
  assert.equal(
    hasPreferredTime({ open_times: [{ slots: [{ matches_preference: false }, { matches_preference: true }] }] }),
    true
  );
});

test('explains a refused answer', () => {
  assert.match(answerErrorMessage('no_open_times'), /open times/);
  assert.match(answerErrorMessage('calendar_not_confirmed'), /Tick the box/);
  assert.match(answerErrorMessage('anything else'), /try again/);
});
