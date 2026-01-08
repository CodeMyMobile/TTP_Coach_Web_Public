import React, { useEffect, useMemo } from 'react';
import moment from 'moment';
import { Calendar, momentLocalizer } from 'react-big-calendar';
import 'react-big-calendar/lib/css/react-big-calendar.css';

const localizer = momentLocalizer(moment);

const DAY_INDEX = {
  sunday: 0,
  monday: 1,
  tuesday: 2,
  wednesday: 3,
  thursday: 4,
  friday: 5,
  saturday: 6
};

const toDateTime = (date, time) => {
  if (!date || !time) {
    return null;
  }

  const [hour, minute] = time.split(':').map(Number);
  if (Number.isNaN(hour) || Number.isNaN(minute)) {
    return null;
  }

  const parsedDate = new Date(date);
  if (Number.isNaN(parsedDate.getTime())) {
    return null;
  }

  parsedDate.setHours(hour, minute, 0, 0);
  return parsedDate;
};

const getWeekStart = (date) => {
  const start = new Date(date);
  const day = start.getDay();
  start.setDate(start.getDate() - day);
  start.setHours(0, 0, 0, 0);
  return start;
};

const buildLessonEvents = (lessons) =>
  (Array.isArray(lessons) ? lessons : []).flatMap((lesson) => {
    const startDateTime = lesson.start_date_time || lesson.startDateTime;
    const endDateTime = lesson.end_date_time || lesson.endDateTime;

    const start = startDateTime
      ? moment(String(startDateTime).replace(/Z$/, '')).toDate()
      : toDateTime(lesson.date, lesson.time);
    let end = endDateTime
      ? moment(String(endDateTime).replace(/Z$/, '')).toDate()
      : null;

    if (!start || Number.isNaN(start.getTime())) {
      return [];
    }

    if (!end || Number.isNaN(end.getTime())) {
      const durationSlots = lesson.duration || 2;
      end = new Date(start.getTime() + durationSlots * 30 * 60000);
    }

    return [{
      start,
      end,
      title: lesson.metadata?.title || lesson.lesson_type_name || lesson.type || 'Lesson',
      resource: lesson,
      type: 'lesson'
    }];
  });

const buildAvailabilityEvents = (availability, referenceDate) => {
  if (!availability) {
    return [];
  }

  const events = [];
  const weekStart = getWeekStart(referenceDate);
  const addEvent = ({ date, start, end, location, source }) => {
    const startDate = toDateTime(date, start);
    const endDate = toDateTime(date, end);
    if (!startDate || !endDate) {
      return;
    }

    events.push({
      start: startDate,
      end: endDate,
      title: location || 'Available',
      resource: {
        ...(source || {}),
        date,
        start,
        end,
        location
      },
      type: 'availability'
    });
  };

  if (Array.isArray(availability)) {
    availability.forEach((slot) => {
      const dayKey = String(slot?.day || '').toLowerCase();
      const dayIndex = DAY_INDEX[dayKey];
      if (dayIndex === undefined) {
        return;
      }

      const dayDate = new Date(weekStart);
      dayDate.setDate(weekStart.getDate() + dayIndex);
      addEvent({
        date: dayDate,
        start: slot.from || slot.start,
        end: slot.to || slot.end,
        location: slot.location || slot.location_name || '',
        source: slot
      });
    });

    return events;
  }

  Object.entries(availability.weekly || {}).forEach(([dayKey, slots]) => {
    const dayIndex = DAY_INDEX[String(dayKey).toLowerCase()];
    if (dayIndex === undefined || !Array.isArray(slots)) {
      return;
    }

    const dayDate = new Date(weekStart);
    dayDate.setDate(weekStart.getDate() + dayIndex);

    slots.forEach((slot) => {
      if (typeof slot !== 'string') {
        return;
      }

      const [rawStart, rawEnd] = slot.split('-').map((part) => part.trim());
      addEvent({
        date: dayDate,
        start: rawStart,
        end: rawEnd,
        location: availability.weeklyLocations?.[dayKey]?.[slot] || '',
        source: { date: dayDate, start: rawStart, end: rawEnd }
      });
    });
  });

  (availability.adHoc || []).forEach((slot) => {
    addEvent({
      date: slot.date,
      start: slot.start,
      end: slot.end || slot.endTime,
      location: slot.location || '',
      source: slot
    });
  });

  return events;
};

const CoachCalendar = ({
  lessons = [],
  availability = null,
  events = null,
  currentDate,
  onDateChange,
  view = 'week',
  onViewChange,
  showToolbar = true,
  onLessonSelect,
  onAvailabilitySelect,
  onEmptySlotSelect
}) => {
  const resolvedEvents = useMemo(() => {
    if (Array.isArray(events)) {
      return events;
    }

    const lessonEvents = buildLessonEvents(lessons);
    const availabilityEvents = buildAvailabilityEvents(availability, currentDate || new Date());
    return [...availabilityEvents, ...lessonEvents];
  }, [events, lessons, availability, currentDate]);

  useEffect(() => {
    const lessonEvents = resolvedEvents.filter((event) => event.type === 'lesson');
    const availabilityEvents = resolvedEvents.filter((event) => event.type === 'availability');
    console.log('[CoachCalendar] events summary', {
      total: resolvedEvents.length,
      lessons: lessonEvents.length,
      availability: availabilityEvents.length
    });

    if (lessonEvents.length === 0) {
      if (availabilityEvents.length === 0) {
        return;
      }
    }

    lessonEvents.forEach((event) => {
      console.log('[CoachCalendar] lesson event', event.start, event.end, event.title);
    });

    availabilityEvents.forEach((event) => {
      console.log('[CoachCalendar] availability event', event.start, event.end, event.title);
    });
  }, [resolvedEvents]);
console.log("events",events);
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
      <Calendar
        localizer={localizer}
        events={resolvedEvents}
        startAccessor="start"
        endAccessor="end"
        views={['week', 'day']}
        view={view}
        onView={onViewChange}
        date={currentDate}
        onNavigate={onDateChange}
        toolbar={showToolbar}
        selectable
        step={30}
        timeslots={2}
        style={{ height: 620 }}
        onSelectEvent={(event) => {
          if (event.type === 'lesson') {
            onLessonSelect?.(event.resource || event);
          } else if (event.type === 'availability') {
            onAvailabilitySelect?.(event.resource || event);
          }
        }}
        onSelectSlot={({ start, end }) => {
          const dateKey = start.toISOString().split('T')[0];
          const startTime = start.toTimeString().slice(0, 5);
          const endTime = end.toTimeString().slice(0, 5);

          const availabilityEvent = resolvedEvents.find(
            (event) =>
              event.type === 'availability' &&
              event.start <= start &&
              event.end >= end
          );

          if (availabilityEvent) {
            onAvailabilitySelect?.({
              ...(availabilityEvent.resource || {}),
              date: dateKey,
              start: startTime,
              end: endTime
            });
            return;
          }

          onEmptySlotSelect?.({
            date: dateKey,
            start: startTime,
            end: endTime,
            location: ''
          });
        }}
        eventPropGetter={(event) => {
          if (event.type === 'lesson') {
            return {
              style: {
                backgroundColor: '#e63946',
                borderColor: '#a62030',
                borderRadius: '4px',
                color: 'white'
              }
            };
          }
          return {
            style: {
              backgroundColor: '#8ecae6',
              borderColor: '#023047',
              borderRadius: '6px',
              opacity: 0.85,
              color: '#0f172a',
              fontWeight: 600
            }
          };
        }}
      />
    </div>
  );
};

export default CoachCalendar;
