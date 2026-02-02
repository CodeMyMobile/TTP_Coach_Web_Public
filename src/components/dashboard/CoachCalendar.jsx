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

const parseLessonDateTime = (value) => {
  if (!value) {
    return null;
  }

  const parsed =  moment(String(value).replace(/Z$/, '')).toDate();
  if (!Number.isNaN(parsed.getTime())) {
    return parsed;
  }

  const fallback = moment(String(value)).toDate();
  return Number.isNaN(fallback.getTime()) ? null : fallback;
};

const buildLessonEvents = (lessons) =>
  (Array.isArray(lessons) ? lessons : []).flatMap((lesson) => {
    const startDateTime =
      lesson.start_date_time ||
      lesson.start_date_time_tz ||
      lesson.startDateTime ||
      lesson.startDateTimeTz ||
      lesson.start;
    const endDateTime =
      lesson.end_date_time ||
      lesson.end_date_time_tz ||
      lesson.endDateTime ||
      lesson.endDateTimeTz ||
      lesson.end;

    const start = startDateTime
      ? parseLessonDateTime(startDateTime)
      : toDateTime(lesson.date, lesson.time);
    let end = endDateTime ? parseLessonDateTime(endDateTime) : null;

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
      lessonType: lesson.lessontype_id || lesson.lesson_type_id || lesson.lessonTypeId,
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
      const dayValue = slot?.day || slot?.dayOfWeek || slot?.day_of_week;
      const dayKey = String(dayValue || '').trim().toLowerCase();
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
    const dayIndex = DAY_INDEX[String(dayKey).trim().toLowerCase()];
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
  googleEvents = [],
  events = null,
  currentDate,
  onDateChange,
  view = 'week',
  onViewChange,
  showToolbar = true,
  onLessonSelect,
  onAvailabilitySelect,
  onEmptySlotSelect,
  onRangeChange
}) => {
  const resolvedEvents = useMemo(() => {
    if (Array.isArray(events)) {
      return events;
    }

    const lessonEvents = buildLessonEvents(lessons);
    const availabilityEvents = buildAvailabilityEvents(availability, currentDate || new Date());
    const busyEvents = (Array.isArray(googleEvents) ? googleEvents : []).map((event) => {
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
      const start = startValue ? new Date(startValue) : null;
      const end = endValue ? new Date(endValue) : null;
      return {
        start,
        end,
        allDay: Boolean(event.all_day) || Boolean(event.start?.date && !event.start?.dateTime),
        title: event.summary || event.raw_payload?.summary || 'Busy',
        resource: event,
        type: 'busy'
      };
    }).filter((event) => event.start && event.end);

    const subtractBusy = (slots, busy) => {
      const byDay = new Map();
      busy.forEach((event) => {
        const key = event.start.toLocaleDateString('en-CA');
        if (!byDay.has(key)) {
          byDay.set(key, []);
        }
        byDay.get(key).push(event);
      });

      return slots.flatMap((slot) => {
        const key = slot.start.toLocaleDateString('en-CA');
        const busyList = byDay.get(key) || [];
        if (busyList.length === 0) {
          return [slot];
        }

        let segments = [{ start: slot.start, end: slot.end }];
        busyList.forEach((event) => {
          if (event.allDay) {
            segments = [];
            return;
          }
          segments = segments.flatMap((segment) => {
            if (event.end <= segment.start || event.start >= segment.end) {
              return [segment];
            }
            const updated = [];
            if (event.start > segment.start) {
              updated.push({ start: segment.start, end: event.start });
            }
            if (event.end < segment.end) {
              updated.push({ start: event.end, end: segment.end });
            }
            return updated;
          });
        });

        return segments.map((segment) => ({
          ...slot,
          start: segment.start,
          end: segment.end,
          title: slot.title
        }));
      });
    };

    const availabilityMinusBusy = subtractBusy(availabilityEvents, busyEvents);
    return [...availabilityMinusBusy, ...lessonEvents, ...busyEvents];
  }, [events, lessons, availability, currentDate, googleEvents]);

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

  useEffect(() => {
    if (!onRangeChange) {
      return;
    }
    const baseDate = currentDate || new Date();
    if (view === 'day') {
      onRangeChange([baseDate]);
      return;
    }
    if (view === 'week') {
      const start = getWeekStart(baseDate);
      const range = Array.from({ length: 7 }, (_, index) => {
        const next = new Date(start);
        next.setDate(start.getDate() + index);
        return next;
      });
      onRangeChange(range);
      return;
    }
    onRangeChange([baseDate]);
  }, [currentDate, onRangeChange, view]);
console.log("events",events);
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
      <div className="mb-3 flex flex-wrap items-center gap-3 text-xs font-medium text-gray-600">
        <span className="inline-flex items-center gap-2">
          <span className="h-2.5 w-2.5 rounded-sm bg-[#e63946]" />
          Private
        </span>
        <span className="inline-flex items-center gap-2">
          <span className="h-2.5 w-2.5 rounded-sm bg-[#f4a261]" />
          Semi-Private
        </span>
        <span className="inline-flex items-center gap-2">
          <span className="h-2.5 w-2.5 rounded-sm bg-[#2a9d8f]" />
          Open Group
        </span>
        <span className="inline-flex items-center gap-2">
          <span className="h-2.5 w-2.5 rounded-sm bg-[#8ecae6]" />
          Availability
        </span>
        <span className="inline-flex items-center gap-2">
          <span className="h-2.5 w-2.5 rounded-sm bg-[#334155]" />
          Busy (Google)
        </span>
      </div>
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
        onRangeChange={onRangeChange}
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
            const lessonType = Number(event.lessonType ?? event.resource?.lessontype_id ?? event.resource?.lesson_type_id);
            if (lessonType === 2) {
              return {
                style: {
                  backgroundColor: '#f4a261',
                  borderColor: '#e76f51',
                  borderRadius: '4px',
                  color: 'white'
                }
              };
            }
            if (lessonType === 3) {
              return {
                style: {
                  backgroundColor: '#2a9d8f',
                  borderColor: '#1f7a69',
                  borderRadius: '4px',
                  color: 'white'
                }
              };
            }
            return {
              style: {
                backgroundColor: '#e63946',
                borderColor: '#a62030',
                borderRadius: '4px',
                color: 'white'
              }
            };
          }
          if (event.type === 'busy') {
            return {
              style: {
                backgroundColor: '#334155',
                borderColor: '#0f172a',
                borderRadius: '6px',
                color: 'white',
                opacity: 0.85
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
