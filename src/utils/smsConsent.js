export const SMS_DISCLOSURE_VERSION = 'v1';

export const SMS_DISCLOSURE_TEXT =
  'I agree to receive SMS messages from The Tennis Plan about lesson confirmations, reminders, invites, and account updates. Message and data rates may apply. Reply STOP to opt out.';

export const buildSmsConsentPayload = (method = 'coach_signup') => ({
  granted: true,
  disclosureVersion: SMS_DISCLOSURE_VERSION,
  disclosureText: SMS_DISCLOSURE_TEXT,
  method
});

export const withSmsConsent = (payload, granted, method = 'coach_signup') => {
  if (!granted) {
    return payload;
  }

  return {
    ...payload,
    smsConsent: buildSmsConsentPayload(method)
  };
};
