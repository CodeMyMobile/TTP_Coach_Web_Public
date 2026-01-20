import React from 'react';
import { CalendarPlus, Edit, Grid, List } from 'lucide-react';
import CoachCalendar from '../CoachCalendar';

const CalendarSection = ({
  calendarView,
  onCalendarViewChange,
  currentDate,
  onCurrentDateChange,
  onRangeChange,
  lessons,
  availability,
  onLessonSelect,
  onAvailabilitySelect,
  onEmptySlotSelect,
  onOpenAddAvailability,
  onRequestAvailabilityOnboarding
}) => (
  <section className="mt-6 space-y-6">
    <div className="rounded-2xl bg-white p-4 shadow-sm">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">Weekly Schedule</h2>
          <p className="text-sm text-gray-500">Manage lessons, availability, and requests</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <div className="inline-flex rounded-lg border border-gray-200 bg-gray-50 p-1">
            {[
              { key: 'day', label: 'Day', icon: Grid },
              { key: 'week', label: 'Week', icon: List }
            ].map((view) => (
              <button
                key={view.key}
                type="button"
                onClick={() => onCalendarViewChange(view.key)}
                className={`flex items-center space-x-2 rounded-md px-3 py-2 text-sm font-medium ${
                  calendarView === view.key
                    ? 'bg-white text-purple-600 shadow'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                <view.icon className="h-4 w-4" />
                <span>{view.label}</span>
              </button>
            ))}
          </div>
          <button
            type="button"
            onClick={() => onCurrentDateChange(new Date())}
            className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50"
          >
            Today
          </button>
        </div>
      </div>

      <div className="mt-4 space-y-4 rounded-xl border border-gray-200 bg-white p-4">
        <div className="flex w-full flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap items-center gap-2 text-xs uppercase text-gray-500">
            <span>Calendar view</span>
          </div>
          <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:space-x-2 sm:gap-0">
            <button
              type="button"
              onClick={onOpenAddAvailability}
              className="flex flex-1 items-center justify-center space-x-2 rounded-lg bg-purple-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-purple-700 sm:flex-none"
            >
              <CalendarPlus className="h-4 w-4" />
              <span>Add</span>
            </button>
            <button
              type="button"
              onClick={onRequestAvailabilityOnboarding}
              className="flex flex-1 items-center justify-center space-x-2 rounded-lg border border-purple-600 px-4 py-2 text-sm font-medium text-purple-600 transition hover:bg-purple-50 sm:flex-none"
            >
              <Edit className="h-4 w-4" />
              <span>Edit</span>
            </button>
          </div>
        </div>

        <CoachCalendar
          lessons={lessons}
          availability={availability}
          currentDate={currentDate}
          onDateChange={onCurrentDateChange}
          onRangeChange={onRangeChange}
          view={calendarView}
          onViewChange={onCalendarViewChange}
          onLessonSelect={onLessonSelect}
          onAvailabilitySelect={onAvailabilitySelect}
          onEmptySlotSelect={onEmptySlotSelect}
        />
      </div>
    </div>
  </section>
);

export default CalendarSection;
