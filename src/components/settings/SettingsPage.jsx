import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { addCoachProfile, getCoachProfile, updateProfileDetails } from '../../api/CoachApi/profileScreen';
import { createStripeOnboardingLink, refreshStripeOnboardingLink } from '../../api/CoachApi/payments';
import { useGoogleCalendarSync } from '../../hooks/useGoogleCalendarSync';
import useAuth from '../../hooks/useAuth';

const SettingsPage = ({ onBack, onOpenGoogleCalendar }) => {
  const { user } = useAuth();
  const [form, setForm] = useState({
    fullName: '',
    aboutMe: '',
    hourlyRate: '',
    email: '',
    phone: '',
    experienceYears: '',
    certifications: '',
    pricePrivate: '',
    priceSemi: '',
    priceGroup: '',
    otherLanguages: ''
  });
  const [profileId, setProfileId] = useState(null);
  const [action, setAction] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [stripeStatus, setStripeStatus] = useState({
    accountId: '',
    chargesEnabled: false,
    chargesDisabledReason: ''
  });
  const { getAuthUrl, syncEvents, getSyncedEvents } = useGoogleCalendarSync();
  const authToken = user?.session?.access_token || localStorage.getItem('token') || '';
  const [googleError, setGoogleError] = useState(null);
  const [googleStatus, setGoogleStatus] = useState('unknown');
  const [googleLoading, setGoogleLoading] = useState(false);
  const [googleSyncLoading, setGoogleSyncLoading] = useState(false);
  const [googleEventsLoading, setGoogleEventsLoading] = useState(false);
  const [googleSyncResult, setGoogleSyncResult] = useState(null);
  const [googleEvents, setGoogleEvents] = useState([]);
  const [lastGoogleSyncAt, setLastGoogleSyncAt] = useState(() => localStorage.getItem('google_calendar_last_sync') || '');
  const [activeMonth, setActiveMonth] = useState(() => {
    const today = new Date();
    return { year: today.getFullYear(), month: today.getMonth() };
  });
  const [stripeActionLoading, setStripeActionLoading] = useState(false);
  const [stripeActionError, setStripeActionError] = useState(null);
  const stripeWindowRef = useRef(null);
  const stripeWatchRef = useRef(null);

  const loadProfile = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await getCoachProfile();
      if (!response) {
        throw new Error('Failed to load profile.');
      }

      if (!response.ok) {
        const errorBody = await response.json().catch(() => null);
        throw new Error(errorBody?.message || errorBody?.error || 'Failed to load profile.');
      }

      const payload = await response.json().catch(() => null);
      setProfileId(payload?.id ?? payload?.profile_id ?? null);
      setForm({
        fullName: payload?.full_name || payload?.name || '',
        aboutMe: payload?.about_me || payload?.bio || '',
        hourlyRate: payload?.hourly_rate ?? payload?.rate ?? '',
        email: payload?.email || '',
        phone: payload?.phone || '',
        experienceYears: payload?.experience_years ?? '',
        certifications: payload?.certifications ?? '',
        pricePrivate: payload?.price_private ?? '',
        priceSemi: payload?.price_semi ?? '',
        priceGroup: payload?.price_group ?? '',
        otherLanguages: payload?.other_languages ?? ''
      });
      setStripeStatus({
        accountId: payload?.stripe_account_id || '',
        chargesEnabled: Boolean(payload?.charges_enabled),
        chargesDisabledReason: payload?.charges_disabled_reason || ''
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load profile.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadProfile();
  }, [loadProfile]);

  useEffect(() => {
    if (lastGoogleSyncAt) {
      localStorage.setItem('google_calendar_last_sync', lastGoogleSyncAt);
    }
  }, [lastGoogleSyncAt]);

  const monthLabel = useMemo(() => {
    const date = new Date(activeMonth.year, activeMonth.month, 1);
    return new Intl.DateTimeFormat('en-US', { month: 'long', year: 'numeric' }).format(date);
  }, [activeMonth.month, activeMonth.year]);

  const timeRange = useMemo(() => {
    const start = new Date(activeMonth.year, activeMonth.month, 1, 0, 0, 0, 0);
    const end = new Date(activeMonth.year, activeMonth.month + 1, 0, 23, 59, 59, 999);
    return {
      timeMin: start.toISOString(),
      timeMax: end.toISOString()
    };
  }, [activeMonth.month, activeMonth.year]);

  useEffect(() => {
    return () => {
      if (stripeWatchRef.current) {
        clearInterval(stripeWatchRef.current);
        stripeWatchRef.current = null;
      }
    };
  }, []);

  const watchStripeWindow = useCallback(() => {
    if (stripeWatchRef.current) {
      clearInterval(stripeWatchRef.current);
      stripeWatchRef.current = null;
    }

    stripeWatchRef.current = window.setInterval(() => {
      if (!stripeWindowRef.current || stripeWindowRef.current.closed) {
        stripeWindowRef.current = null;
        if (stripeWatchRef.current) {
          clearInterval(stripeWatchRef.current);
          stripeWatchRef.current = null;
        }
        loadProfile();
      }
    }, 1000);
  }, [loadProfile]);

  const openStripeWindow = useCallback(
    (payload) => {
      const redirectUrl = (payload?.redirect_url || payload?.url || payload?.onboarding_url || '').trim();
      if (!redirectUrl || typeof window === 'undefined') {
        return;
      }

      const stripeWindow = window.open(redirectUrl, '_blank', 'noopener,noreferrer');
      stripeWindowRef.current = stripeWindow || null;
      watchStripeWindow();
    },
    [watchStripeWindow]
  );

  const handleStripeConnect = useCallback(async () => {
    setStripeActionError(null);
    setStripeActionLoading(true);
    try {
      const response = await createStripeOnboardingLink();
      if (!response) {
        throw new Error('Failed to start Stripe onboarding.');
      }
      const payload = await response.json().catch(() => null);
      if (!response.ok) {
        const message = payload?.message || payload?.error || 'Failed to start Stripe onboarding.';
        throw new Error(message);
      }
      openStripeWindow(payload || {});
    } catch (err) {
      setStripeActionError(err instanceof Error ? err.message : 'Failed to start Stripe onboarding.');
    } finally {
      setStripeActionLoading(false);
    }
  }, [openStripeWindow]);

  const handleStripeRefresh = useCallback(async () => {
    setStripeActionError(null);
    setStripeActionLoading(true);
    try {
      const response = await refreshStripeOnboardingLink();
      if (!response) {
        throw new Error('Unable to refresh Stripe onboarding.');
      }
      const payload = await response.json().catch(() => null);
      if (!response.ok) {
        const message = payload?.message || payload?.error || 'Unable to refresh Stripe onboarding.';
        throw new Error(message);
      }
      openStripeWindow(payload || {});
    } catch (err) {
      setStripeActionError(err instanceof Error ? err.message : 'Unable to refresh Stripe onboarding.');
    } finally {
      setStripeActionLoading(false);
    }
  }, [openStripeWindow]);

  const handleGoogleConnect = useCallback(async () => {
    setGoogleError(null);
    setGoogleLoading(true);
    try {
      if (!authToken) {
        throw new Error('Unauthorized. Please sign in again.');
      }
      const payload = await getAuthUrl({ token: authToken });
      const redirectUrl =
        payload?.redirect_url || payload?.url || payload?.auth_url || payload?.authorization_url;
      if (!redirectUrl) {
        throw new Error('No Google auth URL returned.');
      }
      window.location.assign(redirectUrl);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to connect Google Calendar.';
      setGoogleError(message);
    } finally {
      setGoogleLoading(false);
    }
  }, [authToken, getAuthUrl]);

  const handleGoogleSync = useCallback(async () => {
    setGoogleError(null);
    setGoogleSyncResult(null);
    setGoogleSyncLoading(true);
    try {
      if (!authToken) {
        throw new Error('Unauthorized. Please sign in again.');
      }
      const payload = await syncEvents({
        token: authToken,
        timeMin: timeRange.timeMin,
        timeMax: timeRange.timeMax
      });
      setGoogleSyncResult(payload);
      setLastGoogleSyncAt(new Date().toISOString());
      setGoogleStatus('connected');
    } catch (err) {
      const status = err?.status;
      if (status === 404) {
        setGoogleStatus('not_connected');
        setGoogleError('Google Calendar not connected.');
      } else {
        const message = err instanceof Error ? err.message : 'Failed to sync Google Calendar.';
        setGoogleError(message);
      }
    } finally {
      setGoogleSyncLoading(false);
    }
  }, [authToken, syncEvents, timeRange.timeMax, timeRange.timeMin]);

  const handleLoadSyncedEvents = useCallback(async () => {
    setGoogleError(null);
    setGoogleEventsLoading(true);
    try {
      if (!authToken) {
        throw new Error('Unauthorized. Please sign in again.');
      }
      const payload = await getSyncedEvents({
        token: authToken,
        timeMin: timeRange.timeMin,
        timeMax: timeRange.timeMax
      });
      const items = Array.isArray(payload) ? payload : payload?.events || payload?.items || [];
      setGoogleEvents(items);
      setGoogleStatus('connected');
    } catch (err) {
      const status = err?.status;
      if (status === 404) {
        setGoogleStatus('not_connected');
        setGoogleError('Google Calendar not connected.');
      } else if (status === 401 || status === 403) {
        setGoogleError('Unauthorized. Please sign in again.');
      } else {
        const message = err instanceof Error ? err.message : 'Failed to load synced events.';
        setGoogleError(message);
      }
      setGoogleEvents([]);
    } finally {
      setGoogleEventsLoading(false);
    }
  }, [authToken, getSyncedEvents, timeRange.timeMax, timeRange.timeMin]);

  const shiftGoogleMonth = (offset) => {
    setActiveMonth((prev) => {
      const date = new Date(prev.year, prev.month + offset, 1);
      return { year: date.getFullYear(), month: date.getMonth() };
    });
  };

  const handleSave = async () => {
    setAction(null);
    setSaving(true);
    setError(null);

    try {
      if (!form.fullName.trim()) {
        throw new Error('Full name is required.');
      }

      const hourlyRate = Number(form.hourlyRate);
      const resolvedRate = Number.isFinite(hourlyRate) ? hourlyRate : 0;

      if (profileId) {
        const response = await updateProfileDetails({
          coachAccesstoken: user?.session?.access_token,
          id: profileId,
          fullName: form.fullName.trim(),
          aboutMe: form.aboutMe.trim(),
          hourlyRate: resolvedRate
        });

        if (!response?.ok) {
          const errorBody = await response?.json().catch(() => null);
          throw new Error(errorBody?.message || errorBody?.error || 'Failed to save profile.');
        }
      } else {
        const response = await addCoachProfile({
          accessToken: user?.session?.access_token,
          fullName: form.fullName.trim(),
          aboutMe: form.aboutMe.trim(),
          hourlyRate: resolvedRate,
          profilePicture: ''
        });

        if (!response?.ok) {
          const errorBody = await response?.json().catch(() => null);
          throw new Error(errorBody?.message || errorBody?.error || 'Failed to create profile.');
        }

        const created = await response.json().catch(() => null);
        setProfileId(created?.id ?? created?.profile_id ?? null);
      }

      setAction({ type: 'success', message: 'Profile saved successfully.' });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to save profile.';
      setAction({ type: 'error', message });
      setError(message);
    } finally {
      setSaving(false);
    }
  };

  const completionFields = [form.fullName, form.aboutMe, form.hourlyRate].filter((value) => String(value).trim()).length;
  const profileCompletion = Math.round((completionFields / 3) * 100);

  return (
    <div className="min-h-screen bg-slate-50 px-4 py-6">
      <main className="mx-auto max-w-7xl">
        <div className="mb-6 overflow-hidden rounded-3xl border border-slate-200 bg-white">
          <div className="flex flex-wrap items-start justify-between gap-4 border-b border-slate-200 px-6 py-6">
            <div className="flex items-start gap-4">
              <button
                type="button"
                onClick={onBack}
                className="rounded-xl border border-slate-200 px-4 py-2 text-xl text-slate-600 transition hover:bg-slate-50"
              >
                ‹
              </button>
              <div>
                <h1 className="text-3xl font-semibold text-slate-900 md:text-4xl">Edit Profile</h1>
                <p className="text-lg text-slate-400 md:text-2xl">Changes are visible to students after saving</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onOpenGoogleCalendar}
              className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-700"
            >
              Open Google Calendar Sync
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className="rounded-lg bg-purple-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-purple-700 disabled:cursor-not-allowed disabled:bg-purple-300"
            >
              {saving ? 'Saving…' : 'Save Profile'}
            </button>
          </div>
          </div>

          <div className="border-b border-slate-200 px-6 py-4">
            <div className="mb-2 flex items-center justify-between text-sm font-semibold text-slate-700">
              <span>Profile completion</span>
              <span className="text-emerald-600">{profileCompletion}%</span>
            </div>
            <div className="h-2 rounded-full bg-slate-100">
              <div className="h-2 rounded-full bg-emerald-500" style={{ width: `${profileCompletion}%` }} />
            </div>
          </div>

        {(action || error || stripeActionError) && (
          <div
            className={`mx-6 mt-6 rounded-lg border px-4 py-3 text-sm ${
              (action?.type === 'error' || error)
                ? 'border-red-200 bg-red-50 text-red-700'
                : 'border-green-200 bg-green-50 text-green-700'
            }`}
          >
            {action?.message || error || stripeActionError}
          </div>
        )}
        </div>

        <div className="mb-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold text-slate-900">Google Calendar Sync</h2>
              <p className="text-sm text-slate-500">
                Sync Google events to block availability automatically.
              </p>
            </div>
            {googleStatus === 'connected' && lastGoogleSyncAt && (
              <div className="text-xs text-slate-400">
                Last synced {new Date(lastGoogleSyncAt).toLocaleString()}
              </div>
            )}
          </div>

          {googleError && (
            <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">
              {googleError}
            </div>
          )}

          {googleStatus === 'not_connected' && (
            <button
              type="button"
              onClick={handleGoogleConnect}
              disabled={googleLoading}
              className="mt-4 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-emerald-300"
            >
              {googleLoading ? 'Connecting…' : 'Connect Google Calendar'}
            </button>
          )}

          {googleStatus !== 'not_connected' && (
            <div className="mt-4 space-y-4">
              <div className="flex flex-wrap items-center gap-2 text-sm text-slate-600">
                <button
                  type="button"
                  onClick={() => shiftGoogleMonth(-1)}
                  className="rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-600 transition hover:bg-slate-50"
                >
                  Prev
                </button>
                <span className="font-medium">{monthLabel}</span>
                <button
                  type="button"
                  onClick={() => shiftGoogleMonth(1)}
                  className="rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-600 transition hover:bg-slate-50"
                >
                  Next
                </button>
              </div>

              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={handleGoogleSync}
                  disabled={googleSyncLoading}
                  className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-emerald-300"
                >
                  {googleSyncLoading ? 'Syncing…' : 'Sync Now'}
                </button>
                <button
                  type="button"
                  onClick={handleLoadSyncedEvents}
                  disabled={googleEventsLoading}
                  className="rounded-lg border border-slate-200 px-4 py-2 text-sm text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-70"
                >
                  {googleEventsLoading ? 'Loading…' : 'View Synced Events'}
                </button>
              </div>

              {googleSyncResult && (
                <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
                  Synced events. Fetched: {googleSyncResult.fetched ?? 0}, Upserted: {googleSyncResult.upserted ?? 0},
                  Deleted: {googleSyncResult.deleted ?? 0}.
                </div>
              )}

              {googleEvents.length > 0 && (
                <div className="text-xs text-slate-500">
                  These events block availability automatically.
                </div>
              )}

              <div className="space-y-3">
                {googleEvents.length === 0 && !googleEventsLoading && (
                  <div className="rounded-lg border border-dashed border-slate-200 bg-slate-50 px-4 py-6 text-center text-sm text-slate-500">
                    No synced events in this month.
                  </div>
                )}
                {googleEvents.map((event, index) => {
                  const startValue =
                    event.start_datetime ||
                    event.start?.dateTime ||
                    event.start?.date ||
                    event.raw_payload?.start?.dateTime ||
                    event.raw_payload?.start?.date;
                  const endValue =
                    event.end_datetime ||
                    event.end?.dateTime ||
                    event.end?.date ||
                    event.raw_payload?.end?.dateTime ||
                    event.raw_payload?.end?.date;
                  const isAllDay =
                    Boolean(event.all_day) ||
                    Boolean(event.start?.date && !event.start?.dateTime) ||
                    Boolean(event.raw_payload?.start?.date && !event.raw_payload?.start?.dateTime);
                  return (
                    <div key={`${event.id || event.summary || 'event'}-${index}`} className="rounded-xl border border-slate-200 p-4">
                      <div className="flex items-center justify-between">
                        <div className="text-sm font-semibold text-slate-900">
                          {event.summary || 'Untitled event'}
                        </div>
                        {isAllDay && (
                          <span className="rounded-full bg-slate-100 px-2 py-1 text-xs text-slate-600">All day</span>
                        )}
                      </div>
                      <div className="mt-1 text-sm text-slate-500">
                        {startValue ? new Date(startValue).toLocaleString() : 'TBD'} → {endValue ? new Date(endValue).toLocaleString() : 'TBD'}
                      </div>
                      {event.location && (
                        <div className="mt-1 text-xs text-slate-400">{event.location}</div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
          {loading ? (
            <div className="p-6 text-sm text-gray-500">Loading profile...</div>
          ) : (
            <div className="grid lg:grid-cols-[280px_1fr]">
              <aside className="border-b border-r border-slate-200 bg-slate-50 p-6 lg:border-b-0">
                <p className="mb-4 text-xs font-bold uppercase tracking-[0.2em] text-slate-400">Public Profile</p>
                <div className="space-y-2">
                  {['Basic Info', 'Courts', 'Levels', 'Specialties', 'Formats', 'Pricing', 'Languages'].map((item) => (
                    <div key={item} className="flex items-center justify-between rounded-xl bg-white px-4 py-3 shadow-sm">
                      <span className={item === 'Basic Info' ? 'font-semibold text-violet-600' : 'font-medium text-slate-700'}>{item}</span>
                      <span className="text-emerald-500">✓</span>
                    </div>
                  ))}
                </div>
                <p className="mb-4 mt-6 text-xs font-bold uppercase tracking-[0.2em] text-slate-400">Business</p>
                <div className="rounded-xl bg-white px-4 py-3 font-medium text-slate-700 shadow-sm">Payments</div>
              </aside>
              <div className="grid gap-4 p-6">
                <div>
                  <h2 className="text-3xl font-semibold text-slate-900">Basic Info</h2>
                  <p className="text-lg text-slate-500">Your name, photo, and bio are the first things students see.</p>
                </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Full name *</label>
                <input
                  type="text"
                  value={form.fullName}
                  onChange={(event) => setForm((prev) => ({ ...prev, fullName: event.target.value }))}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">About *</label>
                <textarea
                  rows={4}
                  value={form.aboutMe}
                  onChange={(event) => setForm((prev) => ({ ...prev, aboutMe: event.target.value }))}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Hourly rate *</label>
                <input
                  type="number"
                  value={form.hourlyRate}
                  onChange={(event) => setForm((prev) => ({ ...prev, hourlyRate: event.target.value }))}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">Email</label>
                  <input
                    type="email"
                    value={form.email}
                    disabled
                    className="w-full rounded-lg border border-gray-200 bg-gray-100 px-3 py-2 text-sm text-gray-500"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">Phone</label>
                  <input
                    type="tel"
                    value={form.phone}
                    disabled
                    className="w-full rounded-lg border border-gray-200 bg-gray-100 px-3 py-2 text-sm text-gray-500"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">Experience (years)</label>
                  <input
                    type="number"
                    value={form.experienceYears}
                    disabled
                    className="w-full rounded-lg border border-gray-200 bg-gray-100 px-3 py-2 text-sm text-gray-500"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">Certifications</label>
                  <input
                    type="text"
                    value={form.certifications}
                    disabled
                    className="w-full rounded-lg border border-gray-200 bg-gray-100 px-3 py-2 text-sm text-gray-500"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">Private rate</label>
                  <input
                    type="number"
                    value={form.pricePrivate}
                    disabled
                    className="w-full rounded-lg border border-gray-200 bg-gray-100 px-3 py-2 text-sm text-gray-500"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">Semi-private rate</label>
                  <input
                    type="number"
                    value={form.priceSemi}
                    disabled
                    className="w-full rounded-lg border border-gray-200 bg-gray-100 px-3 py-2 text-sm text-gray-500"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">Group rate</label>
                  <input
                    type="number"
                    value={form.priceGroup}
                    disabled
                    className="w-full rounded-lg border border-gray-200 bg-gray-100 px-3 py-2 text-sm text-gray-500"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">Other languages</label>
                  <input
                    type="text"
                    value={form.otherLanguages}
                    disabled
                    className="w-full rounded-lg border border-gray-200 bg-gray-100 px-3 py-2 text-sm text-gray-500"
                  />
                </div>
              </div>
              {stripeStatus.accountId && (
                <div className="rounded-lg border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-600">
                  <div>Stripe account: {stripeStatus.accountId}</div>
                  <div>
                    Charges enabled: {stripeStatus.chargesEnabled ? 'Yes' : 'No'}
                  </div>
                  {stripeStatus.chargesDisabledReason && (
                    <div>Reason: {stripeStatus.chargesDisabledReason}</div>
                  )}
                </div>
              )}
              <div className="rounded-lg border border-purple-100 bg-purple-50 px-4 py-3 text-sm text-purple-700">
                <div className="font-medium">Stripe onboarding</div>
                <div className="mt-2 flex flex-wrap gap-2">
                  {!stripeStatus.accountId && (
                    <button
                      type="button"
                      onClick={handleStripeConnect}
                      disabled={stripeActionLoading}
                      className="rounded-lg bg-purple-600 px-3 py-2 text-sm font-semibold text-white transition hover:bg-purple-700 disabled:cursor-not-allowed disabled:bg-purple-300"
                    >
                      {stripeActionLoading ? 'Connecting…' : 'Connect with Stripe'}
                    </button>
                  )}
                  {stripeStatus.accountId && !stripeStatus.chargesEnabled && (
                    <button
                      type="button"
                      onClick={handleStripeRefresh}
                      disabled={stripeActionLoading}
                      className="rounded-lg bg-purple-600 px-3 py-2 text-sm font-semibold text-white transition hover:bg-purple-700 disabled:cursor-not-allowed disabled:bg-purple-300"
                    >
                      {stripeActionLoading ? 'Opening…' : 'Complete Stripe setup'}
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={loadProfile}
                    disabled={stripeActionLoading}
                    className="rounded-lg border border-purple-200 px-3 py-2 text-sm text-purple-700 transition hover:bg-purple-100 disabled:cursor-not-allowed disabled:opacity-70"
                  >
                    Refresh Stripe status
                  </button>
                </div>
              </div>
            </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default SettingsPage;
