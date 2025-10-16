import React from 'react';
import { AlertTriangle } from 'lucide-react';
import Modal, { ModalBody, ModalFooter, ModalHeader } from './Modal';

const ConfirmationDialog = ({
  isOpen,
  title,
  description,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  onConfirm,
  onCancel,
  tone = 'warning'
}) => {
  const toneStyles = {
    warning: {
      icon: 'text-yellow-500',
      button: 'bg-red-600 hover:bg-red-700'
    },
    danger: {
      icon: 'text-red-500',
      button: 'bg-red-600 hover:bg-red-700'
    },
    default: {
      icon: 'text-blue-500',
      button: 'bg-purple-600 hover:bg-purple-700'
    }
  };

  const resolvedTone = toneStyles[tone] ?? toneStyles.default;

  return (
    <Modal isOpen={isOpen} onClose={onCancel} panelClassName="max-w-md" placement="center">
      <ModalHeader onClose={onCancel}>
        <div className="flex items-center gap-2 text-gray-900">
          <AlertTriangle className={`h-5 w-5 ${resolvedTone.icon}`} />
          <span className="text-lg font-semibold">{title}</span>
        </div>
      </ModalHeader>
      <ModalBody>
        <p className="text-sm text-gray-600">{description}</p>
      </ModalBody>
      <ModalFooter>
        <button
          type="button"
          onClick={onCancel}
          className="flex-1 rounded-lg bg-gray-100 px-4 py-2 text-gray-700 transition hover:bg-gray-200 sm:flex-none"
        >
          {cancelLabel}
        </button>
        <button
          type="button"
          onClick={onConfirm}
          className={`flex-1 rounded-lg px-4 py-2 text-white transition sm:flex-none ${resolvedTone.button}`}
        >
          {confirmLabel}
        </button>
      </ModalFooter>
    </Modal>
  );
};

export default ConfirmationDialog;
