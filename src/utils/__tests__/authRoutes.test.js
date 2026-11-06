import test from 'node:test';
import assert from 'node:assert/strict';

import { clearReturnPath, peekReturnPath, rememberReturnPath, resolveAuthRedirectPath } from '../authRoutes.js';

const allowedAuthenticatedRoutes = new Set(['/dashboard', '/settings']);

test('unauthenticated users default to sign in route', () => {
  assert.equal(
    resolveAuthRedirectPath({
      authInitialising: false,
      isAuthenticated: false,
      currentPath: '/dashboard',
      allowedAuthenticatedRoutes
    }),
    '/'
  );
});

test('authenticated users default to dashboard route', () => {
  assert.equal(
    resolveAuthRedirectPath({
      authInitialising: false,
      isAuthenticated: true,
      currentPath: '/',
      allowedAuthenticatedRoutes
    }),
    '/dashboard'
  );
});

test('route guard does nothing while auth is initialising', () => {
  assert.equal(
    resolveAuthRedirectPath({
      authInitialising: true,
      isAuthenticated: false,
      currentPath: '/dashboard',
      allowedAuthenticatedRoutes
    }),
    null
  );
});

test('a coach signing in from a link to one request, lesson or player is taken back to it', () => {
  for (const returnPath of ['/dashboard/requests/7', '/dashboard/lesson/12', '/dashboard/players/40']) {
    assert.equal(
      resolveAuthRedirectPath({
        authInitialising: false,
        isAuthenticated: true,
        currentPath: '/',
        allowedAuthenticatedRoutes,
        returnPath
      }),
      returnPath
    );
  }
});

test('only those links are returned to; anything else goes to the dashboard', () => {
  for (const returnPath of ['/settings/../dashboard', 'https://evil.example/dashboard/requests/7', '//evil.example', '/dashboard/requests/7/extra', null]) {
    assert.equal(
      resolveAuthRedirectPath({
        authInitialising: false,
        isAuthenticated: true,
        currentPath: '/',
        allowedAuthenticatedRoutes,
        returnPath
      }),
      '/dashboard'
    );
  }
});

test('a signed-out coach on a link is still sent to sign in', () => {
  assert.equal(
    resolveAuthRedirectPath({
      authInitialising: false,
      isAuthenticated: false,
      currentPath: '/dashboard/requests/7',
      allowedAuthenticatedRoutes,
      returnPath: '/dashboard/requests/7'
    }),
    '/'
  );
});

test('the link is remembered for the tab, then cleared', () => {
  const items = new Map();
  global.window = {
    sessionStorage: {
      getItem: (key) => (items.has(key) ? items.get(key) : null),
      setItem: (key, value) => items.set(key, value),
      removeItem: (key) => items.delete(key)
    }
  };

  rememberReturnPath('/dashboard/settings');
  assert.equal(peekReturnPath(), null);
  rememberReturnPath('/dashboard/requests/7');
  assert.equal(peekReturnPath(), '/dashboard/requests/7');
  clearReturnPath();
  assert.equal(peekReturnPath(), null);

  delete global.window;
});
