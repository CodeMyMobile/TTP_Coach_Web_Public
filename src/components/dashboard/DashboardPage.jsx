import React, { useCallback, useEffect, useMemo, useState } from 'react';
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
  MapPin,
  LogOut,
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
import { getActivePlayerPackages, updateCoachPlayer } from '../../services/coach';
import CoachCalendar from './CoachCalendar';

const parseNumber = (value) => {
  if (value === null || value === undefined || value === '') {
    return null;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

const formatLessonTypeLabel = (value) => {
  if (typeof value !== 'string') {
    return '';
  }

  return value
    .split('_')
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
};

const formatValidityLabel = (months) => {
  if (months === null || months === undefined || months <= 0) {
    return 'No expiration';
  }

  if (months === 1) {
    return '1 month';
  }

  return `${months} months`;
};

const DashboardPage = ({
  profile,
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
  studentsLoadingMore = false,
  studentsError,
  onRefreshStudents,
  studentsHasMore = false,
  onLoadMoreStudents = () => {},
  studentsPage = 1,
  studentsPerPage = 5,
  lessonsData,
  availabilityData,
  statsData,
  scheduleLoading,
  scheduleError,
  onRefreshSchedule,
  mutationError,
  mutationLoading,
  onLessonSelect,
  onAvailabilitySlotSelect,
  onEmptySlotSelect,
  onOpenAddAvailability,
  onOpenCreatePackage,
  onEditProfile,
  onRequestAvailabilityOnboarding,
  onLogout,
  studentSearchQuery,
  onStudentSearchQueryChange,
  showMobileMenu,
  onToggleMobileMenu,
  formatDuration,
  packagesLoading = false,
  packagesError = null,
  onRefreshPackages = () => {},
  locationsData = [],
  locationsLoading = false,
  locationsError = null,
  onRefreshLocations = () => {},
  onAddLocationById = () => {},
  onAddCustomLocation = () => {},
  onDeleteLocation = () => {}
}) => {
  const bookedLessons = Array.isArray(lessonsData)
    ? lessonsData
    : lessonsData?.lessons || [];

  const currencyFormatter = useMemo(
    () =>
      new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        maximumFractionDigits: 2
      }),
    []
  );

  const packages = useMemo(() => {
    if (!Array.isArray(profile?.packages)) {
      return [];
    }

    return profile.packages
      .map((entry, index) => {
        const lessonCount = parseNumber(entry.lessonCount ?? entry.lesson_count);
        const totalPrice = parseNumber(entry.totalPrice ?? entry.total_price ?? entry.price);
        const validity = parseNumber(entry.validityMonths ?? entry.validity_months);

        const lessonTypesSource =
          Array.isArray(entry.lessonTypesAllowed) && entry.lessonTypesAllowed.length > 0
            ? entry.lessonTypesAllowed
            : Array.isArray(entry.lesson_types_allowed)
              ? entry.lesson_types_allowed
              : [];

        const lessonTypes = lessonTypesSource
          .map((type) => (typeof type === 'string' ? type.trim() : ''))
          .filter((type) => type.length > 0);

        return {
          id: entry.id ?? entry.package_id ?? `package-${index}`,
          name: entry.name || entry.title || 'Untitled Package',
          description: typeof entry.description === 'string' ? entry.description : '',
          lessonCount,
          totalPrice,
          validityMonths: validity,
          perLessonPrice:
            lessonCount !== null && lessonCount > 0 && totalPrice !== null
              ? totalPrice / lessonCount
              : null,
          lessonTypes,
          isActive: entry.is_active ?? entry.isActive ?? true
        };
      })
      .sort((a, b) => {
        if (a.isActive === b.isActive) {
          return 0;
        }
        return a.isActive ? -1 : 1;
      });
  }, [profile]);

  const stats = {
    todayLessons: statsData?.todayLessons ?? 0,
    weekRevenue: statsData?.weekRevenue ?? 0,
    activeStudents: statsData?.activeStudents ?? (Array.isArray(studentsData) ? studentsData.length : studentsData?.students?.length ?? 0),
    upcomingLessons: statsData?.upcomingLessons ?? bookedLessons.length,
    pendingRequests: statsData?.pendingRequests ?? bookedLessons.filter((lesson) => lesson.lessonStatus === 'pending').length
  };

  const goToToday = () => {
    onCurrentDateChange(new Date());
    onMobileDayIndexChange(new Date().getDay());
  };

  const handleAvailabilitySelect = (availability) => {
    if (!availability) {
      return;
    }

    const dateValue = availability.date instanceof Date
      ? availability.date.toISOString().split('T')[0]
      : availability.date || '';
    const startValue = availability.start || availability.startTime || availability.from || '';
    const endValue = availability.end || availability.endTime || availability.to || availability.finish || '';

    onAvailabilitySlotSelect({
      ...availability,
      date: dateValue,
      start: startValue,
      end: endValue,
      location: availability.location || profile.home_courts[0] || ''
    });
  };

  const [rosterAction, setRosterAction] = useState(null);
  const [activePackagesLoading, setActivePackagesLoading] = useState(false);
  const [activePackagesError, setActivePackagesError] = useState(null);
  const [activePackagesByPlayer, setActivePackagesByPlayer] = useState({});
  const [locationIdInput, setLocationIdInput] = useState('');
  const [customLocationForm, setCustomLocationForm] = useState({
    location: '',
    latitude: '',
    longitude: ''
  });
  const [locationAction, setLocationAction] = useState(null);

  const resolvedStudents = Array.isArray(studentsData)
    ? studentsData
    : studentsData?.students || [];

  const normalizeStudent = (student) => {
    const name = student?.full_name || student?.name || '';
    const email = student?.email || '';
    const phone = student?.phone || '';
    const statusValue = student?.status ?? null;
    const createdBy = student?.created_by ?? null;
    const playerId = student?.player_id ?? student?.id ?? null;
    const isConfirmed = statusValue === 1 || statusValue === 'CONFIRMED';
    const isPlayerRequest = createdBy !== null && playerId !== null && createdBy === playerId;

    return {
      id: student?.id || playerId || student?.email || name,
      name,
      email,
      phone,
      status: statusValue,
      isConfirmed,
      isPlayerRequest,
      playerId,
      avatar: student?.profile_picture || student?.avatar || ''
    };
  };

  const normalizedStudents = resolvedStudents.map(normalizeStudent);

  const filteredStudents = normalizedStudents.filter((student) => {
    const searchValue = studentSearchQuery.toLowerCase();
    return (
      student.name.toLowerCase().includes(searchValue) ||
      student.email.toLowerCase().includes(searchValue) ||
      student.phone.includes(studentSearchQuery)
    );
  });

  const normalizedLocations = useMemo(() => {
    const source = Array.isArray(locationsData)
      ? locationsData
      : locationsData?.locations || locationsData?.data || [];

    return source.map((location) => {
      const relationId = location?.id ?? location?.coach_location_id ?? location?.relation_id ?? null;
      const locationId = location?.location_id ?? location?.locationId ?? relationId;
      const label =
        location?.location ||
        location?.name ||
        location?.address ||
        location?.formatted_address ||
        location?.label ||
        '';

      return {
        relationId,
        locationId,
        label,
        latitude: location?.latitude,
        longitude: location?.longitude
      };
    });
  }, [locationsData]);

  const handleRosterUpdate = useCallback(
    async (playerId, status) => {
      if (!playerId) {
        return;
      }

      setRosterAction({ playerId, status });
      try {
        await updateCoachPlayer({ playerId, status });
        onRefreshStudents?.();
      } catch (error) {
        console.error('Failed to update roster status', error);
      } finally {
        setRosterAction(null);
      }
    },
    [onRefreshStudents]
  );

  const handleAddLocation = useCallback(async () => {
    setLocationAction(null);
    const result = await onAddLocationById(locationIdInput.trim());
    if (result?.ok) {
      setLocationIdInput('');
      setLocationAction({ type: 'success', message: 'Location added.' });
    } else if (result?.error) {
      setLocationAction({ type: 'error', message: result.error });
    }
  }, [locationIdInput, onAddLocationById]);

  const handleAddCustomLocation = useCallback(async () => {
    setLocationAction(null);
    const result = await onAddCustomLocation({
      location: customLocationForm.location.trim(),
      latitude: customLocationForm.latitude,
      longitude: customLocationForm.longitude
    });
    if (result?.ok) {
      setCustomLocationForm({ location: '', latitude: '', longitude: '' });
      setLocationAction({ type: 'success', message: 'Custom location added.' });
    } else if (result?.error) {
      setLocationAction({ type: 'error', message: result.error });
    }
  }, [customLocationForm, onAddCustomLocation]);

  const handleDeleteLocation = useCallback(async (relationId) => {
    setLocationAction(null);
    const result = await onDeleteLocation(relationId);
    if (result?.ok) {
      setLocationAction({ type: 'success', message: 'Location removed.' });
    } else if (result?.error) {
      setLocationAction({ type: 'error', message: result.error });
    }
  }, [onDeleteLocation]);

  useEffect(() => {
    if (dashboardTab !== 'students') {
      return;
    }

    setActivePackagesByPlayer({});
    setActivePackagesError(null);
  }, [dashboardTab, studentSearchQuery, studentsPerPage]);

  useEffect(() => {
    if (dashboardTab !== 'students') {
      return;
    }

    let isMounted = true;
    const fetchActivePackages = async () => {
      setActivePackagesLoading(true);
      setActivePackagesError(null);

      try {
        const response = await getActivePlayerPackages({
          perPage: studentsPerPage,
          page: studentsPage,
          search: studentSearchQuery
        });
        const purchases = Array.isArray(response)
          ? response
          : response?.purchases || [];

        const map = purchases.reduce((acc, purchase) => {
          const playerId = purchase?.player_id ?? purchase?.playerId ?? purchase?.player?.id;
          if (!playerId) {
            return acc;
          }

          const creditsRemaining = parseNumber(
            purchase?.credits_remaining ??
              purchase?.creditsRemaining ??
              (parseNumber(purchase?.credits_total) ?? 0) - (parseNumber(purchase?.credits_used) ?? 0)
          );

          const existing = acc[playerId];
          if (existing && creditsRemaining !== null && existing.creditsRemaining > creditsRemaining) {
            return acc;
          }

          acc[playerId] = {
            creditsRemaining,
            packageName:
              purchase?.package_name ||
              purchase?.package_title ||
              purchase?.package?.name ||
              purchase?.packageName ||
              'Active package'
          };
          return acc;
        }, {});

        if (isMounted) {
          setActivePackagesByPlayer((previous) =>
            studentsPage === 1 ? map : { ...previous, ...map }
          );
        }
      } catch (error) {
        if (isMounted) {
          setActivePackagesError(error instanceof Error ? error : new Error('Failed to load packages.'));
        }
      } finally {
        if (isMounted) {
          setActivePackagesLoading(false);
        }
      }
    };

    fetchActivePackages();

    return () => {
      isMounted = false;
    };
  }, [dashboardTab, studentSearchQuery, studentsPage, studentsPerPage]);

  const pendingLessons = bookedLessons.filter((lesson) => lesson.lessonStatus === 'pending');

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
              <div className="flex items-center space-x-1">
                <button
                  type="button"
                  onClick={onEditProfile}
                  className="rounded-lg p-2 text-gray-500 hover:text-gray-700"
                >
                  <Settings className="h-5 w-5" />
                  <span className="sr-only">Edit profile</span>
                </button>
                <button
                  type="button"
                  onClick={onLogout}
                  className="rounded-lg p-2 text-gray-500 hover:text-gray-700"
                >
                  <LogOut className="h-5 w-5" />
                  <span className="sr-only">Log out</span>
                </button>
              </div>
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
              { key: 'packages', label: 'Packages', icon: Package },
              { key: 'locations', label: 'Locations', icon: MapPin }
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
          <button
            type="button"
            onClick={() => {
              onToggleMobileMenu(false);
              onLogout?.();
            }}
            className="flex w-full items-center space-x-3 rounded-lg px-4 py-3 text-left text-red-600 hover:bg-red-50"
          >
            <LogOut className="h-5 w-5" />
            <span className="font-medium">Log out</span>
          </button>
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
              { key: 'packages', label: 'Packages', icon: Package },
              { key: 'locations', label: 'Locations', icon: MapPin }
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
                  lessons={bookedLessons}
                  availability={availabilityData?.schedule || availabilityData}
                  currentDate={currentDate}
                  onDateChange={onCurrentDateChange}
                  view={calendarView}
                  onViewChange={onCalendarViewChange}
                  onLessonSelect={onLessonSelect}
                  onAvailabilitySelect={handleAvailabilitySelect}
                  onEmptySlotSelect={onEmptySlotSelect}
                />
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
                  const activePackage = student.playerId
                    ? activePackagesByPlayer[student.playerId]
                    : null;

                  return (
                    <div key={student.id} className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
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
                          <button className="rounded-lg border border-gray-200 p-2 text-gray-500 hover:text-gray-700">
                            <MoreVertical className="h-4 w-4" />
                          </button>
                        </div>
                      </div>

                      {!student.isConfirmed && student.isPlayerRequest && (
                        <div className="mt-4 flex flex-wrap gap-2">
                          <button
                            type="button"
                            onClick={() => handleRosterUpdate(student.playerId, 'CONFIRMED')}
                            disabled={rosterAction?.playerId === student.playerId}
                            className="inline-flex items-center rounded-lg bg-green-600 px-3 py-2 text-xs font-semibold text-white transition hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-70"
                          >
                            <Check className="mr-2 h-4 w-4" />
                            Confirm
                          </button>
                          <button
                            type="button"
                            onClick={() => handleRosterUpdate(student.playerId, 'CANCELLED')}
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
                  <p className="text-sm text-gray-500">
                    Create and manage lesson bundles for your students
                  </p>
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
                {packagesLoading && packages.length === 0 && (
                  <div className="flex flex-col items-center justify-center space-y-2 py-10">
                    <RefreshCw className="h-6 w-6 animate-spin text-purple-600" />
                    <p className="text-sm text-gray-500">Loading packages...</p>
                  </div>
                )}

                {!packagesLoading && packagesError && (
                  <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
                    <p className="font-medium">We couldn't load your packages.</p>
                    <p className="mt-1 text-xs text-red-600">{packagesError}</p>
                    <button
                      type="button"
                      onClick={onRefreshPackages}
                      className="mt-3 inline-flex items-center space-x-2 rounded-lg bg-red-600 px-3 py-2 text-xs font-medium text-white hover:bg-red-700"
                    >
                      <RefreshCw className="h-4 w-4" />
                      <span>Try again</span>
                    </button>
                  </div>
                )}

                {!packagesLoading && !packagesError && packages.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-gray-200 bg-white p-6 text-center">
                    <h3 className="text-base font-semibold text-gray-900">No packages yet</h3>
                    <p className="mt-2 text-sm text-gray-500">
                      Create your first lesson bundle to offer students multi-lesson savings.
                    </p>
                    <button
                      type="button"
                      onClick={onOpenCreatePackage}
                      className="mt-4 inline-flex items-center justify-center space-x-2 rounded-lg bg-purple-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-purple-700"
                    >
                      <Package className="h-4 w-4" />
                      <span>Create package</span>
                    </button>
                  </div>
                ) : null}

                {packages.length > 0 &&
                  packages.map((lessonPackage) => (
                    <div
                      key={lessonPackage.id}
                      className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm"
                    >
                      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                        <div>
                          <div className="flex flex-wrap items-center gap-2">
                            <h3 className="text-lg font-semibold text-gray-900">
                              {lessonPackage.name}
                            </h3>
                            {!lessonPackage.isActive && (
                              <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-600">
                                Archived
                              </span>
                            )}
                          </div>
                          {lessonPackage.description && (
                            <p className="mt-1 text-sm text-gray-500">
                              {lessonPackage.description}
                            </p>
                          )}
                        </div>
                        <div className="flex flex-wrap gap-2 md:justify-end">
                          {lessonPackage.lessonTypes.length > 0 ? (
                            lessonPackage.lessonTypes.map((type) => (
                              <span
                                key={`${lessonPackage.id}-${type}`}
                                className="rounded-full bg-purple-50 px-3 py-1 text-xs font-medium text-purple-700"
                              >
                                {formatLessonTypeLabel(type)}
                              </span>
                            ))
                          ) : (
                            <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-600">
                              Any lesson type
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="mt-4 grid gap-4 md:grid-cols-4">
                        <div>
                          <p className="text-xs uppercase text-gray-500">Price</p>
                          <p className="text-sm font-medium text-gray-900">
                            {lessonPackage.totalPrice !== null
                              ? currencyFormatter.format(lessonPackage.totalPrice)
                              : 'N/A'}
                          </p>
                          {lessonPackage.perLessonPrice !== null && (
                            <p className="text-xs text-gray-500">
                              {currencyFormatter.format(lessonPackage.perLessonPrice)} per lesson
                            </p>
                          )}
                        </div>
                        <div>
                          <p className="text-xs uppercase text-gray-500">Lessons Included</p>
                          <p className="text-sm font-medium text-gray-900">
                            {lessonPackage.lessonCount !== null
                              ? `${lessonPackage.lessonCount} lessons`
                              : 'N/A'}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs uppercase text-gray-500">Validity</p>
                          <p className="text-sm font-medium text-gray-900">
                            {formatValidityLabel(lessonPackage.validityMonths)}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs uppercase text-gray-500">Status</p>
                          <p
                            className={`text-sm font-medium ${
                              lessonPackage.isActive ? 'text-green-600' : 'text-gray-500'
                            }`}
                          >
                            {lessonPackage.isActive ? 'Active' : 'Archived'}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          </section>
        )}

        {dashboardTab === 'locations' && (
          <section className="mt-6 space-y-6">
            <div className="rounded-2xl bg-white p-4 shadow-sm">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <h2 className="text-xl font-semibold text-gray-900">Locations</h2>
                  <p className="text-sm text-gray-500">Manage courts and teaching locations</p>
                </div>
                <button
                  type="button"
                  onClick={onRefreshLocations}
                  className="inline-flex items-center space-x-2 rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-600 hover:bg-gray-50"
                >
                  <RefreshCw className="h-4 w-4" />
                  <span>Refresh</span>
                </button>
              </div>

              {locationAction && (
                <div
                  className={`mt-4 rounded-lg border px-4 py-3 text-sm ${
                    locationAction.type === 'error'
                      ? 'border-red-200 bg-red-50 text-red-700'
                      : 'border-green-200 bg-green-50 text-green-700'
                  }`}
                >
                  {locationAction.message}
                </div>
              )}

              <div className="mt-6 grid gap-6 lg:grid-cols-2">
                <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
                  <h3 className="text-base font-semibold text-gray-900">Add Existing Location</h3>
                  <p className="mt-1 text-xs text-gray-500">Use a master location id.</p>
                  <div className="mt-4 flex flex-col gap-3 sm:flex-row">
                    <input
                      type="number"
                      inputMode="numeric"
                      placeholder="Location ID"
                      value={locationIdInput}
                      onChange={(event) => setLocationIdInput(event.target.value)}
                      className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                    />
                    <button
                      type="button"
                      onClick={handleAddLocation}
                      className="rounded-lg bg-purple-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-purple-700"
                    >
                      Add
                    </button>
                  </div>
                </div>

                <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
                  <h3 className="text-base font-semibold text-gray-900">Add Custom Location</h3>
                  <p className="mt-1 text-xs text-gray-500">Create and link a new location.</p>
                  <div className="mt-4 space-y-3">
                    <input
                      type="text"
                      placeholder="Location name"
                      value={customLocationForm.location}
                      onChange={(event) => setCustomLocationForm((prev) => ({ ...prev, location: event.target.value }))}
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                    />
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                      <input
                        type="number"
                        inputMode="decimal"
                        step="any"
                        placeholder="Latitude"
                        value={customLocationForm.latitude}
                        onChange={(event) => setCustomLocationForm((prev) => ({ ...prev, latitude: event.target.value }))}
                        className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                      />
                      <input
                        type="number"
                        inputMode="decimal"
                        step="any"
                        placeholder="Longitude"
                        value={customLocationForm.longitude}
                        onChange={(event) => setCustomLocationForm((prev) => ({ ...prev, longitude: event.target.value }))}
                        className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={handleAddCustomLocation}
                      className="w-full rounded-lg bg-purple-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-purple-700"
                    >
                      Create Location
                    </button>
                  </div>
                </div>
              </div>

              <div className="mt-6 space-y-4">
                {locationsLoading && (
                  <div className="flex flex-col items-center justify-center space-y-2 py-6 text-sm text-gray-500">
                    <RefreshCw className="h-5 w-5 animate-spin text-purple-600" />
                    <span>Loading locations...</span>
                  </div>
                )}

                {!locationsLoading && locationsError && (
                  <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
                    <p className="font-medium">We couldn't load your locations.</p>
                    <p className="mt-1 text-xs text-red-600">{locationsError}</p>
                  </div>
                )}

                {!locationsLoading && !locationsError && normalizedLocations.length === 0 && (
                  <div className="rounded-lg border border-dashed border-gray-200 bg-white p-6 text-center text-sm text-gray-500">
                    No locations linked yet.
                  </div>
                )}

                {normalizedLocations.map((location) => (
                  <div
                    key={location.relationId ?? location.locationId ?? location.label}
                    className="flex flex-col gap-3 rounded-xl border border-gray-200 bg-white p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div className="flex items-start gap-3">
                      <div className="rounded-lg bg-purple-50 p-2 text-purple-600">
                        <MapPin className="h-4 w-4" />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-gray-900">
                          {location.label || 'Location'}
                        </p>
                        <p className="text-xs text-gray-500">
                          Location ID: {location.locationId ?? 'N/A'}
                        </p>
                        {location.latitude !== undefined && location.longitude !== undefined && (
                          <p className="text-xs text-gray-400">
                            {location.latitude}, {location.longitude}
                          </p>
                        )}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleDeleteLocation(location.relationId ?? location.locationId)}
                      className="rounded-lg border border-gray-200 px-3 py-2 text-xs font-medium text-gray-600 hover:bg-gray-50"
                    >
                      Remove
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </section>
        )}
      </main>
    </div>
  );
};

export default DashboardPage;
