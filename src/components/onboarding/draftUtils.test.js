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
