import React, { useMemo } from 'react';
import moment from 'moment';
import {
  AlertTriangle,
  Clock,
  ExternalLink,
  MapPin,
  MessageCircle,
  ShoppingBag,
  Users
} from 'lucide-react';
import { COACH_SUPPLIES_URL } from '../../../constants/urls';
import {
  formatLessonDuration,
  getGroupCapacity,
  getLessonMoments,
  getLessonParticipants,
  getLessonType,
  isGroupLesson
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

      <div className="flex flex-wrap items-center justify-between gap-3">
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
          className="inline-flex items-center gap-1.5 rounded-lg border border-purple-200 px-3 py-1.5 text-xs font-semibold text-purple-700 transition hover:bg-purple-50"
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

const SuppliesCard = () => (
  <button
    type="button"
    onClick={() => window.open(COACH_SUPPLIES_URL, '_blank', 'noopener,noreferrer')}
    className="flex w-full items-center gap-3 rounded-xl border border-gray-200 bg-white p-4 text-left shadow-sm transition hover:border-purple-200 hover:shadow"
  >
    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-purple-50 text-purple-600">
      <ShoppingBag className="h-5 w-5" />
    </span>
    <span className="min-w-0 flex-1">
      <span className="block text-sm font-semibold text-gray-900">Coach supplies</span>
      <span className="block truncate text-xs text-gray-500">Gear &amp; essentials for your sessions</span>
    </span>
    <ExternalLink className="h-4 w-4 shrink-0 text-gray-400" />
  </button>
);

const TodayPage = ({ lessons = [], cancelledLessons = [], onLessonSelect, coachName = '' }) => {
  const todayLabel = useMemo(() => moment().format('dddd, MMMM D'), []);
  const greeting = useMemo(() => {
    const hour = moment().hour();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  }, []);

  const firstName = String(coachName || '').trim().split(' ')[0];
  const lessonCount = lessons.length;
  const subline = `${todayLabel} · ${lessonCount} ${lessonCount === 1 ? 'lesson' : 'lessons'} today`;

  return (
    <div className="space-y-6">
      <header>
        <h2 className="text-xl font-semibold text-gray-900">
          {greeting}
          {firstName ? `, ${firstName}` : ''}
        </h2>
        <p className="text-sm text-gray-500">{subline}</p>
      </header>

      <SuppliesCard />

      <section className="space-y-3">
        <h3 className="text-sm font-semibold uppercase tracking-wide text-gray-500">
          Today&apos;s lessons
        </h3>
        {lessons.length === 0 ? (
          <div className="rounded-xl border border-dashed border-gray-200 bg-white p-8 text-center text-sm text-gray-500">
            No lessons scheduled for today.
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {lessons.map((lesson) => (
              <LessonCard key={lesson.id} lesson={lesson} onLessonSelect={onLessonSelect} />
            ))}
          </div>
        )}
      </section>

      {cancelledLessons.length > 0 && (
        <section className="space-y-3">
          <h3 className="text-sm font-semibold uppercase tracking-wide text-gray-500">
            Cancelled — players to notify
          </h3>
          <div className="grid gap-3 sm:grid-cols-2">
            {cancelledLessons.map((lesson) => (
              <CancelledLessonCard key={lesson.id} lesson={lesson} onLessonSelect={onLessonSelect} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
};

export default TodayPage;
