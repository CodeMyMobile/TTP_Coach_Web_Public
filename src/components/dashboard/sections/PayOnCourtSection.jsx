import React, { useMemo, useState } from 'react';
import moment from 'moment';
import { CalendarDays, CheckCircle2, Clock3, MapPin, User } from 'lucide-react';
import { markPayOnCourtLessonPaid } from '../../../services/coach';
import { isPayOnCourt } from '../../../utils/bookingPaymentState';

const parseStatus = (value) => {
  if (value === null || value === undefined || value === '') {
    return null;
  }
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

const getLessonTypeId = (lesson) =>
  Number(lesson?.lessontype_id ?? lesson?.lesson_type_id ?? lesson?.lessonTypeId);

const getGroupPlayers = (lesson) =>
  Array.isArray(lesson?.group_players)
    ? lesson.group_players
    : Array.isArray(lesson?.groupPlayers)
      ? lesson.groupPlayers
      : [];

const getPaymentMethod = (record) =>
  record?.payment_method ??
  record?.paymentMethod ??
  record?.payment_method_id ??
  record?.paymentMethodId;

const getPaymentStatus = (record) =>
  record?.payment_status ?? record?.paymentStatus;

const getPlayerName = (record, fallback = 'Player') =>
  record?.full_name ||
  record?.player_name ||
  record?.student_name ||
  record?.studentName ||
  record?.name ||
  fallback;

const parseMoney = (value) => {
  if (value === null || value === undefined || value === '') {
    return null;
  }
  const parsed = Number(String(value).replace(/[^0-9.-]/g, ''));
  return Number.isFinite(parsed) ? parsed : null;
};

const formatMoney = (value) =>
  value === null || value === undefined
    ? '--'
    : new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        maximumFractionDigits: 2
      }).format(value);

const getLessonPrice = (lesson) =>
  parseMoney(lesson?.group_price_per_person) ??
  parseMoney(lesson?.groupPricePerPerson) ??
  parseMoney(lesson?.price_per_person) ??
  parseMoney(lesson?.pricePerPerson) ??
  parseMoney(lesson?.hourly_rate) ??
  parseMoney(lesson?.hourlyRate) ??
  parseMoney(lesson?.price);

const getLessonTime = (lesson) => {
  const startRaw =
    lesson?.start_date_time_tz ||
    lesson?.startDateTimeTz ||
    lesson?.start_date_time ||
    lesson?.startDateTime ||
    lesson?.start;
  const endRaw =
    lesson?.end_date_time_tz ||
    lesson?.endDateTimeTz ||
    lesson?.end_date_time ||
    lesson?.endDateTime ||
    lesson?.end;
  const start = startRaw ? moment(String(startRaw).replace(/Z$/, '')) : null;
  const end = endRaw ? moment(String(endRaw).replace(/Z$/, '')) : null;

  return {
    date: start?.isValid() ? start.format('MMM D, YYYY') : 'Date TBD',
    time: start?.isValid()
      ? `${start.format('h:mm A')}${end?.isValid() ? ` - ${end.format('h:mm A')}` : ''}`
      : 'Time TBD'
  };
};

const lessonTypeLabel = (lesson) => {
  const typeId = getLessonTypeId(lesson);
  if (typeId === 2) return 'Semi-private';
  if (typeId === 3 || typeId === 4) return 'Group';
  return lesson?.lesson_type_name || lesson?.lessonTypeName || 'Private';
};

const collectPayOnCourtItems = (lessons) => {
  const byKey = new Map();

  (Array.isArray(lessons) ? lessons : []).forEach((lesson) => {
    if (!lesson || parseStatus(lesson.status ?? lesson.lessonStatus ?? lesson.lesson_status) === 2) {
      return;
    }

    const time = getLessonTime(lesson);
    const base = {
      lesson,
      lessonId: lesson.id ?? lesson.lesson_id ?? lesson.lessonId,
      lessonType: lessonTypeLabel(lesson),
      title: lesson?.metadata?.title || lesson?.lesson_title || lesson?.title || lessonTypeLabel(lesson),
      date: time.date,
      time: time.time,
      location: lesson.location || lesson.locationName || lesson.courtName || lesson.court || 'Location TBD',
      amount: getLessonPrice(lesson)
    };

    const players = getGroupPlayers(lesson);
    const payOnCourtPlayers = players.filter((player) => isPayOnCourt(getPaymentMethod(player)));

    if (payOnCourtPlayers.length > 0) {
      payOnCourtPlayers.forEach((player, index) => {
        const paymentStatus = parseStatus(getPaymentStatus(player));
        if (paymentStatus === 2 || parseStatus(player.status) === 2) {
          return;
        }
        const key = `${base.lessonId || 'lesson'}:${player.player_id ?? player.playerId ?? player.id ?? index}`;
        byKey.set(key, {
          ...base,
          key,
          playerId: player.player_id ?? player.playerId ?? player.id,
          isParticipant: true,
          playerName: getPlayerName(player, `Participant ${index + 1}`),
          paymentStatus,
          status: paymentStatus === 1 ? 'completed' : 'pending'
        });
      });
      return;
    }

    if (isPayOnCourt(getPaymentMethod(lesson))) {
      const paymentStatus = parseStatus(getPaymentStatus(lesson));
      const key = `${base.lessonId || 'lesson'}:direct`;
      byKey.set(key, {
        ...base,
        key,
        playerId: null,
        isParticipant: false,
        playerName: getPlayerName(lesson),
        paymentStatus,
        status: paymentStatus === 1 ? 'completed' : 'pending'
      });
    }
  });

  return Array.from(byKey.values()).sort((a, b) => {
    const aTime = moment(`${a.date} ${a.time.split(' - ')[0]}`, 'MMM D, YYYY h:mm A').valueOf();
    const bTime = moment(`${b.date} ${b.time.split(' - ')[0]}`, 'MMM D, YYYY h:mm A').valueOf();
    return aTime - bTime;
  });
};

const PayOnCourtSection = ({ lessons = [], onLessonSelect, onMarkedPaid }) => {
  const [view, setView] = useState('pending');
  const [markingKey, setMarkingKey] = useState('');
  const [actionError, setActionError] = useState('');
  const items = useMemo(() => collectPayOnCourtItems(lessons), [lessons]);
  const pendingItems = items.filter((item) => item.status === 'pending');
  const completedItems = items.filter((item) => item.status === 'completed');
  const visibleItems = view === 'completed' ? completedItems : pendingItems;
  const totalDue = pendingItems.reduce((sum, item) => sum + (item.amount || 0), 0);
  const totalCollected = completedItems.reduce((sum, item) => sum + (item.amount || 0), 0);

  const handleMarkPaid = async (item) => {
    if (!item?.lessonId || markingKey) {
      return;
    }

    setMarkingKey(item.key);
    setActionError('');
    try {
      await markPayOnCourtLessonPaid({
        lessonId: item.lessonId,
        playerId: item.isParticipant ? item.playerId : undefined
      });
      await onMarkedPaid?.();
      setView('completed');
    } catch (error) {
      setActionError(error?.message || 'Unable to mark this payment as paid.');
    } finally {
      setMarkingKey('');
    }
  };

  return (
    <section className="space-y-5">
      <div className="rounded-2xl border border-teal-100 bg-gradient-to-br from-teal-50 to-white p-5 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-teal-700">Offline payments</p>
            <h2 className="mt-1 text-2xl font-bold text-slate-900">Pay on court</h2>
            <p className="mt-1 text-sm text-slate-600">Track lessons where players owe you cash or Venmo directly.</p>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-xl bg-white px-4 py-3 shadow-sm">
              <p className="text-xs font-semibold text-slate-500">Pending</p>
              <p className="mt-1 text-xl font-bold text-teal-700">{formatMoney(totalDue)}</p>
            </div>
            <div className="rounded-xl bg-white px-4 py-3 shadow-sm">
              <p className="text-xs font-semibold text-slate-500">Completed</p>
              <p className="mt-1 text-xl font-bold text-emerald-700">{formatMoney(totalCollected)}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="flex w-full rounded-xl border border-slate-200 bg-white p-1 shadow-sm sm:w-fit">
        {[
          { key: 'pending', label: `Pending (${pendingItems.length})` },
          { key: 'completed', label: `Completed (${completedItems.length})` }
        ].map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={() => setView(tab.key)}
            className={`flex-1 rounded-lg px-4 py-2 text-sm font-semibold transition sm:flex-none ${
              view === tab.key ? 'bg-teal-600 text-white shadow' : 'text-slate-600 hover:bg-slate-50'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {actionError ? (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
          {actionError}
        </div>
      ) : null}

      <div className="grid gap-3">
        {visibleItems.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-8 text-center">
            <p className="text-sm font-semibold text-slate-700">
              {view === 'pending' ? 'No pending pay-on-court lessons.' : 'No completed pay-on-court lessons.'}
            </p>
            <p className="mt-1 text-xs text-slate-500">Pay-on-court bookings will appear here when available.</p>
          </div>
        ) : (
          visibleItems.map((item) => (
            <div
              key={item.key}
              className="rounded-2xl border border-slate-200 bg-white p-4 text-left shadow-sm transition hover:border-teal-200 hover:shadow-md"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="inline-flex items-center gap-1 rounded-full bg-teal-100 px-2.5 py-1 text-xs font-semibold text-teal-700">
                      <span className="h-2 w-2 rounded-full bg-teal-500" />
                      Pay on court
                    </span>
                    <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold ${
                      item.status === 'completed' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
                    }`}>
                      {item.status === 'completed' ? <CheckCircle2 className="h-3.5 w-3.5" /> : <Clock3 className="h-3.5 w-3.5" />}
                      {item.status === 'completed' ? 'Completed' : 'Pending collection'}
                    </span>
                  </div>
                  <h3 className="mt-3 text-base font-bold text-slate-900">{item.playerName}</h3>
                  <p className="text-sm font-medium text-slate-600">{item.title} · {item.lessonType}</p>
                </div>
                <p className="text-xl font-bold text-slate-900">{formatMoney(item.amount)}</p>
              </div>

              <div className="mt-4 grid gap-2 text-sm text-slate-600 sm:grid-cols-3">
                <span className="inline-flex items-center gap-2"><CalendarDays className="h-4 w-4 text-slate-400" />{item.date}</span>
                <span className="inline-flex items-center gap-2"><Clock3 className="h-4 w-4 text-slate-400" />{item.time}</span>
                <span className="inline-flex items-center gap-2"><MapPin className="h-4 w-4 text-slate-400" />{item.location}</span>
              </div>
              <div className="mt-4 flex flex-wrap items-center gap-2">
                {item.status === 'pending' ? (
                  <button
                    type="button"
                    onClick={() => handleMarkPaid(item)}
                    disabled={markingKey === item.key}
                    className="rounded-lg bg-teal-600 px-3 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-teal-700 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {markingKey === item.key ? 'Marking...' : 'Mark as paid'}
                  </button>
                ) : null}
                <button
                  type="button"
                  onClick={() => onLessonSelect?.(item.lesson)}
                  className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600 transition hover:border-teal-200 hover:text-teal-700"
                >
                  <User className="h-3.5 w-3.5" />
                  Open lesson details
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </section>
  );
};

export default PayOnCourtSection;
