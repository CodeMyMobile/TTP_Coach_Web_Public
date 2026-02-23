import React, { useEffect, useMemo, useState } from 'react';
import moment from 'moment';
import Modal, { ModalBody, ModalFooter, ModalHeader } from './Modal';

const LESSON_LEVELS = [
  { id: 0, name: 'All' },
  { id: 1, name: 'Beginner (NTRP 2.5)' },
  { id: 2, name: 'Advanced Beginner (NTRP 3.0)' },
  { id: 3, name: 'Intermediate (NTRP 3.5)' },
  { id: 4, name: 'Advanced (NTRP 4.0)' },
  { id: 5, name: 'Advanced Plus (NTRP 4.5)' },
  { id: 6, name: 'Expert (NTRP 5.0)' }
];

const CreateLessonModal = ({
  isOpen,
  draft,
  onClose,
  onSubmit,
  isSubmitting = false,
  submitError = null,
  players = [],
  locations = []
}) => {
  const [form, setForm] = useState(draft);
  const [playerTab, setPlayerTab] = useState('students');
  const [playerSearch, setPlayerSearch] = useState('');
  const [groupPlayerSearch, setGroupPlayerSearch] = useState('');
  const [currentWeekStart, setCurrentWeekStart] = useState(() =>
    draft?.start ? moment(draft.start).startOf('day') : moment().startOf('day')
  );
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const [viewMonth, setViewMonth] = useState(() =>
    draft?.start ? moment(draft.start).startOf('month') : moment().startOf('month')
  );
  const [calendarSelection, setCalendarSelection] = useState(() =>
    draft?.start ? moment(draft.start).startOf('day') : moment().startOf('day')
  );
  const resolvedForm = form;

  useEffect(() => {
    setForm(draft);
    const nextStart = draft?.start ? moment(draft.start).startOf('day') : moment().startOf('day');
    setCurrentWeekStart(nextStart);
    setViewMonth(nextStart.clone().startOf('month'));
    setCalendarSelection(nextStart);
  }, [draft]);

  useEffect(() => {
    setPlayerTab('students');
    setPlayerSearch('');
    setGroupPlayerSearch('');
  }, [isOpen]);

  const handleChange = (field, value) => {
    setForm((prev) => ({ ...(prev || {}), [field]: value }));
  };

  const handleMetadataChange = (field, value) => {
    setForm((prev) => ({
      ...(prev || {}),
      metadata: { ...(prev?.metadata || {}), [field]: value }
    }));
  };

  const handleRecurrenceChange = (field, value) => {
    setForm((prev) => {
      const prevRecurrence = prev?.metadata?.recurrence || { frequency: '', count: '' };
      let nextValue = value;
      if (field === 'count') {
        const parsed = parseInt(String(value), 10);
        nextValue = Number.isFinite(parsed) && parsed > 0 ? parsed : '';
      }
      const nextRecurrence = { ...prevRecurrence, [field]: nextValue };
      if (field === 'frequency' && value === 'NONE') {
        nextRecurrence.count = '';
      }
      return {
        ...(prev || {}),
        metadata: { ...(prev?.metadata || {}), recurrence: nextRecurrence }
      };
    });
  };

  const handleDurationChange = (value) => {
    const minutes = parseInt(value, 10);
    setForm((prev) => {
      const start = prev?.start ? moment(prev.start) : null;
      const end = start && Number.isFinite(minutes)
        ? start.clone().add(minutes, 'minutes').toDate()
        : prev?.end || null;
      return {
        ...(prev || {}),
        end,
        metadata: { ...(prev?.metadata || {}), duration: value }
      };
    });
  };

  const invitees = useMemo(
    () => (Array.isArray(resolvedForm?.invitees) ? resolvedForm.invitees : []),
    [resolvedForm?.invitees]
  );

  const addInvitee = () => {
    setForm((prev) => ({
      ...(prev || {}),
      invitees: [...(Array.isArray(prev?.invitees) ? prev.invitees : []), { full_name: '', phone: '', email: '' }]
    }));
  };

  const removeInvitee = (index) => {
    setForm((prev) => ({
      ...(prev || {}),
      invitees: (Array.isArray(prev?.invitees) ? prev.invitees : []).filter((_, idx) => idx !== index)
    }));
  };

  const updateInvitee = (index, field, value) => {
    setForm((prev) => ({
      ...(prev || {}),
      invitees: (Array.isArray(prev?.invitees) ? prev.invitees : []).map((invitee, idx) =>
        idx === index ? { ...invitee, [field]: value } : invitee
      )
    }));
  };

  const sortedPlayers = useMemo(() => {
    return (Array.isArray(players) ? players : [])
      .map((player) => ({
        id: player.player_id ?? player.id ?? player.user_id ?? player.email,
        name: player.full_name || player.name || 'Student',
        email: player.email || ''
      }))
      .filter((player) => player.id);
  }, [players]);

  const selectedPlayerIds = useMemo(
    () => (Array.isArray(resolvedForm?.playerIds) ? resolvedForm.playerIds.map((id) => String(id)) : []),
    [resolvedForm?.playerIds]
  );

  const filteredPlayers = useMemo(() => {
    const normalizedQuery = playerSearch.trim().toLowerCase();
    if (!normalizedQuery) {
      return sortedPlayers;
    }
    return sortedPlayers.filter((player) => (`${player.name} ${player.email}`).toLowerCase().includes(normalizedQuery));
  }, [playerSearch, sortedPlayers]);

  const filteredGroupPlayers = useMemo(() => {
    const normalizedQuery = groupPlayerSearch.trim().toLowerCase();
    if (!normalizedQuery) {
      return sortedPlayers;
    }
    return sortedPlayers.filter((player) => (`${player.name} ${player.email}`).toLowerCase().includes(normalizedQuery));
  }, [groupPlayerSearch, sortedPlayers]);

  const selectedPlayers = useMemo(
    () => sortedPlayers.filter((player) => selectedPlayerIds.includes(String(player.id))),
    [selectedPlayerIds, sortedPlayers]
  );

  const locationOptions = useMemo(() => {
    return (Array.isArray(locations) ? locations : []).map((location) => {
      if (location && typeof location === 'object') {
        const id = location.location_id ?? location.locationId ?? location.id ?? location.value;
        const label = location.location ?? location.name ?? location.label ?? location.address ?? String(id ?? '');
        return { id, label };
      }
      return { id: null, label: String(location) };
    });
  }, [locations]);

  const requiresLocationId = useMemo(
    () => locationOptions.some((option) => option.id !== null && option.id !== undefined),
    [locationOptions]
  );

  if (!resolvedForm) {
    return null;
  }

  const startTimeValue = resolvedForm.start ? moment(resolvedForm.start).format('HH:mm') : '';
  const endTimeValue = resolvedForm.end ? moment(resolvedForm.end).format('HH:mm') : '';
  const recurrence = resolvedForm.metadata?.recurrence || { frequency: 'NONE', count: '' };
  const baseDate = resolvedForm.start ? moment(resolvedForm.start) : moment();
  const dateOptions = Array.from({ length: 5 }, (_, index) => currentWeekStart.clone().add(index, 'days'));
  const weekRangeLabel = `${currentWeekStart.format('MMM D')} – ${currentWeekStart.clone().add(4, 'days').format('MMM D')}`;
  const isCurrentWeek = moment().isBetween(currentWeekStart, currentWeekStart.clone().add(4, 'days'), 'day', '[]');
  const canGoToPreviousWeek = currentWeekStart.isAfter(moment().startOf('day'), 'day');
  const monthStart = viewMonth.clone().startOf('month');
  const monthEnd = viewMonth.clone().endOf('month');
  const calendarStart = monthStart.clone().startOf('week');
  const calendarEnd = monthEnd.clone().endOf('week');
  const calendarDays = [];
  const dayPointer = calendarStart.clone();
  while (dayPointer.isSameOrBefore(calendarEnd, 'day')) {
    calendarDays.push(dayPointer.clone());
    dayPointer.add(1, 'day');
  }
  const durationMinutes = resolvedForm.start && resolvedForm.end
    ? Math.max(moment(resolvedForm.end).diff(moment(resolvedForm.start), 'minutes'), 0)
    : null;

  const setDatePart = (dateMoment) => {
    setForm((prev) => {
      const nextStart = prev?.start ? moment(prev.start) : moment();
      let nextEnd = prev?.end ? moment(prev.end) : nextStart.clone().add(60, 'minutes');
      nextStart.year(dateMoment.year()).month(dateMoment.month()).date(dateMoment.date());
      const previousDiff = Math.max(nextEnd.diff(nextStart, 'minutes'), 0) || 60;
      nextEnd.year(dateMoment.year()).month(dateMoment.month()).date(dateMoment.date());
      if (!nextEnd.isAfter(nextStart)) {
        nextEnd = nextStart.clone().add(previousDiff, 'minutes');
      }
      return { ...(prev || {}), start: nextStart.toDate(), end: nextEnd.toDate() };
    });
  };

  const setTimePart = (field, value) => {
    const [hour = '0', minute = '0'] = String(value || '').split(':');
    setForm((prev) => {
      const target = field === 'start' ? prev?.start : prev?.end;
      const nextMoment = target ? moment(target) : moment();
      nextMoment.hour(Number(hour)).minute(Number(minute)).second(0).millisecond(0);
      return { ...(prev || {}), [field]: nextMoment.toDate() };
    });
  };

  const goToPreviousWeek = () => {
    if (!canGoToPreviousWeek) {
      return;
    }
    setCurrentWeekStart((prev) => prev.clone().subtract(7, 'days'));
  };

  const goToNextWeek = () => {
    setCurrentWeekStart((prev) => prev.clone().add(7, 'days'));
  };

  const openCalendarPicker = () => {
    setCalendarSelection(baseDate.clone().startOf('day'));
    setViewMonth(baseDate.clone().startOf('month'));
    setIsCalendarOpen(true);
  };

  const closeCalendarPicker = () => {
    setIsCalendarOpen(false);
  };

  const confirmCalendarSelection = () => {
    if (calendarSelection) {
      setDatePart(calendarSelection.clone());
      setCurrentWeekStart(calendarSelection.clone().startOf('day'));
    }
    setIsCalendarOpen(false);
  };

  const updateSingleInvitee = (field, value) => {
    setForm((prev) => {
      const firstInvitee = Array.isArray(prev?.invitees) && prev.invitees.length > 0
        ? prev.invitees[0]
        : { full_name: '', phone: '', email: '' };
      return {
        ...(prev || {}),
        invitees: [{ ...firstInvitee, [field]: value }]
      };
    });
  };

  const primaryInvitee = invitees[0] || { full_name: '', phone: '', email: '' };

  const avatarColor = (name = '') => {
    const palette = [
      'from-violet-500 to-purple-400',
      'from-sky-500 to-blue-400',
      'from-emerald-500 to-green-400',
      'from-amber-500 to-orange-400'
    ];
    const code = (name || '').split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    return palette[code % palette.length];
  };

  const initials = (name = '') => {
    const words = name.trim().split(/\s+/).filter(Boolean);
    if (words.length === 0) return 'PL';
    return words.slice(0, 2).map((word) => word[0]).join('').toUpperCase();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      placement="bottom"
      panelClassName="w-full sm:max-w-3xl"
    >
      <ModalHeader title="Add Lesson" onClose={onClose} />
      <ModalBody className="space-y-5 bg-slate-50">
        {submitError && (
          <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {submitError}
          </div>
        )}

        <div>
          <label className="mb-2 block text-sm font-semibold text-slate-800">Date</label>
          <div className="mb-2 flex items-center gap-2 text-xs text-slate-500">
            <strong className="font-semibold text-slate-800">{weekRangeLabel}</strong>
            {isCurrentWeek && <span>This Week</span>}
          </div>
          <div className="-mx-1 flex items-center gap-2 overflow-x-auto px-1 pb-1">
            <button
              type="button"
              onClick={goToPreviousWeek}
              disabled={!canGoToPreviousWeek}
              aria-label="Previous week"
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-slate-50 text-lg text-slate-500 transition hover:border-slate-300 hover:bg-slate-100 hover:text-slate-800 disabled:cursor-not-allowed disabled:opacity-40"
            >
              ‹
            </button>
            {dateOptions.map((dateMoment) => {
              const isSelected = baseDate.isSame(dateMoment, 'day');
              const isToday = moment().isSame(dateMoment, 'day');
              return (
                <button
                  key={dateMoment.format('YYYY-MM-DD')}
                  type="button"
                  onClick={() => setDatePart(dateMoment)}
                  className={`min-w-[66px] rounded-xl border-2 px-3 py-2 text-center transition ${
                    isSelected
                      ? 'border-violet-500 bg-violet-100'
                      : 'border-slate-200 bg-white hover:border-slate-300'
                  }`}
                >
                  <p className={`text-[10px] font-semibold uppercase ${isSelected ? 'text-violet-700' : 'text-slate-500'}`}>
                    {dateMoment.format('ddd')}
                  </p>
                  <p className={`text-lg font-bold ${isSelected ? 'text-violet-700' : 'text-slate-800'}`}>{dateMoment.format('D')}</p>
                  <p className="text-[10px] text-slate-400">{dateMoment.format('MMM')}</p>
                  {isToday && <span className="mx-auto mt-1 block h-1 w-1 rounded-full bg-violet-500" />}
                </button>
              );
            })}
            <button
              type="button"
              onClick={goToNextWeek}
              aria-label="Next week"
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-slate-50 text-lg text-slate-500 transition hover:border-slate-300 hover:bg-slate-100 hover:text-slate-800"
            >
              ›
            </button>
            <button
              type="button"
              onClick={openCalendarPicker}
              aria-label="Pick a specific date"
              className={`flex min-w-[60px] shrink-0 flex-col items-center justify-center rounded-xl border-2 border-dashed px-3 py-2 transition ${
                isCalendarOpen
                  ? 'border-violet-500 bg-violet-100'
                  : 'border-slate-200 bg-slate-50 hover:border-violet-500 hover:bg-violet-50'
              }`}
            >
              <span className="text-lg">📅</span>
              <span className="text-[9px] font-semibold uppercase text-slate-500">Pick</span>
            </button>
          </div>
        </div>

        {isCalendarOpen && (
          <div
            className="fixed inset-0 z-[70] flex items-center justify-center bg-black/40 px-4"
            onClick={closeCalendarPicker}
          >
            <div
              className="relative w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl"
              onClick={(event) => event.stopPropagation()}
            >
              <button
                type="button"
                onClick={closeCalendarPicker}
                className="absolute right-4 top-4 flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100 text-slate-500 hover:bg-slate-200 hover:text-slate-800"
              >
                ✕
              </button>
              <h3 className="mb-5 text-center text-lg font-bold text-slate-800">Select a Date</h3>
              <div className="mb-4 flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => setViewMonth((prev) => prev.clone().subtract(1, 'month'))}
                  className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-slate-50 text-slate-500 hover:bg-slate-100 hover:text-slate-800"
                >
                  ‹
                </button>
                <span className="text-sm font-semibold text-slate-800">{viewMonth.format('MMMM YYYY')}</span>
                <button
                  type="button"
                  onClick={() => setViewMonth((prev) => prev.clone().add(1, 'month'))}
                  className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-slate-50 text-slate-500 hover:bg-slate-100 hover:text-slate-800"
                >
                  ›
                </button>
              </div>
              <div className="mb-2 grid grid-cols-7 gap-1">
                {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
                  <span key={day} className="py-2 text-center text-[11px] font-semibold text-slate-400">{day}</span>
                ))}
              </div>
              <div className="grid grid-cols-7 gap-1">
                {calendarDays.map((date) => {
                  const isSelected = calendarSelection?.isSame(date, 'day');
                  const isToday = moment().isSame(date, 'day');
                  const isPast = date.isBefore(moment().startOf('day'), 'day');
                  const isOtherMonth = !date.isSame(viewMonth, 'month');
                  return (
                    <button
                      key={date.format('YYYY-MM-DD')}
                      type="button"
                      disabled={isPast}
                      onClick={() => setCalendarSelection(date.clone())}
                      className={`relative aspect-square rounded-full border-2 text-sm transition ${
                        isSelected
                          ? 'border-amber-500 bg-amber-100 font-bold text-amber-700'
                          : 'border-transparent text-slate-800 hover:bg-slate-100'
                      } ${isPast ? 'cursor-not-allowed text-slate-300 hover:bg-transparent' : ''} ${
                        isOtherMonth ? 'text-slate-300' : ''
                      }`}
                    >
                      {date.date()}
                      {isToday && <span className="absolute bottom-1 left-1/2 h-1 w-1 -translate-x-1/2 rounded-full bg-violet-500" />}
                    </button>
                  );
                })}
              </div>
              <div className="mt-6 flex gap-3">
                <button
                  type="button"
                  onClick={closeCalendarPicker}
                  className="flex-1 rounded-xl bg-slate-100 px-4 py-3 text-sm font-semibold text-slate-600 hover:bg-slate-200 hover:text-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={confirmCalendarSelection}
                  className="flex-1 rounded-xl bg-violet-600 px-4 py-3 text-sm font-semibold text-white hover:bg-violet-700"
                >
                  Select
                </button>
              </div>
            </div>
          </div>
        )}

        <div>
          <label className="mb-2 block text-sm font-semibold text-slate-800">Time</label>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <label className="rounded-xl border-2 border-slate-200 bg-white px-3 py-2">
              <span className="mb-1 block text-[11px] font-semibold uppercase text-slate-400">Start</span>
              <input
                type="time"
                value={startTimeValue}
                onChange={(event) => setTimePart('start', event.target.value)}
                className="w-full bg-transparent text-sm font-semibold text-slate-800 outline-none"
              />
            </label>
            <label className="rounded-xl border-2 border-slate-200 bg-white px-3 py-2">
              <span className="mb-1 block text-[11px] font-semibold uppercase text-slate-400">End</span>
              <input
                type="time"
                value={endTimeValue}
                onChange={(event) => setTimePart('end', event.target.value)}
                className="w-full bg-transparent text-sm font-semibold text-slate-800 outline-none"
              />
            </label>
          </div>
          {durationMinutes !== null && (
            <span className="mt-2 inline-flex rounded-md bg-violet-100 px-2 py-1 text-xs font-semibold text-violet-700">
              ⏱ {durationMinutes} min
            </span>
          )}
        </div>

        <div>
          <label className="mb-2 block text-sm font-semibold text-slate-800">Lesson Type</label>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
            {[
              { id: 1, name: 'Private', subtitle: '$100/hr', selectedClass: 'border-red-400 bg-red-100' },
              { id: 2, name: 'Semi-Private', subtitle: '$75/hr ea', selectedClass: 'border-amber-400 bg-amber-100' },
              { id: 3, name: 'Open Group', subtitle: 'Public', selectedClass: 'border-sky-400 bg-sky-100' }
            ].map((option) => {
              const isSelected = Number(resolvedForm.lessontype_id) === option.id;
              return (
                <button
                  key={option.id}
                  type="button"
                  onClick={() => handleChange('lessontype_id', option.id)}
                  className={`rounded-xl border-2 px-3 py-3 text-center transition ${
                    isSelected ? option.selectedClass : 'border-slate-200 bg-white hover:border-slate-300'
                  }`}
                >
                  <p className="text-sm font-bold text-slate-800">{option.name}</p>
                  <p className="text-xs text-slate-500">{option.subtitle}</p>
                </button>
              );
            })}
          </div>
        </div>

        <div>
          <label className="mb-2 block text-sm font-semibold text-slate-800">Location</label>
          <select
            value={requiresLocationId ? resolvedForm.location_id ?? '' : resolvedForm.location || ''}
            onChange={(event) => {
              const value = event.target.value;
              if (requiresLocationId) {
                const selected = locationOptions.find((option) => String(option.id) === value);
                handleChange('location_id', selected?.id ?? null);
                handleChange('location', selected?.label ?? '');
              } else {
                handleChange('location', value);
                handleChange('location_id', null);
              }
            }}
            className="w-full rounded-xl border-2 border-slate-200 bg-white px-3 py-3 focus:outline-none focus:ring-2 focus:ring-violet-500"
          >
            <option value="">Select location</option>
            {locationOptions.map((option) => (
              <option key={option.id ?? option.label} value={option.id ?? option.label}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        {Number(resolvedForm.lessontype_id) === 1 && (
          <div className="space-y-3 rounded-xl border border-slate-200 bg-white p-4">
            <label className="block text-sm font-semibold text-slate-800">Player</label>
            <div className="grid grid-cols-2 rounded-lg bg-slate-100 p-1">
              <button
                type="button"
                onClick={() => setPlayerTab('students')}
                className={`rounded-md px-3 py-2 text-sm font-semibold ${playerTab === 'students' ? 'bg-white text-slate-800 shadow' : 'text-slate-500'}`}
              >
                My Students
              </button>
              <button
                type="button"
                onClick={() => setPlayerTab('new')}
                className={`rounded-md px-3 py-2 text-sm font-semibold ${playerTab === 'new' ? 'bg-white text-slate-800 shadow' : 'text-slate-500'}`}
              >
                New Player
              </button>
            </div>

            {playerTab === 'students' ? (
              <>
                {selectedPlayers.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {selectedPlayers.map((player) => (
                      <span key={`selected-${player.id}`} className="inline-flex items-center gap-2 rounded-full bg-violet-100 px-2 py-1 text-xs font-semibold text-violet-800">
                        <span className={`flex h-6 w-6 items-center justify-center rounded-full bg-gradient-to-br ${avatarColor(player.name)} text-[10px] text-white`}>
                          {initials(player.name)}
                        </span>
                        {player.name}
                        <button type="button" onClick={() => handleChange('playerIds', [])}>×</button>
                      </span>
                    ))}
                  </div>
                )}
                <input
                  type="text"
                  value={playerSearch}
                  onChange={(event) => setPlayerSearch(event.target.value)}
                  placeholder="Search players..."
                  className="w-full rounded-xl border-2 border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none focus:border-violet-500"
                />
                <div className="max-h-44 space-y-2 overflow-y-auto pr-1">
                  {filteredPlayers.map((player) => {
                    const isSelected = selectedPlayerIds.includes(String(player.id));
                    return (
                      <button
                        key={player.id}
                        type="button"
                        onClick={() => handleChange('playerIds', isSelected ? [] : [Number(player.id)])}
                        className={`flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left ${isSelected ? 'bg-violet-100' : 'bg-slate-50 hover:bg-slate-100'}`}
                      >
                        <span className={`flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br ${avatarColor(player.name)} text-xs font-bold text-white`}>
                          {initials(player.name)}
                        </span>
                        <span className="flex-1">
                          <span className="block text-sm font-semibold text-slate-800">{player.name}</span>
                          <span className="block text-xs text-slate-500">{player.email || 'Student'}</span>
                        </span>
                        {isSelected && <span className="text-violet-700">✓</span>}
                      </button>
                    );
                  })}
                </div>
              </>
            ) : (
              <div className="space-y-3">
                <input
                  type="text"
                  value={primaryInvitee.full_name || ''}
                  onChange={(event) => updateSingleInvitee('full_name', event.target.value)}
                  placeholder="Player name"
                  className="w-full rounded-xl border-2 border-slate-200 bg-slate-50 px-3 py-3 text-sm outline-none focus:border-violet-500"
                />
                <input
                  type="tel"
                  value={primaryInvitee.phone || ''}
                  onChange={(event) => updateSingleInvitee('phone', event.target.value)}
                  placeholder="Phone number (optional)"
                  className="w-full rounded-xl border-2 border-slate-200 bg-slate-50 px-3 py-3 text-sm outline-none focus:border-violet-500"
                />
                <input
                  type="email"
                  value={primaryInvitee.email || ''}
                  onChange={(event) => updateSingleInvitee('email', event.target.value)}
                  placeholder="Email (optional)"
                  className="w-full rounded-xl border-2 border-slate-200 bg-slate-50 px-3 py-3 text-sm outline-none focus:border-violet-500"
                />
                <p className="rounded-lg bg-blue-50 px-3 py-2 text-xs text-blue-800">
                  📲 Add a phone number or email for invites. New players will receive lesson details and a Tennis Plan join link.
                </p>
              </div>
            )}
          </div>
        )}

        {(Number(resolvedForm.lessontype_id) === 2 ||
          Number(resolvedForm.lessontype_id) === 3) && (
          <div className="space-y-3 rounded-xl border border-slate-200 bg-white p-4">
            <label className="block text-sm font-semibold text-slate-800">
              Existing players (optional)
            </label>
            {selectedPlayers.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {selectedPlayers.map((player) => (
                  <span key={`selected-group-${player.id}`} className="inline-flex items-center gap-2 rounded-full bg-violet-100 px-2 py-1 text-xs font-semibold text-violet-800">
                    <span className={`flex h-6 w-6 items-center justify-center rounded-full bg-gradient-to-br ${avatarColor(player.name)} text-[10px] text-white`}>
                      {initials(player.name)}
                    </span>
                    {player.name}
                    <button
                      type="button"
                      onClick={() => handleChange(
                        'playerIds',
                        selectedPlayerIds
                          .filter((id) => id !== String(player.id))
                          .map((id) => Number(id))
                      )}
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            )}

            <input
              type="text"
              value={groupPlayerSearch}
              onChange={(event) => setGroupPlayerSearch(event.target.value)}
              placeholder="Search players..."
              className="w-full rounded-xl border-2 border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none focus:border-violet-500"
            />

            <div className="max-h-44 space-y-2 overflow-y-auto pr-1">
              {filteredGroupPlayers.map((player) => {
                const isSelected = selectedPlayerIds.includes(String(player.id));
                return (
                  <button
                    key={`group-player-${player.id}`}
                    type="button"
                    onClick={() => handleChange(
                      'playerIds',
                      isSelected
                        ? selectedPlayerIds.filter((id) => id !== String(player.id)).map((id) => Number(id))
                        : [...selectedPlayerIds, String(player.id)].map((id) => Number(id))
                    )}
                    className={`flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left ${isSelected ? 'bg-violet-100' : 'bg-slate-50 hover:bg-slate-100'}`}
                  >
                    <span className={`flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br ${avatarColor(player.name)} text-xs font-bold text-white`}>
                      {initials(player.name)}
                    </span>
                    <span className="flex-1">
                      <span className="block text-sm font-semibold text-slate-800">{player.name}</span>
                      <span className="block text-xs text-slate-500">{player.email || 'Student'}</span>
                    </span>
                    {isSelected && <span className="text-violet-700">✓</span>}
                  </button>
                );
              })}
            </div>

            <p className="text-xs text-gray-500">
              You can select existing players, add new invitees below, or use both.
            </p>
          </div>
        )}

        {(Number(resolvedForm.lessontype_id) === 2 ||
          Number(resolvedForm.lessontype_id) === 3) && (
          <div className="space-y-3 rounded-lg border border-gray-200 bg-gray-50 p-3">
            <div className="flex items-center justify-between">
              <label className="block text-sm font-medium text-gray-700">
                {Number(resolvedForm.lessontype_id) === 1 ? 'Invite player by phone or email' : 'Invite players by phone or email'}
              </label>
              <button
                type="button"
                onClick={addInvitee}
                className="rounded-md border border-gray-300 bg-white px-2 py-1 text-xs font-semibold text-gray-700 hover:bg-gray-100"
              >
                Add Invitee
              </button>
            </div>
            {invitees.length === 0 ? (
              <p className="text-xs text-gray-500">No invitees added.</p>
            ) : (
              <div className="space-y-2">
                {invitees.map((invitee, index) => (
                  <div key={`invitee-${index}`} className="grid grid-cols-1 gap-2 sm:grid-cols-[1fr_1fr_1fr_auto]">
                    <input
                      type="text"
                      value={invitee.full_name || ''}
                      onChange={(event) => updateInvitee(index, 'full_name', event.target.value)}
                      placeholder="Full name"
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                    />
                    <input
                      type="tel"
                      value={invitee.phone || ''}
                      onChange={(event) => updateInvitee(index, 'phone', event.target.value)}
                      placeholder="+1 415 555 1212"
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                    />
                    <input
                      type="email"
                      value={invitee.email || ''}
                      onChange={(event) => updateInvitee(index, 'email', event.target.value)}
                      placeholder="player@example.com"
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                    />
                    <button
                      type="button"
                      onClick={() => removeInvitee(index)}
                      className="rounded-lg bg-red-50 px-3 py-2 text-xs font-semibold text-red-600 hover:bg-red-100"
                    >
                      Remove
                    </button>
                  </div>
                ))}
              </div>
            )}
            <p className="text-xs text-gray-500">
              New invitees will receive lesson details and a Tennis Plan join link by SMS/email.
            </p>
          </div>
        )}

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Title (Optional)</label>
          <input
            type="text"
            value={resolvedForm.metadata?.title || ''}
            onChange={(event) => handleMetadataChange('title', event.target.value)}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500"
          />
        </div>

        {(Number(resolvedForm.lessontype_id) === 2 || Number(resolvedForm.lessontype_id) === 3) && (
          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Price per person</label>
              <input
                type="number"
                value={resolvedForm.price_per_person || ''}
                onChange={(event) => handleChange('price_per_person', event.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
            </div>
          </div>
        )}

        {Number(resolvedForm.lessontype_id) === 3 && (
          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Level</label>
              <select
                value={resolvedForm.metadata?.level || 'All'}
                onChange={(event) => handleMetadataChange('level', event.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500"
              >
                {LESSON_LEVELS.map((level) => (
                  <option key={level.id} value={level.name}>
                    {level.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Duration (minutes)</label>
              <input
                type="number"
                value={resolvedForm.metadata?.duration || ''}
                onChange={(event) => handleDurationChange(event.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
              <textarea
                rows={3}
                value={resolvedForm.metadata?.description || ''}
                onChange={(event) => handleMetadataChange('description', event.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Player limit</label>
              <input
                type="number"
                value={resolvedForm.player_limit || ''}
                onChange={(event) => handleChange('player_limit', event.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Recurrence</label>
                <select
                  value={recurrence.frequency || 'NONE'}
                  onChange={(event) => handleRecurrenceChange('frequency', event.target.value)}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500"
                >
                  <option value="NONE">None</option>
                  <option value="DAILY">Daily</option>
                  <option value="WEEKLY">Weekly</option>
                </select>
              </div>
              {recurrence.frequency && recurrence.frequency !== 'NONE' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Recurrence Count</label>
                  <input
                    type="number"
                    min="1"
                    value={recurrence.count || ''}
                    onChange={(event) => handleRecurrenceChange('count', event.target.value)}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                </div>
              )}
            </div>
          </div>
        )}
      </ModalBody>
      <ModalFooter>
        <button
          type="button"
          onClick={onClose}
          className="flex-1 rounded-lg bg-gray-100 px-4 py-2 text-gray-700 transition hover:bg-gray-200 sm:flex-none"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={() => onSubmit?.(resolvedForm)}
          disabled={isSubmitting}
          className={`flex-1 rounded-lg px-4 py-2 text-white transition sm:flex-none ${
            isSubmitting ? 'cursor-not-allowed bg-purple-300' : 'bg-purple-600 hover:bg-purple-700'
          }`}
        >
          {isSubmitting ? 'Saving…' : 'Save Lesson'}
        </button>
      </ModalFooter>
    </Modal>
  );
};

export default CreateLessonModal;
