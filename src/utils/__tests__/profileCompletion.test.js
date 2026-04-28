import test from 'node:test';
import assert from 'node:assert/strict';
import { parseCompletionValue, resolveCompletionValue } from '../profileCompletion.js';

test('parseCompletionValue handles booleans, numeric flags, and string flags', () => {
  assert.equal(parseCompletionValue(true), true);
  assert.equal(parseCompletionValue(false), false);
  assert.equal(parseCompletionValue(1), true);
  assert.equal(parseCompletionValue(0), false);
  assert.equal(parseCompletionValue('true'), true);
  assert.equal(parseCompletionValue('TRUE'), true);
  assert.equal(parseCompletionValue('1'), true);
  assert.equal(parseCompletionValue('false'), false);
  assert.equal(parseCompletionValue('0'), false);
  assert.equal(parseCompletionValue('completed'), true);
  assert.equal(parseCompletionValue('pending'), false);
});

test('parseCompletionValue returns undefined for unsupported values', () => {
  assert.equal(parseCompletionValue('maybe'), undefined);
  assert.equal(parseCompletionValue(2), undefined);
  assert.equal(parseCompletionValue(null), undefined);
  assert.equal(parseCompletionValue(undefined), undefined);
});

test('resolveCompletionValue preserves the first explicit completion signal including false', () => {
  assert.equal(resolveCompletionValue(undefined, null, 'false', true), false);
  assert.equal(resolveCompletionValue(undefined, 'true', false), true);
  assert.equal(resolveCompletionValue(undefined, null, 'maybe', 1), true);
  assert.equal(resolveCompletionValue(undefined, null, 'maybe'), undefined);
});
