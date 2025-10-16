import React from 'react';
import {
  AlertCircle,
  Check,
  Repeat,
  Send,
  X
} from 'lucide-react';
import Modal, { ModalBody, ModalFooter, ModalHeader } from './Modal';

const LessonDetailModal = ({
  isOpen,
  lesson,
  onClose,
  isEditing,
  onStartEdit,
  onCancelEdit,
  onSaveEdit,
  editData,
  onEditChange,
  mutationLoading = false,
  onCancelLesson,
  students = [],
  coachCourts = [],
  formatDuration,
  onAcceptRequest,
  onDeclineRequest
}) => {
  if (!lesson) {
    return null;
  }

  const title =
    lesson.type === 'group'
      ? 'Group Class Details'
      : lesson.type === 'available'
        ? 'Available Slot'
        : 'Lesson Details';

  const handleFieldChange = (field, value) => {
    onEditChange({ ...editData, [field]: value });
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={() => {
        onClose();
        onCancelEdit?.();
      }}
      placement="bottom"
      panelClassName="w-full sm:max-w-2xl"
    >
      <ModalHeader title={title} onClose={onClose} />
      <ModalBody className="space-y-4">
        {!isEditing ? (
          <>
            {lesson.lessonStatus === 'pending' && (
              <div className="rounded-lg border-l-4 border-yellow-400 bg-yellow-50 p-4">
                <div className="flex items-start gap-3">
                  <AlertCircle className="h-5 w-5 text-yellow-600" />
                  <div className="space-y-2 text-sm">
                    <div className="font-semibold text-yellow-800">Pending Approval</div>
                    <p className="text-yellow-700">
                      This lesson request requires your approval.
                    </p>
                    {lesson.requestedAt && (
                      <p className="text-xs text-yellow-600">Requested: {lesson.requestedAt}</p>
                    )}
                    {lesson.message && (
                      <div className="rounded border border-yellow-200 bg-white p-3 text-xs text-gray-700">
                        <p className="mb-1 text-gray-500">Message from student:</p>
                        <p className="italic">“{lesson.message}”</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {lesson.type === 'available' && (
              <>
                <div className="rounded-lg bg-purple-50 p-4">
                  <h4 className="font-medium text-gray-900">Available Time Slot</h4>
                  <div className="mt-3 grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
                    <div>
                      <span className="text-gray-500">Date:</span>
                      <span className="ml-2 font-medium">{lesson.date}</span>
                    </div>
                    <div>
                      <span className="text-gray-500">Time:</span>
                      <span className="ml-2 font-medium">{lesson.time}</span>
                    </div>
                    <div>
                      <span className="text-gray-500">Duration:</span>
                      <span className="ml-2 font-medium">{formatDuration?.(lesson.duration) ?? lesson.duration}</span>
                    </div>
                    <div>
                      <span className="text-gray-500">Location:</span>
                      <span className="ml-2 font-medium">{lesson.location}</span>
                    </div>
                  </div>
                </div>

                <div className="rounded-lg bg-blue-50 p-4">
                  <h4 className="font-medium text-gray-900">Invite Student</h4>
                  <div className="mt-3 space-y-3 text-sm">
                    <div>
                      <label className="mb-1 block font-medium text-gray-700">
                        Select Existing Student
                      </label>
                      <select className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500">
                        <option value="">Choose a student…</option>
                        {students.map((student) => (
                          <option key={student.email} value={student.email}>
                            {student.name} – {student.level}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="relative">
                      <div className="absolute inset-0 flex items-center">
                        <div className="w-full border-t border-gray-300" />
                      </div>
                      <div className="relative flex justify-center text-xs">
                        <span className="bg-blue-50 px-2 text-gray-500">OR</span>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label className="block font-medium text-gray-700">
                        Invite New Student by Email
                      </label>
                      <div className="flex flex-col gap-2 sm:flex-row">
                        <input
                          type="email"
                          placeholder="student@email.com"
                          className="flex-1 rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500"
                        />
                        <button className="flex items-center justify-center gap-2 rounded-lg bg-purple-600 px-4 py-2 text-white transition hover:bg-purple-700">
                          <Send className="h-4 w-4" />
                          <span>Send Invite</span>
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </>
            )}

            {lesson.type === 'group' && (
              <>
                <div className="rounded-lg bg-gray-50 p-4">
                  <h4 className="font-medium text-gray-900">Class Information</h4>
                  <p className="mt-3 text-sm font-medium">{lesson.title}</p>
                  <p className="text-sm text-gray-600">{lesson.description}</p>
                  <div className="mt-4 grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
                    <div>
                      <span className="text-gray-500">Date:</span>
                      <span className="ml-2 font-medium">{lesson.date}</span>
                    </div>
                    <div>
                      <span className="text-gray-500">Time:</span>
                      <span className="ml-2 font-medium">{lesson.time}</span>
                    </div>
                    <div>
                      <span className="text-gray-500">Duration:</span>
                      <span className="ml-2 font-medium">{formatDuration?.(lesson.duration) ?? lesson.duration}</span>
                    </div>
                    <div>
                      <span className="text-gray-500">Max Students:</span>
                      <span className="ml-2 font-medium">{lesson.maxStudents}</span>
                    </div>
                  </div>
                </div>
                {lesson.attendees && lesson.attendees.length > 0 && (
                  <div className="rounded-lg bg-white p-4 shadow-sm">
                    <h4 className="font-medium text-gray-900">Registered Students</h4>
                    <ul className="mt-3 space-y-2 text-sm">
                      {lesson.attendees.map((attendee) => (
                        <li key={attendee.email} className="flex items-center justify-between rounded border border-gray-200 bg-gray-50 px-3 py-2">
                          <div>
                            <p className="font-medium text-gray-900">{attendee.name}</p>
                            <p className="text-xs text-gray-500">{attendee.email}</p>
                          </div>
                          <span className="rounded-full bg-green-100 px-3 py-1 text-xs font-medium text-green-700">
                            {attendee.status}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </>
            )}

            {lesson.type !== 'group' && lesson.type !== 'available' && (
              <>
                <div className="rounded-lg bg-gray-50 p-4">
                  <h4 className="font-medium text-gray-900">Lesson Information</h4>
                  <div className="mt-3 grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
                    <div>
                      <span className="text-gray-500">Type:</span>
                      <span className="ml-2 font-medium capitalize">{lesson.type}</span>
                    </div>
                    <div>
                      <span className="text-gray-500">Date:</span>
                      <span className="ml-2 font-medium">{lesson.date}</span>
                    </div>
                    <div>
                      <span className="text-gray-500">Time:</span>
                      <span className="ml-2 font-medium">{lesson.time}</span>
                    </div>
                    <div>
                      <span className="text-gray-500">Duration:</span>
                      <span className="ml-2 font-medium">{formatDuration?.(lesson.duration) ?? lesson.duration}</span>
                    </div>
                  </div>
                </div>

                <div className="rounded-lg bg-blue-50 p-4">
                  <h4 className="font-medium text-gray-900">Student Information</h4>
                  <div className="mt-3 space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-500">Student:</span>
                      <span className="font-medium">{lesson.student}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Level:</span>
                      <span className="font-medium">{lesson.level}</span>
                    </div>
                    {lesson.package && (
                      <div className="rounded border border-purple-200 bg-purple-50 p-3 text-xs text-purple-700">
                        Package: {lesson.package}
                      </div>
                    )}
                  </div>
                </div>

                <div className="rounded-lg bg-white p-4 shadow-sm">
                  <h4 className="font-medium text-gray-900">Payment Summary</h4>
                  <div className="mt-3 space-y-3 text-sm">
                    {lesson.package ? (
                      <>
                        <div className="rounded border border-green-200 bg-white p-3">
                          <div className="flex items-center justify-between">
                            <span className="text-sm font-medium text-gray-700">Package Applied</span>
                            <span className="rounded-full bg-green-100 px-2 py-1 text-xs font-medium text-green-700">
                              Prepaid
                            </span>
                          </div>
                          <div className="mt-2 text-sm">
                            {lesson.package}
                          </div>
                        </div>
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-gray-500">Payment Status:</span>
                          <span className="rounded-full bg-green-100 px-3 py-1 text-xs font-medium text-green-700">
                            ✓ Paid via Package
                          </span>
                        </div>
                      </>
                    ) : (
                      <>
                        <div className="rounded border border-green-200 bg-white p-3">
                          <div className="flex items-center justify-between">
                            <span className="text-sm font-medium text-gray-700">Payment Method</span>
                            <span className="rounded-full bg-blue-100 px-2 py-1 text-xs font-medium text-blue-700">
                              Pay Per Lesson
                            </span>
                          </div>
                          <div className="mt-2 space-y-2 text-sm">
                            <div className="flex justify-between">
                              <span className="text-gray-500">Rate:</span>
                              <span className="font-medium">${lesson.rate}/hour</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-500">Total Due:</span>
                              <span className="text-lg font-bold text-gray-900">${lesson.price}</span>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-gray-500">Payment Status:</span>
                          {lesson.paymentStatus === 'paid' ? (
                            <span className="rounded-full bg-green-100 px-3 py-1 text-xs font-medium text-green-700">✓ Paid</span>
                          ) : (
                            <div className="flex items-center gap-2">
                              <span className="rounded-full bg-yellow-100 px-3 py-1 text-xs font-medium text-yellow-700">
                                Pending Payment
                              </span>
                              <button className="rounded-full bg-purple-600 px-3 py-1 text-xs font-medium text-white transition hover:bg-purple-700">
                                Send Reminder
                              </button>
                            </div>
                          )}
                        </div>
                        {lesson.paymentStatus === 'pending' && (
                          <div className="flex items-center gap-2 rounded bg-yellow-50 p-3 text-xs text-yellow-700">
                            <AlertCircle className="h-4 w-4" />
                            Payment will be collected after lesson completion.
                          </div>
                        )}
                      </>
                    )}
                  </div>
                </div>
              </>
            )}

            <div className="rounded-lg bg-green-50 p-4">
              <h4 className="font-medium text-gray-900">Location</h4>
              <div className="mt-2 text-sm">
                <p className="font-medium">{lesson.location}</p>
                <p className="text-gray-600">{lesson.court}</p>
              </div>
            </div>

            {lesson.recurring && (
              <div className="flex items-center gap-2 rounded-lg bg-yellow-50 p-3 text-sm text-yellow-800">
                <Repeat className="h-4 w-4" />
                This is a recurring lesson.
              </div>
            )}
          </>
        ) : (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Time</label>
              <input
                type="time"
                value={editData.time}
                onChange={(event) => handleFieldChange('time', event.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Location</label>
              <select
                value={editData.location}
                onChange={(event) => handleFieldChange('location', event.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500"
              >
                {coachCourts.map((court) => (
                  <option key={court} value={court}>
                    {court}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Court</label>
              <input
                type="text"
                value={editData.court}
                onChange={(event) => handleFieldChange('court', event.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
            </div>
          </div>
        )}
      </ModalBody>
      <ModalFooter>
        {!isEditing ? (
          lesson.lessonStatus === 'pending' ? (
            <>
              <button
                type="button"
                onClick={onDeclineRequest}
                className="flex-1 rounded-lg bg-red-50 px-4 py-2 text-red-600 transition hover:bg-red-100 sm:flex-none"
              >
                <div className="flex items-center justify-center gap-2">
                  <X className="h-4 w-4" />
                  Decline Request
                </div>
              </button>
              <button
                type="button"
                onClick={onAcceptRequest}
                className="flex-1 rounded-lg bg-green-600 px-4 py-2 text-white transition hover:bg-green-700 sm:flex-none"
              >
                <div className="flex items-center justify-center gap-2">
                  <Check className="h-4 w-4" />
                  Accept Request
                </div>
              </button>
            </>
          ) : (
            <>
              {lesson.type !== 'available' && (
                <button
                  type="button"
                  onClick={onCancelLesson}
                  className="flex-1 rounded-lg bg-red-50 px-4 py-2 text-red-600 transition hover:bg-red-100 sm:flex-none"
                >
                  Cancel Lesson
                </button>
              )}
              <button
                type="button"
                onClick={onStartEdit}
                className="flex-1 rounded-lg bg-purple-600 px-4 py-2 text-white transition hover:bg-purple-700 sm:flex-none"
              >
                {lesson.type === 'available' ? 'Edit Availability' : 'Edit Lesson'}
              </button>
            </>
          )
        ) : (
          <>
            <button
              type="button"
              onClick={onCancelEdit}
              className="flex-1 rounded-lg bg-gray-100 px-4 py-2 text-gray-700 transition hover:bg-gray-200 sm:flex-none"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={onSaveEdit}
              disabled={mutationLoading}
              className={`flex-1 rounded-lg px-4 py-2 text-white transition sm:flex-none ${
                mutationLoading ? 'cursor-wait bg-purple-300' : 'bg-purple-600 hover:bg-purple-700'
              }`}
            >
              {mutationLoading ? 'Saving…' : 'Save Changes'}
            </button>
          </>
        )}
      </ModalFooter>
    </Modal>
  );
};

export default LessonDetailModal;
