import React, { useCallback, useState } from 'react';
import useAuth from '../../hooks/useAuth.jsx';

const loginInitialState = {
  email: '',
  password: ''
};

const signupInitialState = {
  fullName: '',
  email: '',
  phone: '',
  password: '',
  confirmPassword: ''
};

const LoginPage = () => {
  const { login, signup, authLoading, authError } = useAuth();
  const [mode, setMode] = useState('login');
  const [formState, setFormState] = useState(loginInitialState);
  const [formError, setFormError] = useState(null);

  const updateField = useCallback((field, value) => {
    setFormState((previous) => ({ ...previous, [field]: value }));
  }, []);

  const validate = useCallback(() => {
    const emailPattern = /.+@.+\..+/i;

    if (!formState.email.trim()) {
      return 'Please enter your email address.';
    }

    if (!emailPattern.test(formState.email.trim())) {
      return 'Please enter a valid email address.';
    }

    if (mode === 'login') {
      if (!formState.password) {
        return 'Please enter your password.';
      }
      return null;
    }

    if (!formState.fullName.trim()) {
      return 'Please enter your full name.';
    }

    if (!formState.phone.trim()) {
      return 'Please enter your contact number.';
    }

    if (!formState.password || formState.password.length < 8) {
      return 'Please create a password with at least 8 characters.';
    }

    if (formState.password !== formState.confirmPassword) {
      return 'Passwords do not match.';
    }

    return null;
  }, [formState, mode]);

  const handleSubmit = useCallback(
    async (event) => {
      event.preventDefault();
      setFormError(null);
      const validationError = validate();

      if (validationError) {
        setFormError(validationError);
        return;
      }

      if (mode === 'login') {
        const result = await login(formState.email.trim(), formState.password);
        if (result?.error) {
          setFormError(result.error);
        } else {
          setFormState(loginInitialState);
        }
      } else {
        const payload = {
          full_name: formState.fullName.trim(),
          email: formState.email.trim(),
          phone: formState.phone.trim(),
          phone_number: formState.phone.trim(),
          password: formState.password,
          confirm_password: formState.confirmPassword
        };

        const result = await signup(payload);
        if (result?.error) {
          setFormError(result.error);
        } else {
          setFormState(loginInitialState);
          setMode('login');
        }
      }
    },
    [formState, mode, login, signup, validate]
  );

  const switchMode = useCallback(() => {
    setFormError(null);
    if (mode === 'login') {
      setMode('signup');
      setFormState(signupInitialState);
    } else {
      setMode('login');
      setFormState(loginInitialState);
    }
  }, [mode]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-green-50 to-white px-4 py-12">
      <div className="w-full max-w-md rounded-2xl border border-emerald-100 bg-white p-8 shadow-xl">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-xl bg-gradient-to-br from-green-500 to-emerald-600 text-2xl font-bold text-white">
            TP
          </div>
          <h1 className="text-2xl font-semibold text-gray-900">Coach Portal</h1>
          <p className="mt-2 text-sm text-gray-600">
            {mode === 'login' ? 'Sign in to manage your coaching profile.' : 'Create your coach account to get started.'}
          </p>
        </div>

        <form className="space-y-6" onSubmit={handleSubmit}>
          {mode === 'signup' && (
            <>
              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700" htmlFor="coach-signup-full-name">
                  Full name
                </label>
                <input
                  id="coach-signup-full-name"
                  type="text"
                  autoComplete="name"
                  className="w-full rounded-lg border border-gray-300 px-4 py-3 text-sm shadow-sm focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-200"
                  value={formState.fullName}
                  onChange={(event) => updateField('fullName', event.target.value)}
                  disabled={authLoading}
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700" htmlFor="coach-signup-phone">
                  Mobile number
                </label>
                <input
                  id="coach-signup-phone"
                  type="tel"
                  autoComplete="tel"
                  className="w-full rounded-lg border border-gray-300 px-4 py-3 text-sm shadow-sm focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-200"
                  value={formState.phone}
                  onChange={(event) => updateField('phone', event.target.value)}
                  disabled={authLoading}
                />
              </div>
            </>
          )}

          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700" htmlFor="coach-login-email">
              Email
            </label>
            <input
              id="coach-login-email"
              type="email"
              autoComplete="email"
              className="w-full rounded-lg border border-gray-300 px-4 py-3 text-sm shadow-sm focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-200"
              value={formState.email}
              onChange={(event) => updateField('email', event.target.value)}
              disabled={authLoading}
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700" htmlFor="coach-login-password">
              Password
            </label>
            <input
              id="coach-login-password"
              type="password"
              autoComplete="current-password"
              className="w-full rounded-lg border border-gray-300 px-4 py-3 text-sm shadow-sm focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-200"
              value={formState.password}
              onChange={(event) => updateField('password', event.target.value)}
              disabled={authLoading}
            />
          </div>

          {mode === 'signup' && (
            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700" htmlFor="coach-signup-confirm-password">
                Confirm password
              </label>
              <input
                id="coach-signup-confirm-password"
                type="password"
                autoComplete="new-password"
                className="w-full rounded-lg border border-gray-300 px-4 py-3 text-sm shadow-sm focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-200"
                value={formState.confirmPassword}
                onChange={(event) => updateField('confirmPassword', event.target.value)}
                disabled={authLoading}
              />
            </div>
          )}

          {(formError || authError) && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
              {formError || authError}
            </div>
          )}

          <button
            type="submit"
            className="flex w-full items-center justify-center rounded-lg bg-gradient-to-r from-green-500 to-emerald-600 px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:from-green-600 hover:to-emerald-700 disabled:cursor-not-allowed disabled:opacity-70"
            disabled={authLoading}
          >
            {authLoading ? (mode === 'login' ? 'Signing in…' : 'Creating account…') : mode === 'login' ? 'Sign In' : 'Create Account'}
          </button>
        </form>

        <div className="mt-6 text-center text-sm text-gray-600">
          {mode === 'login' ? (
            <>
              Need an account?{' '}
              <button
                type="button"
                onClick={switchMode}
                className="font-medium text-emerald-600 hover:text-emerald-700"
              >
                Sign up as a coach
              </button>
            </>
          ) : (
            <>
              Already have an account?{' '}
              <button
                type="button"
                onClick={switchMode}
                className="font-medium text-emerald-600 hover:text-emerald-700"
              >
                Back to sign in
              </button>
            </>
          )}
        </div>

        <p className="mt-6 text-center text-xs text-gray-500">
          Access restricted to verified coaches. Please contact support if you need assistance.
        </p>
      </div>
    </div>
  );
};

export default LoginPage;
