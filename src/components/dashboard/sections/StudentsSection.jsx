import React from 'react';
import { Check, Filter, MoreVertical, RefreshCw, Search, UserPlus } from 'lucide-react';

const StudentsSection = ({
  studentSearchQuery,
  onStudentSearchQueryChange,
  studentsLoading,
  studentsError,
  onRefreshStudents,
  activePackagesLoading,
  activePackagesError,
  filteredStudents,
  activePackagesByPlayer,
  rosterAction,
  onRosterUpdate,
  onStudentSelect,
  studentsHasMore,
  studentsLoadingMore,
  onLoadMoreStudents
}) => (
  <section className="mt-6 space-y-6">
    <div className="rounded-2xl bg-white p-4 shadow-sm">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">Student Directory</h2>
          <p className="text-sm text-gray-500">Manage students, packages, and communications</p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row">
          <div className="relative">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
            <input
              type="search"
              value={studentSearchQuery}
              onChange={(event) => onStudentSearchQueryChange(event.target.value)}
              className="w-full rounded-lg border border-gray-200 px-10 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
              placeholder="Search students..."
            />
          </div>
          <button className="flex items-center justify-center space-x-2 rounded-lg border border-gray-200 px-4 py-2 text-sm text-gray-600 hover:bg-gray-50">
            <Filter className="h-4 w-4" />
            <span>Filters</span>
          </button>
          <button className="flex items-center justify-center space-x-2 rounded-lg bg-purple-600 px-4 py-2 text-sm font-medium text-white hover:bg-purple-700">
            <UserPlus className="h-4 w-4" />
            <span>Add Student</span>
          </button>
        </div>
      </div>

      <div className="mt-6 space-y-4">
        {studentsLoading && (
          <div className="flex flex-col items-center justify-center space-y-2 py-10">
            <RefreshCw className="h-6 w-6 animate-spin text-purple-600" />
            <p className="text-sm text-gray-500">Loading students...</p>
          </div>
        )}

        {studentsError && (
          <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            <p className="font-medium">We couldn't load your students.</p>
            <button
              type="button"
              onClick={onRefreshStudents}
              className="mt-2 inline-flex items-center space-x-2 rounded-lg bg-red-600 px-3 py-2 text-xs font-medium text-white hover:bg-red-700"
            >
              <RefreshCw className="h-4 w-4" />
              <span>Try again</span>
            </button>
          </div>
        )}

        {activePackagesError && !studentsError && (
          <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-700">
            We couldn't load active packages for these students.
          </div>
        )}

        {activePackagesLoading && !studentsLoading && !studentsError && (
          <div className="rounded-lg border border-blue-100 bg-blue-50 p-4 text-sm text-blue-700">
            Loading active packages...
          </div>
        )}

        {!studentsLoading && !studentsError && filteredStudents.length === 0 && (
          <div className="rounded-lg border border-gray-200 bg-gray-50 p-6 text-center text-sm text-gray-500">
            No students found matching your search.
          </div>
        )}

        {filteredStudents.map((student) => {
          const activePackage = student.playerId ? activePackagesByPlayer[student.playerId] : null;

          return (
            <div
              key={student.id}
              role="button"
              tabIndex={0}
              onClick={() => onStudentSelect?.(student)}
              onKeyDown={(event) => {
                if (event.key === 'Enter' || event.key === ' ') {
                  event.preventDefault();
                  onStudentSelect?.(student);
                }
              }}
              className="cursor-pointer rounded-xl border border-gray-200 bg-white p-4 shadow-sm transition hover:border-purple-200 hover:shadow-md"
            >
              <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div className="flex items-center gap-3">
                  <div className="h-12 w-12 overflow-hidden rounded-full bg-gray-100">
                    {student.avatar ? (
                      <img
                        src={student.avatar}
                        alt={student.name || 'Student'}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-sm font-semibold text-gray-500">
                        {student.name ? student.name.slice(0, 1).toUpperCase() : '?'}
                      </div>
                    )}
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">{student.name || 'Unnamed student'}</h3>
                    <p className="text-sm text-gray-500">{student.email} • {student.phone}</p>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  {student.isConfirmed ? (
                    <span className="rounded-full bg-green-100 px-3 py-1 text-xs font-medium text-green-700">Active</span>
                  ) : student.isPlayerRequest ? (
                    <span className="rounded-full bg-yellow-100 px-3 py-1 text-xs font-medium text-yellow-700">
                      Request pending
                    </span>
                  ) : (
                    <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-600">
                      Invite pending
                    </span>
                  )}
                  <button
                    type="button"
                    onClick={(event) => event.stopPropagation()}
                    className="rounded-lg border border-gray-200 p-2 text-gray-500 hover:text-gray-700"
                  >
                    <MoreVertical className="h-4 w-4" />
                  </button>
                </div>
              </div>

              {!student.isConfirmed && student.isPlayerRequest && (
                <div className="mt-4 flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={(event) => {
                      event.stopPropagation();
                      onRosterUpdate(student.playerId, 'CONFIRMED');
                    }}
                    disabled={rosterAction?.playerId === student.playerId}
                    className="inline-flex items-center rounded-lg bg-green-600 px-3 py-2 text-xs font-semibold text-white transition hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-70"
                  >
                    <Check className="mr-2 h-4 w-4" />
                    Confirm
                  </button>
                  <button
                    type="button"
                    onClick={(event) => {
                      event.stopPropagation();
                      onRosterUpdate(student.playerId, 'CANCELLED');
                    }}
                    disabled={rosterAction?.playerId === student.playerId}
                    className="inline-flex items-center rounded-lg border border-gray-200 px-3 py-2 text-xs font-semibold text-gray-600 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-70"
                  >
                    Decline
                  </button>
                </div>
              )}

              <div className="mt-4 grid gap-4 md:grid-cols-2">
                <div className="rounded-lg bg-gray-50 p-3">
                  <p className="text-xs uppercase text-gray-500">Current Package</p>
                  <p className="mt-1 text-sm font-medium text-gray-900">
                    {activePackage?.packageName || 'No active package'}
                  </p>
                  <p className="text-xs text-gray-500">
                    Remaining lessons: {activePackage?.creditsRemaining ?? 'N/A'}
                  </p>
                </div>
                <div className="rounded-lg bg-gray-50 p-3">
                  <p className="text-xs uppercase text-gray-500">Next Lesson</p>
                  <p className="mt-1 text-sm font-medium text-gray-900">{student.nextLesson || 'Not scheduled'}</p>
                </div>
              </div>
            </div>
          );
        })}

        {!studentsLoading && !studentsError && studentsHasMore && (
          <div className="flex justify-center">
            <button
              type="button"
              onClick={onLoadMoreStudents}
              disabled={studentsLoadingMore}
              className="inline-flex items-center rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-70"
            >
              {studentsLoadingMore ? (
                <>
                  <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                  Loading more...
                </>
              ) : (
                'Load more'
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  </section>
);

export default StudentsSection;
