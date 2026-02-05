import React from 'react';
import { CalendarPlus, Edit } from 'lucide-react';
import CoachCalendar from '../CoachCalendar';

const CalendarSection = ({
  calendarView,
  onCalendarViewChange,
  currentDate,
  onCurrentDateChange,
  onRangeChange,
  lessons,
  availability,
  googleEvents,
  onLessonSelect,
  onAvailabilitySelect,
  onEmptySlotSelect,
  onOpenAddAvailability,
  onRequestAvailabilityOnboarding
}) => (
  <section className="mt-6 space-y-6 calendar-section">
    <div className="rounded-2xl bg-white p-4 shadow-sm calendar-section-card">
      <div className="space-y-4 rounded-xl border border-gray-200 bg-white p-4 calendar-section-body">
        <p className="text-sm text-gray-500">Manage lessons, availability, and requests</p>
        <div className="flex w-full flex-col gap-2 sm:flex-row sm:items-center sm:justify-between calendar-section-controls">
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
          googleEvents={googleEvents}
          currentDate={currentDate}
          onDateChange={onCurrentDateChange}
          onRangeChange={onRangeChange}
          view={calendarView}
          onViewChange={onCalendarViewChange}
          onLessonSelect={onLessonSelect}
          onAvailabilitySelect={onAvailabilitySelect}
          onEmptySlotSelect={onEmptySlotSelect}
          onOpenAddAvailability={onOpenAddAvailability}
        />
      </div>
    </div>
  </section>
);

export default CalendarSection;
