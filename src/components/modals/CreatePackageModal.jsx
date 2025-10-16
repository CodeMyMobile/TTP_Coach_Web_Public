import React from 'react';
import Modal, { ModalBody, ModalFooter, ModalHeader } from './Modal';

const CreatePackageModal = ({ isOpen, onClose }) => {
  return (
    <Modal isOpen={isOpen} onClose={onClose} panelClassName="max-w-md">
      <ModalHeader title="Create Lesson Package" onClose={onClose} />
      <ModalBody className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Package Name *</label>
          <input
            type="text"
            placeholder="e.g., 10 Lesson Bundle"
            className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
          <textarea
            placeholder="Brief description of the package..."
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
              className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Total Price ($) *</label>
            <input
              type="number"
              min="0"
              placeholder="850"
              className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500"
            />
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Validity Period *</label>
          <select className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500">
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
            <label className="flex items-center">
              <input type="checkbox" className="rounded text-purple-600" defaultChecked />
              <span className="ml-2 text-sm">Private Lessons</span>
            </label>
            <label className="flex items-center">
              <input type="checkbox" className="rounded text-purple-600" />
              <span className="ml-2 text-sm">Semi-Private Lessons</span>
            </label>
            <label className="flex items-center">
              <input type="checkbox" className="rounded text-purple-600" />
              <span className="ml-2 text-sm">Group Classes</span>
            </label>
          </div>
        </div>
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
          className="flex-1 rounded-lg bg-purple-600 px-4 py-2 text-white transition hover:bg-purple-700 sm:flex-none"
        >
          Create Package
        </button>
      </ModalFooter>
    </Modal>
  );
};

export default CreatePackageModal;
