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
