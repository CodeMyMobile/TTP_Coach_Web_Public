import React, { useEffect, useMemo, useRef, useState } from 'react';
import moment from 'moment';
import { Calendar, momentLocalizer } from 'react-big-calendar';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import './CoachCalendar.css';

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
  onRangeChange,
  onOpenAddAvailability
}) => {
  const [mobileView, setMobileView] = useState(view === 'day' ? 'day' : 'week');
  const calendarRef = useRef(null);

  const lessonEvents = useMemo(() => buildLessonEvents(lessons), [lessons]);
  const availabilityEvents = useMemo(
    () => buildAvailabilityEvents(availability, currentDate || new Date()),
    [availability, currentDate]
  );
  const busyEvents = useMemo(
    () =>
      (Array.isArray(googleEvents) ? googleEvents : [])
        .map((event) => {
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
        })
        .filter((event) => event.start && event.end),
    [googleEvents]
  );

  const availabilityMinusBusy = useMemo(() => {
    const byDay = new Map();
    busyEvents.forEach((event) => {
      const key = event.start.toLocaleDateString('en-CA');
      if (!byDay.has(key)) {
        byDay.set(key, []);
      }
      byDay.get(key).push(event);
    });

    return availabilityEvents.flatMap((slot) => {
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
  }, [availabilityEvents, busyEvents]);

  const resolvedEvents = useMemo(() => {
    if (Array.isArray(events)) {
      return events;
    }

    return [...availabilityMinusBusy, ...lessonEvents, ...busyEvents];
  }, [availabilityMinusBusy, busyEvents, events, lessonEvents]);

  useEffect(() => {
    setMobileView(view === 'day' ? 'day' : 'week');
  }, [view]);

  useEffect(() => {
    const updateMetrics = () => {
      if (!calendarRef.current) {
        return;
      }
      const header = calendarRef.current.querySelector('.rbc-time-header');
      const gutter = calendarRef.current.querySelector('.rbc-time-header-gutter');
      if (header) {
        calendarRef.current.style.setProperty(
          '--coach-time-header-height',
          `${header.getBoundingClientRect().height}px`
        );
      }
      if (gutter) {
        calendarRef.current.style.setProperty(
          '--coach-time-gutter-width',
          `${gutter.getBoundingClientRect().width}px`
        );
      }
    };

    updateMetrics();
    window.addEventListener('resize', updateMetrics);
    return () => window.removeEventListener('resize', updateMetrics);
  }, [view, resolvedEvents.length]);

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

  const availabilityByDay = useMemo(() => {
    const map = new Map();
    availabilityEvents.forEach((slot) => {
      const key = slot.start.toLocaleDateString('en-CA');
      if (!map.has(key)) {
        map.set(key, []);
      }
      map.get(key).push(slot);
    });
    return map;
  }, [availabilityEvents]);

  const lessonsByDay = useMemo(() => {
    const map = new Map();
    [...lessonEvents, ...busyEvents].forEach((slot) => {
      const key = slot.start.toLocaleDateString('en-CA');
      if (!map.has(key)) {
        map.set(key, []);
      }
      map.get(key).push(slot);
    });
    map.forEach((items, key) => {
      map.set(
        key,
        items.sort((a, b) => a.start.getTime() - b.start.getTime())
      );
    });
    return map;
  }, [busyEvents, lessonEvents]);

  const mobileDays = useMemo(() => {
    const baseDate = currentDate || new Date();
    if (mobileView === 'week') {
      const start = getWeekStart(baseDate);
      return Array.from({ length: 7 }, (_, index) => {
        const next = new Date(start);
        next.setDate(start.getDate() + index);
        return next;
      });
    }
    const count = mobileView === '3day' ? 3 : 1;
    return Array.from({ length: count }, (_, index) => {
      const next = new Date(baseDate);
      next.setDate(baseDate.getDate() + index);
      return next;
    });
  }, [currentDate, mobileView]);

  const weekDays = useMemo(() => {
    const start = getWeekStart(currentDate || new Date());
    return Array.from({ length: 7 }, (_, index) => {
      const next = new Date(start);
      next.setDate(start.getDate() + index);
      return next;
    });
  }, [currentDate]);

  const formatCompact = (value) => {
    const date = moment(value);
    return date.minutes() === 0 ? date.format('ha') : date.format('h:mma');
  };

  const formatLong = (value) => moment(value).format('h:mm A');

  const handleMobileNav = (direction) => {
    const baseDate = currentDate || new Date();
    const offset = mobileView === '3day' ? 3 : mobileView === 'week' ? 7 : 1;
    const next = new Date(baseDate);
    next.setDate(baseDate.getDate() + offset * direction);
    onDateChange?.(next);
  };

  return (
    <div className="coach-calendar rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
      <div className="coach-calendar-legend">
        <span className="legend-item">
          <span className="legend-dot private" />
          Private
        </span>
        <span className="legend-item">
          <span className="legend-dot semi-private" />
          Semi-Private
        </span>
        <span className="legend-item">
          <span className="legend-dot open-group" />
          Open Group
        </span>
        <span className="legend-item">
          <span className="legend-dot availability" />
          Available
        </span>
        <span className="legend-item">
          <span className="legend-dot busy" />
          Busy
        </span>
      </div>

      <div className="coach-calendar-mobile">
        <div className="coach-calendar-mobile-controls">
          <div className="mobile-view-toggle">
            {['day', '3day', 'week'].map((option) => (
              <button
                key={option}
                type="button"
                className={`mobile-view-btn ${mobileView === option ? 'active' : ''}`}
                onClick={() => setMobileView(option)}
              >
                {option === 'day' ? 'D' : option === '3day' ? '3D' : 'W'}
              </button>
            ))}
          </div>
          <div className="mobile-date-nav">
            <button type="button" className="mobile-nav-btn" onClick={() => handleMobileNav(-1)}>
              ‹
            </button>
            <button type="button" className="mobile-today-btn" onClick={() => onDateChange?.(new Date())}>
              Today
            </button>
            <button type="button" className="mobile-nav-btn" onClick={() => handleMobileNav(1)}>
              ›
            </button>
          </div>
        </div>
        <div className="coach-calendar-day-cards">
          {mobileDays.map((day) => {
            const key = day.toLocaleDateString('en-CA');
            const isToday = day.toDateString() === new Date().toDateString();
            const dayAvailability = availabilityByDay.get(key) || [];
            const dayLessons = lessonsByDay.get(key) || [];
            const lessonCount = dayLessons.filter((lesson) => lesson.type !== 'busy').length;

            return (
              <div key={key} className="day-card">
                <div className={`day-card-header ${isToday ? 'today' : ''}`}>
                  <div className="day-card-header-left">
                    <span className={`day-card-date ${isToday ? 'today' : ''}`}>{moment(day).format('D')}</span>
                    <div className="day-card-meta">
                      <span className="day-card-day">{moment(day).format('ddd')}</span>
                      <span className="day-card-month">{moment(day).format('MMM')}</span>
                    </div>
                  </div>
                  {lessonCount > 0 && <span className="day-card-count">{lessonCount} lessons</span>}
                </div>

                {dayAvailability.length > 0 ? (
                  dayAvailability.map((slot, index) => (
                    <div
                      key={`${key}-avail-${index}`}
                      className={`availability-banner ${index > 0 ? 'stacked' : ''}`}
                    >
                      <div className="availability-banner-left">
                        <span className="availability-dot">🟢</span>
                        <div>
                          <div className="availability-time">
                            {formatLong(slot.start)} – {formatLong(slot.end)}
                          </div>
                          <div className="availability-location">{slot.title || 'Location'}</div>
                        </div>
                      </div>
                      <span className="availability-edit">✏️</span>
                    </div>
                  ))
                ) : (
                  <div className="availability-empty">+ Set availability</div>
                )}

                <div className="day-card-lessons">
                  {dayLessons.length === 0 && (
                    <div className="lessons-empty">
                      <span className="lessons-empty-title">No lessons booked</span>
                      <span className="lessons-empty-subtitle">Available hours shown above</span>
                    </div>
                  )}
                  {dayLessons.map((lesson, index) => {
                    const lessonTypeId = Number(
                      lesson.lessonType ?? lesson.resource?.lessontype_id ?? lesson.resource?.lesson_type_id
                    );
                    const lessonKind =
                      lesson.type === 'busy'
                        ? 'busy'
                        : lessonTypeId === 2
                          ? 'semi-private'
                          : lessonTypeId === 3
                            ? 'open-group'
                            : 'private';
                    const title = lesson.resource?.metadata?.title || lesson.title || 'Lesson';
                    const subtitle = lesson.resource?.location || lesson.resource?.metadata?.subtitle || '';

                    return (
                      <div key={`${key}-lesson-${index}`} className={`lesson-card ${lessonKind}`}>
                        <div className="lesson-card-header">
                          <span className={`lesson-card-type ${lessonKind}`}>
                            {lessonKind.replace('-', ' ').toUpperCase()}
                          </span>
                          <span className="lesson-card-time">
                            {formatLong(lesson.start)} – {formatLong(lesson.end)}
                          </span>
                        </div>
                        <div className="lesson-card-title">{title}</div>
                        {subtitle && <div className="lesson-card-subtitle">{subtitle}</div>}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div
        className={`coach-calendar-desktop ${view === 'week' ? 'has-availability-strip' : ''}`}
        ref={calendarRef}
      >
        {view === 'week' && (
          <div className="coach-calendar-availability-strip">
            <div className="availability-strip-label">📍 Avail</div>
            {weekDays.map((day) => {
              const key = day.toLocaleDateString('en-CA');
              const slots = availabilityByDay.get(key) || [];
              if (slots.length === 0) {
                return (
                  <div key={key} className="availability-strip-cell empty">
                    <button type="button" className="availability-add-btn" onClick={onOpenAddAvailability}>
                      + Add
                    </button>
                  </div>
                );
              }
              return (
                <div key={key} className="availability-strip-cell">
                  {slots.map((slot, index) => (
                    <button
                      type="button"
                      key={`${key}-${index}`}
                      className="availability-strip-badge"
                      onClick={() => onAvailabilitySelect?.(slot.resource || slot)}
                    >
                      <span className="availability-strip-time">
                        {formatCompact(slot.start)}–{formatCompact(slot.end)}
                      </span>
                      <span className="availability-strip-location">{slot.title || 'Location'}</span>
                    </button>
                  ))}
                </div>
              );
            })}
          </div>
        )}
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
              (event) => event.type === 'availability' && event.start <= start && event.end >= end
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
              const lessonType = Number(
                event.lessonType ?? event.resource?.lessontype_id ?? event.resource?.lesson_type_id
              );
              const lessonKind =
                lessonType === 2 ? 'semi-private' : lessonType === 3 ? 'open-group' : 'private';
              return {
                className: `lesson-card-event lesson-${lessonKind}`
              };
            }
            if (event.type === 'busy') {
              return {
                className: 'lesson-card-event lesson-busy'
              };
            }
            return {
              className: 'availability-bg-event'
            };
          }}
        />
      </div>
    </div>
  );
};

export default CoachCalendar;
