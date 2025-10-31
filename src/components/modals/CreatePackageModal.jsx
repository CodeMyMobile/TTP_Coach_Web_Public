import React, { useEffect, useMemo, useState } from 'react';
import { apiRequest } from '../../api/apiRequest';
import Modal, { ModalBody, ModalFooter, ModalHeader } from './Modal';

const LESSON_TYPE_OPTIONS = [
  { id: 'private', label: 'Private Lessons' },
  { id: 'semi_private', label: 'Semi-Private Lessons' },
  { id: 'group', label: 'Group Classes' }
];

const buildInitialFormState = () => ({
  name: '',
  description: '',
  lessonCount: '',
  totalPrice: '',
  validityMonths: '',
  lessonTypesAllowed: ['private']
});

const CreatePackageModal = ({ isOpen, onClose, onCreated = () => {} }) => {
  const [formValues, setFormValues] = useState(buildInitialFormState);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  const lessonTypesSelected = useMemo(() => new Set(formValues.lessonTypesAllowed), [formValues.lessonTypesAllowed]);

  const resetForm = () => {
    setFormValues(buildInitialFormState());
    setError('');
  };

  useEffect(() => {
    if (isOpen) {
      resetForm();
    }
  }, [isOpen]);

  const handleInputChange = (field) => (event) => {
    const { value } = event.target;
    setFormValues((previous) => ({
      ...previous,
      [field]: value
    }));
  };

  const toggleLessonType = (type) => {
    setFormValues((previous) => {
      const nextSelection = new Set(previous.lessonTypesAllowed);

      if (nextSelection.has(type)) {
        nextSelection.delete(type);
      } else {
        nextSelection.add(type);
      }

      return {
        ...previous,
        lessonTypesAllowed: Array.from(nextSelection)
      };
    });
  };

  const isValid = useMemo(() => {
    const lessonCount = Number(formValues.lessonCount);
    const totalPrice = Number(formValues.totalPrice);

    if (!formValues.name.trim()) {
      return false;
    }

    if (!Number.isFinite(lessonCount) || lessonCount <= 0) {
      return false;
    }

    if (!Number.isFinite(totalPrice) || totalPrice < 0) {
      return false;
    }

    if (!formValues.validityMonths) {
      return false;
    }

    return true;
  }, [formValues]);

  const handleSubmit = async () => {
    if (isSubmitting || !isValid) {
      return;
    }

    setIsSubmitting(true);
    setError('');

    const payload = {
      name: formValues.name.trim(),
      description: formValues.description.trim(),
      lessonCount: Number(formValues.lessonCount),
      totalPrice: Number(formValues.totalPrice),
      validityMonths:
        formValues.validityMonths === '0' ? null : Number(formValues.validityMonths),
      lessonTypesAllowed: formValues.lessonTypesAllowed
    };

    try {
      const response = await apiRequest('/coach/packages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!response) {
        setError('Your session has expired. Please sign in again.');
        return;
      }

      if (!response.ok) {
        let message = 'Failed to create package. Please try again.';

        try {
          const errorBody = await response.json();
          message =
            errorBody?.message ||
            errorBody?.error ||
            errorBody?.errors?.[0] ||
            message;
        } catch (parseError) {
          // Ignore JSON parse errors and keep the default message.
        }

        setError(message);
        return;
      }

      const createdPackage = await response.json().catch(() => null);
      onCreated(createdPackage);
      resetForm();
      onClose();
    } catch (requestError) {
      setError('An unexpected error occurred. Please try again.');
      console.error('Failed to create package', requestError);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} panelClassName="max-w-md">
      <ModalHeader title="Create Lesson Package" onClose={onClose} />
      <ModalBody className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Package Name *</label>
          <input
            type="text"
            placeholder="e.g., 10 Lesson Bundle"
            value={formValues.name}
            onChange={handleInputChange('name')}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
          <textarea
            placeholder="Brief description of the package..."
            value={formValues.description}
            onChange={handleInputChange('description')}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500 h-20"
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Number of Lessons *</label>
            <input
              type="number"
              min="1"
              placeholder="10"
              value={formValues.lessonCount}
              onChange={handleInputChange('lessonCount')}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Total Price ($) *</label>
            <input
              type="number"
              min="0"
              placeholder="850"
              value={formValues.totalPrice}
              onChange={handleInputChange('totalPrice')}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500"
            />
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Validity Period *</label>
          <select
            value={formValues.validityMonths}
            onChange={handleInputChange('validityMonths')}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500"
          >
            <option value="">Select validity</option>
            <option value="1">1 month</option>
            <option value="3">3 months</option>
            <option value="6">6 months</option>
            <option value="12">12 months</option>
            <option value="0">No expiration</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Lesson Types Allowed</label>
          <div className="space-y-2">
            {LESSON_TYPE_OPTIONS.map(({ id, label }) => (
              <label key={id} className="flex items-center">
                <input
                  type="checkbox"
                  className="rounded text-purple-600"
                  checked={lessonTypesSelected.has(id)}
                  onChange={() => toggleLessonType(id)}
                />
                <span className="ml-2 text-sm">{label}</span>
              </label>
            ))}
          </div>
        </div>
        {error && (
          <div className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">
            {error}
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
          onClick={handleSubmit}
          disabled={!isValid || isSubmitting}
          className={`flex-1 rounded-lg px-4 py-2 text-white transition sm:flex-none ${
            isValid && !isSubmitting
              ? 'bg-purple-600 hover:bg-purple-700'
              : 'cursor-not-allowed bg-purple-300'
          }`}
        >
          {isSubmitting ? 'Creating…' : 'Create Package'}
        </button>
      </ModalFooter>
    </Modal>
  );
};

export default CreatePackageModal;
