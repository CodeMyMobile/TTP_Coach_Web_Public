import React, { useMemo, useState } from 'react';
import moment from 'moment';
import {
  AlertTriangle,
  CalendarDays,
  ChevronRight,
  Clock,
  MapPin,
  MessageCircle,
  ShoppingBag,
  Users
} from 'lucide-react';
import SuppliesSelectorModal from '../../modals/SuppliesSelectorModal';
import {
  formatLessonDuration,
  getGroupCapacity,
  getLessonMoments,
  getLessonParticipants,
  getLessonType,
  isGroupLesson,
  normalizeGoogleEvent
} from '../../../utils/lessonDisplay';
import { openSmsComposer, textAllParticipants } from '../../../utils/messaging';

const typeBadgeStyles = {
  private: 'bg-[#FEE2E2] text-[#DC2626]',
  'semi-private': 'bg-[#FEF3C7] text-[#D97706]',
  group: 'bg-[#D1FAE5] text-[#059669]'
};

const typeLabels = {
  private: 'Private',
  'semi-private': 'Semi-private',
  group: 'Group'
};

const durationLabel = (lesson) => {
  const fromSlots = formatLessonDuration(lesson?.duration);
  if (fromSlots) {
    return fromSlots;
  }

  const { start, end } = getLessonMoments(lesson);
  if (start?.isValid() && end?.isValid()) {
    return formatLessonDuration(Math.max(1, Math.round(end.diff(start, 'minutes') / 30)));
  }
  return '';
};

const timeRangeLabel = (lesson) => {
  const { start, end } = getLessonMoments(lesson);
  if (!start?.isValid()) {
    return lesson?.time || '';
  }
  const startLabel = start.format('h:mm A');
  return end?.isValid() ? `${startLabel} – ${end.format('h:mm A')}` : startLabel;
};

const ParticipantAvatars = ({ participants }) => {
  if (participants.length === 0) {
    return null;
  }

  const visible = participants.slice(0, 5);
  const overflow = participants.length - visible.length;

  return (
    <div className="flex items-center -space-x-2">
      {visible.map((participant) =>
        participant.profilePicture ? (
          <img
            key={participant.id}
            src={participant.profilePicture}
            alt={participant.name}
            title={participant.name}
            className="h-8 w-8 rounded-full border-2 border-white object-cover"
          />
        ) : (
          <span
            key={participant.id}
            title={participant.name}
            className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-white bg-purple-100 text-xs font-semibold text-purple-700"
          >
            {participant.initials}
          </span>
        )
      )}
      {overflow > 0 && (
        <span className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-white bg-gray-100 text-xs font-semibold text-gray-600">
          +{overflow}
        </span>
      )}
    </div>
  );
};

const LessonCard = ({ lesson, onLessonSelect }) => {
  const type = getLessonType(lesson);
  const group = isGroupLesson(lesson);
  const participants = getLessonParticipants(lesson);
  const activeParticipants = participants.filter(
    (participant) => String(participant.status).toLowerCase() !== 'cancelled'
  );
  const capacity = getGroupCapacity(lesson);
  const filled = activeParticipants.length;
  const needed = Math.max(capacity - filled, 0);

  const handleMessage = (event) => {
    event.stopPropagation();
    if (group) {
      textAllParticipants(activeParticipants);
      return;
    }
    const primary = activeParticipants[0];
    openSmsComposer({
      playerId: primary?.playerId ?? lesson.player_id ?? lesson.playerId,
      phone: primary?.phone
    });
  };

  return (
    <button
      type="button"
      onClick={() => onLessonSelect?.(lesson)}
      className="flex w-full flex-col gap-3 rounded-xl border border-gray-200 bg-white p-4 text-left shadow-sm transition hover:border-purple-200 hover:shadow"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2 text-sm font-semibold text-gray-900">
            <Clock className="h-4 w-4 text-gray-400" />
            <span>{timeRangeLabel(lesson)}</span>
            {durationLabel(lesson) && (
              <span className="text-xs font-normal text-gray-500">• {durationLabel(lesson)}</span>
            )}
          </div>
          {lesson.location && (
            <div className="mt-1 flex items-center gap-1.5 text-xs text-gray-500">
              <MapPin className="h-3.5 w-3.5" />
              <span className="truncate">{lesson.location}</span>
            </div>
          )}
        </div>
        <span
          className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold ${
            typeBadgeStyles[type] || typeBadgeStyles.private
          }`}
        >
          {typeLabels[type] || 'Private'}
        </span>
      </div>

      <div
        className={
          group
            ? 'flex flex-col gap-3 md:flex-row md:items-center md:justify-between'
            : 'flex flex-wrap items-center justify-between gap-3'
        }
      >
        <div className="flex items-center gap-3">
          <ParticipantAvatars participants={participants} />
          <div className="text-xs text-gray-600">
            {group ? (
              <span className="flex items-center gap-1">
                <Users className="h-3.5 w-3.5 text-gray-400" />
                {filled} of {capacity} spots
                {needed > 0 && (
                  <span className="font-semibold text-amber-600">• needs {needed} more</span>
                )}
              </span>
            ) : (
              <span className="truncate font-medium text-gray-700">
                {participants[0]?.name || 'Player'}
              </span>
            )}
          </div>
        </div>

        <span
          onClick={handleMessage}
          role="button"
          tabIndex={0}
          onKeyDown={(event) => {
            if (event.key === 'Enter' || event.key === ' ') {
              handleMessage(event);
            }
          }}
          className={`inline-flex items-center justify-center gap-1.5 rounded-lg border border-purple-200 px-3 py-1.5 text-xs font-semibold text-purple-700 transition hover:bg-purple-50 ${
            group ? 'w-full md:w-auto' : ''
          }`}
        >
          <MessageCircle className="h-3.5 w-3.5" />
          {group ? 'Message all' : 'Message'}
        </span>
      </div>
    </button>
  );
};

const CancelledLessonCard = ({ lesson, onLessonSelect }) => {
  const participants = getLessonParticipants(lesson);

  const handleNotifyAll = (event) => {
    event.stopPropagation();
    textAllParticipants(participants);
  };

  return (
    <button
      type="button"
      onClick={() => onLessonSelect?.(lesson)}
      className="flex w-full flex-col gap-2 rounded-xl border border-rose-100 bg-rose-50/50 p-4 text-left transition hover:border-rose-200"
    >
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-sm font-semibold text-gray-700">
          <span className="line-through">{timeRangeLabel(lesson)}</span>
          <span className="rounded-full bg-rose-100 px-2 py-0.5 text-xs font-semibold text-rose-600">
            Cancelled
          </span>
        </div>
        {participants.length > 0 && (
          <span
            onClick={handleNotifyAll}
            role="button"
            tabIndex={0}
            onKeyDown={(event) => {
              if (event.key === 'Enter' || event.key === ' ') {
                handleNotifyAll(event);
              }
            }}
            className="inline-flex items-center gap-1.5 rounded-lg border border-rose-200 px-3 py-1.5 text-xs font-semibold text-rose-700 transition hover:bg-rose-100"
          >
            <MessageCircle className="h-3.5 w-3.5" />
            Notify {participants.length > 1 ? 'all' : 'player'}
          </span>
        )}
      </div>
      <div className="flex items-center gap-2 text-xs text-rose-700/80">
        <AlertTriangle className="h-3.5 w-3.5" />
        <span className="truncate">
          {participants.map((participant) => participant.name).join(', ') || 'No players to notify'}
        </span>
      </div>
    </button>
  );
};

const SuppliesCard = ({ onOpen }) => (
  <button
    type="button"
    onClick={onOpen}
    className="flex w-full items-center gap-3 rounded-xl border border-gray-200 bg-white p-4 text-left shadow-sm transition hover:border-purple-200 hover:shadow"
  >
    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-purple-50 text-purple-600">
      <ShoppingBag className="h-5 w-5" />
    </span>
    <span className="min-w-0 flex-1">
      <span className="block text-sm font-semibold text-gray-900">Coach supplies</span>
      <span className="block truncate text-xs text-gray-500">Gear &amp; essentials for your sessions</span>
    </span>
    <ChevronRight className="h-4 w-4 shrink-0 text-gray-400" />
  </button>
);

const BusyBlock = ({ event }) => (
  <div className="flex items-center gap-2 rounded-xl border border-dashed border-gray-200 bg-gray-50 p-4 text-sm text-gray-500">
    <Clock className="h-4 w-4 shrink-0 text-gray-400" />
    <span className="font-medium text-gray-600">
      {event.start.format('h:mm A')}
      {event.end ? ` – ${event.end.format('h:mm A')}` : ''}
    </span>
    <span className="truncate">· {event.title}</span>
    <span className="ml-auto shrink-0 text-xs uppercase tracking-wide text-gray-400">Busy</span>
  </div>
);

const RequestRow = ({ item }) => {
  const processing = Boolean(item.activeAction);
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
      <button type="button" onClick={item.onDetails} className="block w-full text-left">
        <p className="text-sm text-gray-900">
          <span className="font-semibold">{item.name}</span> {item.detail}
        </p>
        {item.info && <p className="mt-0.5 text-xs text-gray-500">{item.info}</p>}
      </button>
      <div className="mt-3 flex flex-wrap gap-2">
        {item.acceptLabel !== '' && (
          <button
            type="button"
            onClick={item.onAccept || undefined}
            disabled={!item.onAccept || processing}
            className="rounded-lg bg-purple-600 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-purple-700 disabled:opacity-60"
          >
            {item.activeAction === 'confirm' || item.activeAction === 'approve'
              ? 'Processing…'
              : item.acceptLabel}
          </button>
        )}
        {!item.hideDecline && (
          <button
            type="button"
            onClick={item.onDecline || undefined}
            disabled={!item.onDecline || processing}
            className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-semibold text-gray-600 transition hover:bg-gray-50 disabled:opacity-60"
          >
            {item.activeAction === 'decline' ? 'Processing…' : item.declineLabel || 'Decline'}
          </button>
        )}
      </div>
    </div>
  );
};

const TodayPage = ({
  lessons = [],
  cancelledLessons = [],
  requests = [],
  googleEvents = [],
  calendarConnected = null,
  onLessonSelect,
  coachName = '',
  onViewFullCalendar = () => {}
}) => {
  const [suppliesOpen, setSuppliesOpen] = useState(false);
  const todayLabel = useMemo(() => moment().format('dddd, MMMM D'), []);
  const todayKey = useMemo(() => moment().format('YYYY-MM-DD'), []);
  const greeting = useMemo(() => {
    const hour = moment().hour();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  }, []);

  const firstName = String(coachName || '').trim().split(' ')[0];
  const lessonCount = lessons.length;
  const subline = `${todayLabel} · ${lessonCount} ${lessonCount === 1 ? 'lesson' : 'lessons'} today`;

  // Only surface busy blocks when the calendar is definitively connected.
  const busyEvents = useMemo(() => {
    if (calendarConnected !== true || !Array.isArray(googleEvents)) {
      return [];
    }
    return googleEvents
      .map(normalizeGoogleEvent)
      .filter(Boolean)
      .filter((event) => event.start.format('YYYY-MM-DD') === todayKey);
  }, [calendarConnected, googleEvents, todayKey]);

  const allDayBusy = useMemo(() => busyEvents.filter((event) => event.allDay), [busyEvents]);

  // Timed lessons + timed busy blocks, interleaved by start time (same tz as cards).
  const timedItems = useMemo(() => {
    const items = [
      ...lessons.map((lesson) => ({
        kind: 'lesson',
        key: `lesson-${lesson.id}`,
        start: getLessonMoments(lesson).start,
        data: lesson
      })),
      ...busyEvents
        .filter((event) => !event.allDay)
        .map((event, index) => ({
          kind: 'busy',
          key: `busy-${index}`,
          start: event.start,
          data: event
        }))
    ];
    return items.sort((a, b) => (a.start?.valueOf() ?? 0) - (b.start?.valueOf() ?? 0));
  }, [lessons, busyEvents]);

  return (
    <div className="space-y-6">
      <header>
        <h2 className="text-xl font-semibold text-gray-900">
          {greeting}
          {firstName ? `, ${firstName}` : ''}
        </h2>
        <p className="text-sm text-gray-500">{subline}</p>
      </header>

      <SuppliesCard onOpen={() => setSuppliesOpen(true)} />
      <SuppliesSelectorModal isOpen={suppliesOpen} onClose={() => setSuppliesOpen(false)} />

      {(requests.length > 0 || cancelledLessons.length > 0) && (
        <section className="space-y-3">
          <h3 className="text-sm font-semibold uppercase tracking-wide text-gray-500">
            Needs action
          </h3>
          {requests.length > 0 && (
            <div className="grid gap-3 sm:grid-cols-2">
              {requests.map((item) => (
                <RequestRow key={item.id} item={item} />
              ))}
            </div>
          )}
          {cancelledLessons.length > 0 && (
            <div className="grid gap-3 sm:grid-cols-2">
              {cancelledLessons.map((lesson) => (
                <CancelledLessonCard key={lesson.id} lesson={lesson} onLessonSelect={onLessonSelect} />
              ))}
            </div>
          )}
        </section>
      )}

      <section className="space-y-3">
        <h3 className="text-sm font-semibold uppercase tracking-wide text-gray-500">
          Today&apos;s lessons
        </h3>

        {allDayBusy.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {allDayBusy.map((event, index) => (
              <span
                key={`allday-${index}`}
                className="inline-flex items-center gap-1.5 rounded-lg border border-dashed border-gray-200 bg-gray-50 px-3 py-1.5 text-xs text-gray-500"
              >
                <span className="font-semibold uppercase tracking-wide text-gray-400">All day</span>
                <span className="max-w-[12rem] truncate">{event.title}</span>
              </span>
            ))}
          </div>
        )}

        {timedItems.length === 0 && allDayBusy.length === 0 ? (
          <div className="rounded-xl border border-dashed border-gray-200 bg-white p-8 text-center text-sm text-gray-500">
            No lessons scheduled for today.
          </div>
        ) : timedItems.length > 0 ? (
          <div className="grid gap-3 sm:grid-cols-2">
            {timedItems.map((item) =>
              item.kind === 'lesson' ? (
                <LessonCard key={item.key} lesson={item.data} onLessonSelect={onLessonSelect} />
              ) : (
                <BusyBlock key={item.key} event={item.data} />
              )
            )}
          </div>
        ) : null}

        <button
          type="button"
          onClick={onViewFullCalendar}
          className="flex w-full items-center justify-between rounded-xl border border-gray-200 bg-white px-4 py-3 text-left transition hover:border-purple-200 hover:shadow-sm"
        >
          <span className="flex items-center gap-2 text-sm font-medium text-gray-700">
            <CalendarDays className="h-4 w-4 text-purple-600" />
            View full calendar
          </span>
          <ChevronRight className="h-4 w-4 text-gray-400" />
        </button>
      </section>
    </div>
  );
};

export default TodayPage;
