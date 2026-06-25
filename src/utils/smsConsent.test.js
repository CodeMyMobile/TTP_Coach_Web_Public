import assert from 'node:assert/strict';
import test from 'node:test';

import { SMS_DISCLOSURE_VERSION, buildSmsConsentPayload, withSmsConsent } from './smsConsent.js';

test('buildSmsConsentPayload creates backend SMS consent shape', () => {
  const payload = buildSmsConsentPayload('coach_signup');

  assert.equal(payload.granted, true);
  assert.equal(payload.disclosureVersion, SMS_DISCLOSURE_VERSION);
  assert.match(payload.disclosureText, /SMS/i);
  assert.equal(payload.method, 'coach_signup');
});

test('withSmsConsent only adds smsConsent when granted', () => {
  assert.deepEqual(withSmsConsent({ phone: '4155550101' }, false), {
    phone: '4155550101'
  });

  const payload = withSmsConsent({ phone: '4155550101' }, true, 'coach_onboarding');
  assert.equal(payload.smsConsent.granted, true);
  assert.equal(payload.smsConsent.method, 'coach_onboarding');
});
