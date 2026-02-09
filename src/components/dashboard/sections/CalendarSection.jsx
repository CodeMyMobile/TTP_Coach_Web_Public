import React from 'react';
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
  onOpenAddAvailability
}) => (
  <section className="mt-6 space-y-6 calendar-section">
    <div className="rounded-2xl bg-white p-4 shadow-sm calendar-section-card">
      <div className="rounded-xl border border-gray-200 bg-white p-4 calendar-section-body">
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
