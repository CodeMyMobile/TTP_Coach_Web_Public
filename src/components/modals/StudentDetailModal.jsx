import React from 'react';
import moment from 'moment';
import Modal, { ModalBody, ModalHeader } from './Modal';

const resolveStatusLabel = (status) => {
  if (status === 1 || status === 'CONFIRMED') {
    return 'Confirmed';
  }
  if (status === 2 || status === 'CANCELLED') {
    return 'Cancelled';
  }
  if (status === 0 || status === 'PENDING') {
    return 'Pending';
  }
  return 'Unknown';
};

const formatLessonRange = (startValue, endValue) => {
  if (!startValue) {
    return '';
  }

  const startRaw = String(startValue).replace(/Z$/, '');
  const endRaw = endValue ? String(endValue).replace(/Z$/, '') : null;
  const start = moment(startRaw);
  const end = endRaw ? moment(endRaw) : null;

  if (!start.isValid()) {
    return '';
  }

  if (end && end.isValid()) {
    return `${start.format('MMM DD, YYYY')} · ${start.format('h:mm A')} - ${end.format('h:mm A')}`;
  }

  return `${start.format('MMM DD, YYYY')} · ${start.format('h:mm A')}`;
};

const StudentDetailModal = ({
  isOpen,
  student,
  lessons = [],
  loading = false,
  loadingMore = false,
  error = null,
  hasMore = false,
  onClose,
  onLoadMore
}) => {
  if (!student) {
    return null;
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} placement="center" panelClassName="w-full sm:max-w-3xl">
      <ModalHeader
        title={student.name || 'Student details'}
        description={student.email || student.phone || ''}
        onClose={onClose}
      />
      <ModalBody className="space-y-4">
        <div className="rounded-lg bg-gray-50 p-4">
          <div className="flex flex-wrap gap-6 text-sm text-gray-600">
            <div>
              <span className="block text-xs uppercase text-gray-400">Status</span>
              <span className="font-medium text-gray-900">
                {student.isConfirmed ? 'Active' : student.isPlayerRequest ? 'Request pending' : 'Invite pending'}
              </span>
            </div>
            <div>
              <span className="block text-xs uppercase text-gray-400">Phone</span>
              <span className="font-medium text-gray-900">{student.phone || '—'}</span>
            </div>
            <div>
              <span className="block text-xs uppercase text-gray-400">Player ID</span>
              <span className="font-medium text-gray-900">{student.playerId || '—'}</span>
            </div>
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-gray-900">Previous Lessons</h3>
            {loading && <span className="text-xs text-gray-500">Loading...</span>}
          </div>

          {error && (
            <div className="mt-3 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          )}

          {!loading && lessons.length === 0 && !error && (
            <div className="mt-3 rounded-lg border border-dashed border-gray-200 bg-white px-4 py-6 text-sm text-gray-500">
              No previous lessons found.
            </div>
          )}

          {lessons.length > 0 && (
            <div className="mt-3 space-y-3">
              {lessons.map((lesson, index) => (
                <div key={lesson.id ?? `${lesson.start_date_time}-${index}`} className="rounded-lg border border-gray-200 bg-white p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-gray-900">
                        {lesson.metadata?.title || lesson.lesson_type_name || 'Lesson'}
                      </p>
                      <p className="text-xs text-gray-500">
                        {formatLessonRange(lesson.start_date_time, lesson.end_date_time)}
                      </p>
                      {lesson.location && (
                        <p className="mt-1 text-xs text-gray-500">{lesson.location}</p>
                      )}
                    </div>
                    <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-600">
                      {resolveStatusLabel(lesson.status)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}

          {hasMore && (
            <div className="mt-4 flex justify-center">
              <button
                type="button"
                onClick={onLoadMore}
                disabled={loadingMore}
                className="rounded-lg border border-gray-200 px-4 py-2 text-sm text-gray-600 hover:bg-gray-50 disabled:cursor-not-allowed"
              >
                {loadingMore ? 'Loading...' : 'Load more'}
              </button>
            </div>
          )}
        </div>
      </ModalBody>
    </Modal>
  );
};

export default StudentDetailModal;
