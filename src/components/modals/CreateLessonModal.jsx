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
  players = []
}) => {
  const [form, setForm] = useState(draft);
  const resolvedForm = form;

  useEffect(() => {
    setForm(draft);
  }, [draft]);

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

  if (!resolvedForm) {
    return null;
  }

  const startValue = resolvedForm.start ? moment(resolvedForm.start).format('YYYY-MM-DDTHH:mm') : '';
  const endValue = resolvedForm.end ? moment(resolvedForm.end).format('YYYY-MM-DDTHH:mm') : '';
  const recurrence = resolvedForm.metadata?.recurrence || { frequency: 'NONE', count: '' };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      placement="bottom"
      panelClassName="w-full sm:max-w-3xl"
    >
      <ModalHeader title="Create Lesson" onClose={onClose} />
      <ModalBody className="space-y-4">
        {submitError && (
          <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {submitError}
          </div>
        )}

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Start</label>
            <input
              type="datetime-local"
              value={startValue}
              onChange={(event) => handleChange('start', new Date(event.target.value))}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">End</label>
            <input
              type="datetime-local"
              value={endValue}
              onChange={(event) => handleChange('end', new Date(event.target.value))}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Lesson Type</label>
          <select
            value={resolvedForm.lessontype_id}
            onChange={(event) => handleChange('lessontype_id', Number(event.target.value))}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500"
          >
            <option value={1}>Private (1 coach : 1 player)</option>
            <option value={2}>Semi-Private (select players)</option>
            <option value={3}>Open Group (public)</option>
          </select>
        </div>

        {(Number(resolvedForm.lessontype_id) === 1 ||
          Number(resolvedForm.lessontype_id) === 2 ||
          Number(resolvedForm.lessontype_id) === 3) && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {Number(resolvedForm.lessontype_id) === 1 ? 'Existing player' : 'Existing players (optional)'}
            </label>
            <select
              multiple={Number(resolvedForm.lessontype_id) !== 1}
              value={
                Number(resolvedForm.lessontype_id) === 1
                  ? resolvedForm.playerIds?.[0] ?? ''
                  : resolvedForm.playerIds || []
              }
              onChange={(event) => {
                if (Number(resolvedForm.lessontype_id) === 1) {
                  const selectedValue = event.target.value;
                  handleChange('playerIds', selectedValue ? [Number(selectedValue)] : []);
                  return;
                }
                const selectedIds = Array.from(event.target.selectedOptions, (option) => Number(option.value));
                handleChange('playerIds', selectedIds);
              }}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500"
            >
              {Number(resolvedForm.lessontype_id) === 1 && <option value="">Select a player</option>}
              {sortedPlayers.map((player) => (
                <option key={player.id} value={player.id}>
                  {player.name} {player.email ? `(${player.email})` : ''}
                </option>
              ))}
            </select>
            {Number(resolvedForm.lessontype_id) !== 1 && (
              <p className="mt-1 text-xs text-gray-500">
                You can select existing players, add new invitees below, or use both.
              </p>
            )}
          </div>
        )}

        {(Number(resolvedForm.lessontype_id) === 1 ||
          Number(resolvedForm.lessontype_id) === 2 ||
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
