import test from 'node:test';
import assert from 'node:assert/strict';
import { buildOnboardingPayload } from '../onboarding.js';

test('buildOnboardingPayload includes pay-on-court coach flag', () => {
  const payload = buildOnboardingPayload({
    allow_pay_on_court: true,
    availability: {},
    availabilityLocations: {},
    home_courts: [],
    levels: [],
    specialties: [],
    formats: [],
    languages: [],
    groupClasses: []
  });

  assert.equal(payload.allow_pay_on_court, true);
});
