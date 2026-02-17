import React, { useMemo } from 'react';

const pad = (value) => String(value).padStart(2, '0');

const formatDateTimeForGoogle = (dateInput) => {
  const date = new Date(dateInput);
  if (Number.isNaN(date.getTime())) {
    return '';
  }

  return `${date.getUTCFullYear()}${pad(date.getUTCMonth() + 1)}${pad(date.getUTCDate())}T${pad(date.getUTCHours())}${pad(date.getUTCMinutes())}${pad(date.getUTCSeconds())}Z`;
};

const toLocalIcsDate = (dateInput) => {
  const date = new Date(dateInput);
  if (Number.isNaN(date.getTime())) {
    return '';
  }

  return `${date.getFullYear()}${pad(date.getMonth() + 1)}${pad(date.getDate())}T${pad(date.getHours())}${pad(date.getMinutes())}${pad(date.getSeconds())}`;
};

const buildIcs = ({ title, description, location, start, end }) => {
  const uid = `${Date.now()}@ttpcoach`;
  const now = formatDateTimeForGoogle(new Date().toISOString());
  const dtStart = toLocalIcsDate(start);
  const dtEnd = toLocalIcsDate(end);

  return [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//TTP Coach//Lesson Confirmation//EN',
    'BEGIN:VEVENT',
    `UID:${uid}`,
    `DTSTAMP:${now}`,
    `DTSTART:${dtStart}`,
    `DTEND:${dtEnd}`,
    `SUMMARY:${title}`,
    `DESCRIPTION:${description.replace(/\n/g, '\\n')}`,
    `LOCATION:${location}`,
    'END:VEVENT',
    'END:VCALENDAR'
  ].join('\r\n');
};

const downloadIcs = (content, fileName) => {
  const blob = new Blob([content], { type: 'text/calendar;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

function LessonConfirmationSheet({ isOpen, lesson, onDone }) {
  const detail = useMemo(() => {
    if (!lesson) {
      return null;
    }

    const studentName = lesson.playerName || lesson.player_name || lesson.studentName || 'Your student';
    const studentLevel = lesson.playerSkillLevel || lesson.player_skill_level || lesson.level || 'All levels';
    const lessonType = lesson.lessonType || lesson.lesson_type || 'private';
    const start = lesson.startDateTime || lesson.start_date_time_tz || lesson.start_date_time;
    const end = lesson.endDateTime || lesson.end_date_time_tz || lesson.end_date_time;
    const locationName = lesson.locationName || lesson.location_name || lesson.location || 'TBD';
    const locationAddress = lesson.locationAddress || lesson.location_address || lesson.locationAddressLine || '';
    const lessonFee = Number(
      lesson.pricePerHour
      || lesson.price_per_hour
      || lesson.lessonFee
      || lesson.price_per_person
      || lesson.private_lesson_fee
      || lesson.lesson_fee
      || 0
    );

    const startDate = start ? new Date(start) : null;
    const endDate = end ? new Date(end) : null;
    const isCreditLesson = Boolean(
      lesson.creditUsageStatus
      || lesson.credit_usage_status
      || lesson.creditsUsed
      || lesson.credits_used
      || lesson.paymentType === 'credits'
      || lesson.payment_type === 'credits'
    );

    return {
      studentName,
      studentLevel,
      lessonType,
      start,
      end,
      locationName,
      locationAddress,
      lessonFee,
      startDate,
      endDate,
      isCreditLesson
    };
  }, [lesson]);

  if (!isOpen || !detail) {
    return null;
  }

  const initials = detail.studentName
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('') || 'ST';

  const dateLabel = detail.startDate
    ? detail.startDate.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })
    : 'Date TBD';
  const timeLabel = detail.startDate && detail.endDate
    ? `${detail.startDate.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })} – ${detail.endDate.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}`
    : 'Time TBD';

  const cancelDeadline = detail.startDate
    ? new Date(detail.startDate.getTime() - (24 * 60 * 60 * 1000))
    : null;
  const cancellationText = cancelDeadline
    ? `${detail.studentName.split(' ')[0]} can cancel for free until ${cancelDeadline.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })} at ${cancelDeadline.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}.`
    : 'Student can cancel for free up to 24 hours before lesson start.';

  const eventTitle = `${detail.lessonType === 'private' ? 'Private' : 'Lesson'} with ${detail.studentName}`;
  const eventDescription = [
    `${eventTitle}`,
    `Time: ${dateLabel}, ${timeLabel}`,
    `Location: ${detail.locationName}${detail.locationAddress ? `, ${detail.locationAddress}` : ''}`
  ].join('\n');

  const openGoogleCalendar = () => {
    const startValue = formatDateTimeForGoogle(detail.start);
    const endValue = formatDateTimeForGoogle(detail.end);
    const query = new URLSearchParams({
      action: 'TEMPLATE',
      text: eventTitle,
      dates: `${startValue}/${endValue}`,
      details: eventDescription,
      location: `${detail.locationName}${detail.locationAddress ? `, ${detail.locationAddress}` : ''}`
    });

    window.open(`https://calendar.google.com/calendar/render?${query.toString()}`, '_blank', 'noopener,noreferrer');
  };

  const handleAppleCalendar = () => {
    const ics = buildIcs({
      title: eventTitle,
      description: eventDescription,
      location: `${detail.locationName}${detail.locationAddress ? `, ${detail.locationAddress}` : ''}`,
      start: detail.start,
      end: detail.end
    });

    downloadIcs(ics, 'lesson.ics');
  };

  const handleOutlookCalendar = () => {
    const ics = buildIcs({
      title: eventTitle,
      description: eventDescription,
      location: `${detail.locationName}${detail.locationAddress ? `, ${detail.locationAddress}` : ''}`,
      start: detail.start,
      end: detail.end
    });

    downloadIcs(ics, 'lesson-outlook.ics');
  };

  return (
    <div className="fixed inset-0 z-[120] bg-slate-900/45">
      <div className="mx-auto flex h-full w-full items-end justify-center sm:items-center sm:p-4">
        <div className="max-h-[92vh] w-full overflow-y-auto rounded-t-3xl bg-white p-5 shadow-2xl sm:max-h-[90vh] sm:max-w-2xl sm:rounded-3xl sm:p-7">
          <div className="mx-auto mb-3 h-1.5 w-10 rounded-full bg-slate-200 sm:hidden" />

          <div className="text-center">
            <div className="mx-auto mb-4 flex h-[72px] w-[72px] items-center justify-center rounded-full bg-gradient-to-br from-emerald-500 to-emerald-600 text-4xl text-white shadow-[0_12px_24px_rgba(16,185,129,0.35)]">✓</div>
            <h2 className="text-2xl font-bold text-slate-900">Lesson Confirmed!</h2>
            <p className="mt-1 text-sm text-slate-500">{detail.studentName.split(' ')[0]} has been notified</p>
          </div>

          <div className="mt-5 rounded-2xl bg-slate-50 p-4">
            <div className="mb-4 flex items-center gap-3 border-b border-slate-200 pb-3">
              <span className="rounded-md bg-rose-100 px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide text-rose-600">{detail.lessonType}</span>
              <div className="flex items-center gap-2">
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-blue-500 text-xs font-bold text-white">{initials}</div>
                <div>
                  <p className="text-sm font-semibold text-slate-900">{detail.studentName}</p>
                  <p className="text-xs text-slate-500">{detail.studentLevel}</p>
                </div>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <p className="text-[11px] uppercase text-slate-400">Date</p>
                <p className="font-semibold text-slate-800">{dateLabel}</p>
              </div>
              <div>
                <p className="text-[11px] uppercase text-slate-400">Time</p>
                <p className="font-semibold text-slate-800">{timeLabel}</p>
              </div>
              <div className="col-span-2">
                <p className="text-[11px] uppercase text-slate-400">Location</p>
                <p className="font-semibold text-slate-800">{detail.locationName}</p>
                {detail.locationAddress && <p className="text-xs text-slate-500">{detail.locationAddress}</p>}
              </div>
              <div className="col-span-2">
                <p className="text-[11px] uppercase text-slate-400">Price</p>
                <p className="font-semibold text-slate-800">${detail.lessonFee} / hour</p>
              </div>
            </div>
          </div>

          <div className="mt-5">
            <p className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-400">Add to Calendar</p>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <button type="button" onClick={openGoogleCalendar} className="rounded-xl border border-slate-200 px-3 py-3 text-left transition hover:border-slate-300 hover:bg-slate-50 sm:text-center">
                <p className="text-sm font-semibold text-slate-900">Google Calendar</p>
                <p className="text-xs text-slate-500">Opens in browser</p>
              </button>
              <button type="button" onClick={handleAppleCalendar} className="rounded-xl border border-slate-200 px-3 py-3 text-left transition hover:border-slate-300 hover:bg-slate-50 sm:text-center">
                <p className="text-sm font-semibold text-slate-900">Apple Calendar</p>
                <p className="text-xs text-slate-500">Download .ics file</p>
              </button>
              <button type="button" onClick={handleOutlookCalendar} className="rounded-xl border border-slate-200 px-3 py-3 text-left transition hover:border-slate-300 hover:bg-slate-50 sm:text-center">
                <p className="text-sm font-semibold text-slate-900">Outlook</p>
                <p className="text-xs text-slate-500">Download .ics file</p>
              </button>
            </div>
          </div>

          <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-900">
            <p>
              <strong>💰 Payment info:</strong>{' '}
              {detail.isCreditLesson
                ? 'This lesson is covered by player credits, so no payout will be deposited for this booking.'
                : `$${detail.lessonFee} will be deposited to your connected account after the lesson is completed.`}
            </p>
          </div>

          <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
            <p>
              <strong>⏰ 24-hour cancellation policy:</strong> {cancellationText}
              <span className="hidden sm:inline"> After that, you&apos;ll be compensated for late cancellations.</span>
            </p>
          </div>

          <div className="mt-3 rounded-xl border border-blue-200 bg-blue-50 p-3 text-sm text-blue-900">
            <p>
              <strong>📩 {detail.studentName.split(' ')[0]} will receive:</strong> Email confirmation with lesson details, location, and a link to message you.
            </p>
          </div>

          <button
            type="button"
            onClick={onDone}
            className="mt-5 w-full rounded-xl bg-violet-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-violet-700"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}

export default LessonConfirmationSheet;
