import React from 'react';
import { X } from 'lucide-react';

const cx = (...classes) => classes.filter(Boolean).join(' ');

const placementMap = {
  center: 'items-center',
  bottom: 'items-end sm:items-center'
};

export function Modal({
  isOpen,
  onClose,
  children,
  placement = 'center',
  overlayClassName = '',
  panelClassName = '',
  closeOnOverlay = true
}) {
  if (!isOpen) {
    return null;
  }

  const handleOverlayClick = (event) => {
    if (event.target === event.currentTarget && closeOnOverlay) {
      onClose?.();
    }
  };

  return (
    <div
      className={cx(
        'fixed inset-0 z-50 flex bg-black/50 p-4',
        placementMap[placement] ?? placementMap.center,
        overlayClassName
      )}
      onClick={handleOverlayClick}
    >
      <div
        className={cx(
          'w-full max-h-full overflow-y-auto rounded-lg bg-white shadow-xl',
          placement === 'bottom' ? 'rounded-t-xl sm:rounded-lg' : '',
          panelClassName
        )}
      >
        {children}
      </div>
    </div>
  );
}

export function ModalHeader({ title, description, onClose, className = '', children }) {
  return (
    <div className={cx('flex items-start justify-between gap-4 border-b border-gray-100 px-6 py-4', className)}>
      <div className="space-y-1">
        {title && <h3 className="text-lg font-semibold text-gray-900">{title}</h3>}
        {description && <p className="text-sm text-gray-500">{description}</p>}
        {children}
      </div>
      {onClose && (
        <button
          type="button"
          onClick={onClose}
          className="rounded-full p-2 text-gray-400 transition hover:text-gray-600"
        >
          <X className="h-5 w-5" />
        </button>
      )}
    </div>
  );
}

export function ModalBody({ className = '', children }) {
  return <div className={cx('px-6 py-4', className)}>{children}</div>;
}

export function ModalFooter({ className = '', children }) {
  return (
    <div className={cx('flex flex-col-reverse gap-3 border-t border-gray-100 px-6 py-4 sm:flex-row sm:justify-end', className)}>
      {children}
    </div>
  );
}

export default Modal;
