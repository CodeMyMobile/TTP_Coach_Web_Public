import React, { useEffect, useMemo, useState } from 'react';
import moment from 'moment';
import {
  AlertCircle,
  Calendar,
  MapPin,
  MessageCircle,
  Pencil,
  Phone,
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
  onCreateLesson,
  coachHourlyRate = null
}) => {
  const isMobile = useMediaQuery('(max-width: 640px)');
  const [participantsOpen, setParticipantsOpen] = useState(true);

  const resolvedLesson = useMemo(() => {
    if (!lesson) {
      return null;
    }

    const createdById = Number(lesson.created_by ?? lesson.createdBy);
    const coachId = Number(lesson.coach_id ?? lesson.coachId);
    const updatedById = Number(lesson.updated_by ?? lesson.updatedBy);
    const playerId = Number(lesson.player_id ?? lesson.playerId);
    const isCoachCreatedLesson =
      Number.isFinite(createdById) && Number.isFinite(coachId) && createdById === coachId;

    const normalizeStatus = (value) => {
      if (value === 2 || value === '2') {
        return 'cancelled';
      }

      if (value === 0 || value === '0') {
        return isCoachCreatedLesson ? 'confirmed' : 'pending';
      }

      if (value === 1 || value === '1') {
        return 'confirmed';
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

    const status = normalizeStatus(lesson.status ?? lesson.lessonStatus ?? lesson.lesson_status);

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
    const start = startRaw ? moment.utc(startRaw) : null;
    const end = endRaw
      ? moment.utc(endRaw)
      : start?.isValid()
        ? start.clone().add(1, 'hour')
        : null;

    const dateLabel = lesson.date || (start?.isValid() ? start.format('dddd, MMMM D') : '');
    const startTimeLabel = lesson.startTime || (start?.isValid() ? start.format('hh:mm a') : '');
    const endTimeLabel = lesson.endTime || (end?.isValid() ? end.format('hh:mm a') : '');
    return {
      ...lesson,
      lessonType,
      status,
      dateLabel,
      startTimeLabel,
      endTimeLabel,
      isCoachCreatedLesson,
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
      cancelledBy:
        lesson.cancelledBy ||
        lesson.cancelled_by ||
        lesson.canceledBy ||
        lesson.canceled_by ||
        (status === 'cancelled' && Number.isFinite(updatedById) && Number.isFinite(coachId) && updatedById === coachId
          ? 'coach'
          : status === 'cancelled' && Number.isFinite(updatedById) && Number.isFinite(playerId) && updatedById === playerId
            ? 'student'
            : ''),
      locationName: lesson.location?.name || lesson.location_name || lesson.location,
      locationAddress: lesson.location?.address || lesson.location_address || lesson.court || ''
    };
  }, [lesson]);

  if (!resolvedLesson) {
    return null;
  }

  const title = resolvedLesson.status === 'pending' && !resolvedLesson.isCoachCreatedLesson ? 'Lesson Request' : 'Lesson Details';
  const typeLabelMap = {
    private: 'Private Lesson',
    'semi-private': 'Semi-Private Lesson',
    group: 'Group Lesson'
  };
  const isGroupLesson = resolvedLesson.lessonType === 'group';
  const isGroupOrSemiPrivate =
    resolvedLesson.lessonType === 'group' || resolvedLesson.lessonType === 'semi-private';

  const lessonGroupPlayers = Array.isArray(resolvedLesson.group_players)
    ? resolvedLesson.group_players
    : Array.isArray(resolvedLesson.groupPlayers)
      ? resolvedLesson.groupPlayers
      : [];

  const groupPlayerList = lessonGroupPlayers.map((student, index) => ({
    id: student.player_id || student.playerId || student.id || `${student.full_name}-${index}`,
    name: student.full_name || student.name || student.player_name || `Participant ${index + 1}`,
    initials: (student.full_name || student.name || student.player_name || 'ST')
      .split(' ')
      .map((part) => part[0])
      .join('')
      .slice(0, 2)
      .toUpperCase(),
    level: student.level || student.skill_level || resolvedLesson.studentLevel || 'Intermediate',
    lessonsCompleted: student.lessonCount || student.lessonsCompleted || student.lessons_completed || 0,
    phone: student.phone || student.phone_number || '',
    profilePicture: student.profile_picture || student.profilePicture || '',
    status: student.status
  }));

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

  const participantsFromProps = students?.length
    ? students.map((student) => ({
        id: student.id || student.playerId || student.player_id || student.name,
        name: student.name || student.full_name || student.player_name,
        level: student.level || student.skill_level || 'Intermediate',
        lessonsCompleted: student.lessonCount || student.lessonsCompleted || student.lessons_completed || 0,
        phone: student.phone || student.phone_number || ''
      }))
    : [];

  const hasGroupPlayers = isGroupOrSemiPrivate && groupPlayerList.length > 0;
  const participantListRaw = isGroupOrSemiPrivate
    ? groupPlayerList
    : studentList.length
      ? studentList
      : participantsFromProps;

  const resolveParticipantStatus = (status) => {
    if (status === 1 || status === '1') {
      return 'Confirmed';
    }

    if (status === 2 || status === '2') {
      return 'Cancelled';
    }

    if (status === 0 || status === '0') {
      return 'Pending';
    }

    if (!status) {
      return 'Confirmed';
    }

    return status;
  };

  const participantStatusClass = (status) => {
    const normalized = String(status || '').toLowerCase();

    if (normalized.includes('cancel')) {
      return {
        text: 'text-rose-600',
        dot: 'bg-rose-500'
      };
    }

    if (normalized.includes('pending')) {
      return {
        text: 'text-amber-600',
        dot: 'bg-amber-500'
      };
    }

    return {
      text: 'text-emerald-600',
      dot: 'bg-emerald-500'
    };
  };

  const participantList = participantListRaw.map((participant, index) => ({
    id: participant.id || `${participant.name}-${index}`,
    name: participant.name || `Participant ${index + 1}`,
    initials:
      participant.initials ||
      participant.name
        ?.split(' ')
        .map((part) => part[0])
        .join('')
        .slice(0, 2)
        .toUpperCase() ||
      'ST',
    level: participant.level || 'Intermediate',
    lessonsCompleted: participant.lessonsCompleted || 0,
    phone: participant.phone || '',
    status: resolveParticipantStatus(participant.status)
  }));

  const primaryStudent = participantList[0];
  const durationLabel =
    resolvedLesson.durationMinutes || resolvedLesson.duration
      ? `${formatDuration?.(resolvedLesson.durationMinutes || resolvedLesson.duration) || resolvedLesson.durationMinutes || resolvedLesson.duration}`
      : '1 hour';

  const parseMoney = (value) => {
    if (value === null || value === undefined || value === '') {
      return null;
    }

    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  };

  const groupPricePerPerson =
    parseMoney(resolvedLesson.group_price_per_person) ??
    parseMoney(resolvedLesson.groupPricePerPerson) ??
    parseMoney(resolvedLesson.price_per_person) ??
    parseMoney(resolvedLesson.pricePerPerson);

  const privateHourlyRate =
    parseMoney(coachHourlyRate) ??
    parseMoney(resolvedLesson.hourly_rate) ??
    parseMoney(resolvedLesson.hourlyRate) ??
    parseMoney(resolvedLesson.pricePerHour) ??
    parseMoney(resolvedLesson.price_per_hour) ??
    parseMoney(resolvedLesson.rate) ??
    parseMoney(resolvedLesson.price);

  const resolvedLessonFee = isGroupOrSemiPrivate ? groupPricePerPerson : privateHourlyRate;
  const feeSuffix = isGroupOrSemiPrivate ? '/ player' : '/ hour';
  const priceLabel = resolvedLessonFee !== null ? `$${resolvedLessonFee}` : '—';
  const groupCapacity = Number(
    resolvedLesson.maxParticipants ||
      resolvedLesson.max_participants ||
      resolvedLesson.player_limit ||
      resolvedLesson.capacity ||
      resolvedLesson.max_players ||
      8
  );
  const filledSpots = participantList.length;
  const availableSpots = Math.max(groupCapacity - filledSpots, 0);
  const expectedRevenue = resolvedLessonFee !== null ? resolvedLessonFee * filledSpots : null;

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
      if (resolvedLesson.isCoachCreatedLesson) {
        return (
          <button
            type="button"
            onClick={onDeclineRequest}
            className="flex-1 rounded-xl bg-red-50 px-4 py-3 text-sm font-semibold text-red-600 transition hover:bg-red-100"
          >
            ✕ Cancel Lesson
          </button>
        );
      }

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

    if (isGroupLesson) {
      return (
        <>
          <button
            type="button"
            className="flex-1 rounded-xl bg-purple-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-purple-700"
          >
            📤 Share Class
          </button>
          <button
            type="button"
            onClick={onCancelLesson}
            className="flex-1 rounded-xl bg-red-100 px-4 py-3 text-sm font-semibold text-red-600 transition hover:bg-red-200"
          >
            Cancel Class
          </button>
        </>
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

  const lessonMoment = resolvedLesson.start_date_time ? moment.utc(resolvedLesson.start_date_time) : null;
  const relativeStartLabel = lessonMoment?.isValid()
    ? lessonMoment.fromNow().replace('in ', 'Starts in ')
    : 'Starts soon';

  const avatarGradients = [
    'from-violet-500 to-violet-300',
    'from-blue-500 to-sky-400',
    'from-emerald-500 to-green-300',
    'from-amber-500 to-yellow-300',
    'from-pink-500 to-rose-300'
  ];

  return (
    <Modal
      isOpen={isOpen}
      onClose={closeModal}
      placement={isMobile ? 'bottom' : 'center'}
      overlayClassName="bg-black/40"
      panelClassName={`flex w-full flex-col overflow-hidden bg-white shadow-2xl ${
        isMobile
          ? 'max-h-[88vh] rounded-t-3xl'
          : 'max-h-[90vh] w-[390px] max-w-[94vw] rounded-2xl'
      }`}
    >
      {isMobile && <div className="mx-auto mt-3 h-1 w-9 rounded-full bg-slate-200" />}

      <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4 sm:px-6">
        <h3 className="text-lg font-semibold text-slate-900">{isEditing ? 'Edit Lesson' : title}</h3>
        <div className="flex items-center gap-2">
          {isGroupLesson && !isEditing && resolvedLesson.status === 'confirmed' && (
            <button
              type="button"
              onClick={onStartEdit}
              className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-100 text-slate-600 transition hover:bg-slate-200"
            >
              <Pencil className="h-4 w-4" />
            </button>
          )}
          <button
            type="button"
            onClick={isEditing ? onCancelEdit : closeModal}
            className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-100 text-slate-500 transition hover:bg-slate-200"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-5 pb-6 pt-5 sm:px-6">
        {!isEditing ? (
          <div className="space-y-5">
            {isGroupLesson && resolvedLesson.status === 'confirmed' && (
              <>
                <div className="flex items-center gap-3 rounded-xl bg-blue-100 px-4 py-3">
                  <span className="text-base">📅</span>
                  <p className="text-sm font-semibold text-blue-900">Upcoming</p>
                  <p className="ml-auto text-xs font-semibold text-blue-700">{relativeStartLabel}</p>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-white p-5">
                  <div className="flex items-start gap-3">
                    <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-100 text-lg">👥</div>
                    <div className="flex-1">
                      <p className="text-[11px] font-semibold uppercase tracking-wide text-blue-600">Group Lesson</p>
                      <p className="text-lg font-bold text-slate-800">{resolvedLesson.title || resolvedLesson.lesson_title || 'Group Lesson'}</p>
                    </div>
                    <span className="rounded-lg bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-600">Open</span>
                  </div>

                  <div className="mt-4 space-y-3 border-t border-slate-100 pt-4">
                    <div className="flex items-center gap-3">
                      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-50 text-slate-500">📅</div>
                      <div>
                        <p className="text-[11px] font-semibold uppercase text-slate-400">Date &amp; Time</p>
                        <p className="text-sm font-semibold text-slate-800">{resolvedLesson.dateLabel} · {resolvedLesson.startTimeLabel}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-50 text-slate-500">⏱</div>
                      <div>
                        <p className="text-[11px] font-semibold uppercase text-slate-400">Duration</p>
                        <p className="text-sm font-semibold text-slate-800">{durationLabel}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-50 text-slate-500">📍</div>
                      <div>
                        <p className="text-[11px] font-semibold uppercase text-slate-400">Location</p>
                        <p className="text-sm font-semibold text-slate-800">{resolvedLesson.locationName || 'TBD'}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-50 text-slate-500">💰</div>
                      <div>
                        <p className="text-[11px] font-semibold uppercase text-slate-400">Price</p>
                        <p className="text-sm font-semibold text-slate-800">{resolvedLessonFee !== null ? `$${resolvedLessonFee} per person` : '—'}</p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between rounded-xl bg-emerald-50 px-4 py-3">
                  <p className="text-sm text-emerald-900">Expected revenue ({filledSpots} participants)</p>
                  <p className="text-xl font-bold text-emerald-600">{expectedRevenue !== null ? `$${expectedRevenue}` : '—'}</p>
                </div>

                <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
                  <div className="flex items-center justify-between border-b border-slate-100 px-4 py-4">
                    <div className="flex items-center gap-2">
                      <p className="font-semibold text-slate-900">Participants</p>
                      <span className="rounded-full bg-violet-100 px-2 py-0.5 text-xs font-semibold text-violet-600">{filledSpots} of {groupCapacity}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setParticipantsOpen((prev) => !prev)}
                        className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600 transition hover:bg-slate-50"
                      >
                        {participantsOpen ? 'Hide' : 'Show'}
                      </button>
                      <button type="button" className="rounded-lg bg-violet-500 px-3 py-2 text-xs font-semibold text-white">💬 Text All</button>
                    </div>
                  </div>

                  {participantsOpen && (
                    <div className="space-y-1 p-2">
                    {participantList.length === 0 && (
                      <p className="px-2 py-3 text-sm text-slate-500">No participants yet.</p>
                    )}
                    {participantList.map((participant, index) => (
                      <div key={participant.id} className="flex items-center gap-3 rounded-xl p-2">
                        <div className={`flex h-11 w-11 items-center justify-center rounded-full bg-gradient-to-br ${avatarGradients[index % avatarGradients.length]} text-sm font-bold text-white`}>
                          {participant.initials}
                        </div>
                        <div className="flex-1">
                          <p className="text-sm font-semibold text-slate-800">{participant.name}</p>
                          <p className="text-xs text-slate-500">USTA {participant.level} · {participant.lessonsCompleted} lessons</p>
                          <p className={`mt-1 flex items-center gap-1 text-[11px] font-semibold ${participantStatusClass(participant.status).text}`}><span className={`h-1.5 w-1.5 rounded-full ${participantStatusClass(participant.status).dot}`} />{participant.status}</p>
                        </div>
                        <div className="flex gap-1">
                          <button type="button" className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-100 text-slate-600">
                            <MessageCircle className="h-4 w-4" />
                          </button>
                          <button type="button" className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-100 text-slate-600">
                            <Phone className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                    </div>
                  )}

                  {availableSpots > 0 && (
                    <div className="border-t border-amber-200 bg-amber-100 px-4 py-3 text-sm text-amber-900">⚠️ {availableSpots} spots still available</div>
                  )}
                </div>
              </>
            )}

            {!isGroupLesson && (
              <>
                {resolvedLesson.status === 'pending' && (
                  <div className="rounded-xl border border-yellow-200 bg-gradient-to-r from-[#FEF3C7] to-[#FDE68A] p-4">
                    <div className="flex items-start gap-3">
                      <div className="text-2xl">⏳</div>
                      <div className="space-y-1">
                        <p className="text-sm font-semibold text-yellow-900">Awaiting Player Confirmation</p>
                        <p className="text-xs text-yellow-800">
                          {resolvedLesson.isCoachCreatedLesson ? `Created ${resolvedLesson.requestedAt || 'recently'}` : `Requested ${resolvedLesson.requestedAt || 'recently'}`}
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
                        <p className="text-sm font-semibold text-red-800">Cancelled by {cancelledByLabel}</p>
                        <p className="text-xs text-red-600">{resolvedLesson.cancelledAt || 'Recently'}</p>
                      </div>
                    </div>
                  </div>
                )}

                <div className={`inline-flex items-center gap-2 rounded-lg px-3 py-1 text-xs font-semibold uppercase ${typeBadgeClass}`}>
                  🎾 {typeLabelMap[resolvedLesson.lessonType]}
                </div>

                {hasGroupPlayers ? (
                  <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
                    <div className="flex items-center justify-between border-b border-slate-100 px-4 py-4">
                      <div className="flex items-center gap-2">
                        <p className="font-semibold text-slate-900">Participants</p>
                        <span className="rounded-full bg-violet-100 px-2 py-0.5 text-xs font-semibold text-violet-600">{filledSpots}</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => setParticipantsOpen((prev) => !prev)}
                        className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600 transition hover:bg-slate-50"
                      >
                        {participantsOpen ? 'Hide' : 'Show'}
                      </button>
                    </div>
                    {participantsOpen && (
                      <div className="space-y-1 p-2">
                        {participantList.map((participant, index) => (
                        <div key={participant.id} className="flex items-center gap-3 rounded-xl p-2">
                          <div className={`flex h-11 w-11 items-center justify-center rounded-full bg-gradient-to-br ${avatarGradients[index % avatarGradients.length]} text-sm font-bold text-white`}>
                            {participant.initials}
                          </div>
                          <div className="flex-1">
                            <p className="text-sm font-semibold text-slate-800">{participant.name}</p>
                            <p className="text-xs text-slate-500">USTA {participant.level} · {participant.lessonsCompleted} lessons</p>
                            <p className={`mt-1 flex items-center gap-1 text-[11px] font-semibold ${participantStatusClass(participant.status).text}`}><span className={`h-1.5 w-1.5 rounded-full ${participantStatusClass(participant.status).dot}`} />{participant.status}</p>
                          </div>
                          <div className="flex gap-1">
                            <button type="button" className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-100 text-slate-600">
                              <MessageCircle className="h-4 w-4" />
                            </button>
                            <button type="button" className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-100 text-slate-600">
                              <Phone className="h-4 w-4" />
                            </button>
                          </div>
                        </div>
                      ))}
                      </div>
                    )}
                  </div>
                ) : primaryStudent ? (
                  <div className="flex items-center gap-3 rounded-2xl bg-slate-50 p-4">
                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-purple-500 to-purple-300 text-sm font-bold text-white">
                      {primaryStudent.initials}
                    </div>
                    <div className="flex-1">
                      <p className="text-base font-semibold text-slate-900">{primaryStudent.name}</p>
                      <p className="text-sm text-slate-500">{primaryStudent.level} · {primaryStudent.lessonsCompleted} lessons</p>
                    </div>
                    <button
                      type="button"
                      className="flex h-9 w-9 items-center justify-center rounded-full bg-purple-100 text-purple-600"
                    >
                      <MessageCircle className="h-5 w-5" />
                    </button>
                  </div>
                ) : null}

                {resolvedLesson.status === 'pending' && resolvedLesson.studentMessage && (
                  <div className="rounded-xl border border-slate-100 border-l-4 border-l-purple-500 bg-slate-50 p-4">
                    <p className="text-xs font-semibold uppercase text-slate-400">Message from Student</p>
                    <p className="mt-2 text-sm text-slate-600">{resolvedLesson.studentMessage}</p>
                  </div>
                )}

                {resolvedLesson.status === 'cancelled' && resolvedLesson.cancellationReason && (
                  <div className="rounded-xl border border-red-100 border-l-4 border-l-red-500 bg-red-50 p-4">
                    <p className="text-xs font-semibold uppercase text-slate-400">Cancellation Reason</p>
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
                    <p className="mt-2 text-base font-semibold text-slate-900">{resolvedLesson.locationName || 'TBD'}</p>
                    <p className="text-sm text-slate-500">{resolvedLesson.locationAddress || ''}</p>
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
                      {priceLabel} <span className="text-sm font-normal text-slate-400">{feeSuffix}</span>
                    </p>
                  </div>
                </div>
              </>
            )}
          </div>
        ) : (
          <div className="space-y-5">
            {isGroupLesson ? (
              <>
                <div>
                  <label className="mb-2 block text-sm font-semibold text-slate-800">Lesson Title</label>
                  <input
                    type="text"
                    value={editData?.title || editData?.lesson_title || ''}
                    onChange={(event) => handleFieldChange('title', event.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                </div>
                <div>
                  <label className="mb-2 block text-sm font-semibold text-slate-800">Date & Time</label>
                  <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium text-slate-700">
                    {resolvedLesson.dateLabel} · {resolvedLesson.startTimeLabel}{resolvedLesson.endTimeLabel ? ` - ${resolvedLesson.endTimeLabel}` : ''}
                  </div>
                </div>
                <div>
                  <label className="mb-2 block text-sm font-semibold text-slate-800">Location</label>
                  <select
                    value={editData?.location || editData?.location_name || resolvedLesson.locationName || ''}
                    onChange={(event) => handleFieldChange('location', event.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-purple-500"
                  >
                    {[resolvedLesson.locationName, ...coachCourts].filter(Boolean).map((court) => (
                      <option key={court} value={court}>{court}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="mb-2 block text-sm font-semibold text-slate-800">Price per Person</label>
                  <div className="inline-flex items-center rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
                    <span className="mr-1 text-lg text-slate-500">$</span>
                    <input
                      type="number"
                      value={editData?.group_price_per_person || editData?.price_per_person || resolvedLessonFee || ''}
                      onChange={(event) => handleFieldChange('group_price_per_person', event.target.value)}
                      className="w-24 bg-transparent text-lg font-semibold text-slate-800 focus:outline-none"
                    />
                  </div>
                </div>
                <div>
                  <label className="mb-2 block text-sm font-semibold text-slate-800">Max Participants</label>
                  <input
                    type="number"
                    min={filledSpots}
                    value={editData?.max_participants || editData?.maxParticipants || groupCapacity}
                    onChange={(event) => handleFieldChange('max_participants', event.target.value)}
                    className="w-24 rounded-xl border border-slate-200 bg-slate-50 px-4 py-2 text-center text-base font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                  <p className="mt-2 text-xs text-slate-500">{filledSpots} already booked</p>
                </div>
                <div className="rounded-xl bg-amber-100 px-4 py-3 text-sm text-amber-900">
                  📲 Notify participants? {filledSpots} booked participants will be notified of changes.
                </div>
              </>
            ) : (
              <>
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
              </>
            )}
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
