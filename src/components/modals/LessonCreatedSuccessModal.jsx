import React from 'react';
import moment from 'moment';
import Modal from './Modal';

const lessonTypeLabels = {
  1: 'Private Lesson',
  2: 'Semi-Private Lesson',
  3: 'Open Group Lesson'
};

const formatPhone = (value = '') => {
  const digits = String(value).replace(/\D/g, '');
  if (digits.length === 10) {
    return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
  }
  return value;
};

const initials = (name = '') => {
  const words = String(name).trim().split(/\s+/).filter(Boolean);
  if (!words.length) return 'PL';
  return words.slice(0, 2).map((word) => word[0]).join('').toUpperCase();
};

const smsLessonTypeLabels = {
  1: 'private',
  2: 'semi-private',
  3: 'group'
};

const buildSmsPreview = ({ coachName, lessonTypeId, start, location }) => {
  const coach = coachName || 'Coach';
  const lessonType = smsLessonTypeLabels[lessonTypeId] || 'private';
  const lessonTime = start ? moment(start).format('YYYY-MM-DD hh:mm a') : 'TBD';
  const lessonLocation = location || 'TBD';
  return `Coach ${coach} invited you to a ${lessonType} lesson.
When: ${lessonTime}
Where: ${lessonLocation}
Coach ${coach} invited you to a lesson. Tap the link to confirm.`;
};

function LessonCreatedSuccessModal({
  isOpen,
  onClose,
  data
}) {
  if (!isOpen || !data) {
    return null;
  }

  const isSms = data.inviteMethod === 'sms';
  const subtitle = isSms ? `Text invite sent to ${data.playerFirstName}` : `Invite sent to ${data.playerFirstName}`;
  const statusText = isSms
    ? `${formatPhone(data.playerPhone)} · Text sent`
    : 'Notification sent · Awaiting response';

  const handleAddToCalendar = () => {
    const startAt = data.start ? moment(data.start) : null;
    if (!startAt || !startAt.isValid()) {
      return;
    }

    const endAt = data.end && moment(data.end).isValid()
      ? moment(data.end)
      : moment(startAt).add(1, 'hour');

    const formatIcsDate = (time) => moment(time).utc().format('YYYYMMDD[T]HHmmss[Z]');
    const fileSafeName = String(data.playerName || 'lesson').toLowerCase().replace(/[^a-z0-9]+/g, '-');
    const title = `${lessonTypeLabels[data.lessonTypeId] || 'Lesson'} with ${data.playerName || 'Player'}`;
    const details = isSms
      ? buildSmsPreview(data).replace(/\n/g, '\\n')
      : `Invite sent to ${data.playerName || 'player'} via app notification.`;

    const icsContent = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//TTP Coach//Lesson Calendar//EN',
      'BEGIN:VEVENT',
      `UID:${Date.now()}-${fileSafeName}@ttpcoach`,
      `DTSTAMP:${formatIcsDate(moment())}`,
      `DTSTART:${formatIcsDate(startAt)}`,
      `DTEND:${formatIcsDate(endAt)}`,
      `SUMMARY:${title}`,
      `LOCATION:${(data.location || 'TBD location').replace(/,/g, '\\,')}`,
      `DESCRIPTION:${details}`,
      'END:VEVENT',
      'END:VCALENDAR'
    ].join('\r\n');

    const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${fileSafeName || 'lesson'}.ics`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} placement="bottom" panelClassName="w-full sm:max-w-md rounded-t-3xl sm:rounded-2xl">
      <div className="px-5 pb-6 pt-3">
        <div className="mx-auto mb-5 h-1.5 w-10 rounded-full bg-slate-200" />
        <div className="max-h-[78vh] overflow-y-auto pb-3">
          <div className="mb-3 text-center">
            <div className="mx-auto mb-3 flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-emerald-500 to-emerald-600 text-3xl text-white">✓</div>
            <h2 className="text-2xl font-bold text-slate-800">Lesson Created!</h2>
            <p className="mt-1 text-sm text-slate-500">{subtitle}</p>
          </div>

          <div className="mb-4 rounded-2xl bg-slate-50 p-4 text-left">
            <div className="flex items-center gap-3 py-2 text-sm text-slate-800">
              <span>📅</span>
              <span className="font-medium">{data.start ? moment(data.start).format('dddd, MMM D · h:mm A') : '—'}</span>
            </div>
            <div className="flex items-center gap-3 border-t border-slate-200 py-2 text-sm text-slate-800">
              <span>📍</span>
              <span className="font-medium">{data.location || 'TBD location'}</span>
            </div>
            <div className="flex items-center gap-3 border-t border-slate-200 py-2 text-sm text-slate-800">
              <span>🎾</span>
              <span className="font-medium">{lessonTypeLabels[data.lessonTypeId] || 'Lesson'}</span>
            </div>
            <div className="flex items-center gap-3 border-t border-slate-200 py-2 text-sm text-slate-800">
              <span>💰</span>
              <span className="font-medium">{data.priceLabel}</span>
            </div>
          </div>

          <div className="mb-4 flex items-center gap-3 rounded-2xl bg-violet-50 p-4 text-left">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-violet-500 to-violet-400 text-sm font-semibold text-white">
              {initials(data.playerName)}
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-800">{data.playerName}</p>
              <p className="mt-0.5 flex items-center gap-2 text-xs text-slate-500">
                <span className="h-2 w-2 rounded-full bg-amber-500" />
                {statusText}
              </p>
            </div>
          </div>

          {isSms && (
            <div className="mb-4 rounded-2xl bg-slate-50 p-4 text-left">
              <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
                <span>📲</span>
                <span>Message sent</span>
              </div>
              <p className="whitespace-pre-line rounded-2xl rounded-bl-md bg-slate-200 px-3 py-2 text-sm leading-relaxed text-slate-800">
                {buildSmsPreview(data)}
              </p>
            </div>
          )}

          <div className="mb-2 flex items-center justify-between gap-3 rounded-xl bg-blue-100 px-4 py-3">
            <div className="flex items-center gap-2 text-sm font-medium text-blue-900">
              <span>📅</span>
              <span>Add to your calendar</span>
            </div>
            <button type="button" onClick={handleAddToCalendar} className="rounded-lg bg-white px-3 py-1.5 text-xs font-semibold text-blue-600">Add</button>
          </div>
        </div>

        <div className="mt-3 border-t border-slate-100 pt-4">
          <button type="button" onClick={onClose} className="rounded-xl bg-violet-600 px-4 py-3 text-sm font-semibold text-white">Done</button>
        </div>
      </div>
    </Modal>
  );
}

export default LessonCreatedSuccessModal;
