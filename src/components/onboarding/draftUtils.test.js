import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildDraftPartialPayload,
  mergeOnboardingWithDraft,
  resetDraftUiState
} from './draftUtils.js';

test('merge priority prefers draft payload over onboarding fields', () => {
  const onboarding = {
    name: 'Coach Saved',
    availability: { monday: ['09:00 - 10:00'], tuesday: [] },
    formats: ['private']
  };
  const draft = {
    name: 'Coach Draft',
    availability: { monday: ['10:00 - 11:00'] },
    formats: ['group']
  };

  const merged = mergeOnboardingWithDraft(onboarding, draft);
  assert.equal(merged.name, 'Coach Draft');
  assert.deepEqual(merged.availability.monday, ['10:00 - 11:00']);
  assert.deepEqual(merged.formats, ['group']);
});

test('merge ignores empty default draft fields over complete onboarding data', () => {
  const onboarding = {
    name: 'A K',
    bio: 'Complete saved profile',
    email: 'coach@example.com',
    profileImage: 'https://example.com/avatar.png',
    home_courts: ['Court A'],
    levels: ['beginner'],
    availability: { Monday: ['09:00 - 10:00'], Tuesday: [] },
    availabilityLocations: { Monday: { '09:00 - 10:00': 'Court A' }, Tuesday: {} }
  };
  const draft = {
    name: '',
    bio: '',
    email: '',
    profileImage: '',
    home_courts: [],
    levels: [],
    availability: { Monday: [], Tuesday: [] },
    availabilityLocations: { Monday: { '09:00 - 10:00': 'Court A' }, Tuesday: {} }
  };

  const merged = mergeOnboardingWithDraft(onboarding, draft);

  assert.equal(merged.name, 'A K');
  assert.equal(merged.bio, 'Complete saved profile');
  assert.equal(merged.email, 'coach@example.com');
  assert.equal(merged.profileImage, 'https://example.com/avatar.png');
  assert.deepEqual(merged.home_courts, ['Court A']);
  assert.deepEqual(merged.levels, ['beginner']);
  assert.deepEqual(merged.availability.Monday, ['09:00 - 10:00']);
});

test('buildDraftPartialPayload returns only changed meaningful keys', () => {
  const previous = { name: 'A', formats: [], availability: { monday: [] }, bio: '' };
  const current = { name: 'B', formats: [], availability: { monday: ['09:00'] }, bio: '' };

  const patch = buildDraftPartialPayload(previous, current);

  assert.deepEqual(Object.keys(patch).sort(), ['availability', 'name']);
  assert.equal(patch.name, 'B');
  assert.deepEqual(patch.availability, { monday: ['09:00'] });
});

test('discard flow reset helper clears draft-dependent UI state', () => {
  const state = resetDraftUiState();
  assert.deepEqual(state, {
    autosaveStatus: 'idle',
    autosaveError: null,
    hasUnsavedChanges: false
  });
});

test('final submit success helper state indicates no draft-dependent warning', () => {
  const state = resetDraftUiState();
  assert.equal(state.hasUnsavedChanges, false);
  assert.equal(state.autosaveError, null);
});


test('buildDraftPartialPayload excludes server-managed stripe status fields', () => {
  const previous = { charges_enabled: false, charges_disabled_reason: '' };
  const current = { charges_enabled: true, charges_disabled_reason: 'pending' };

  const patch = buildDraftPartialPayload(previous, current);

  assert.deepEqual(patch, {});
});
