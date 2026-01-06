import { useCallback, useEffect, useState } from 'react';
import {
  createCoachAvailability,
  getCoachAvailability,
  getCoachLessons,
  getCoachStats,
  updateCoachLesson
} from '../services/coach';

const emptyAvailability = {
  weekly: {},
  weeklyLocations: {},
  adHoc: [],
  blockedSlots: []
};

const toLessonDateTime = (value) => {
  if (!value) {
    return null;
  }

  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

const toTimeString = (date) => {
  if (!date) {
    return '';
  }

  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  return `${hours}:${minutes}`;
};

const normaliseLesson = (lesson) => {
  if (!lesson || typeof lesson !== 'object') {
    return lesson;
  }

  if (lesson.date && lesson.time) {
    return lesson;
  }

  const start = toLessonDateTime(lesson.start_date_time || lesson.startDateTime || lesson.start);
  const end = toLessonDateTime(lesson.end_date_time || lesson.endDateTime || lesson.end);
  const durationMinutes = start && end ? Math.max(0, (end - start) / 60000) : null;
  const durationSlots = durationMinutes !== null ? Math.max(1, Math.round(durationMinutes / 30)) : 2;

  const typeLabel = lesson.lesson_type_name || lesson.lessonType || lesson.type || '';
  const statusValue = lesson.status;
  const lessonStatus = statusValue === 0 ? 'pending' : lesson.lessonStatus || 'scheduled';

  return {
    ...lesson,
    id: lesson.id ?? lesson.lesson_id ?? lesson.lessonId,
    date: start ? start.toISOString().split('T')[0] : lesson.date,
    time: start ? toTimeString(start) : lesson.time,
    duration: lesson.duration ?? durationSlots,
    type: typeof typeLabel === 'string' ? typeLabel.toLowerCase() : lesson.type,
    student: lesson.student || lesson.full_name || lesson.player_name || lesson.playerName || '',
    location: lesson.location || lesson.court || lesson.venue || '',
    lessonStatus
  };
};

const normaliseLessons = (payload) => {
  if (Array.isArray(payload)) {
    return payload.map(normaliseLesson);
  }

  if (payload && Array.isArray(payload.lessons)) {
    return payload.lessons.map(normaliseLesson);
  }

  return [];
};

const addWeeklySlot = (acc, day, start, end, location) => {
  if (!day || !start || !end) {
    return;
  }

  const label = `${start} - ${end}`;
  const daySlots = acc.weekly[day] ? [...acc.weekly[day]] : [];

  if (!daySlots.includes(label)) {
    daySlots.push(label);
  }

  acc.weekly[day] = daySlots;

  const dayLocations = { ...(acc.weeklyLocations[day] || {}) };
  if (location) {
    dayLocations[label] = location;
  }
  acc.weeklyLocations[day] = dayLocations;
};

const normaliseAdHocSlot = (slot) => {
  if (!slot) {
    return null;
  }

  const start = slot.start || slot.startTime;
  const end = slot.end || slot.endTime || slot.finish;
  const date = slot.date;

  if (!date || !start) {
    return null;
  }

  return {
    ...slot,
    id: slot.id ?? slot.availabilityId,
    date,
    start,
    end,
    location: slot.location || slot.court || slot.venue || '',
    type: slot.type || 'ad-hoc'
  };
};

const normaliseAvailability = (payload) => {
  if (!payload) {
    return { ...emptyAvailability };
  }

  const availability = {
    weekly: {},
    weeklyLocations: {},
    adHoc: [],
    blockedSlots: []
  };

  const registerWeeklySlot = (slot) => {
    if (!slot) {
      return;
    }

    const day = slot.dayOfWeek || slot.day;
    const start = slot.start || slot.startTime;
    const end = slot.end || slot.endTime;
    const location = slot.location || slot.court || slot.venue || '';

    addWeeklySlot(availability, day, start, end, location);
  };

  const registerWeeklyList = (day, slots, locationLookup = {}) => {
    if (!Array.isArray(slots)) {
      return;
    }

    slots.forEach((slot) => {
      if (typeof slot === 'string') {
        const [start, end] = slot.split('-').map((item) => item.trim());
        const label = `${start} - ${end}`;
        addWeeklySlot(availability, day, start, end, locationLookup[label]);
      } else {
        registerWeeklySlot({ ...slot, day });
      }
    });
  };

  const registerAdHocCollection = (collection) => {
    if (!Array.isArray(collection)) {
      return;
    }

    collection.forEach((slot) => {
      const normalised = normaliseAdHocSlot(slot);
      if (normalised) {
        availability.adHoc.push(normalised);
      }
    });
  };

  if (Array.isArray(payload)) {
    payload.forEach((slot) => {
      const normalised = normaliseAdHocSlot(slot);
      if (normalised) {
        availability.adHoc.push(normalised);
      } else {
        registerWeeklySlot(slot);
      }
    });
    return availability;
  }

  if (Array.isArray(payload.blockedSlots)) {
    availability.blockedSlots = payload.blockedSlots;
  }

  const weeklySource =
    payload.weekly || payload.recurring || payload.recurringAvailability || payload.slots || {};

  Object.entries(weeklySource || {}).forEach(([day, slots]) => {
    const locations = (payload.weeklyLocations || payload.locations || {})[day] || {};
    registerWeeklyList(day, slots, locations);
  });

  const locationOverrides = payload.weeklyLocations || payload.locations || {};
  Object.entries(locationOverrides).forEach(([day, mapping]) => {
    availability.weeklyLocations[day] = {
      ...(availability.weeklyLocations[day] || {}),
      ...(mapping || {})
    };
    if (!availability.weekly[day]) {
      availability.weekly[day] = Object.keys(mapping || {});
    }
  });

  const adHocSource =
    payload.adHoc || payload.adhoc || payload.oneOff || payload.single || payload.ad_hoc || [];

  if (Array.isArray(adHocSource)) {
    registerAdHocCollection(adHocSource);
  } else if (Array.isArray(adHocSource?.slots)) {
    registerAdHocCollection(adHocSource.slots);
  }

  return availability;
};

const mergeAvailability = (current, nextSlot, fallback) => {
  const base = {
    weekly: { ...(current?.weekly || {}) },
    weeklyLocations: { ...(current?.weeklyLocations || {}) },
    adHoc: Array.isArray(current?.adHoc) ? [...current.adHoc] : [],
    blockedSlots: Array.isArray(current?.blockedSlots) ? [...current.blockedSlots] : []
  };

  if (!nextSlot && !fallback) {
    return base;
  }

  const slot = nextSlot || fallback || {};

  if (slot.date || fallback?.date) {
    const normalised = normaliseAdHocSlot({ ...fallback, ...slot });
    if (normalised) {
      const filtered = base.adHoc.filter(
        (item) => !(item.date === normalised.date && item.start === normalised.start)
      );
      filtered.push(normalised);
      base.adHoc = filtered;
    }
    return base;
  }

  const day = slot.dayOfWeek || slot.day || fallback?.day || fallback?.dayOfWeek;
  const start = slot.start || slot.startTime || fallback?.start || fallback?.startTime;
  const end = slot.end || slot.endTime || fallback?.end || fallback?.endTime;
  const location = slot.location || slot.court || fallback?.location || '';

  addWeeklySlot(base, day, start, end, location);
  return base;
};

const normaliseStats = (payload) => {
  if (!payload) {
    return null;
  }

  if (payload.stats && typeof payload.stats === 'object') {
    return payload.stats;
  }

  return payload;
};

export const useCoachSchedule = ({ enabled = true } = {}) => {
  const [lessons, setLessons] = useState([]);
  const [availability, setAvailability] = useState({ ...emptyAvailability });
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(Boolean(enabled));
  const [error, setError] = useState(null);
  const [mutationLoading, setMutationLoading] = useState(false);
  const [mutationError, setMutationError] = useState(null);

  const fetchSchedule = useCallback(async () => {
    if (!enabled) {
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const [lessonsResult, availabilityResult, statsResult] = await Promise.allSettled([
        getCoachLessons(),
        getCoachAvailability(),
        getCoachStats()
      ]);

      if (lessonsResult.status === 'fulfilled') {
        setLessons(normaliseLessons(lessonsResult.value));
      } else {
        throw lessonsResult.reason;
      }

      if (availabilityResult.status === 'fulfilled') {
        setAvailability(normaliseAvailability(availabilityResult.value));
      } else {
        throw availabilityResult.reason;
      }

      if (statsResult.status === 'fulfilled') {
        setStats(normaliseStats(statsResult.value));
      } else {
        setStats(null);
      }

      setError(null);
    } catch (err) {
      const normalisedError = err instanceof Error ? err : new Error('Failed to load schedule data');
      setError(normalisedError);
    } finally {
      setLoading(false);
    }
  }, [enabled]);

  useEffect(() => {
    if (!enabled) {
      setLoading(false);
      return;
    }

    fetchSchedule();
  }, [enabled, fetchSchedule]);

  const refresh = useCallback(() => fetchSchedule(), [fetchSchedule]);

  const addAvailabilitySlot = useCallback(
    async (slot) => {
      if (!slot) {
        throw new Error('A slot payload is required to create availability.');
      }

      setMutationLoading(true);
      setMutationError(null);

      try {
        const created = await createCoachAvailability(slot);
        setAvailability((prev) => mergeAvailability(prev, created, slot));
        return created;
      } catch (err) {
        const normalisedError = err instanceof Error ? err : new Error('Failed to create availability');
        setMutationError(normalisedError);
        throw normalisedError;
      } finally {
        setMutationLoading(false);
      }
    },
    []
  );

  const updateLessonMutation = useCallback(
    async (lessonId, updates = {}) => {
      if (!lessonId) {
        throw new Error('A lesson id is required to update a lesson.');
      }

      setMutationLoading(true);
      setMutationError(null);

      try {
        const response = await updateCoachLesson(lessonId, updates);
        setLessons((prev) =>
          prev.map((lesson) => {
            if (lesson.id !== lessonId) {
              return lesson;
            }

            if (response && typeof response === 'object' && !Array.isArray(response)) {
              return { ...lesson, ...response };
            }

            return { ...lesson, ...updates };
          })
        );
        return response;
      } catch (err) {
        const normalisedError = err instanceof Error ? err : new Error('Failed to update lesson');
        setMutationError(normalisedError);
        throw normalisedError;
      } finally {
        setMutationLoading(false);
      }
    },
    []
  );

  return {
    lessons,
    availability,
    stats,
    loading,
    error,
    refresh,
    addAvailabilitySlot,
    updateLesson: updateLessonMutation,
    mutationLoading,
    mutationError
  };
};

export default useCoachSchedule;
