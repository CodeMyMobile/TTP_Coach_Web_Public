import React, { useEffect, useMemo, useState } from 'react';
import moment from 'moment';
import {
  AlertCircle,
  Calendar,
  MapPin,
  MessageCircle,
  Tag,
  X
} from 'lucide-react';
import Modal from './Modal';

const typeStyles = {
  private: 'bg-[#FEE2E2] text-[#DC2626]',
  'semi-private': 'bg-[#FEF3C7] text-[#D97706]',
  group: 'bg-[#D1FAE5] text-[#059669]'
};

const cancelledTypeStyles = {
  private: 'bg-[#F1F5F9] text-[#94A3B8]',
  'semi-private': 'bg-[#F1F5F9] text-[#94A3B8]',
  group: 'bg-[#F1F5F9] text-[#94A3B8]'
};

const statusLabels = {
  confirmed: 'Confirmed',
  pending: 'Awaiting Confirmation',
  cancelled: 'Cancelled'
};

const useMediaQuery = (query) => {
  const [matches, setMatches] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return undefined;
    }

    const media = window.matchMedia(query);
    const update = () => setMatches(media.matches);
    update();

    if (media.addEventListener) {
      media.addEventListener('change', update);
      return () => media.removeEventListener('change', update);
    }

    media.addListener(update);
    return () => media.removeListener(update);
  }, [query]);

  return matches;
};

const LessonDetailModal = ({
  isOpen,
  lesson,
  onClose,
  isEditing,
  onStartEdit,
  onCancelEdit,
  onSaveEdit,
  editData,
  onEditChange,
  mutationLoading = false,
  onCancelLesson,
  students = [],
  coachCourts = [],
  formatDuration,
  onAcceptRequest,
  onDeclineRequest,
  onCreateLesson
}) => {
  const isMobile = useMediaQuery('(max-width: 640px)');

  const resolvedLesson = useMemo(() => {
    if (!lesson) {
      return null;
    }

    const normalizeStatus = (value) => {
      if (value === 0 || value === '0') {
        return 'pending';
      }
      if (value === 2 || value === '2') {
        return 'cancelled';
      }
      if (!value) {
        return 'confirmed';
      }
      const normalized = String(value).toLowerCase();
      if (normalized.includes('pending') || normalized.includes('request') || normalized.includes('await')) {
        return 'pending';
      }
      if (normalized.includes('cancel')) {
        return 'cancelled';
      }
      if (normalized.includes('confirm') || normalized.includes('schedule')) {
        return 'confirmed';
      }
      return normalized;
    };

    const status = normalizeStatus(lesson.status || lesson.lessonStatus || lesson.lesson_status);

    const resolveType = () => {
      const typeId = Number(lesson.lessontype_id ?? lesson.lesson_type_id ?? lesson.lessonTypeId);
      if (typeId === 2) {
        return 'semi-private';
      }
      if (typeId === 3) {
        return 'group';
      }
      const raw = lesson.lesson_type_name || lesson.lessonType || lesson.type || '';
      const normalized = String(raw).toLowerCase();
      if (normalized.includes('semi')) {
        return 'semi-private';
      }
      if (normalized.includes('group') || normalized.includes('open')) {
        return 'group';
      }
      return 'private';
    };
    const lessonType = resolveType();

    const startRaw = lesson.start_date_time || lesson.startDateTime;
    const endRaw = lesson.end_date_time || lesson.endDateTime;
    const start = startRaw ? moment(String(startRaw).replace(/Z$/, '')) : null;
    const end = endRaw ? moment(String(endRaw).replace(/Z$/, '')) : null;

    const dateLabel = lesson.date || (start ? start.format('dddd, MMMM D') : '');
    const startTimeLabel = lesson.startTime || (start ? start.format('h:mm A') : '');
    const endTimeLabel = lesson.endTime || (end ? end.format('h:mm A') : '');

    return {
      ...lesson,
      lessonType,
      status,
      dateLabel,
      startTimeLabel,
      endTimeLabel,
      studentName:
        lesson.student ||
        lesson.full_name ||
        lesson.player_name ||
        lesson.student_name ||
        lesson.studentName ||
        lesson.playerName ||
        lesson.metadata?.player_name ||
        '',
      studentLevel: lesson.level || lesson.metadata?.level || lesson.skill_level || 'Intermediate',
      lessonsCompleted: lesson.lessonsCompleted || lesson.lessons_completed || 0,
      studentMessage:
        lesson.studentMessage ||
        lesson.message ||
        lesson.metadata?.message ||
        lesson.metadata?.student_message ||
        '',
      cancellationReason:
        lesson.cancellationReason ||
        lesson.cancellation_reason ||
        lesson.cancel_reason ||
        '',
      requestedAt: lesson.requestedAt || lesson.requested_at || lesson.request_time || '',
      cancelledAt: lesson.cancelledAt || lesson.cancelled_at || lesson.cancelled_time || '',
      cancelledBy: lesson.cancelledBy || lesson.cancelled_by || '',
      locationName: lesson.location?.name || lesson.location_name || lesson.location,
      locationAddress: lesson.location?.address || lesson.location_address || lesson.court || ''
    };
  }, [lesson]);

  if (!resolvedLesson) {
    return null;
  }

  const title = resolvedLesson.status === 'pending' ? 'Lesson Request' : 'Lesson Details';
  const typeLabelMap = {
    private: 'Private Lesson',
    'semi-private': 'Semi-Private Lesson',
    group: 'Group Lesson'
  };

  const studentList = resolvedLesson.students?.length
    ? resolvedLesson.students
    : resolvedLesson.studentName
      ? [
          {
            id: resolvedLesson.id,
            name: resolvedLesson.studentName,
            initials: resolvedLesson.studentName
              .split(' ')
              .map((part) => part[0])
              .join('')
              .slice(0, 2)
              .toUpperCase(),
            level: resolvedLesson.studentLevel || 'Intermediate',
            lessonsCompleted: resolvedLesson.lessonsCompleted || 0
          }
        ]
      : [];

  const primaryStudent = studentList[0];
  const durationLabel =
    resolvedLesson.durationMinutes || resolvedLesson.duration
      ? `${formatDuration?.(resolvedLesson.durationMinutes || resolvedLesson.duration) || resolvedLesson.durationMinutes || resolvedLesson.duration}`
      : '1 hour';

  const pricePerHour =
    resolvedLesson.pricePerHour ||
    resolvedLesson.price_per_hour ||
    resolvedLesson.rate ||
    resolvedLesson.price ||
    0;
  const priceLabel = pricePerHour ? `$${pricePerHour}` : '—';

  const typeBadgeClass =
    resolvedLesson.status === 'cancelled'
      ? cancelledTypeStyles[resolvedLesson.lessonType]
      : typeStyles[resolvedLesson.lessonType];

  const handleFieldChange = (field, value) => {
    onEditChange({ ...editData, [field]: value });
  };

  const closeModal = () => {
    onClose?.();
    onCancelEdit?.();
  };

  const actionButtons = () => {
    if (resolvedLesson.status === 'pending') {
      return (
        <>
          <button
            type="button"
            onClick={onAcceptRequest}
            className="flex-1 rounded-xl bg-emerald-500 px-4 py-3 text-sm font-semibold text-white transition hover:bg-emerald-600"
          >
            ✓ Confirm Lesson
          </button>
          <button
            type="button"
            onClick={onDeclineRequest}
            className="flex-1 rounded-xl bg-red-50 px-4 py-3 text-sm font-semibold text-red-600 transition hover:bg-red-100"
          >
            ✕ Decline
          </button>
        </>
      );
    }

    if (resolvedLesson.status === 'cancelled') {
      return (
        <button
          type="button"
          className="flex-1 rounded-xl bg-purple-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-purple-700"
        >
          💬 Message Student
        </button>
      );
    }

    if (resolvedLesson.type === 'available') {
      return (
        <button
          type="button"
          onClick={() => onCreateLesson?.(resolvedLesson)}
          className="flex-1 rounded-xl bg-emerald-500 px-4 py-3 text-sm font-semibold text-white transition hover:bg-emerald-600"
        >
          Create Lesson
        </button>
      );
    }

    return (
      <>
        <button
          type="button"
          className="flex-1 rounded-xl bg-purple-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-purple-700"
        >
          💬 Message Student
        </button>
        <button
          type="button"
          onClick={onCancelLesson}
          className="flex-1 rounded-xl bg-red-50 px-4 py-3 text-sm font-semibold text-red-600 transition hover:bg-red-100"
        >
          ✕ Cancel Lesson
        </button>
      </>
    );
  };

  const cancelledByLabel = resolvedLesson.cancelledBy
    ? `${resolvedLesson.cancelledBy}`.charAt(0).toUpperCase() + `${resolvedLesson.cancelledBy}`.slice(1)
    : 'Student';


  return (
    <Modal
      isOpen={isOpen}
      onClose={closeModal}
      placement={isMobile ? 'bottom' : 'center'}
      overlayClassName="bg-black/40"
      panelClassName={`flex w-full flex-col overflow-hidden bg-white shadow-2xl ${
        isMobile
          ? 'max-h-[78vh] rounded-t-3xl'
          : 'max-h-[90vh] w-[360px] max-w-[90vw] rounded-2xl'
      }`}
    >
      {isMobile && <div className="mx-auto mt-3 h-1 w-9 rounded-full bg-slate-200" />}

      <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4 sm:px-6">
        <h3 className="text-lg font-semibold text-slate-900">{title}</h3>
        <button
          type="button"
          onClick={closeModal}
          className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-100 text-slate-500 transition hover:bg-slate-200"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-5 pb-6 pt-5 sm:px-6">
        {!isEditing ? (
          <div className="space-y-5">
            {resolvedLesson.status === 'pending' && (
              <div className="rounded-xl border border-yellow-200 bg-gradient-to-r from-[#FEF3C7] to-[#FDE68A] p-4">
                <div className="flex items-start gap-3">
                  <div className="text-2xl">⏳</div>
                  <div className="space-y-1">
                    <p className="text-sm font-semibold text-yellow-900">
                      Awaiting Your Confirmation
                    </p>
                    <p className="text-xs text-yellow-800">
                      Requested {resolvedLesson.requestedAt || 'recently'}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {resolvedLesson.status === 'cancelled' && (
              <div className="rounded-xl border border-red-200 bg-[#FEE2E2] p-4">
                <div className="flex items-start gap-3">
                  <div className="text-2xl">🚫</div>
                  <div className="space-y-1">
                    <p className="text-sm font-semibold text-red-800">
                      Cancelled by {cancelledByLabel}
                    </p>
                    <p className="text-xs text-red-600">
                      {resolvedLesson.cancelledAt || 'Recently'}
                    </p>
                  </div>
                </div>
              </div>
            )}

            <div className={`inline-flex items-center gap-2 rounded-lg px-3 py-1 text-xs font-semibold uppercase ${typeBadgeClass}`}>
              🎾 {typeLabelMap[resolvedLesson.lessonType]}
            </div>

            {primaryStudent && (
              <div className="flex items-center gap-3 rounded-2xl bg-slate-50 p-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-purple-500 to-purple-300 text-sm font-bold text-white">
                  {primaryStudent.initials}
                </div>
                <div className="flex-1">
                  <p className="text-base font-semibold text-slate-900">{primaryStudent.name}</p>
                  <p className="text-sm text-slate-500">
                    {primaryStudent.level} · {primaryStudent.lessonsCompleted} lessons
                  </p>
                </div>
                <button
                  type="button"
                  className="flex h-9 w-9 items-center justify-center rounded-full bg-purple-100 text-purple-600"
                >
                  <MessageCircle className="h-5 w-5" />
                </button>
              </div>
            )}

            {resolvedLesson.status === 'pending' && resolvedLesson.studentMessage && (
              <div className="rounded-xl border border-slate-100 border-l-4 border-l-purple-500 bg-slate-50 p-4">
                <p className="text-xs font-semibold uppercase text-slate-400">
                  Message from Student
                </p>
                <p className="mt-2 text-sm text-slate-600">{resolvedLesson.studentMessage}</p>
              </div>
            )}

            {resolvedLesson.status === 'cancelled' && resolvedLesson.cancellationReason && (
              <div className="rounded-xl border border-red-100 border-l-4 border-l-red-500 bg-red-50 p-4">
                <p className="text-xs font-semibold uppercase text-slate-400">
                  Cancellation Reason
                </p>
                <p className="mt-2 text-sm text-slate-600">{resolvedLesson.cancellationReason}</p>
              </div>
            )}

            <div className="space-y-4 sm:grid sm:grid-cols-2 sm:gap-4 sm:space-y-0">
              <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
                <div className="flex items-center gap-2 text-xs font-semibold uppercase text-slate-400">
                  <Calendar className="h-4 w-4" />
                  {resolvedLesson.status === 'pending' ? 'Requested Time' : 'Date & Time'}
                </div>
                <p
                  className={`mt-2 text-base font-semibold ${
                    resolvedLesson.status === 'cancelled' ? 'text-slate-300 line-through' : 'text-slate-900'
                  }`}
                >
                  {resolvedLesson.dateLabel}
                </p>
                <p className="text-sm text-slate-500">
                  {resolvedLesson.startTimeLabel}
                  {resolvedLesson.endTimeLabel ? ` – ${resolvedLesson.endTimeLabel}` : ''} ({durationLabel})
                </p>
              </div>

              <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
                <div className="flex items-center gap-2 text-xs font-semibold uppercase text-slate-400">
                  <MapPin className="h-4 w-4" />
                  Location
                </div>
                <p className="mt-2 text-base font-semibold text-slate-900">
                  {resolvedLesson.locationName || 'TBD'}
                </p>
                <p className="text-sm text-slate-500">
                  {resolvedLesson.locationAddress || ''}
                </p>
              </div>

              {resolvedLesson.status === 'confirmed' && (
                <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
                  <div className="flex items-center gap-2 text-xs font-semibold uppercase text-slate-400">
                    <Tag className="h-4 w-4" />
                    Status
                  </div>
                  <div className="mt-3 inline-flex items-center gap-2 rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-600">
                    <span className="h-2 w-2 rounded-full bg-emerald-500" />
                    {statusLabels.confirmed}
                  </div>
                </div>
              )}

              <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
                <div className="flex items-center gap-2 text-xs font-semibold uppercase text-slate-400">
                  <AlertCircle className="h-4 w-4" />
                  Lesson Fee
                </div>
                <p
                  className={`mt-2 text-lg font-semibold ${
                    resolvedLesson.status === 'cancelled' ? 'text-slate-300 line-through' : 'text-slate-900'
                  }`}
                >
                  {priceLabel} <span className="text-sm font-normal text-slate-400">/ hour</span>
                </p>
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Time</label>
              <input
                type="time"
                value={editData?.time}
                onChange={(event) => handleFieldChange('time', event.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Location</label>
              <select
                value={editData?.location}
                onChange={(event) => handleFieldChange('location', event.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500"
              >
                {coachCourts.map((court) => (
                  <option key={court} value={court}>
                    {court}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Court</label>
              <input
                type="text"
                value={editData?.court}
                onChange={(event) => handleFieldChange('court', event.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
            </div>
          </div>
        )}
      </div>

      <div className="border-t border-slate-100 bg-white px-5 py-5 sm:px-6">
        {!isEditing ? (
          <div className="flex flex-col gap-3 sm:flex-row">{actionButtons()}</div>
        ) : (
          <div className="flex flex-col gap-3 sm:flex-row">
            <button
              type="button"
              onClick={onCancelEdit}
              className="flex-1 rounded-xl bg-slate-100 px-4 py-3 text-sm font-semibold text-slate-600 transition hover:bg-slate-200"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={onSaveEdit}
              disabled={mutationLoading}
              className={`flex-1 rounded-xl px-4 py-3 text-sm font-semibold text-white transition ${
                mutationLoading ? 'cursor-wait bg-purple-300' : 'bg-purple-600 hover:bg-purple-700'
              }`}
            >
              {mutationLoading ? 'Saving…' : 'Save Changes'}
            </button>
          </div>
        )}
      </div>
    </Modal>
  );

};

export default LessonDetailModal;
