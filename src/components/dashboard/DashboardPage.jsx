import React, { useMemo } from 'react';
import {
  Activity,
  AlertCircle,
  ArrowDownRight,
  ArrowUpRight,
  Bell,
  Calendar,
  CalendarOff,
  CalendarPlus,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  Clock,
  Copy,
  DollarSign,
  Edit,
  Edit2,
  Filter,
  Grid,
  List,
  Menu,
  MessageSquare,
  MoreVertical,
  Package,
  RefreshCw,
  Search,
  Settings,
  Shield,
  Target,
  TrendingUp,
  Trophy,
  UserPlus,
  Users,
  Zap
} from 'lucide-react';

const DashboardPage = ({
  profile,
  isMobile,
  dashboardTab,
  onDashboardTabChange,
  calendarView,
  onCalendarViewChange,
  currentDate,
  onCurrentDateChange,
  mobileDayIndex,
  onMobileDayIndexChange,
  studentsData,
  studentsLoading,
  studentsError,
  onRefreshStudents,
  lessonsData,
  availabilityData,
  statsData,
  scheduleLoading,
  scheduleError,
  onRefreshSchedule,
  mutationError,
  mutationLoading,
  combinedAdHocAvailability,
  recurringAvailability,
  recurringAvailabilityLocations,
  onLessonSelect,
  onAvailabilitySlotSelect,
  onEmptySlotSelect,
  onOpenAddAvailability,
  onOpenCreatePackage,
  onEditProfile,
  onRequestAvailabilityOnboarding,
  studentSearchQuery,
  onStudentSearchQueryChange,
  showMobileMenu,
  onToggleMobileMenu,
  formatDuration
}) => {
  const generateWeekDays = () => {
    const days = [];
    const startOfWeek = new Date(currentDate);
    const day = startOfWeek.getDay();
    const diff = startOfWeek.getDate() - day;
    startOfWeek.setDate(diff);

    for (let index = 0; index < 7; index += 1) {
      const date = new Date(startOfWeek);
      date.setDate(startOfWeek.getDate() + index);
      days.push(date);
    }
    return days;
  };

  const generateTimeSlots = () => {
    const slots = [];
    for (let hour = 6; hour <= 21; hour += 1) {
      slots.push(`${hour}:00`);
      slots.push(`${hour}:30`);
    }
    return slots;
  };

  const weekDays = useMemo(generateWeekDays, [currentDate]);
  const timeSlots = useMemo(generateTimeSlots, []);

  const bookedLessons = Array.isArray(lessonsData)
    ? lessonsData
    : lessonsData?.lessons || [];

  const stats = {
    todayLessons: statsData?.todayLessons ?? 0,
    weekRevenue: statsData?.weekRevenue ?? 0,
    activeStudents: statsData?.activeStudents ?? (Array.isArray(studentsData) ? studentsData.length : studentsData?.students?.length ?? 0),
    upcomingLessons: statsData?.upcomingLessons ?? bookedLessons.length,
    pendingRequests: statsData?.pendingRequests ?? bookedLessons.filter((lesson) => lesson.lessonStatus === 'pending').length
  };

  const getAvailabilityForDate = (date, time) => {
    const dateStr = date.toISOString().split('T')[0];
    const dayName = date.toLocaleDateString('en-US', { weekday: 'long' });

    if (combinedAdHocAvailability?.[dateStr]?.[time]) {
      return combinedAdHocAvailability[dateStr][time];
    }

    const daySlots = recurringAvailability?.[dayName];
    const dayLocations = recurringAvailabilityLocations?.[dayName];
    if (!daySlots || daySlots.length === 0) {
      return null;
    }

    const parseTimeToMinutes = (timeString) => {
      if (!timeString) {
        return null;
      }

      const [hourPart, minutePart = '0'] = timeString.split(':');
      const hour = parseInt(hourPart, 10);
      const minute = parseInt(minutePart, 10);

      if (Number.isNaN(hour) || Number.isNaN(minute)) {
        return null;
      }

      return hour * 60 + minute;
    };

    const slotMinutes = parseTimeToMinutes(time);
    if (slotMinutes === null) {
      return null;
    }

    for (const slot of daySlots) {
      const [rawStart, rawEnd] = slot.split(' - ');
      const startStr = rawStart?.trim();
      const endStr = rawEnd?.trim();
      const startMinutes = parseTimeToMinutes(startStr);
      const endMinutes = parseTimeToMinutes(endStr);

      if (startMinutes === null || endMinutes === null) {
        continue;
      }

      if (slotMinutes >= startMinutes && slotMinutes < endMinutes) {
        return {
          type: 'recurring',
          label: slot,
          location: dayLocations?.[slot] || 'Not specified',
          endTime: endStr
        };
      }
    }

    return null;
  };

  const getLessonForSlot = (date, time) => {
    const dateStr = date.toISOString().split('T')[0];
    return bookedLessons.find((lesson) => {
      if (lesson.date !== dateStr) {
        return false;
      }
      const [lessonHour, lessonMin] = lesson.time.split(':').map(Number);
      const lessonStartMinutes = lessonHour * 60 + lessonMin;
      const lessonEndMinutes = lessonStartMinutes + lesson.duration * 30;

      const [slotHour, slotMin] = time.split(':').map(Number);
      const slotMinutes = slotHour * 60 + slotMin;
      return slotMinutes >= lessonStartMinutes && slotMinutes < lessonEndMinutes;
    });
  };

  const isLessonStart = (lesson, time) => lesson?.time === time;

  const buildAvailabilityDetail = (date, time, availability) => {
    const endTime = availability?.endTime;
    let duration = 2; // default to 1 hour
    if (endTime) {
      const [startHour, startMinute] = time.split(':').map(Number);
      const [endHour, endMinute] = endTime.split(':').map(Number);
      const totalMinutes = (endHour * 60 + endMinute) - (startHour * 60 + startMinute);
      duration = Math.max(1, Math.round(totalMinutes / 30));
    }
    return {
      id: `${date}-${time}`,
      type: 'available',
      date,
      time,
      duration,
      location: availability?.location || profile.home_courts[0] || '',
      court: availability?.location || '',
      lessonStatus: 'available'
    };
  };

  const handleSlotClick = (date, time) => {
    const lesson = getLessonForSlot(date, time);
    const availability = getAvailabilityForDate(date, time);

    if (lesson && isLessonStart(lesson, time)) {
      onLessonSelect(lesson);
      return;
    }

    if (availability) {
      onAvailabilitySlotSelect(buildAvailabilityDetail(date.toISOString().split('T')[0], time, availability));
      return;
    }

    onEmptySlotSelect({
      date: date.toISOString().split('T')[0],
      start: time,
      end: availability?.endTime ?? time,
      location: profile.home_courts[0] || ''
    });
  };

  const navigateWeek = (direction) => {
    const newDate = new Date(currentDate);
    newDate.setDate(newDate.getDate() + direction * 7);
    onCurrentDateChange(newDate);
  };

  const navigateMobileDay = (direction) => {
    const nextIndex = mobileDayIndex + direction;
    if (nextIndex >= 0 && nextIndex < 7) {
      onMobileDayIndexChange(nextIndex);
    }
  };

  const goToToday = () => {
    onCurrentDateChange(new Date());
    onMobileDayIndexChange(new Date().getDay());
  };

  const resolvedStudents = Array.isArray(studentsData)
    ? studentsData
    : studentsData?.students || [];

  const filteredStudents = resolvedStudents.filter((student) =>
    student.name.toLowerCase().includes(studentSearchQuery.toLowerCase()) ||
    student.email.toLowerCase().includes(studentSearchQuery.toLowerCase()) ||
    student.phone.includes(studentSearchQuery)
  );

  const pendingLessons = bookedLessons.filter((lesson) => lesson.lessonStatus === 'pending');

  const getLessonSpan = (lesson) => lesson.duration;

  const getLessonColor = (lesson) => {
    if (lesson.lessonStatus === 'pending') return 'bg-gradient-to-br from-yellow-400 to-yellow-500 text-white shadow-lg ring-2 ring-yellow-300 animate-pulse';
    if (lesson.type === 'available') return 'bg-gradient-to-br from-purple-500 to-purple-600 text-white shadow-lg ring-2 ring-purple-400';
    if (lesson.type === 'private') return 'bg-gradient-to-br from-blue-500 to-blue-600 text-white';
    if (lesson.type === 'semi') return 'bg-gradient-to-br from-green-500 to-green-600 text-white';
    if (lesson.type === 'group') return 'bg-gradient-to-br from-orange-500 to-orange-600 text-white';
    if (lesson.type === 'clinic') return 'bg-gradient-to-br from-pink-500 to-pink-600 text-white';
    return 'bg-gray-200';
  };

  const MobileCalendarView = () => {
    const currentDay = weekDays[mobileDayIndex];

    return (
      <div className="rounded-lg bg-white">
        <div className="flex items-center justify-between rounded-t-lg bg-gray-50 p-4">
          <button
            type="button"
            onClick={() => navigateMobileDay(-1)}
            disabled={mobileDayIndex === 0}
            className={`rounded-lg p-2 ${mobileDayIndex === 0 ? 'text-gray-300' : 'text-gray-600 hover:bg-gray-100'}`}
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <div className="text-center">
            <div className="text-xs uppercase text-gray-500">
              {currentDay.toLocaleDateString('en-US', { weekday: 'long' })}
            </div>
            <div className="text-lg font-bold text-gray-900">
              {currentDay.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
            </div>
          </div>
          <button
            type="button"
            onClick={() => navigateMobileDay(1)}
            disabled={mobileDayIndex === 6}
            className={`rounded-lg p-2 ${mobileDayIndex === 6 ? 'text-gray-300' : 'text-gray-600 hover:bg-gray-100'}`}
          >
            <ChevronRight className="h-5 w-5" />
          </button>
        </div>
        <div className="divide-y divide-gray-200">
          {timeSlots.map((time) => {
            const lesson = getLessonForSlot(currentDay, time);
            const availability = getAvailabilityForDate(currentDay, time);
            const isStart = isLessonStart(lesson, time);

            if (lesson && !isStart) {
              return null;
            }

            return (
              <div
                key={time}
                role="button"
                tabIndex={0}
                onClick={() => handleSlotClick(currentDay, time)}
                onKeyDown={(event) => event.key === 'Enter' && handleSlotClick(currentDay, time)}
                className={`cursor-pointer p-4 transition-colors ${
                  availability && !lesson
                    ? 'bg-green-50'
                    : lesson
                      ? ''
                      : 'hover:bg-gray-50'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-900">{time}</p>
                    {lesson ? (
                      <div className="mt-1 space-y-1 text-sm">
                        <p className="font-semibold text-gray-900">{lesson.student || lesson.title}</p>
                        <p className="text-xs text-gray-500">{formatDuration(lesson.duration)}</p>
                        <p className="flex items-center text-xs text-gray-500">
                          <Clock className="mr-1 h-3 w-3" />
                          {lesson.location}
                        </p>
                      </div>
                    ) : availability ? (
                      <p className="text-sm font-medium text-green-600">Available for booking</p>
                    ) : (
                      <p className="text-sm text-gray-400">Tap to add availability</p>
                    )}
                  </div>
                  {lesson && (
                    <span className={`rounded-full px-3 py-1 text-xs font-medium ${getLessonColor(lesson)}`}>
                      {lesson.type}
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {mutationError && (
        <div className="border-b border-red-200 bg-red-50">
          <div className="mx-auto flex max-w-7xl items-center space-x-2 px-4 py-3 text-sm text-red-700">
            <AlertCircle className="h-4 w-4" />
            <span>{mutationError.message || 'An unexpected error occurred. Please try again.'}</span>
          </div>
        </div>
      )}

      <nav className="border-b border-gray-200 bg-white shadow-sm">
        <div className="mx-auto max-w-7xl px-4">
          <div className="flex h-16 items-center justify-between">
            <div className="flex items-center">
              <button
                type="button"
                onClick={() => onToggleMobileMenu(!showMobileMenu)}
                className="touch-target p-2 text-gray-500 transition hover:text-gray-700 md:hidden"
              >
                <Menu className="h-6 w-6" />
              </button>
              <div className="flex items-center">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-purple-600 to-purple-700">
                  <Activity className="h-5 w-5 text-white" />
                </div>
                <span className="ml-3 hidden text-lg font-semibold text-gray-900 sm:block">Coach Dashboard</span>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              {pendingLessons.length > 0 && (
                <button className="relative flex items-center justify-center rounded-lg border border-yellow-200 bg-yellow-50 p-2 text-yellow-700 hover:bg-yellow-100">
                  <Clock className="h-5 w-5" />
                  <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-xs font-bold text-white">
                    {pendingLessons.length}
                  </span>
                </button>
              )}
              <button className="relative rounded-lg p-2 text-gray-500 hover:text-gray-700">
                <Bell className="h-5 w-5" />
                <span className="absolute top-1 right-1 h-2 w-2 rounded-full bg-red-500" />
              </button>
              <button
                type="button"
                onClick={onEditProfile}
                className="rounded-lg p-2 text-gray-500 hover:text-gray-700"
              >
                <Settings className="h-5 w-5" />
              </button>
            </div>
          </div>
        </div>
      </nav>

      {showMobileMenu && (
        <div className="border-b bg-white shadow-lg md:hidden">
          <div className="space-y-2 px-4 py-4">
            {[
              { key: 'calendar', label: 'Calendar', icon: Calendar },
              { key: 'students', label: 'Students', icon: Users },
              { key: 'earnings', label: 'Earnings', icon: DollarSign },
              { key: 'packages', label: 'Packages', icon: Package }
            ].map((tab) => (
              <button
                key={tab.key}
                type="button"
                onClick={() => {
                  onDashboardTabChange(tab.key);
                  onToggleMobileMenu(false);
                }}
                className={`flex w-full items-center space-x-3 rounded-lg px-4 py-3 text-left ${
                  dashboardTab === tab.key ? 'bg-purple-50 text-purple-600' : 'text-gray-600 hover:bg-gray-50'
                }`}
              >
                <tab.icon className="h-5 w-5" />
                <span className="font-medium">{tab.label}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="border-b bg-white">
        <div className="mx-auto max-w-7xl px-4 py-4">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-4">
            <div className="flex items-center rounded-lg bg-gray-50 p-3">
              <div className="rounded-lg bg-blue-50 p-2">
                <Calendar className="h-4 w-4 text-blue-600 md:h-5 md:w-5" />
              </div>
              <div className="ml-3">
                <p className="text-xs text-gray-500">Today</p>
                <p className="text-base font-semibold text-gray-900 md:text-lg">{stats.todayLessons}</p>
              </div>
            </div>
            <div className="flex items-center rounded-lg bg-gray-50 p-3">
              <div className="rounded-lg bg-green-50 p-2">
                <DollarSign className="h-4 w-4 text-green-600 md:h-5 md:w-5" />
              </div>
              <div className="ml-3">
                <p className="text-xs text-gray-500">Revenue</p>
                <p className="text-base font-semibold text-gray-900 md:text-lg">${stats.weekRevenue}</p>
              </div>
            </div>
            <div className="flex items-center rounded-lg bg-gray-50 p-3">
              <div className="rounded-lg bg-purple-50 p-2">
                <Users className="h-4 w-4 text-purple-600 md:h-5 md:w-5" />
              </div>
              <div className="ml-3">
                <p className="text-xs text-gray-500">Students</p>
                <p className="text-base font-semibold text-gray-900 md:text-lg">{stats.activeStudents}</p>
              </div>
            </div>
            <div className="flex items-center rounded-lg bg-gray-50 p-3">
              <div className="rounded-lg bg-orange-50 p-2">
                <TrendingUp className="h-4 w-4 text-orange-600 md:h-5 md:w-5" />
              </div>
              <div className="ml-3">
                <p className="text-xs text-gray-500">Upcoming</p>
                <p className="text-base font-semibold text-gray-900 md:text-lg">{stats.upcomingLessons}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <main className="mx-auto max-w-7xl px-4 py-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex w-full flex-wrap gap-2 sm:w-auto sm:flex-nowrap">
            {[
              { key: 'calendar', label: 'Calendar', icon: Calendar },
              { key: 'students', label: 'Students', icon: Users },
              { key: 'earnings', label: 'Earnings', icon: DollarSign },
              { key: 'packages', label: 'Packages', icon: Package }
            ].map((tab) => (
              <button
                key={tab.key}
                type="button"
                onClick={() => onDashboardTabChange(tab.key)}
                className={`flex w-full items-center justify-center space-x-2 rounded-lg px-4 py-2 text-sm font-medium sm:w-auto sm:justify-start ${
                  dashboardTab === tab.key
                    ? 'bg-purple-600 text-white shadow'
                    : 'border border-gray-200 text-gray-600 hover:bg-gray-50'
                }`}
              >
                <tab.icon className="h-4 w-4" />
                <span>{tab.label}</span>
              </button>
            ))}
          </div>

          <div className="flex w-full flex-col items-start gap-1 text-sm text-gray-500 sm:w-auto sm:flex-row sm:items-center sm:gap-2">
            <Shield className="h-4 w-4 text-green-500" />
            <span>Secure portal • Last synced moments ago</span>
          </div>
        </div>

        {dashboardTab === 'calendar' && (
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
                    onClick={goToToday}
                    className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50"
                  >
                    Today
                  </button>
                </div>
              </div>

              <div className="mt-4 space-y-4 rounded-xl border border-gray-200 bg-white p-4">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                  <div className="flex items-center space-x-3">
                    <button
                      type="button"
                      onClick={() => (isMobile ? navigateMobileDay(-1) : navigateWeek(-1))}
                      className="touch-target rounded-lg p-2 text-gray-600 transition hover:bg-gray-100"
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </button>
                    <div>
                      <p className="text-xs uppercase text-gray-500">Week of</p>
                      <h3 className="text-lg font-semibold text-gray-900">
                        {isMobile
                          ? weekDays[mobileDayIndex].toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
                          : `${weekDays[0].toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${weekDays[6].toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`}
                      </h3>
                    </div>
                    <button
                      type="button"
                      onClick={() => (isMobile ? navigateMobileDay(1) : navigateWeek(1))}
                      className="touch-target rounded-lg p-2 text-gray-600 transition hover:bg-gray-100"
                    >
                      <ChevronRight className="h-4 w-4" />
                    </button>
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

                {isMobile ? (
                  <MobileCalendarView />
                ) : (
                  <div className="overflow-x-auto rounded-lg border border-gray-200">
                    <div className="min-w-[600px]">
                      <div className="grid grid-cols-[100px_repeat(7,minmax(0,1fr))] border-b border-gray-200 bg-gray-50 px-4 py-2 text-sm font-medium text-gray-500">
                        <div className="flex items-center space-x-2">
                          <Filter className="h-4 w-4" />
                          <span>Time</span>
                        </div>
                        {weekDays.map((day) => (
                          <div key={day.toISOString()} className="text-center">
                            <div className="text-xs uppercase text-gray-400">
                              {day.toLocaleDateString('en-US', { weekday: 'short' })}
                            </div>
                            <div className="text-sm font-semibold text-gray-900">
                              {day.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                            </div>
                          </div>
                        ))}
                      </div>

                      <div className="relative">
                        <div className="grid grid-cols-[100px_repeat(7,minmax(0,1fr))]">
                          {timeSlots.map((time) => (
                            <React.Fragment key={time}>
                              <div className="border-b border-r border-gray-100 px-4 py-6 text-sm text-gray-400">
                                {time}
                              </div>
                              {weekDays.map((day) => {
                                const lesson = getLessonForSlot(day, time);
                                const availability = getAvailabilityForDate(day, time);
                                const isStart = isLessonStart(lesson, time);

                                if (lesson && !isStart) {
                                  return <div key={`${day.toISOString()}-${time}`} />;
                                }

                                return (
                                  <div
                                    key={`${day.toISOString()}-${time}`}
                                    className={`border-b border-r border-gray-100 p-2 ${
                                      availability && !lesson
                                        ? 'bg-green-50'
                                        : lesson
                                          ? ''
                                          : 'hover:bg-gray-50'
                                    }`}
                                  >
                                    <button
                                      type="button"
                                      onClick={() => handleSlotClick(day, time)}
                                      className="flex h-full w-full flex-col items-start space-y-2 rounded-lg border border-dashed border-transparent p-2 text-left transition hover:border-purple-200"
                                    >
                                      {lesson ? (
                                        <div
                                          className={`w-full rounded-lg p-3 text-left text-sm shadow ${getLessonColor(lesson)}`}
                                          style={{ gridRowEnd: `span ${getLessonSpan(lesson)}` }}
                                        >
                                          <div className="flex items-center justify-between text-xs uppercase">
                                            <span className="font-bold">{lesson.type}</span>
                                            <span className="opacity-75">{formatDuration(lesson.duration)}</span>
                                          </div>
                                          <div className="mt-1 font-semibold">
                                            {lesson.type === 'group' ? lesson.title : lesson.student}
                                          </div>
                                          <div className="mt-2 text-xs opacity-75">
                                            {lesson.location}
                                          </div>
                                        </div>
                                      ) : availability ? (
                                        <div className="w-full rounded-lg border border-green-200 bg-white p-3 text-sm text-green-600">
                                          Available • {availability.location}
                                        </div>
                                      ) : (
                                        <div className="w-full rounded-lg border border-dashed border-gray-200 p-3 text-xs text-gray-400">
                                          Add availability
                                        </div>
                                      )}
                                    </button>
                                  </div>
                                );
                              })}
                            </React.Fragment>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </section>
        )}

        {dashboardTab === 'students' && (
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

                {!studentsLoading && !studentsError && filteredStudents.length === 0 && (
                  <div className="rounded-lg border border-gray-200 bg-gray-50 p-6 text-center text-sm text-gray-500">
                    No students found matching your search.
                  </div>
                )}

                {filteredStudents.map((student) => (
                  <div key={student.email} className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
                    <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900">{student.name}</h3>
                        <p className="text-sm text-gray-500">{student.email} • {student.phone}</p>
                      </div>
                      <div className="flex items-center space-x-2">
                        <span className="rounded-full bg-green-100 px-3 py-1 text-xs font-medium text-green-700">Active</span>
                        <button className="rounded-lg border border-gray-200 p-2 text-gray-500 hover:text-gray-700">
                          <MoreVertical className="h-4 w-4" />
                        </button>
                      </div>
                    </div>

                    <div className="mt-4 grid gap-4 md:grid-cols-2">
                      <div className="rounded-lg bg-gray-50 p-3">
                        <p className="text-xs uppercase text-gray-500">Current Package</p>
                        <p className="mt-1 text-sm font-medium text-gray-900">{student.package || 'No active package'}</p>
                        <p className="text-xs text-gray-500">Remaining lessons: {student.remaining ?? 'N/A'}</p>
                      </div>
                      <div className="rounded-lg bg-gray-50 p-3">
                        <p className="text-xs uppercase text-gray-500">Next Lesson</p>
                        <p className="mt-1 text-sm font-medium text-gray-900">{student.nextLesson || 'Not scheduled'}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>
        )}

        {dashboardTab === 'earnings' && (
          <section className="mt-6 space-y-6">
            <div className="rounded-2xl bg-white p-4 shadow-sm">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <h2 className="text-xl font-semibold text-gray-900">Earnings Overview</h2>
                  <p className="text-sm text-gray-500">Track revenue, payouts, and performance</p>
                </div>
                <div className="flex w-full flex-wrap gap-2 sm:w-auto sm:flex-nowrap sm:space-x-2 sm:gap-0">
                  <button className="flex w-full items-center justify-center space-x-2 rounded-lg border border-gray-200 px-4 py-2 text-sm text-gray-600 hover:bg-gray-50 sm:w-auto sm:justify-start">
                    <Calendar className="h-4 w-4" />
                    <span>Past 30 days</span>
                    <ChevronDown className="h-4 w-4" />
                  </button>
                  <button className="w-full rounded-lg bg-purple-600 px-4 py-2 text-sm font-medium text-white hover:bg-purple-700 sm:w-auto">
                    Export
                  </button>
                </div>
              </div>

              <div className="mt-6 grid gap-4 md:grid-cols-3">
                <div className="rounded-xl border border-purple-100 bg-purple-50 p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs uppercase text-purple-500">Total Revenue</p>
                      <p className="text-2xl font-bold text-purple-900">${stats.weekRevenue}</p>
                    </div>
                    <ArrowUpRight className="h-5 w-5 text-purple-500" />
                  </div>
                  <p className="mt-2 text-xs text-purple-700">Up 12% from last period</p>
                </div>
                <div className="rounded-xl border border-green-100 bg-green-50 p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs uppercase text-green-500">Outstanding</p>
                      <p className="text-2xl font-bold text-green-900">$280</p>
                    </div>
                    <ArrowDownRight className="h-5 w-5 text-green-500" />
                  </div>
                  <p className="mt-2 text-xs text-green-700">2 invoices awaiting payment</p>
                </div>
                <div className="rounded-xl border border-blue-100 bg-blue-50 p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs uppercase text-blue-500">Average Rate</p>
                      <p className="text-2xl font-bold text-blue-900">$112/hr</p>
                    </div>
                    <Target className="h-5 w-5 text-blue-500" />
                  </div>
                  <p className="mt-2 text-xs text-blue-700">Across all lesson types</p>
                </div>
              </div>
            </div>
          </section>
        )}

        {dashboardTab === 'packages' && (
          <section className="mt-6 space-y-6">
            <div className="rounded-2xl bg-white p-4 shadow-sm">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <h2 className="text-xl font-semibold text-gray-900">Lesson Packages</h2>
                  <p className="text-sm text-gray-500">Create and manage lesson bundles for your students</p>
                </div>
                <button
                  type="button"
                  onClick={onOpenCreatePackage}
                  className="flex w-full items-center justify-center space-x-2 rounded-lg bg-purple-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-purple-700 sm:w-auto sm:justify-start"
                >
                  <Package className="h-4 w-4" />
                  <span>Create package</span>
                </button>
              </div>

              <div className="mt-6 space-y-4">
                <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
                  <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900">10 Lesson Performance Bundle</h3>
                      <p className="text-sm text-gray-500">Perfect for students preparing for tournaments</p>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className="rounded-full bg-purple-100 px-3 py-1 text-xs font-medium text-purple-700">Popular</span>
                      <button className="rounded-lg border border-gray-200 p-2 text-gray-500 hover:text-gray-700">
                        <MoreVertical className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                  <div className="mt-4 grid gap-4 md:grid-cols-3">
                    <div>
                      <p className="text-xs uppercase text-gray-500">Price</p>
                      <p className="text-sm font-medium text-gray-900">$850</p>
                    </div>
                    <div>
                      <p className="text-xs uppercase text-gray-500">Lessons</p>
                      <p className="text-sm font-medium text-gray-900">10 x 60 min</p>
                    </div>
                    <div>
                      <p className="text-xs uppercase text-gray-500">Students enrolled</p>
                      <p className="text-sm font-medium text-gray-900">7</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>
        )}
      </main>
    </div>
  );
};

export default DashboardPage;
