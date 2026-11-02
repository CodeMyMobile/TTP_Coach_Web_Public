import React, { useEffect, useMemo, useState } from 'react';
import moment from 'moment';
import {
  AlertTriangle,
  ArrowRight,
  CalendarDays,
  ChevronRight,
  CircleDot,
  Clock,
  ListChecks,
  MapPin,
  MessageCircle,
  Package,
  ShoppingBag,
  Users
} from 'lucide-react';
import { getCoachRestringingEarnings, getCoachRestringingOrders } from '../../../services/coach';
import { normalizeRestringingEarnings } from './restringingOrderPayload';
import { proShopSummary } from './proShop';
import {
  formatLessonDuration,
  getBookedGroupParticipants,
  getGroupCapacity,
  getLessonDateKey,
  getLessonMoments,
  getLessonParticipants,
  getLessonType,
  isGroupLesson,
  normalizeGoogleEvent
} from '../../../utils/lessonDisplay';
import { openSmsComposer, textAllParticipants } from '../../../utils/messaging';

const typeBadgeStyles = {
  private: 'bg-[#FEE2E2] text-[#DC2626]',
  'semi-private': 'bg-[#FEF3C7] text-[#D97706]',
  group: 'bg-[#D1FAE5] text-[#059669]'
};

const typeLabels = {
  private: 'Private',
  'semi-private': 'Semi-private',
  group: 'Group'
};

// Concise, single-line location: keep the venue (first comma segment), drop the
// trailing city/state/zip/country so the card doesn't blow out its width.
const conciseLocation = (location) => {
  const first = String(location || '').split(',')[0].trim();
  return first || String(location || '').trim();
};

// Day-group header: Today / Tomorrow / "Wed 25 Jun".
const dayLabel = (dateKey) => {
  const day = moment(dateKey, 'YYYY-MM-DD').startOf('day');
  const diff = day.diff(moment().startOf('day'), 'days');
  if (diff === 0) return 'Today';
  if (diff === 1) return 'Tomorrow';
  return day.format('ddd D MMM');
};

const durationLabel = (lesson) => {
  const fromSlots = formatLessonDuration(lesson?.duration);
  if (fromSlots) {
    return fromSlots;
  }

  const { start, end } = getLessonMoments(lesson);
  if (start?.isValid() && end?.isValid()) {
    return formatLessonDuration(Math.max(1, Math.round(end.diff(start, 'minutes') / 30)));
  }
  return '';
};

const timeRangeLabel = (lesson) => {
  const { start, end } = getLessonMoments(lesson);
  if (!start?.isValid()) {
    return lesson?.time || '';
  }
  const startLabel = start.format('h:mm A');
  return end?.isValid() ? `${startLabel} – ${end.format('h:mm A')}` : startLabel;
};

const ParticipantAvatars = ({ participants }) => {
  if (participants.length === 0) {
    return null;
  }

  const visible = participants.slice(0, 5);
  const overflow = participants.length - visible.length;

  return (
    <div className="flex items-center -space-x-2">
      {visible.map((participant) =>
        participant.profilePicture ? (
          <img
            key={participant.id}
            src={participant.profilePicture}
            alt={participant.name}
            title={participant.name}
            className="h-8 w-8 rounded-full border-2 border-white object-cover"
          />
        ) : (
          <span
            key={participant.id}
            title={participant.name}
            className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-white bg-purple-100 text-xs font-semibold text-purple-700"
          >
            {participant.initials}
          </span>
        )
      )}
      {overflow > 0 && (
        <span className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-white bg-gray-100 text-xs font-semibold text-gray-600">
          +{overflow}
        </span>
      )}
    </div>
  );
};

const LessonCard = ({ lesson, onLessonSelect }) => {
  const type = getLessonType(lesson);
  const group = isGroupLesson(lesson);
  const participants = getLessonParticipants(lesson);
  const activeParticipants = group
    ? getBookedGroupParticipants(lesson)
    : participants.filter((participant) => String(participant.status).toLowerCase() !== 'cancelled');
  const capacity = getGroupCapacity(lesson);
  const filled = activeParticipants.length;
  const needed = Math.max(capacity - filled, 0);

  const handleMessage = (event) => {
    event.stopPropagation();
    if (group) {
      textAllParticipants(activeParticipants);
      return;
    }
    const primary = activeParticipants[0];
    openSmsComposer({
      playerId: primary?.playerId ?? lesson.player_id ?? lesson.playerId,
      phone: primary?.phone
    });
  };

  return (
    <button
      type="button"
      onClick={() => onLessonSelect?.(lesson)}
      className="flex w-full min-w-0 flex-col gap-2 rounded-xl border border-gray-200 bg-white p-3 text-left shadow-sm transition hover:border-purple-200 hover:shadow"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 text-sm font-semibold text-gray-900">
            <Clock className="h-4 w-4 shrink-0 text-gray-400" />
            <span className="truncate">{timeRangeLabel(lesson)}</span>
            {durationLabel(lesson) && (
              <span className="shrink-0 text-xs font-normal text-gray-500">• {durationLabel(lesson)}</span>
            )}
          </div>
          {lesson.location && (
            <div className="mt-0.5 flex min-w-0 items-center gap-1.5 text-xs text-gray-500">
              <MapPin className="h-3.5 w-3.5 shrink-0" />
              <span className="min-w-0 truncate">{conciseLocation(lesson.location)}</span>
            </div>
          )}
        </div>
        <span
          className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold ${
            typeBadgeStyles[type] || typeBadgeStyles.private
          }`}
        >
          {typeLabels[type] || 'Private'}
        </span>
      </div>

      <div
        className={
          group
            ? 'flex flex-col gap-2 md:flex-row md:items-center md:justify-between'
            : 'flex flex-wrap items-center justify-between gap-2'
        }
      >
        <div className="flex min-w-0 items-center gap-3">
          <ParticipantAvatars participants={participants} />
          <div className="min-w-0 text-xs text-gray-600">
            {group ? (
              <span className="flex items-center gap-1">
                <Users className="h-3.5 w-3.5 shrink-0 text-gray-400" />
                {filled} of {capacity} spots
                {needed > 0 && (
                  <span className="font-semibold text-amber-600">• needs {needed} more</span>
                )}
              </span>
            ) : (
              <span className="block truncate font-medium text-gray-700">
                {participants[0]?.name || 'Player'}
              </span>
            )}
          </div>
        </div>

        <span
          onClick={handleMessage}
          role="button"
          tabIndex={0}
          onKeyDown={(event) => {
            if (event.key === 'Enter' || event.key === ' ') {
              handleMessage(event);
            }
          }}
          className={`inline-flex items-center justify-center gap-1.5 rounded-lg border border-purple-200 px-3 py-1.5 text-xs font-semibold text-purple-700 transition hover:bg-purple-50 ${
            group ? 'w-full md:w-auto' : ''
          }`}
        >
          <MessageCircle className="h-3.5 w-3.5" />
          {group ? 'Message all' : 'Message'}
        </span>
      </div>
    </button>
  );
};

const CancelledLessonCard = ({ lesson, onLessonSelect }) => {
  const participants = getLessonParticipants(lesson);

  const handleNotifyAll = (event) => {
    event.stopPropagation();
    textAllParticipants(participants);
  };

  return (
    <button
      type="button"
      onClick={() => onLessonSelect?.(lesson)}
      className="flex w-full flex-col gap-2 rounded-xl border border-rose-100 bg-rose-50/50 p-4 text-left transition hover:border-rose-200"
    >
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-sm font-semibold text-gray-700">
          <span className="line-through">{timeRangeLabel(lesson)}</span>
          <span className="rounded-full bg-rose-100 px-2 py-0.5 text-xs font-semibold text-rose-600">
            Cancelled
          </span>
        </div>
        {participants.length > 0 && (
          <span
            onClick={handleNotifyAll}
            role="button"
            tabIndex={0}
            onKeyDown={(event) => {
              if (event.key === 'Enter' || event.key === ' ') {
                handleNotifyAll(event);
              }
            }}
            className="inline-flex items-center gap-1.5 rounded-lg border border-rose-200 px-3 py-1.5 text-xs font-semibold text-rose-700 transition hover:bg-rose-100"
          >
            <MessageCircle className="h-3.5 w-3.5" />
            Notify {participants.length > 1 ? 'all' : 'player'}
          </span>
        )}
      </div>
      <div className="flex items-center gap-2 text-xs text-rose-700/80">
        <AlertTriangle className="h-3.5 w-3.5" />
        <span className="truncate">
          {participants.map((participant) => participant.name).join(', ') || 'No players to notify'}
        </span>
      </div>
    </button>
  );
};

const money = cents =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(Number(cents || 0) / 100);

const plural = (count, one, many = `${one}s`) => `${count} ${count === 1 ? one : many}`;

// A link that moves within the app, but stays a real link (new tab, copy address).
const onAppLink = (event, go) => {
  if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) {
    return;
  }
  event.preventDefault();
  go();
};

// One Pro Shop card: a full card from tablet width up, a compact tile on phones.
const ProShopCard = ({ card, compact = false, href, onOpen }) => {
  const { Icon } = card;
  const iconTile = (
    <span
      aria-hidden="true"
      className={`flex shrink-0 items-center justify-center rounded-xl ${compact ? 'h-10 w-10' : 'h-11 w-11'}`}
      style={{ backgroundColor: card.tint, color: card.accent }}
    >
      <Icon className="h-5 w-5" />
    </span>
  );

  if (compact) {
    return (
      <a
        href={href}
        onClick={event => onAppLink(event, onOpen)}
        className="flex min-h-[44px] flex-col gap-2 rounded-xl border border-gray-200 bg-white p-3 transition hover:border-purple-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-purple-500"
      >
        {iconTile}
        <span className="min-w-0">
          <span className="block text-sm font-semibold leading-tight text-gray-900">{card.title}</span>
          <span className="mt-0.5 block text-[11px] font-semibold uppercase tracking-wide text-gray-600">{card.shortLabel}</span>
          <span className="mt-1 block text-xs text-gray-700">{card.compactStatus}</span>
        </span>
      </a>
    );
  }

  return (
    <article className="flex h-full flex-col rounded-2xl border border-gray-200 bg-white p-5">
      <div className="flex items-start gap-3">
        {iconTile}
        <div className="min-w-0">
          <h4 className="text-base font-semibold text-gray-900">{card.title}</h4>
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-600">{card.label}</p>
        </div>
      </div>
      <p className="mt-3 text-sm text-gray-600">{card.description}</p>
      <p className="mt-3 text-sm font-medium text-gray-900">{card.status}</p>
      <div className="mt-auto pt-4">
        <a
          href={href}
          onClick={event => onAppLink(event, onOpen)}
          className="inline-flex min-h-[44px] w-full items-center justify-center rounded-lg bg-purple-600 px-4 text-sm font-semibold text-white transition hover:bg-purple-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-purple-500 focus-visible:ring-offset-2"
        >
          {card.action}
        </a>
      </div>
    </article>
  );
};

const ProShopSection = ({ summary, earnings, proShopHref, onOpenProShop }) => {
  const cards = [
    {
      tab: 'supplies',
      Icon: ShoppingBag,
      tint: '#F3EEFF',
      accent: '#6D28D9',
      title: 'Coach supplies',
      label: 'For you',
      shortLabel: 'For you',
      description: 'Restrings and balls for your own lessons, at your coach price.',
      status: summary.openSupplies ? plural(summary.openSupplies, 'open supply order') : 'No open supply orders',
      compactStatus: `${summary.openSupplies} open`,
      action: 'Shop supplies'
    },
    {
      tab: 'restring',
      Icon: CircleDot,
      tint: '#E3F5F1',
      accent: '#0F766E',
      title: 'Restringing',
      label: 'For players · You earn',
      shortLabel: 'For players',
      description: "Collect your players' rackets; The Tennis Garage strings them.",
      status: `${summary.restringAwaitingDropOff} awaiting drop-off · ${summary.restringReady} ready`,
      compactStatus: `${summary.restringAwaitingDropOff} drop-off · ${summary.restringReady} ready`,
      action: 'New restring order'
    },
    {
      tab: 'racket',
      Icon: Package,
      tint: '#FFF1DC',
      accent: '#B45309',
      title: 'Racket sales',
      label: 'For players · You earn',
      shortLabel: 'For players',
      description: 'Order a new frame for a player, strung and ready for pickup.',
      status: summary.openRackets ? plural(summary.openRackets, 'open racket order') : 'No open racket orders',
      compactStatus: `${summary.openRackets} open`,
      action: 'Sell a racket'
    }
  ];

  return (
    <section aria-labelledby="today-pro-shop" className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1">
        <h3 id="today-pro-shop" className="text-sm font-semibold uppercase tracking-wide text-gray-600">
          Pro Shop
        </h3>
        <a
          href={proShopHref()}
          onClick={event => onAppLink(event, () => onOpenProShop())}
          className="inline-flex min-h-[44px] items-center gap-1 text-sm font-medium text-purple-700 hover:text-purple-800"
        >
          {money(earnings.earned_cents)} earned · {money(earnings.pending_cents)} awaiting payment ·{' '}
          {plural(summary.playerOrders, 'order')}
          <ArrowRight className="h-4 w-4" aria-hidden="true" />
        </a>
      </div>

      <div className="hidden gap-4 md:grid md:grid-cols-3">
        {cards.map(card => (
          <ProShopCard key={card.tab} card={card} href={proShopHref(card.tab)} onOpen={() => onOpenProShop(card.tab)} />
        ))}
      </div>

      <div className="grid grid-cols-3 gap-2 md:hidden">
        {cards.map(card => (
          <ProShopCard key={card.tab} compact card={card} href={proShopHref(card.tab)} onOpen={() => onOpenProShop(card.tab)} />
        ))}
      </div>

      <dl className="grid grid-cols-3 divide-x divide-gray-100 rounded-xl border border-gray-200 bg-white md:hidden">
        {[
          { label: 'Awaiting drop-off', value: summary.awaitingDropOff },
          { label: 'Ready for pickup', value: summary.ready },
          { label: 'Awaiting payment', value: summary.awaitingPayment }
        ].map(cell => (
          <div key={cell.label} className="px-3 py-2">
            <dd className="text-base font-semibold tabular-nums text-gray-900">{cell.value}</dd>
            <dt className="text-[11px] leading-tight text-gray-600">{cell.label}</dt>
          </div>
        ))}
      </dl>
    </section>
  );
};

// Compact busy time range: show the meridiem once when start and end share it
// ("3:30 – 5:30 PM"); keep both when they differ ("11:30 AM – 1:00 PM").
const formatBusyTimeRange = (start, end) => {
  if (!end) {
    return start.format('h:mm A');
  }
  const startLabel = start.format('A') === end.format('A') ? start.format('h:mm') : start.format('h:mm A');
  return `${startLabel} – ${end.format('h:mm A')}`;
};

const BusyBlock = ({ event }) => (
  <div className="flex w-full min-w-0 items-center gap-2 rounded-xl border border-dashed border-gray-200 bg-gray-50 p-4 text-sm text-gray-500">
    <Clock className="h-4 w-4 shrink-0 text-gray-400" />
    <span className="shrink-0 whitespace-nowrap font-medium text-gray-600">
      {formatBusyTimeRange(event.start, event.end)}
    </span>
    <span className="min-w-0 flex-1 truncate">· {event.title}</span>
    <span className="shrink-0 text-xs uppercase tracking-wide text-gray-400">Busy</span>
  </div>
);

const RequestRow = ({ item }) => {
  const processing = Boolean(item.activeAction);
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
      <button type="button" onClick={item.onDetails} className="block w-full text-left">
        <p className="text-sm text-gray-900">
          <span className="font-semibold">{item.name}</span> {item.detail}
        </p>
        {item.info && <p className="mt-0.5 text-xs text-gray-500">{item.info}</p>}
      </button>
      <div className="mt-3 flex flex-wrap gap-2">
        {item.acceptLabel !== '' && (
          <button
            type="button"
            onClick={item.onAccept || undefined}
            disabled={!item.onAccept || processing}
            className="rounded-lg bg-purple-600 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-purple-700 disabled:opacity-60"
          >
            {item.activeAction === 'confirm' || item.activeAction === 'approve'
              ? 'Processing…'
              : item.acceptLabel}
          </button>
        )}
        {!item.hideDecline && (
          <button
            type="button"
            onClick={item.onDecline || undefined}
            disabled={!item.onDecline || processing}
            className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-semibold text-gray-600 transition hover:bg-gray-50 disabled:opacity-60"
          >
            {item.activeAction === 'decline' ? 'Processing…' : item.declineLabel || 'Decline'}
          </button>
        )}
      </div>
    </div>
  );
};

const TodayPage = ({
  upcomingLessons = [],
  todayLessonCount = 0,
  cancelledLessons = [],
  requests = [],
  googleEvents = [],
  calendarConnected = null,
  onLessonSelect,
  coachName = '',
  onViewFullCalendar = () => {},
  onOpenUpcomingLessons = () => {},
  proShopHref = () => '/pro-shop',
  onOpenProShop = () => {}
}) => {
  const [proShopOrders, setProShopOrders] = useState([]);
  const [proShopEarnings, setProShopEarnings] = useState(null);
  const todayLabel = useMemo(() => moment().format('dddd, MMMM D'), []);
  const todayKey = useMemo(() => moment().format('YYYY-MM-DD'), []);
  const greeting = useMemo(() => {
    const hour = moment().hour();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  }, []);

  const firstName = String(coachName || '').trim().split(' ')[0];
  const subline = `${todayLabel} · ${todayLessonCount} ${todayLessonCount === 1 ? 'lesson' : 'lessons'} today`;

  useEffect(() => {
    let active = true;

    getCoachRestringingOrders()
      .then(response => {
        if (active) setProShopOrders(response?.orders || response || []);
      })
      .catch(() => {});
    getCoachRestringingEarnings()
      .then(response => {
        if (active) setProShopEarnings(response);
      })
      .catch(() => {});

    return () => {
      active = false;
    };
  }, []);

  // Busy blocks grouped by local day → { allDay, timed }. Covers the whole synced
  // window, not just today. Suppress only when the calendar is *definitively* not
  // connected; event presence already implies sync (they come from synced-events), and
  // this matches both the green pill and the Calendar tab (which renders ungated).
  const busyByDay = useMemo(() => {
    const map = new Map();
    if (calendarConnected === false || !Array.isArray(googleEvents)) {
      return map;
    }
    googleEvents
      .map(normalizeGoogleEvent)
      .filter(Boolean)
      .forEach((event) => {
        const key = event.start.format('YYYY-MM-DD');
        if (!map.has(key)) {
          map.set(key, { allDay: [], timed: [] });
        }
        (event.allDay ? map.get(key).allDay : map.get(key).timed).push(event);
      });
    return map;
  }, [calendarConnected, googleEvents]);

  // Day groups come from the upcoming lessons; synthesize a Today group if today has
  // busy but no lessons. Busy never creates a group for any other day.
  const dayGroups = useMemo(() => {
    const map = new Map();
    upcomingLessons.forEach((lesson) => {
      const key = getLessonDateKey(lesson) || todayKey;
      if (!map.has(key)) {
        map.set(key, []);
      }
      map.get(key).push(lesson);
    });
    const todayBusy = busyByDay.get(todayKey);
    if (!map.has(todayKey) && todayBusy && (todayBusy.allDay.length > 0 || todayBusy.timed.length > 0)) {
      map.set(todayKey, []);
    }
    return [...map.entries()]
      .map(([key, lessons]) => ({ key, lessons }))
      .sort((a, b) => (a.key < b.key ? -1 : a.key > b.key ? 1 : 0));
  }, [upcomingLessons, todayKey, busyByDay]);

  // Interleave a day's lessons with that day's timed busy blocks, by start time.
  const buildTimedItems = (dayKey, lessons) => {
    const timedBusy = busyByDay.get(dayKey)?.timed || [];
    const items = [
      ...lessons.map((lesson) => ({
        kind: 'lesson',
        key: `lesson-${lesson.id}`,
        start: getLessonMoments(lesson).start,
        data: lesson
      })),
      ...timedBusy.map((event, index) => ({
        kind: 'busy',
        key: `busy-${dayKey}-${index}`,
        start: event.start,
        data: event
      }))
    ];
    return items.sort((a, b) => (a.start?.valueOf() ?? 0) - (b.start?.valueOf() ?? 0));
  };

  return (
    <div className="space-y-6">
      <header>
        <h2 className="text-xl font-semibold text-gray-900">
          {greeting}
          {firstName ? `, ${firstName}` : ''}
        </h2>
        <p className="text-sm text-gray-500">{subline}</p>
      </header>

      <ProShopSection
        summary={proShopSummary(proShopOrders)}
        earnings={normalizeRestringingEarnings(proShopEarnings)}
        proShopHref={proShopHref}
        onOpenProShop={onOpenProShop}
      />

      {(requests.length > 0 || cancelledLessons.length > 0) && (
        <section className="space-y-3">
          <h3 className="text-sm font-semibold uppercase tracking-wide text-gray-500">
            Needs action
          </h3>
          {requests.length > 0 && (
            <div className="grid gap-3 sm:grid-cols-2">
              {requests.map((item) => (
                <RequestRow key={item.id} item={item} />
              ))}
            </div>
          )}
          {cancelledLessons.length > 0 && (
            <div className="grid gap-3 sm:grid-cols-2">
              {cancelledLessons.map((lesson) => (
                <CancelledLessonCard key={lesson.id} lesson={lesson} onLessonSelect={onLessonSelect} />
              ))}
            </div>
          )}
        </section>
      )}

      <section className="space-y-4">
        <h3 className="text-sm font-semibold uppercase tracking-wide text-gray-500">
          Upcoming
        </h3>

        {dayGroups.length === 0 ? (
          <div className="rounded-xl border border-dashed border-gray-200 bg-white p-8 text-center text-sm text-gray-500">
            No upcoming lessons
          </div>
        ) : (
          dayGroups.map((group) => {
            const allDayBusy = busyByDay.get(group.key)?.allDay || [];
            const timedItems = buildTimedItems(group.key, group.lessons);
            return (
              <div key={group.key} className="space-y-2">
                <h4 className="text-xs font-semibold uppercase tracking-wide text-gray-400">
                  {dayLabel(group.key)}
                </h4>

                {allDayBusy.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {allDayBusy.map((event, index) => (
                      <span
                        key={`allday-${group.key}-${index}`}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-dashed border-gray-200 bg-gray-50 px-3 py-1.5 text-xs text-gray-500"
                      >
                        <span className="font-semibold uppercase tracking-wide text-gray-400">All day</span>
                        <span className="max-w-[12rem] truncate">{event.title}</span>
                      </span>
                    ))}
                  </div>
                )}
                {timedItems.length > 0 && (
                  <div className="grid gap-3 sm:grid-cols-2">
                    {timedItems.map((item) =>
                      item.kind === 'lesson' ? (
                        <LessonCard key={item.key} lesson={item.data} onLessonSelect={onLessonSelect} />
                      ) : (
                        <BusyBlock key={item.key} event={item.data} />
                      )
                    )}
                  </div>
                )}
              </div>
            );
          })
        )}

        <button
          type="button"
          onClick={onViewFullCalendar}
          className="flex w-full items-center justify-between rounded-xl border border-gray-200 bg-white px-4 py-3 text-left transition hover:border-purple-200 hover:shadow-sm"
        >
          <span className="flex items-center gap-2 text-sm font-medium text-gray-700">
            <CalendarDays className="h-4 w-4 text-purple-600" />
            View full calendar
          </span>
          <ChevronRight className="h-4 w-4 text-gray-400" />
        </button>
        <button
          type="button"
          onClick={onOpenUpcomingLessons}
          className="flex w-full items-center justify-between rounded-xl border border-gray-200 bg-white px-4 py-3 text-left transition hover:border-purple-200 hover:shadow-sm"
        >
          <span className="flex items-center gap-2 text-sm font-medium text-gray-700">
            <ListChecks className="h-4 w-4 text-purple-600" />
            All upcoming lessons
          </span>
          <ChevronRight className="h-4 w-4 text-gray-400" />
        </button>
      </section>
    </div>
  );
};

export default TodayPage;
