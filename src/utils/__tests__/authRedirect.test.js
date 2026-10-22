import test from 'node:test';
import assert from 'node:assert/strict';

import { AS_USER_KEY } from '../../constants/urls.js';
import { getAccessToken, removeTokens, storeTokens } from '../tokenHelper.js';

const setupWindow = () => {
  let assignedPath = '';

  global.window = {
    localStorage: {
      removeItem: () => {}
    },
    location: {
      pathname: '/dashboard',
      assign: (path) => {
        assignedPath = path;
      }
    }
  };

  return {
    get assignedPath() {
      return assignedPath;
    }
  };
};

test('redirectToSignInOnForbidden redirects and clears stored auth on unauthorized response', async () => {
  await storeTokens('coach-token', 'refresh-token');
  const locationState = setupWindow();
  const removedKeys = [];
  global.window.localStorage.removeItem = (key) => removedKeys.push(key);

  const { redirectToSignInOnForbidden } = await import('../authRedirect.js');
  await redirectToSignInOnForbidden({ status: 401 });

  assert.equal(locationState.assignedPath, '/');
  assert.equal(await getAccessToken(), null);
  assert.deepEqual(removedKeys, [AS_USER_KEY]);

  delete global.window;
  await removeTokens();
});

test('redirectToSignInOnForbidden keeps a signed-in coach on the page when an action is refused', async () => {
  // e.g. 403 coach_restringing_not_enabled from "Send order & pay link": the
  // token is fine, so the coach stays signed in and the caller shows the error.
  await storeTokens('coach-token', 'refresh-token');
  const locationState = setupWindow();
  const removedKeys = [];
  global.window.localStorage.removeItem = (key) => removedKeys.push(key);

  const { redirectToSignInOnForbidden } = await import('../authRedirect.js');
  await redirectToSignInOnForbidden({ status: 403 });

  assert.equal(locationState.assignedPath, '');
  assert.equal(await getAccessToken(), 'coach-token');
  assert.deepEqual(removedKeys, []);

  delete global.window;
  await removeTokens();
});

test('redirectToSignInOnForbidden signs out on a 403 sent because there was no token', async () => {
  await removeTokens();
  const locationState = setupWindow();

  const { redirectToSignInOnForbidden } = await import('../authRedirect.js');
  await redirectToSignInOnForbidden({ status: 403 });

  assert.equal(locationState.assignedPath, '/');

  delete global.window;
});

test('redirectToSignInOnForbidden leaves other failures to the caller', async () => {
  await storeTokens('coach-token', 'refresh-token');
  const locationState = setupWindow();

  const { redirectToSignInOnForbidden } = await import('../authRedirect.js');
  for (const status of [200, 400, 404, 500]) {
    await redirectToSignInOnForbidden({ status });
  }

  assert.equal(locationState.assignedPath, '');
  assert.equal(await getAccessToken(), 'coach-token');

  delete global.window;
  await removeTokens();
});
