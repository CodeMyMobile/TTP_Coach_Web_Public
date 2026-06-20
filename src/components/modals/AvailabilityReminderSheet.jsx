import React from 'react';
import { CalendarCheck } from 'lucide-react';
import { Modal, ModalHeader, ModalBody } from './Modal';

const DAY_BY_ABBR = {
  mon: ['Mon', 0],
  tue: ['Tue', 1],
  wed: ['Wed', 2],
  thu: ['Thu', 3],
  fri: ['Fri', 4],
  sat: ['Sat', 5],
  sun: ['Sun', 6]
};

// Compact, scannable per-day summary from availability.weekly
// ({ [DayName]: ['7:00 - 9:00', ...] }). Returns [] when there's nothing to show.
const formatWeeklySummary = (weekly) => {
  if (!weekly || typeof weekly !== 'object') {
    return [];
  }
  return Object.entries(weekly)
    .filter(([, slots]) => Array.isArray(slots) && slots.length > 0)
    .map(([day, slots]) => {
      const meta = DAY_BY_ABBR[String(day).trim().toLowerCase().slice(0, 3)];
      return {
        label: meta ? meta[0] : day,
        order: meta ? meta[1] : 99,
        slots: slots.map((slot) => String(slot).replace(/\s*-\s*/, '–'))
      };
    })
    .sort((a, b) => a.order - b.order);
};

const AvailabilityReminderSheet = ({ isOpen, availability, onLooksGood, onUpdate, onClose }) => {
  const summary = formatWeeklySummary(availability?.weekly);

  return (
    <Modal isOpen={isOpen} onClose={onClose} placement="bottom" panelClassName="sm:max-w-md">
      <ModalHeader
        title="Booking confirmed"
        description="Quick check — is your availability still right?"
        onClose={onClose}
      />
      <ModalBody className="space-y-4">
        <div className="flex items-start gap-3 rounded-xl border border-gray-200 bg-gray-50 p-3">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-purple-50 text-purple-600">
            <CalendarCheck className="h-5 w-5" />
          </span>
          {summary.length > 0 ? (
            <div className="min-w-0 space-y-1 text-sm">
              {summary.map((row) => (
                <div key={row.label} className="flex gap-2">
                  <span className="w-9 shrink-0 font-semibold text-gray-900">{row.label}</span>
                  <span className="text-gray-600">{row.slots.join(', ')}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-gray-600">Your availability — still right?</p>
          )}
        </div>

        <div className="space-y-2">
          <button
            type="button"
            onClick={onLooksGood}
            className="w-full rounded-lg bg-purple-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-purple-700"
          >
            Looks good
          </button>
          <button
            type="button"
            onClick={onUpdate}
            className="w-full rounded-lg border border-gray-200 px-4 py-2.5 text-sm font-semibold text-gray-700 transition hover:bg-gray-50"
          >
            Update availability
          </button>
          <button
            type="button"
            onClick={onClose}
            className="w-full py-2 text-sm font-medium text-gray-500 transition hover:text-gray-700"
          >
            Not now
          </button>
        </div>
      </ModalBody>
    </Modal>
  );
};

export default AvailabilityReminderSheet;
