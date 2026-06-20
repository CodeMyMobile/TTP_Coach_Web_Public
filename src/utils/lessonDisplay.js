import moment from 'moment';

// Duration is stored as a count of 30-minute slots (e.g. 2 = 1 hour).
export const formatLessonDuration = (duration) => {
  const slots = Number(duration);
  if (!Number.isFinite(slots) || slots <= 0) {
    return '';
  }

  const hours = Math.floor(slots / 2);
  const hasHalfHour = slots % 2 === 1;

  if (hours === 0 && hasHalfHour) return '30 min';
  if (hours === 1 && !hasHalfHour) return '1 hour';
  if (hours === 1 && hasHalfHour) return '1.5 hours';
  if (hours > 1 && !hasHalfHour) return `${hours} hours`;
  if (hours > 1 && hasHalfHour) return `${hours}.5 hours`;
  return `${slots * 30} min`;
};

const parseDisplayMoment = (dateInput, { treatUtcAsLocal = false } = {}) => {
  if (!dateInput) {
    return null;
  }

  if (treatUtcAsLocal && typeof dateInput === 'string' && /z$/i.test(dateInput)) {
    const parsedLocal = moment(dateInput.replace(/z$/i, ''));
    return parsedLocal.isValid() ? parsedLocal : null;
  }

  const parsed = moment(dateInput);
  return parsed.isValid() ? parsed : null;
};

// Returns { start, end } as moment objects (or null), mirroring LessonDetailModal's
// timezone handling: prefer the *_tz fields, otherwise treat a bare UTC string as local.
export const getLessonMoments = (lesson) => {
  if (!lesson) {
    return { start: null, end: null };
  }

  const startWithTimezone = lesson.start_date_time_tz || lesson.startDateTimeTz || lesson.startDateTime;
  const endWithTimezone = lesson.end_date_time_tz || lesson.endDateTimeTz || lesson.endDateTime;
  const startRaw = startWithTimezone || lesson.start_date_time || lesson.start;
  const endRaw = endWithTimezone || lesson.end_date_time || lesson.end;
  const shouldTreatUtcAsLocal = !startWithTimezone && !endWithTimezone;

  const start = parseDisplayMoment(startRaw, { treatUtcAsLocal: shouldTreatUtcAsLocal });
  const end = endRaw
    ? parseDisplayMoment(endRaw, { treatUtcAsLocal: shouldTreatUtcAsLocal })
    : start?.isValid()
      ? start.clone().add(1, 'hour')
      : null;

  return { start, end };
};

// 'YYYY-MM-DD' for the lesson's local day, falling back to the normalised `date` field.
export const getLessonDateKey = (lesson) => {
  const { start } = getLessonMoments(lesson);
  if (start?.isValid()) {
    return start.format('YYYY-MM-DD');
  }
  return lesson?.date || null;
};

// 'pending' | 'confirmed' | 'cancelled' | 'scheduled'
export const getLessonStatus = (lesson) => {
  const value = lesson?.status ?? lesson?.lessonStatus ?? lesson?.lesson_status;

  if (value === 2 || value === '2') return 'cancelled';
  if (value === 0 || value === '0') return 'pending';
  if (value === 1 || value === '1') return 'confirmed';
  if (!value) return 'scheduled';

  const normalized = String(value).toLowerCase();
  if (normalized.includes('cancel')) return 'cancelled';
  if (normalized.includes('pending') || normalized.includes('request') || normalized.includes('await')) {
    return 'pending';
  }
  if (normalized.includes('confirm') || normalized.includes('schedule') || normalized.includes('book')) {
    return 'confirmed';
  }
  return normalized;
};

// 'private' | 'semi-private' | 'group'
export const getLessonType = (lesson) => {
  const typeId = Number(lesson?.lessontype_id ?? lesson?.lesson_type_id ?? lesson?.lessonTypeId);
  if (typeId === 2) return 'semi-private';
  if (typeId === 3) return 'group';

  const raw = lesson?.lesson_type_name || lesson?.lessonType || lesson?.type || '';
  const normalized = String(raw).toLowerCase();
  if (normalized.includes('semi')) return 'semi-private';
  if (normalized.includes('group') || normalized.includes('open')) return 'group';
  return 'private';
};

export const isGroupLesson = (lesson) => getLessonType(lesson) !== 'private';

const toInitials = (name) =>
  String(name || 'ST')
    .split(' ')
    .filter(Boolean)
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase() || 'ST';

// Per-participant status, matching LessonDetailModal's 0/1/2 convention.
export const resolveParticipantStatus = (status) => {
  if (status === 1 || status === '1') return 'Confirmed';
  if (status === 2 || status === '2') return 'Cancelled';
  if (status === 0 || status === '0') return 'Pending';
  if (!status) return 'Confirmed';
  return status;
};

// Normalised participant list: [{ id, playerId, name, initials, phone, profilePicture, status }]
export const getLessonParticipants = (lesson) => {
  if (!lesson) {
    return [];
  }

  const groupPlayers = Array.isArray(lesson.group_players)
    ? lesson.group_players
    : Array.isArray(lesson.groupPlayers)
      ? lesson.groupPlayers
      : [];

  if (groupPlayers.length > 0) {
    return groupPlayers.map((player, index) => ({
      id: player.player_id || player.playerId || player.id || `${player.full_name}-${index}`,
      playerId: player.player_id || player.playerId || player.id || null,
      name: player.full_name || player.name || player.player_name || `Participant ${index + 1}`,
      initials: toInitials(player.full_name || player.name || player.player_name),
      phone: player.phone || player.phone_number || '',
      profilePicture: player.profile_picture || player.profilePicture || '',
      status: resolveParticipantStatus(player.status)
    }));
  }

  const name =
    lesson.student ||
    lesson.full_name ||
    lesson.player_name ||
    lesson.studentName ||
    lesson.playerName ||
    lesson.metadata?.player_name ||
    '';

  if (!name) {
    return [];
  }

  return [
    {
      id: lesson.player_id || lesson.playerId || lesson.id,
      playerId: lesson.player_id || lesson.playerId || null,
      name,
      initials: toInitials(name),
      phone: lesson.phone || lesson.phone_number || '',
      profilePicture: lesson.profile_picture || lesson.profilePicture || '',
      status: resolveParticipantStatus(lesson.status)
    }
  ];
};

// Total spots for a group lesson (defaults to 8 when no capacity field is present).
export const getGroupCapacity = (lesson) =>
  Number(
    lesson?.maxParticipants ??
      lesson?.max_participants ??
      lesson?.player_limit ??
      lesson?.playerLimit ??
      lesson?.capacity ??
      lesson?.max_players ??
      8
  );
