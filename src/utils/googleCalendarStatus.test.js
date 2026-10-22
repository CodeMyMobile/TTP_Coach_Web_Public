import assert from 'node:assert/strict';
import test from 'node:test';

import { googleCalendarErrorMessage, readGoogleConnected } from './googleCalendarStatus.js';

test('readGoogleConnected reads the status answer', () => {
  assert.equal(readGoogleConnected({ connected: true }), true);
  assert.equal(readGoogleConnected({ connected: false }), false);
});

test('readGoogleConnected is unknown when the answer does not say', () => {
  assert.equal(readGoogleConnected(null), null);
  assert.equal(readGoogleConnected('<html>Cannot GET</html>'), null);
  assert.equal(readGoogleConnected({}), null);
});

test('googleCalendarErrorMessage shows the API detail rather than the HTTP status text', () => {
  assert.equal(
    googleCalendarErrorMessage({ detail: 'Failed to sync events' }, 'Internal Server Error'),
    'Failed to sync events'
  );
  assert.equal(googleCalendarErrorMessage(null, 'Bad Gateway'), 'Bad Gateway');
  assert.equal(googleCalendarErrorMessage(null, ''), 'Request failed.');
});
