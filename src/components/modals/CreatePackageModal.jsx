import React, { useEffect, useMemo, useState } from 'react';
import {
  createCoachPackage,
  updateCoachPackage
} from '../../api/CoachApi/packages';
import Modal, { ModalBody, ModalFooter, ModalHeader } from './Modal';

const LESSON_TYPE_OPTIONS = [
  { id: 'private', label: 'Private Lessons' },
  { id: 'semi_private', label: 'Semi-Private Lessons' },
  { id: 'group', label: 'Group Classes' }
];

const resolvePackageFromPayload = (payload) => {
  if (!payload || typeof payload !== 'object') {
    return null;
  }

  return payload.package || payload.data?.package || payload.data || payload.result || payload.item || payload;
};

const getApiErrorMessage = (errorBody, fallbackMessage) =>
  errorBody?.message ||
  errorBody?.error ||
  errorBody?.errors?.[0] ||
  fallbackMessage;

const buildInitialFormState = (lessonPackage) => ({
  name: lessonPackage?.name || '',
  description: lessonPackage?.description || '',
  lessonCount:
    lessonPackage?.lessonCount === null || lessonPackage?.lessonCount === undefined
      ? ''
      : String(lessonPackage.lessonCount),
  totalPrice:
    lessonPackage?.totalPrice === null || lessonPackage?.totalPrice === undefined
      ? ''
      : String(lessonPackage.totalPrice),
  validityMonths:
    lessonPackage?.validityMonths === null
      ? '0'
      : lessonPackage?.validityMonths === undefined
      ? ''
      : String(lessonPackage.validityMonths),
  lessonTypesAllowed:
    Array.isArray(lessonPackage?.lessonTypes) && lessonPackage.lessonTypes.length > 0
      ? lessonPackage.lessonTypes
      : ['private'],
  isActive: lessonPackage?.isActive ?? true
});

const CreatePackageModal = ({
  isOpen,
  onClose,
  onCreated = () => {},
  onUpdated = () => {},
  packageToEdit = null
}) => {
  const isEditMode = Boolean(packageToEdit?.id);
  const isLockedAfterPurchase = Boolean(packageToEdit?.hasPurchaseHistory);
  const [formValues, setFormValues] = useState(buildInitialFormState(packageToEdit));
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  const lessonTypesSelected = useMemo(
    () => new Set(formValues.lessonTypesAllowed),
    [formValues.lessonTypesAllowed]
  );

  useEffect(() => {
    if (isOpen) {
      setFormValues(buildInitialFormState(packageToEdit));
      setError('');
    }
  }, [isOpen, packageToEdit]);

  const handleInputChange = (field) => (event) => {
    const { value } = event.target;
    setFormValues((previous) => ({
      ...previous,
      [field]: value
    }));
  };

  const toggleLessonType = (type) => {
    if (isLockedAfterPurchase) {
      return;
    }

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

    if (formValues.lessonTypesAllowed.length === 0) {
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
      lessonTypesAllowed: formValues.lessonTypesAllowed,
      isActive: Boolean(formValues.isActive)
    };

    const requestPayload = isLockedAfterPurchase
      ? { isActive: payload.isActive }
      : payload;

    try {
      const response = isEditMode
        ? await updateCoachPackage(packageToEdit.id, requestPayload)
        : await createCoachPackage(payload);

      if (!response) {
        setError('Your session has expired. Please sign in again.');
        return;
      }

      if (!response.ok) {
        let message = isEditMode
          ? 'Failed to update package. Please try again.'
          : 'Failed to create package. Please try again.';

        try {
          const errorBody = await response.json();
          message = getApiErrorMessage(errorBody, message);
        } catch {
          // Ignore JSON parse errors and keep the default message.
        }

        setError(message);
        return;
      }

      const responseBody = await response.json().catch(() => null);
      const resolvedPackage = resolvePackageFromPayload(responseBody);

      if (isEditMode) {
        onUpdated(resolvedPackage, packageToEdit.id, requestPayload);
      } else {
        onCreated(resolvedPackage);
      }

      onClose();
    } catch (requestError) {
      setError('An unexpected error occurred. Please try again.');
      console.error('Failed to submit package', requestError);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} panelClassName="max-w-md">
      <ModalHeader
        title={isEditMode ? 'Edit Lesson Package' : 'Create Lesson Package'}
        description={
          isLockedAfterPurchase
            ? 'This package has purchase history. Only archive or restore is allowed.'
            : undefined
        }
        onClose={onClose}
      />
      <ModalBody className="space-y-4">
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">Package Name *</label>
          <input
            type="text"
            placeholder="e.g., 10 Lesson Bundle"
            value={formValues.name}
            onChange={handleInputChange('name')}
            disabled={isLockedAfterPurchase}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500 disabled:cursor-not-allowed disabled:bg-gray-100"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">Description</label>
          <textarea
            placeholder="Brief description of the package..."
            value={formValues.description}
            onChange={handleInputChange('description')}
            disabled={isLockedAfterPurchase}
            className="h-20 w-full rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500 disabled:cursor-not-allowed disabled:bg-gray-100"
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Number of Lessons *</label>
            <input
              type="number"
              min="1"
              placeholder="10"
              value={formValues.lessonCount}
              onChange={handleInputChange('lessonCount')}
              disabled={isLockedAfterPurchase}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500 disabled:cursor-not-allowed disabled:bg-gray-100"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Total Price ($) *</label>
            <input
              type="number"
              min="0"
              placeholder="850"
              value={formValues.totalPrice}
              onChange={handleInputChange('totalPrice')}
              disabled={isLockedAfterPurchase}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500 disabled:cursor-not-allowed disabled:bg-gray-100"
            />
          </div>
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">Validity Period *</label>
          <select
            value={formValues.validityMonths}
            onChange={handleInputChange('validityMonths')}
            disabled={isLockedAfterPurchase}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500 disabled:cursor-not-allowed disabled:bg-gray-100"
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
          <label className="mb-1 block text-sm font-medium text-gray-700">Lesson Types Allowed</label>
          <div className="space-y-2">
            {LESSON_TYPE_OPTIONS.map(({ id, label }) => (
              <label key={id} className="flex items-center">
                <input
                  type="checkbox"
                  className="rounded text-purple-600"
                  checked={lessonTypesSelected.has(id)}
                  onChange={() => toggleLessonType(id)}
                  disabled={isLockedAfterPurchase}
                />
                <span className="ml-2 text-sm">{label}</span>
              </label>
            ))}
          </div>
        </div>
        {isEditMode && (
          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700">Status</label>
            <label className="flex items-center">
              <input
                type="checkbox"
                className="rounded text-purple-600"
                checked={Boolean(formValues.isActive)}
                onChange={(event) =>
                  setFormValues((previous) => ({
                    ...previous,
                    isActive: event.target.checked
                  }))
                }
              />
              <span className="ml-2 text-sm text-gray-700">Package is active</span>
            </label>
          </div>
        )}
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
          {isSubmitting
            ? isEditMode
              ? 'Saving...'
              : 'Creating...'
            : isEditMode
              ? 'Save Changes'
              : 'Create Package'}
        </button>
      </ModalFooter>
    </Modal>
  );
};

export default CreatePackageModal;
