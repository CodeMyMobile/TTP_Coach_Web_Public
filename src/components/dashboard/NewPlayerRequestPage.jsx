import React, { useCallback, useEffect, useRef, useState } from 'react';
import { AlertTriangle, ArrowLeft, CalendarDays, CalendarPlus, CheckCircle2, Clock, Loader2, RefreshCw } from 'lucide-react';
import { answerCoachLessonRequest, getCoachLessonRequest } from '../../services/coach';
import {
  answerErrorMessage,
  answerRows,
  hasPreferredTime,
  playerFirstName,
  requestHeadline
} from '../../utils/newPlayerRequest';

const initialsOf = (name) =>
  String(name || '')
    .replace(/\./g, '')
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('') || '?';

/**
 * A player who isn't on the roster asking for lessons, from the link in the coach's text
 * and email or the Requests list. Shows their answers beside the coach's open times, which
 * the coach can add to or edit here. "I'm interested" stays off until the coach ticks that
 * their calendar is up to date, because the player is then texted a link to book one.
 */
const NewPlayerRequestPage = ({
  requestId,
  onBack,
  onAddAvailability,
  onEditWeeklyAvailability,
  availabilityEditorOpen = false
}) => {
  const [state, setState] = useState({ kind: 'loading' });
  const [refreshing, setRefreshing] = useState(false);
  const [calendarConfirmed, setCalendarConfirmed] = useState(false);
  const [answering, setAnswering] = useState(null);
  const [answerError, setAnswerError] = useState('');
  const [playerPhone, setPlayerPhone] = useState(null);
  const [photoFailed, setPhotoFailed] = useState(false);

  const load = useCallback(
    async (mode) => {
      if (mode === 'refresh') setRefreshing(true);
      try {
        const view = await getCoachLessonRequest(requestId);
        setState({ kind: 'ready', view });
      } catch (error) {
        if (mode === 'refresh') return;
        setState({ kind: Number(error?.status) === 404 ? 'missing' : 'error' });
      } finally {
        if (mode === 'refresh') setRefreshing(false);
      }
    },
    [requestId]
  );

  useEffect(() => {
    setState({ kind: 'loading' });
    setCalendarConfirmed(false);
    setAnswerError('');
    setPlayerPhone(null);
    load('initial');
  }, [load]);

  // A time added in the availability window shows here as soon as it closes.
  const editorWasOpen = useRef(availabilityEditorOpen);
  useEffect(() => {
    if (editorWasOpen.current && !availabilityEditorOpen) {
      load('refresh');
    }
    editorWasOpen.current = availabilityEditorOpen;
  }, [availabilityEditorOpen, load]);

  // Back from another tab (e.g. Google Calendar): show the times as they are now.
  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState === 'visible' && state.kind === 'ready' && state.view.status === 'pending') {
        load('refresh');
      }
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => document.removeEventListener('visibilitychange', onVisible);
  }, [load, state]);

  const answer = useCallback(
    async (action) => {
      if (state.kind !== 'ready') return;
      setAnswering(action);
      setAnswerError('');
      try {
        const result = await answerCoachLessonRequest(requestId, action, { calendarConfirmed });
        if (result?.player_phone) setPlayerPhone(result.player_phone);
        setState({ kind: 'ready', view: { ...state.view, status: result?.status || state.view.status } });
        if (result?.status === 'accepted' && !result?.player_phone) load('refresh');
      } catch (error) {
        const code = error?.body?.error;
        if (code === 'lesson_request_expired') {
          setState({ kind: 'ready', view: { ...state.view, status: 'expired' } });
        } else {
          setAnswerError(answerErrorMessage(code));
          if (code === 'no_open_times') load('refresh');
        }
      } finally {
        setAnswering(null);
      }
    },
    [calendarConfirmed, load, requestId, state]
  );

  const renderBody = () => {
    if (state.kind === 'loading') {
      return (
        <div className="flex flex-col items-center gap-2 py-12 text-gray-500" aria-live="polite">
          <Loader2 className="h-7 w-7 animate-spin text-purple-600" aria-hidden="true" />
          <span className="text-sm">Loading request…</span>
        </div>
      );
    }
    if (state.kind === 'missing') {
      return (
        <div className="py-10 text-center">
          <h1 className="text-xl font-semibold text-gray-900">This request isn't available</h1>
          <p className="mt-2 text-sm text-gray-500">It may have been sent to a different coach account.</p>
        </div>
      );
    }
    if (state.kind === 'error') {
      return (
        <div className="py-10 text-center">
          <h1 className="text-xl font-semibold text-gray-900">Couldn't load this request</h1>
          <p className="mt-2 text-sm text-gray-500">Check your connection and try again.</p>
          <button
            type="button"
            onClick={() => {
              setState({ kind: 'loading' });
              load('initial');
            }}
            className="mt-4 rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            Try again
          </button>
        </div>
      );
    }

    const { view } = state;
    const first = playerFirstName(view);
    const photo = photoFailed ? null : view.player?.profile_picture;
    const header = (
      <div className="flex items-center gap-4">
        {photo ? (
          <img src={photo} alt="" onError={() => setPhotoFailed(true)} className="h-14 w-14 shrink-0 rounded-full object-cover" />
        ) : (
          <span
            aria-hidden="true"
            className="grid h-14 w-14 shrink-0 place-items-center rounded-full bg-gradient-to-br from-purple-500 to-purple-700 text-lg font-bold text-white"
          >
            {initialsOf(view.player?.name)}
          </span>
        )}
        <div className="min-w-0">
          <span className="inline-flex rounded-md bg-amber-50 px-2 py-0.5 text-[11px] font-semibold text-amber-700">
            New player
          </span>
          <h1 className="mt-1 text-xl font-semibold leading-snug text-gray-900">{requestHeadline(view)}</h1>
          <p className="text-sm text-gray-500">Found you on The Tennis Plan.</p>
        </div>
      </div>
    );

    if (view.status === 'accepted') {
      const phone = playerPhone || view.player?.phone;
      return (
        <div className="py-8 text-center">
          <CheckCircle2 className="mx-auto h-9 w-9 text-emerald-500" aria-hidden="true" />
          <h1 className="mt-3 text-xl font-semibold text-gray-900">You're connected with {view.player?.name || first}</h1>
          <p className="mx-auto mt-2 max-w-md text-sm text-gray-600">
            We've texted {first} a link to book one of your open times, and your number. They're on your roster now.
            {phone ? ` You can reach them at ${phone}.` : ''}
          </p>
        </div>
      );
    }
    if (view.status === 'declined') {
      return (
        <div className="py-8 text-center">
          <h1 className="text-xl font-semibold text-gray-900">Thanks for letting us know</h1>
          <p className="mt-2 text-sm text-gray-600">We've let {first} know and pointed them to other coaches.</p>
        </div>
      );
    }
    if (view.status === 'expired') {
      return (
        <div className="py-8 text-center">
          <h1 className="text-xl font-semibold text-gray-900">This request has expired</h1>
          <p className="mt-2 text-sm text-gray-600">Requests stay open for two weeks.</p>
        </div>
      );
    }

    const noTimes = !view.open_count;
    const canAccept = calendarConfirmed && !noTimes && !answering && !refreshing;

    return (
      <div className="space-y-5">
        {header}

        <dl className="divide-y divide-gray-100 rounded-xl border border-gray-200 bg-gray-50 px-4">
          {answerRows(view).map(([label, value]) => (
            <div key={label} className="grid grid-cols-[104px_minmax(0,1fr)] gap-2 py-2.5 text-sm">
              <dt className="text-gray-500">{label}</dt>
              <dd className="break-words font-medium text-gray-900">{value}</dd>
            </div>
          ))}
        </dl>

        <section aria-labelledby="new-player-open-times">
          <div className="flex items-center justify-between gap-2">
            <h2 id="new-player-open-times" className="flex items-center gap-2 text-base font-semibold text-gray-900">
              <CalendarDays className="h-4 w-4 text-purple-600" aria-hidden="true" />
              Your open times, next 2 weeks
            </h2>
            <button
              type="button"
              onClick={() => load('refresh')}
              disabled={refreshing}
              aria-label="Refresh open times"
              className="grid h-8 w-8 place-items-center rounded-full border border-gray-200 text-gray-600 hover:bg-gray-50 disabled:opacity-60"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? 'animate-spin' : ''}`} aria-hidden="true" />
            </button>
          </div>
          <p className="mt-1 text-sm text-gray-600">
            {first} will be sent a link to book one of these. Make sure they're right before you say yes.
          </p>

          {noTimes ? (
            <div role="status" className="mt-3 flex gap-2 rounded-xl bg-amber-50 p-3 text-sm text-amber-800">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
              <span>You have no open times in the next two weeks. Add some below, or {first} will have nothing to book.</span>
            </div>
          ) : (
            <>
              <ul className="mt-3 space-y-2">
                {view.open_times.map((day) => (
                  <li key={day.date} className="grid grid-cols-[88px_minmax(0,1fr)] items-start gap-2">
                    <span className="pt-1 text-sm font-semibold text-gray-700">{day.label}</span>
                    <span className="flex flex-wrap gap-1.5">
                      {day.slots.map((slot) => (
                        <span
                          key={`${day.date}-${slot.time}`}
                          title={slot.location || undefined}
                          className={`rounded-full px-2.5 py-0.5 text-sm ${
                            slot.matches_preference
                              ? 'bg-purple-100 font-semibold text-purple-700'
                              : 'border border-gray-200 bg-white text-gray-700'
                          }`}
                        >
                          {slot.time}
                        </span>
                      ))}
                    </span>
                  </li>
                ))}
              </ul>
              <p className="mt-2 text-xs text-gray-500">
                {hasPreferredTime(view)
                  ? `Purple times fall in ${first}'s preferred times.`
                  : `None of these fall in ${first}'s preferred times.`}
              </p>
            </>
          )}

          <div className="mt-4 grid gap-2 sm:grid-cols-2">
            <button
              type="button"
              onClick={onAddAvailability}
              className="inline-flex items-center justify-center gap-2 rounded-lg border border-purple-200 bg-white px-4 py-2.5 text-sm font-semibold text-purple-700 hover:bg-purple-50"
            >
              <CalendarPlus className="h-4 w-4" aria-hidden="true" />
              Add a time
            </button>
            <button
              type="button"
              onClick={onEditWeeklyAvailability}
              className="inline-flex items-center justify-center gap-2 rounded-lg border border-gray-200 bg-white px-4 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-50"
            >
              <Clock className="h-4 w-4" aria-hidden="true" />
              Edit weekly hours
            </button>
          </div>
        </section>

        <label
          className={`flex items-start gap-3 rounded-xl border border-gray-200 p-3.5 text-sm text-gray-900 ${
            noTimes ? 'cursor-not-allowed opacity-60' : 'cursor-pointer'
          }`}
        >
          <input
            type="checkbox"
            checked={calendarConfirmed && !noTimes}
            disabled={noTimes}
            onChange={(event) => setCalendarConfirmed(event.target.checked)}
            className="mt-0.5 h-5 w-5 shrink-0 accent-purple-600"
          />
          <span>My calendar is up to date. These are times I can teach.</span>
        </label>

        <div className="grid gap-2 sm:grid-cols-2">
          <button
            type="button"
            onClick={() => answer('accept')}
            disabled={!canAccept}
            className="rounded-lg bg-purple-600 px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-purple-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {answering === 'accept' ? 'Sending…' : "I'm interested"}
          </button>
          <button
            type="button"
            onClick={() => answer('decline')}
            disabled={Boolean(answering)}
            className="rounded-lg border border-gray-200 bg-white px-4 py-3 text-sm font-semibold text-gray-700 transition hover:bg-gray-50 disabled:opacity-50"
          >
            {answering === 'decline' ? 'Sending…' : 'Not right now'}
          </button>
        </div>
        {answerError ? (
          <p role="alert" className="text-sm text-red-600">
            {answerError}
          </p>
        ) : null}
        <p className="text-xs text-gray-500">
          Saying yes texts {first} a link to book with you, adds them to your roster and shares your numbers with each other.
        </p>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="mx-auto max-w-2xl px-4 py-6">
        <button
          type="button"
          onClick={onBack}
          className="mb-4 inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to dashboard
        </button>
        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm sm:p-6">{renderBody()}</div>
      </div>
    </div>
  );
};

export default NewPlayerRequestPage;
