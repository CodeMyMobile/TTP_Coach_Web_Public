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

const parseMoney = (value) => {
  if (value === null || value === undefined || value === '') {
    return null;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

const getLessonTypeLabel = (rawType) => {
  const normalized = String(rawType || 'private').toLowerCase();
  if (normalized.includes('group')) {
    return 'Group Lesson';
  }
  if (normalized.includes('semi')) {
    return 'Semi-Private Lesson';
  }
  return 'Private Lesson';
};

function LessonConfirmationSheet({ isOpen, lesson, onDone, coachHourlyRate = null }) {
  const detail = useMemo(() => {
    if (!lesson) {
      return null;
    }

    const studentName = lesson.playerName || lesson.player_name || lesson.studentName || lesson.full_name || 'Your student';
    const studentLevel = lesson.playerSkillLevel || lesson.player_skill_level || lesson.level || 'All levels';
    const lessonType = lesson.lessonType || lesson.lesson_type || lesson.lesson_type_name || 'private';
    const start = lesson.startDateTime || lesson.start_date_time_tz || lesson.start_date_time;
    const end = lesson.endDateTime || lesson.end_date_time_tz || lesson.end_date_time;
    const locationName = lesson.locationName || lesson.location_name || lesson.location || 'TBD';
    const locationAddress = lesson.locationAddress || lesson.location_address || lesson.locationAddressLine || '';
    const lessonFee =
      parseMoney(lesson.group_price_per_person)
      ?? parseMoney(lesson.groupPricePerPerson)
      ?? parseMoney(lesson.price_per_person)
      ?? parseMoney(lesson.pricePerPerson)
      ?? parseMoney(lesson.private_lesson_fee)
      ?? parseMoney(lesson.lesson_fee)
      ?? parseMoney(lesson.pricePerHour)
      ?? parseMoney(lesson.price_per_hour)
      ?? parseMoney(lesson.hourly_rate)
      ?? parseMoney(lesson.hourlyRate)
      ?? parseMoney(lesson.price)
      ?? parseMoney(coachHourlyRate);

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
      lessonTypeLabel: getLessonTypeLabel(lessonType),
      start,
      end,
      locationName,
      locationAddress,
      lessonFee,
      startDate,
      endDate,
      isCreditLesson
    };
  }, [lesson, coachHourlyRate]);

  if (!isOpen || !detail) {
    return null;
  }

  const initials = detail.studentName
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('') || 'ST';

  const studentFirstName = detail.studentName.split(' ')[0] || 'Student';
  const mobileDate = detail.startDate
    ? detail.startDate.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })
    : 'Date TBD';
  const desktopDate = detail.startDate
    ? detail.startDate.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })
    : 'Date TBD';

  const mobileTime = detail.startDate && detail.endDate
    ? `${detail.startDate.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })} – ${detail.endDate.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}`
    : 'Time TBD';

  const durationMinutes = detail.startDate && detail.endDate
    ? Math.max(Math.round((detail.endDate - detail.startDate) / 60000), 0)
    : null;
  const durationLabel = durationMinutes
    ? `${Math.floor(durationMinutes / 60) > 0 ? `${Math.floor(durationMinutes / 60)} hour${Math.floor(durationMinutes / 60) > 1 ? 's' : ''}` : ''}${durationMinutes % 60 ? ` ${durationMinutes % 60} min` : ''}`.trim()
    : '';

  const cancelDeadline = detail.startDate ? new Date(detail.startDate.getTime() - (24 * 60 * 60 * 1000)) : null;
  const cancellationText = cancelDeadline
    ? `${studentFirstName} can cancel for free until ${cancelDeadline.toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' })} at ${cancelDeadline.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}.`
    : 'Student can cancel for free up to 24 hours before lesson start.';

  const eventTitle = `${detail.lessonTypeLabel} with ${detail.studentName}`;
  const eventDescription = [
    `${eventTitle}`,
    `Time: ${desktopDate}, ${mobileTime}`,
    `Location: ${detail.locationName}${detail.locationAddress ? `, ${detail.locationAddress}` : ''}`
  ].join('\n');

  const eventLocation = `${detail.locationName}${detail.locationAddress ? `, ${detail.locationAddress}` : ''}`;

  const openGoogleCalendar = () => {
    const startValue = formatDateTimeForGoogle(detail.start);
    const endValue = formatDateTimeForGoogle(detail.end);
    const query = new URLSearchParams({
      action: 'TEMPLATE',
      text: eventTitle,
      dates: `${startValue}/${endValue}`,
      details: eventDescription,
      location: eventLocation
    });

    window.open(`https://calendar.google.com/calendar/render?${query.toString()}`, '_blank', 'noopener,noreferrer');
  };

  const handleAppleCalendar = () => {
    const ics = buildIcs({
      title: eventTitle,
      description: eventDescription,
      location: eventLocation,
      start: detail.start,
      end: detail.end
    });

    downloadIcs(ics, 'lesson-apple.ics');
  };

  const handleOutlookCalendar = () => {
    const ics = buildIcs({
      title: eventTitle,
      description: eventDescription,
      location: eventLocation,
      start: detail.start,
      end: detail.end
    });

    downloadIcs(ics, 'lesson-outlook.ics');
  };

  return (
    <div className="fixed inset-0 z-[120] bg-slate-900/40">
      <div className="mx-auto flex h-full w-full items-end justify-center sm:items-center sm:p-4">
        <div className="w-full max-h-[92vh] overflow-y-auto rounded-t-3xl bg-white shadow-2xl sm:max-h-[90vh] sm:max-w-[520px] sm:rounded-3xl">
          <div className="mx-auto mt-3 h-1.5 w-10 rounded-full bg-slate-200 sm:hidden" />

          <div className="flex justify-end p-4 pb-0 sm:p-5 sm:pb-0">
            <button
              type="button"
              onClick={onDone}
              className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-100 text-xl text-slate-500 transition hover:bg-slate-200"
              aria-label="Close confirmation"
            >
              ×
            </button>
          </div>

          <div className="px-5 pb-5 pt-1 sm:px-7 sm:pb-6 sm:pt-1">
            <div className="text-center">
              <div className="mx-auto mb-4 flex h-[72px] w-[72px] items-center justify-center rounded-full bg-gradient-to-br from-emerald-500 to-emerald-600 text-4xl text-white shadow-[0_10px_26px_rgba(16,185,129,0.35)]">✓</div>
              <h2 className="text-[28px] font-bold leading-tight text-slate-800">Lesson Confirmed!</h2>
              <p className="mt-1 text-sm text-slate-500">{studentFirstName} has been notified via email</p>
            </div>

            <div className="mt-5 rounded-2xl bg-slate-50 p-4">
              <div className="mb-4 flex items-center gap-3 border-b border-slate-200 pb-3">
                <span className="rounded-md bg-rose-100 px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide text-rose-600">{detail.lessonTypeLabel}</span>
                <div className="flex items-center gap-2">
                  <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-blue-400 text-xs font-bold text-white">{initials}</div>
                  <div>
                    <p className="text-sm font-semibold text-slate-900">{detail.studentName}</p>
                    <p className="text-xs text-slate-500">{detail.studentLevel}</p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="flex items-start gap-2.5">
                  <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-white text-sm">📅</span>
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">Date</p>
                    <p className="text-sm font-semibold text-slate-800 sm:hidden">{mobileDate}</p>
                    <p className="hidden text-sm font-semibold text-slate-800 sm:block">{desktopDate}</p>
                  </div>
                </div>
                <div className="flex items-start gap-2.5">
                  <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-white text-sm">🕐</span>
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">Time</p>
                    <p className="text-sm font-semibold text-slate-800">{mobileTime}</p>
                    {durationLabel && <p className="text-xs text-slate-500">{durationLabel}</p>}
                  </div>
                </div>
                <div className="col-span-2 flex items-start gap-2.5 sm:col-span-1">
                  <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-white text-sm">📍</span>
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">Location</p>
                    <p className="text-sm font-semibold text-slate-800">{detail.locationName}</p>
                    {detail.locationAddress && <p className="text-xs text-slate-500">{detail.locationAddress}</p>}
                  </div>
                </div>
                <div className="col-span-2 flex items-start gap-2.5 sm:col-span-1">
                  <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-white text-sm">💵</span>
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">Lesson Fee</p>
                    <p className="text-sm font-semibold text-slate-800">{detail.lessonFee !== null ? `$${detail.lessonFee} / hour` : '—'}</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-5">
              <p className="mb-3 text-xs font-bold uppercase tracking-wide text-slate-400 sm:hidden">Add to Calendar</p>
              <p className="mb-3 hidden text-xs font-bold uppercase tracking-wide text-slate-400 sm:block">Add to Your Calendar</p>

              <div className="space-y-2.5 sm:hidden">
                <button type="button" onClick={openGoogleCalendar} className="flex w-full items-center gap-3 rounded-xl border border-slate-200 px-4 py-3 text-left transition hover:bg-slate-50">
                  <span className="flex h-11 w-11 items-center justify-center rounded-lg bg-amber-100 text-xl">📅</span>
                  <span className="flex-1">
                    <span className="block text-sm font-semibold text-slate-900">Google Calendar</span>
                    <span className="block text-xs text-slate-500">Opens in browser</span>
                  </span>
                  <span className="text-slate-300">›</span>
                </button>
                <button type="button" onClick={handleAppleCalendar} className="flex w-full items-center gap-3 rounded-xl border border-slate-200 px-4 py-3 text-left transition hover:bg-slate-50">
                  <span className="flex h-11 w-11 items-center justify-center rounded-lg bg-slate-100 text-xl">🍎</span>
                  <span className="flex-1">
                    <span className="block text-sm font-semibold text-slate-900">Apple Calendar</span>
                    <span className="block text-xs text-slate-500">Download .ics file</span>
                  </span>
                  <span className="text-slate-300">›</span>
                </button>
                <button type="button" onClick={handleOutlookCalendar} className="flex w-full items-center gap-3 rounded-xl border border-slate-200 px-4 py-3 text-left transition hover:bg-slate-50">
                  <span className="flex h-11 w-11 items-center justify-center rounded-lg bg-blue-100 text-xl">📧</span>
                  <span className="flex-1">
                    <span className="block text-sm font-semibold text-slate-900">Outlook</span>
                    <span className="block text-xs text-slate-500">Download .ics file</span>
                  </span>
                  <span className="text-slate-300">›</span>
                </button>
              </div>

              <div className="hidden grid-cols-3 gap-3 sm:grid">
                <button type="button" onClick={openGoogleCalendar} className="flex flex-col items-center rounded-xl border border-slate-200 px-3 py-4 text-center transition hover:border-violet-300 hover:bg-slate-50 hover:shadow-[0_0_0_3px_rgba(139,92,246,0.1)]">
                  <span className="mb-2.5 flex h-12 w-12 items-center justify-center rounded-xl bg-amber-100 text-2xl">📅</span>
                  <span className="text-sm font-semibold text-slate-900">Google Calendar</span>
                </button>
                <button type="button" onClick={handleAppleCalendar} className="flex flex-col items-center rounded-xl border border-slate-200 px-3 py-4 text-center transition hover:border-violet-300 hover:bg-slate-50 hover:shadow-[0_0_0_3px_rgba(139,92,246,0.1)]">
                  <span className="mb-2.5 flex h-12 w-12 items-center justify-center rounded-xl bg-slate-100 text-2xl">🍎</span>
                  <span className="text-sm font-semibold text-slate-900">Apple Calendar</span>
                </button>
                <button type="button" onClick={handleOutlookCalendar} className="flex flex-col items-center rounded-xl border border-slate-200 px-3 py-4 text-center transition hover:border-violet-300 hover:bg-slate-50 hover:shadow-[0_0_0_3px_rgba(139,92,246,0.1)]">
                  <span className="mb-2.5 flex h-12 w-12 items-center justify-center rounded-xl bg-blue-100 text-2xl">📧</span>
                  <span className="text-sm font-semibold text-slate-900">Outlook</span>
                </button>
              </div>
            </div>

            <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-900">
              <p>
                <strong>💰</strong>{' '}
                {detail.isCreditLesson
                  ? 'This lesson is covered by player credits, so no payout will be deposited for this booking.'
                  : detail.lessonFee !== null
                    ? <><strong>${detail.lessonFee} will be deposited</strong> to your connected account after the lesson is completed.</>
                    : 'Funds will be deposited to your connected account after the lesson is completed.'}
              </p>
            </div>

            <div className="mt-3 rounded-xl border border-amber-200 bg-amber-100 p-3 text-sm text-amber-900">
              <p>
                <strong>⏰ 24-hour cancellation policy:</strong> {cancellationText}
                <span className="hidden sm:inline"> After that, you&apos;ll be compensated for late cancellations.</span>
              </p>
            </div>

            <div className="mt-3 rounded-xl border border-blue-200 bg-blue-50 p-3 text-sm text-blue-900">
              <p>
                <strong>📩 {studentFirstName} will receive:</strong> Email confirmation with lesson details, location, and a link to message you directly.
              </p>
            </div>
          </div>

          <div className="border-t border-slate-100 bg-slate-50 px-5 py-4 sm:px-7 sm:py-5">
            <button
              type="button"
              onClick={onDone}
              className="w-full rounded-xl bg-violet-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-violet-700"
            >
              Done
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default LessonConfirmationSheet;
