import test from 'node:test';
import assert from 'node:assert/strict';

import { resolveAuthRedirectPath } from '../authRoutes.js';

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
