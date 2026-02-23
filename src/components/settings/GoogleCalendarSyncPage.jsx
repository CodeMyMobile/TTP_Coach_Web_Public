import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import useAuth from '../../hooks/useAuth';
import { useCoachCalendarEvents } from '../../hooks/useCoachCalendarEvents';

const formatLocalDateTime = (value) => {
  if (!value) {
    return 'TBD';
  }
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return 'TBD';
  }
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit'
  }).format(parsed);
};

const resolveEventTime = (value) => {
  if (!value) {
    return null;
  }
  if (typeof value === 'string') {
    return value;
  }
  return value.dateTime || value.date || null;
};

const extractEvents = (payload) => {
  if (Array.isArray(payload)) {
    return payload;
  }
  if (payload && Array.isArray(payload.events)) {
    return payload.events;
  }
  if (payload && Array.isArray(payload.items)) {
    return payload.items;
  }
  return [];
};

const GoogleCalendarSyncPage = ({ onBack }) => {
  const { user } = useAuth();
  const authToken = user?.session?.access_token || localStorage.getItem('token') || '';
  const { getEvents, getAuthUrl } = useCoachCalendarEvents();
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [connecting, setConnecting] = useState(false);
  const [activeMonth, setActiveMonth] = useState(() => {
    const today = new Date();
    return { year: today.getFullYear(), month: today.getMonth() };
  });
  const hasLoadedRef = useRef(false);
  const lastRangeRef = useRef('');

  const handleGoogleReconnect = useCallback(async () => {
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
  }, [authToken, getAuthUrl]);

  const timeRange = useMemo(() => {
    const start = new Date(activeMonth.year, activeMonth.month, 1, 0, 0, 0, 0);
    const end = new Date(activeMonth.year, activeMonth.month + 1, 0, 23, 59, 59, 999);
    return {
      timeMin: start.toISOString(),
      timeMax: end.toISOString()
    };
  }, [activeMonth.month, activeMonth.year]);

  const monthLabel = useMemo(() => {
    const date = new Date(activeMonth.year, activeMonth.month, 1);
    return new Intl.DateTimeFormat('en-US', { month: 'long', year: 'numeric' }).format(date);
  }, [activeMonth.month, activeMonth.year]);

  const loadEvents = useCallback(async () => {
    if (!authToken) {
      setError('Unauthorized. Please sign in again.');
      setEvents([]);
      return;
    }
    setError(null);
    setLoading(true);
    try {
      const payload = await getEvents({ token: authToken, ...timeRange });
      setEvents(extractEvents(payload));
    } catch (err) {
      const status = err?.status;
      const code = err?.code || err?.data?.code;
      if (code === 'google_reconnect_required') {
        setError('Google authorization expired. Reconnect required.');
        await handleGoogleReconnect();
      } else if (status === 404) {
        setError('Google Calendar not connected.');
      } else if (status === 401 || status === 403) {
        setError('Unauthorized. Please sign in again.');
      } else {
        const message = err instanceof Error ? err.message : 'Failed to load events.';
        setError(message);
      }
      setEvents([]);
    } finally {
      setLoading(false);
    }
  }, [authToken, getEvents, handleGoogleReconnect, timeRange.timeMax, timeRange.timeMin]);

  useEffect(() => {
    const rangeKey = `${timeRange.timeMin}|${timeRange.timeMax}`;
    if (lastRangeRef.current === rangeKey) {
      if (hasLoadedRef.current) {
        return;
      }
    }
    lastRangeRef.current = rangeKey;
    hasLoadedRef.current = true;
    loadEvents();
  }, [loadEvents, timeRange.timeMax, timeRange.timeMin]);

  const shiftMonth = (offset) => {
    setActiveMonth((prev) => {
      const date = new Date(prev.year, prev.month + offset, 1);
      return { year: date.getFullYear(), month: date.getMonth() };
    });
  };

  const handleConnect = useCallback(async () => {
    if (!authToken) {
      setError('Unauthorized. Please sign in again.');
      return;
    }
    setConnecting(true);
    setError(null);
    try {
      await handleGoogleReconnect();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to start Google connection.';
      setError(message);
    } finally {
      setConnecting(false);
    }
  }, [authToken, handleGoogleReconnect]);

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="border-b bg-white">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-4">
          <div>
            <p className="text-xs uppercase text-slate-400">Integrations</p>
            <h1 className="text-2xl font-semibold text-slate-900">Coach Google Calendar Events</h1>
            <p className="text-sm text-slate-500">Preview upcoming events pulled from Google Calendar.</p>
          </div>
          <button
            type="button"
            onClick={onBack}
            className="rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-600 hover:bg-slate-50"
          >
            Back
          </button>
        </div>
      </div>

      <main className="mx-auto max-w-5xl px-4 py-6">
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold text-slate-900">Events Preview</h2>
              <p className="mt-1 text-sm text-slate-500">
                Showing events for {monthLabel}.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => shiftMonth(-1)}
                className="rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-600 transition hover:bg-slate-50"
              >
                Prev
              </button>
              <button
                type="button"
                onClick={() => shiftMonth(1)}
                className="rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-600 transition hover:bg-slate-50"
              >
                Next
              </button>
              <button
                type="button"
                onClick={loadEvents}
                disabled={loading}
                className="rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-70"
              >
                {loading ? 'Refreshing…' : 'Refresh'}
              </button>
            </div>
          </div>

          {error && (
            <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">
              {error}
            </div>
          )}

          {error === 'Google Calendar not connected.' && (
            <button
              type="button"
              onClick={handleConnect}
              disabled={connecting}
              className="mt-4 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-emerald-300"
            >
              {connecting ? 'Connecting…' : 'Connect Google Calendar'}
            </button>
          )}

          <div className="mt-6 space-y-4">
            {loading && (
              <div className="rounded-lg border border-dashed border-slate-200 bg-slate-50 px-4 py-6 text-center text-sm text-slate-500">
                Loading events…
              </div>
            )}

            {!loading && events.length === 0 && !error && (
              <div className="rounded-lg border border-dashed border-slate-200 bg-slate-50 px-4 py-6 text-center text-sm text-slate-500">
                No events found in this time range.
              </div>
            )}

            {!loading && events.map((event, index) => {
              const startValue = resolveEventTime(event.start);
              const endValue = resolveEventTime(event.end);
              return (
                <div
                  key={`${event.id || event.summary || 'event'}-${index}`}
                  className="rounded-xl border border-slate-200 p-4"
                >
                  <div className="text-sm font-semibold text-slate-900">
                    {event.summary || event.title || 'Untitled event'}
                  </div>
                  <div className="mt-1 text-sm text-slate-500">
                    {formatLocalDateTime(startValue)} → {formatLocalDateTime(endValue)}
                  </div>
                  {event.location && (
                    <div className="mt-1 text-xs text-slate-400">{event.location}</div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </main>
    </div>
  );
};

export default GoogleCalendarSyncPage;
