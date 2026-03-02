import React, { useCallback, useMemo, useState } from 'react';
import useAuth from '../../hooks/useAuth.jsx';

const loginInitialState = {
  email: '',
  password: '',
  rememberMe: false
};

const signupInitialState = {
  firstName: '',
  lastName: '',
  phone: '',
  email: '',
  password: ''
};

const GoogleIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true">
    <path
      fill="#4285F4"
      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
    />
    <path
      fill="#34A853"
      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
    />
    <path
      fill="#FBBC05"
      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
    />
    <path
      fill="#EA4335"
      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
    />
  </svg>
);

const LoginPage = () => {
  const { login, signup, authLoading, authError } = useAuth();
  const [mode, setMode] = useState('login');
  const [loginState, setLoginState] = useState(loginInitialState);
  const [signupState, setSignupState] = useState(signupInitialState);
  const [formError, setFormError] = useState(null);

  const activeState = mode === 'login' ? loginState : signupState;

  const updateField = useCallback((field, value) => {
    setFormError(null);
    if (mode === 'login') {
      setLoginState((previous) => ({ ...previous, [field]: value }));
      return;
    }
    setSignupState((previous) => ({ ...previous, [field]: value }));
  }, [mode]);

  const validate = useCallback(() => {
    const emailPattern = /.+@.+\..+/i;

    if (!activeState.email.trim()) {
      return 'Please enter your email address.';
    }

    if (!emailPattern.test(activeState.email.trim())) {
      return 'Please enter a valid email address.';
    }

    if (mode === 'login') {
      if (!activeState.password) {
        return 'Please enter your password.';
      }
      return null;
    }

    if (!signupState.firstName.trim()) {
      return 'Please enter your first name.';
    }

    if (!signupState.lastName.trim()) {
      return 'Please enter your last name.';
    }

    if (!signupState.phone.trim()) {
      return 'Please enter your contact number.';
    }

    if (!signupState.password || signupState.password.length < 8) {
      return 'Please create a password with at least 8 characters.';
    }

    return null;
  }, [activeState, mode, signupState]);

  const handleSubmit = useCallback(async (event) => {
    event.preventDefault();
    setFormError(null);
    const validationError = validate();

    if (validationError) {
      setFormError(validationError);
      return;
    }

    if (mode === 'login') {
      const result = await login(loginState.email.trim(), loginState.password);
      if (result?.error) {
        setFormError(result.error);
      } else {
        setLoginState(loginInitialState);
      }
      return;
    }

    const fullName = `${signupState.firstName.trim()} ${signupState.lastName.trim()}`.trim();
    const payload = {
      full_name: fullName,
      email: signupState.email.trim(),
      phone: signupState.phone.trim(),
      phone_number: signupState.phone.trim(),
      password: signupState.password,
      confirm_password: signupState.password
    };

    const result = await signup(payload);
    if (result?.error) {
      setFormError(result.error);
    } else {
      setSignupState(signupInitialState);
      setMode('login');
    }
  }, [login, loginState.email, loginState.password, mode, signup, signupState, validate]);

  const switchMode = useCallback((nextMode) => {
    setFormError(null);
    setMode(nextMode);
  }, []);

  const headline = useMemo(
    () => (mode === 'login' ? 'Manage your coaching business with ease' : 'Start growing your coaching business today'),
    [mode]
  );

  const subhead = useMemo(
    () =>
      mode === 'login'
        ? 'Schedule lessons, track payments, and grow your tennis coaching business — all in one place.'
        : 'Join hundreds of coaches using The Tennis Plan to manage lessons, students, and payments.',
    [mode]
  );

  return (
    <div className="min-h-screen bg-slate-100 px-4 py-6 md:px-6 md:py-12">
      <div className="mx-auto flex w-full max-w-6xl overflow-hidden rounded-3xl bg-white shadow-2xl md:min-h-[640px]">
        <aside className="relative hidden flex-1 overflow-hidden bg-gradient-to-br from-violet-500 to-violet-700 p-12 md:flex md:flex-col md:justify-center">
          <div className="pointer-events-none absolute -right-10 -top-10 text-[300px] opacity-10">🎾</div>
          <div className="relative z-10">
            <div className="mb-10 flex items-center gap-3">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/20 text-2xl">🎾</div>
              <p className="text-3xl font-bold text-white">
                The Tennis <span className="font-normal text-white/90">Plan</span>
              </p>
            </div>

            <h1 className="mb-5 text-4xl font-bold leading-tight text-white">{headline}</h1>
            <p className="mb-10 text-lg leading-relaxed text-white/85">{subhead}</p>

            <div className="space-y-4 text-white/90">
              {(mode === 'login'
                ? [
                    ['📅', 'Smart scheduling & calendar sync'],
                    ['💳', 'Easy payments & invoicing'],
                    ['👥', 'Student management & progress']
                  ]
                : [
                    ['✓', 'Free to get started'],
                    ['✓', 'Set up in under 2 minutes'],
                    ['✓', 'No credit card required']
                  ]
              ).map(([icon, text]) => (
                <div key={text} className="flex items-center gap-3 text-base">
                  <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/20 text-sm">{icon}</span>
                  <span>{text}</span>
                </div>
              ))}
            </div>
          </div>
        </aside>

        <section className="w-full p-6 sm:p-8 md:w-[460px] md:p-12">
          <div className="relative mb-8 overflow-hidden rounded-2xl bg-gradient-to-br from-violet-500 to-violet-700 p-6 text-center md:hidden">
            <div className="absolute -right-4 -top-5 text-8xl opacity-10">🎾</div>
            <div className="relative z-10">
              <div className="mb-3 flex items-center justify-center gap-2">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/20">🎾</div>
                <p className="text-xl font-bold text-white">
                  The Tennis <span className="font-normal text-white/90">Plan</span>
                </p>
              </div>
              <h1 className="text-xl font-bold text-white">{mode === 'login' ? 'Manage your coaching business' : 'Start growing your business'}</h1>
            </div>
          </div>

          <div className="mb-6 flex rounded-xl bg-slate-100 p-1">
            <button
              type="button"
              className={`flex-1 rounded-lg px-3 py-2.5 text-sm font-semibold transition ${
                mode === 'login' ? 'bg-white text-slate-800 shadow' : 'text-slate-500 hover:text-slate-700'
              }`}
              onClick={() => switchMode('login')}
              disabled={authLoading}
            >
              Sign In
            </button>
            <button
              type="button"
              className={`flex-1 rounded-lg px-3 py-2.5 text-sm font-semibold transition ${
                mode === 'signup' ? 'bg-white text-slate-800 shadow' : 'text-slate-500 hover:text-slate-700'
              }`}
              onClick={() => switchMode('signup')}
              disabled={authLoading}
            >
              Sign Up
            </button>
          </div>

          <h2 className="mb-1 text-2xl font-bold text-slate-800">{mode === 'login' ? 'Welcome back' : 'Create your account'}</h2>
          <p className="mb-6 text-sm text-slate-500">
            {mode === 'login' ? 'Sign in to your coach account' : 'Start managing your coaching business'}
          </p>

          <form className="space-y-4" onSubmit={handleSubmit}>
            {mode === 'signup' && (
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <label className="mb-1.5 block text-sm font-semibold text-slate-800" htmlFor="signup-first-name">First name</label>
                  <input
                    id="signup-first-name"
                    type="text"
                    autoComplete="given-name"
                    className="w-full rounded-xl border-2 border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-violet-500"
                    value={signupState.firstName}
                    onChange={(event) => updateField('firstName', event.target.value)}
                    disabled={authLoading}
                    placeholder="Paul"
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-semibold text-slate-800" htmlFor="signup-last-name">Last name</label>
                  <input
                    id="signup-last-name"
                    type="text"
                    autoComplete="family-name"
                    className="w-full rounded-xl border-2 border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-violet-500"
                    value={signupState.lastName}
                    onChange={(event) => updateField('lastName', event.target.value)}
                    disabled={authLoading}
                    placeholder="Cochrane"
                  />
                </div>
              </div>
            )}

            {mode === 'signup' && (
              <div>
                <label className="mb-1.5 block text-sm font-semibold text-slate-800" htmlFor="signup-phone">Cell phone</label>
                <input
                  id="signup-phone"
                  type="tel"
                  autoComplete="tel"
                  className="w-full rounded-xl border-2 border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-violet-500"
                  value={signupState.phone}
                  onChange={(event) => updateField('phone', event.target.value)}
                  disabled={authLoading}
                  placeholder="(555) 123-4567"
                />
              </div>
            )}

            <div>
              <label className="mb-1.5 block text-sm font-semibold text-slate-800" htmlFor="auth-email">Email</label>
              <input
                id="auth-email"
                type="email"
                autoComplete="email"
                className="w-full rounded-xl border-2 border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-violet-500"
                value={activeState.email}
                onChange={(event) => updateField('email', event.target.value)}
                disabled={authLoading}
                placeholder="coach@example.com"
              />
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-semibold text-slate-800" htmlFor="auth-password">Password</label>
              <input
                id="auth-password"
                type="password"
                autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                className="w-full rounded-xl border-2 border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-violet-500"
                value={activeState.password}
                onChange={(event) => updateField('password', event.target.value)}
                disabled={authLoading}
                placeholder={mode === 'login' ? 'Enter your password' : 'Create a password'}
              />
            </div>

            {mode === 'login' && (
              <div className="flex items-center justify-between text-sm">
                <label className="flex cursor-pointer items-center gap-2 text-slate-500">
                  <input
                    type="checkbox"
                    className="h-4 w-4 accent-violet-500"
                    checked={loginState.rememberMe}
                    onChange={(event) => updateField('rememberMe', event.target.checked)}
                    disabled={authLoading}
                  />
                  Remember me
                </label>
                <button type="button" className="font-semibold text-violet-500 hover:underline" disabled>
                  Forgot password?
                </button>
              </div>
            )}

            {(formError || authError) && (
              <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">{formError || authError}</div>
            )}

            <button
              type="submit"
              className="w-full rounded-xl bg-violet-500 px-4 py-4 text-sm font-bold text-white transition hover:bg-violet-600 disabled:cursor-not-allowed disabled:opacity-70"
              disabled={authLoading}
            >
              {authLoading ? (mode === 'login' ? 'Signing in…' : 'Creating account…') : mode === 'login' ? 'Sign In' : 'Create Account'}
            </button>
          </form>

          <div className="my-6 flex items-center gap-3">
            <span className="h-px flex-1 bg-slate-200" />
            <span className="text-xs text-slate-400">or</span>
            <span className="h-px flex-1 bg-slate-200" />
          </div>

          <button
            type="button"
            className="flex w-full items-center justify-center gap-2 rounded-xl border-2 border-slate-200 px-4 py-3 text-sm font-semibold text-slate-800 transition hover:bg-slate-50"
            disabled
          >
            <GoogleIcon />
            {mode === 'login' ? 'Continue with Google' : 'Sign up with Google'}
          </button>

          {mode === 'signup' && (
            <p className="mt-5 text-center text-xs leading-relaxed text-slate-500">
              By signing up, you agree to our <a href="#" className="text-violet-500">Terms of Service</a> and{' '}
              <a href="#" className="text-violet-500">Privacy Policy</a>
            </p>
          )}
        </section>
      </div>
    </div>
  );
};

export default LoginPage;
