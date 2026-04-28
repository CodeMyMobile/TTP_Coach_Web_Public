import test from 'node:test';
import assert from 'node:assert/strict';
import {
  deriveOnboardingCompletion,
  parseCompletionValue,
  resolveCompletionValue
} from '../profileCompletion.js';

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

test('deriveOnboardingCompletion accepts a complete saved onboarding response without backend flags', () => {
  const completeProfile = {
    id: 23,
    profileImage: 'https://example.com/avatar.png',
    name: 'A K',
    email: 'coach@example.com',
    phone: '+19990000000',
    bio: 'Hi, I am a Tennis Coach. Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.',
    experience_years: '3-5',
    home_courts: ['Court A'],
    levels: ['beginner'],
    formats: ['group', 'private', 'semi'],
    price_private: 100,
    price_semi: 75,
    price_group: 50,
    availability: {
      Monday: ['06:00 - 07:00']
    },
    groupClasses: []
  };

  assert.equal(deriveOnboardingCompletion(completeProfile), true);
});

test('deriveOnboardingCompletion rejects empty default draft-shaped profiles', () => {
  const emptyDraftProfile = {
    profileImage: '',
    name: '',
    email: '',
    bio: '',
    experience_years: '',
    home_courts: [],
    levels: [],
    formats: [],
    price_private: 100,
    availability: {
      Monday: [],
      Tuesday: []
    },
    groupClasses: []
  };

  assert.equal(deriveOnboardingCompletion(emptyDraftProfile), false);
});
