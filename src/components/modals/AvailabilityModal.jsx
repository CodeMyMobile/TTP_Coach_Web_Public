import React from 'react';
import Modal, { ModalBody, ModalFooter, ModalHeader } from './Modal';

const AvailabilityModal = ({
  isOpen,
  slot,
  onChange,
  onClose,
  onSubmit,
  isSubmitting = false,
  locations = []
}) => {
  const handleFieldChange = (field, value) => {
    onChange({ ...slot, [field]: value });
  };

  const isValid = slot.date && slot.start && slot.end && slot.location;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      placement="bottom"
      panelClassName="w-full sm:max-w-md"
    >
      <ModalHeader title="Add Availability" onClose={onClose} />
      <ModalBody className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
          <input
            type="date"
            value={slot.date}
            onChange={(event) => handleFieldChange('date', event.target.value)}
            className="w-full rounded-lg border border-gray-300 px-3 py-3 focus:outline-none focus:ring-2 focus:ring-purple-500"
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Start</label>
            <input
              type="time"
              value={slot.start}
              onChange={(event) => handleFieldChange('start', event.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-3 focus:outline-none focus:ring-2 focus:ring-purple-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">End</label>
            <input
              type="time"
              value={slot.end}
              onChange={(event) => handleFieldChange('end', event.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-3 focus:outline-none focus:ring-2 focus:ring-purple-500"
            />
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Location</label>
          <select
            value={slot.location}
            onChange={(event) => handleFieldChange('location', event.target.value)}
            className="w-full rounded-lg border border-gray-300 px-3 py-3 focus:outline-none focus:ring-2 focus:ring-purple-500"
          >
            <option value="">Select location</option>
            {locations.map((location) => (
              <option key={location} value={location}>
                {location}
              </option>
            ))}
          </select>
        </div>
      </ModalBody>
      <ModalFooter>
        <button
          type="button"
          onClick={onClose}
          className="flex-1 rounded-lg bg-gray-100 px-4 py-3 text-gray-700 transition hover:bg-gray-200 sm:flex-none"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={onSubmit}
          disabled={!isValid || isSubmitting}
          className={`flex-1 rounded-lg px-4 py-3 text-white transition sm:flex-none ${
            isValid && !isSubmitting
              ? 'bg-purple-600 hover:bg-purple-700'
              : 'cursor-not-allowed bg-purple-300'
          }`}
        >
          {isSubmitting ? 'Saving…' : 'Save Availability'}
        </button>
      </ModalFooter>
    </Modal>
  );
};

export default AvailabilityModal;
