import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertCircle,
  Bell,
  Calendar,
  DollarSign,
  Menu,
  LogOut,
  Package,
  Settings,
  Shield,
  Users,
  MapPin
} from 'lucide-react';
import { getActivePlayerPackages, updateCoachPlayer } from '../../services/coach';
import StatsSummary from './sections/StatsSummary';
import CalendarSection from './sections/CalendarSection';
import StudentsSection from './sections/StudentsSection';
import EarningsSection from './sections/EarningsSection';
import PackagesSection from './sections/PackagesSection';
import LocationsSection from './sections/LocationsSection';
import './DashboardPage.css';

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
  onRangeChange,
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
  googleEvents,
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
  onRequestAvailabilityOnboarding,
  onOpenSettings,
  onOpenNotifications = () => {},
  onLogout,
  studentSearchQuery,
  onStudentSearchQueryChange,
  onStudentSelect = () => {},
  showMobileMenu,
  onToggleMobileMenu,
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
  const [showNotificationsDropdown, setShowNotificationsDropdown] = useState(false);
  const [showFabMenu, setShowFabMenu] = useState(false);
  const [dismissedActionBar, setDismissedActionBar] = useState(false);
  const notificationRef = useRef(null);

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

  useEffect(() => {
    if (!showNotificationsDropdown) {
      return;
    }

    const handleClickOutside = (event) => {
      if (notificationRef.current && !notificationRef.current.contains(event.target)) {
        setShowNotificationsDropdown(false);
      }
    };

    window.addEventListener('mousedown', handleClickOutside);
    return () => window.removeEventListener('mousedown', handleClickOutside);
  }, [showNotificationsDropdown]);

  const pendingLessons = bookedLessons.filter((lesson) => lesson.lessonStatus === 'pending');
  const rosterRequests = normalizedStudents.filter(
    (student) => student.isPlayerRequest && !student.isConfirmed
  );
  const actionItems = [
    ...rosterRequests.map((student) => ({
      id: `roster-${student.id}`,
      type: 'roster',
      name: student.name || 'Student',
      detail: 'roster request',
      onAccept: () => handleRosterUpdate(student.playerId, 'CONFIRMED'),
      onDecline: () => handleRosterUpdate(student.playerId, 'CANCELLED')
    })),
    ...pendingLessons.map((lesson, index) => ({
      id: lesson.id ?? lesson.lesson_id ?? `lesson-${index}`,
      type: 'lesson',
      name: lesson.player_name || lesson.student_name || lesson.studentName || lesson.title || 'Lesson request',
      detail: lesson.start_date_time ? 'lesson request' : 'lesson pending',
      onAccept: null,
      onDecline: null
    }))
  ];
  const notificationItems = actionItems;

  useEffect(() => {
    if (actionItems.length > 0) {
      setDismissedActionBar(false);
    }
  }, [actionItems.length]);

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

      <nav className="dashboard-header border-b border-gray-200 bg-white shadow-sm">
        <div className="mx-auto max-w-7xl px-4">
          <div className="flex h-16 items-center justify-between">
            <div className="flex items-center">
              <button
                type="button"
                onClick={() => onToggleMobileMenu(!showMobileMenu)}
                className="touch-target p-2 text-gray-500 transition hover:text-gray-700 md:hidden dashboard-mobile-toggle"
              >
                <Menu className="h-6 w-6" />
              </button>
              <div className="flex items-center dashboard-brand">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-purple-600 to-purple-700 text-lg">
                  🎾
                </div>
                <div className="ml-3 text-lg font-semibold text-gray-900 dashboard-brand-text">
                  The Tennis <span className="text-purple-600">Plan</span>
                </div>
              </div>
            </div>
            <div className="flex items-center space-x-2 dashboard-header-actions">
              <div className="hidden items-center gap-2 text-xs text-emerald-600 md:flex">
                <span className="h-2 w-2 rounded-full bg-emerald-500" />
                Synced just now
              </div>
              <div className="relative" ref={notificationRef}>
                <button
                  type="button"
                  onClick={() => setShowNotificationsDropdown((prev) => !prev)}
                  className="dashboard-header-btn"
                >
                  <Bell className="h-5 w-5" />
                  {notificationItems.length > 0 && (
                    <span className="notification-badge">{notificationItems.length}</span>
                  )}
                </button>
                {showNotificationsDropdown && (
                  <div className="notification-dropdown">
                    <div className="notification-dropdown-header">
                      <span className="notification-dropdown-title">Notifications</span>
                      <button type="button" className="notification-mark-read">
                        Mark all read
                      </button>
                    </div>
                    <div className="notification-dropdown-body">
                      {notificationItems.length === 0 && (
                        <div className="notification-empty">You&apos;re all caught up.</div>
                      )}
                      {notificationItems.map((item) => (
                        <div key={item.id} className="notification-item notification-item-unread">
                          <div className={`notification-icon notification-icon-${item.type}`}>
                            {item.type === 'roster' ? '👤' : '📅'}
                          </div>
                          <div className="notification-content">
                            <div className="notification-text">
                              <strong>{item.name}</strong> {item.detail}
                            </div>
                            <div className="notification-actions">
                              <button
                                type="button"
                                className="notification-btn approve"
                                onClick={item.onAccept || undefined}
                              >
                                {item.type === 'lesson' ? 'Confirm' : 'Accept'}
                              </button>
                              <button
                                type="button"
                                className="notification-btn decline"
                                onClick={item.onDecline || undefined}
                              >
                                Decline
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                    <div className="notification-dropdown-footer">
                      <button type="button" className="notification-view-all" onClick={onOpenNotifications}>
                        View all notifications
                      </button>
                    </div>
                  </div>
                )}
              </div>
              <button
                type="button"
                onClick={onOpenSettings}
                className="dashboard-header-btn"
              >
                <Settings className="h-5 w-5" />
                <span className="sr-only">Open settings</span>
              </button>
              <button
                type="button"
                onClick={onLogout}
                className="dashboard-header-btn dashboard-logout-btn"
              >
                <LogOut className="h-5 w-5" />
                <span className="sr-only">Log out</span>
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

      <StatsSummary stats={stats} />

      <main className="mx-auto max-w-7xl px-4 py-6 dashboard-main">
        <div className="flex flex-wrap items-center justify-between gap-3 dashboard-tabs-row">
          <div className="hidden w-full flex-wrap gap-2 sm:flex sm:w-auto sm:flex-nowrap dashboard-tabs">
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

          <div className="flex w-full flex-col items-start gap-1 text-sm text-gray-500 sm:w-auto sm:flex-row sm:items-center sm:gap-2 dashboard-secure-note">
            <Shield className="h-4 w-4 text-green-500" />
            <span>Secure portal • Last synced moments ago</span>
          </div>
        </div>

        {actionItems.length > 0 && !dismissedActionBar && (
          <div className="action-alert-bar">
            <div className="action-alert-left">
              <span className="action-alert-icon">⚡</span>
              <span className="action-alert-text">
                <strong>{actionItems.length} items</strong> need attention
              </span>
            </div>
            <div className="action-alert-items">
              {actionItems.map((item) => (
                <div key={item.id} className="action-alert-item">
                  <span>
                    {item.type === 'roster' ? '👤' : '📅'} <strong>{item.name}</strong> {item.detail}
                  </span>
                  <div className="action-alert-buttons">
                    <button
                      type="button"
                      className="action-alert-btn approve"
                      onClick={item.onAccept || undefined}
                    >
                      {item.type === 'lesson' ? 'Confirm' : 'Accept'}
                    </button>
                    <button
                      type="button"
                      className="action-alert-btn decline"
                      onClick={item.onDecline || undefined}
                    >
                      Decline
                    </button>
                  </div>
                </div>
              ))}
            </div>
            <button
              type="button"
              className="action-alert-dismiss"
              onClick={() => setDismissedActionBar(true)}
            >
              ×
            </button>
          </div>
        )}

        {dashboardTab === 'calendar' && (
          <CalendarSection
            calendarView={calendarView}
            onCalendarViewChange={onCalendarViewChange}
            currentDate={currentDate}
            onCurrentDateChange={onCurrentDateChange}
            onRangeChange={onRangeChange}
            lessons={bookedLessons}
            availability={
              Array.isArray(availabilityData?.schedule) && availabilityData.schedule.length > 0
                ? availabilityData.schedule
                : availabilityData
            }
            googleEvents={googleEvents}
            onLessonSelect={onLessonSelect}
            onAvailabilitySelect={handleAvailabilitySelect}
            onEmptySlotSelect={onEmptySlotSelect}
            onOpenAddAvailability={onOpenAddAvailability}
            onRequestAvailabilityOnboarding={onRequestAvailabilityOnboarding}
          />
        )}

        {dashboardTab === 'students' && (
          <StudentsSection
            studentSearchQuery={studentSearchQuery}
            onStudentSearchQueryChange={onStudentSearchQueryChange}
            studentsLoading={studentsLoading}
            studentsError={studentsError}
            onRefreshStudents={onRefreshStudents}
            activePackagesLoading={activePackagesLoading}
            activePackagesError={activePackagesError}
            filteredStudents={filteredStudents}
            activePackagesByPlayer={activePackagesByPlayer}
            rosterAction={rosterAction}
            onRosterUpdate={handleRosterUpdate}
            onStudentSelect={onStudentSelect}
            studentsHasMore={studentsHasMore}
            studentsLoadingMore={studentsLoadingMore}
            onLoadMoreStudents={onLoadMoreStudents}
          />
        )}

        {dashboardTab === 'earnings' && <EarningsSection stats={stats} />}

        {dashboardTab === 'packages' && (
          <PackagesSection
            packages={packages}
            packagesLoading={packagesLoading}
            packagesError={packagesError}
            onRefreshPackages={onRefreshPackages}
            onOpenCreatePackage={onOpenCreatePackage}
            currencyFormatter={currencyFormatter}
            formatLessonTypeLabel={formatLessonTypeLabel}
            formatValidityLabel={formatValidityLabel}
          />
        )}

        {dashboardTab === 'locations' && (
          <LocationsSection
            locationAction={locationAction}
            locationIdInput={locationIdInput}
            onLocationIdChange={setLocationIdInput}
            onAddLocation={handleAddLocation}
            customLocationForm={customLocationForm}
            onCustomLocationChange={setCustomLocationForm}
            onAddCustomLocation={handleAddCustomLocation}
            locationsLoading={locationsLoading}
            locationsError={locationsError}
            normalizedLocations={normalizedLocations}
            onDeleteLocation={handleDeleteLocation}
            onRefreshLocations={onRefreshLocations}
          />
        )}

      </main>

      <div className="dashboard-fab-container">
        {showFabMenu && (
          <div className="dashboard-fab-menu">
            <button type="button" className="dashboard-fab-menu-item">Set Availability</button>
            <button type="button" className="dashboard-fab-menu-item">Add Lesson</button>
            <button type="button" className="dashboard-fab-menu-item">Block Time</button>
          </div>
        )}
        <button
          type="button"
          className="dashboard-fab"
          onClick={() => setShowFabMenu((prev) => !prev)}
        >
          +
        </button>
      </div>

      <nav className="dashboard-bottom-nav">
        {[
          { key: 'calendar', label: 'Calendar', icon: '📅' },
          { key: 'students', label: 'Students', icon: '👥' },
          { key: 'earnings', label: 'Earnings', icon: '💵' },
          { key: 'packages', label: 'Packages', icon: '📦' },
          { key: 'locations', label: 'Locations', icon: '📍' }
        ].map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={() => onDashboardTabChange(tab.key)}
            className={`dashboard-bottom-nav-item ${dashboardTab === tab.key ? 'active' : ''}`}
          >
            <span className="dashboard-bottom-nav-icon">{tab.icon}</span>
            <span className="dashboard-bottom-nav-label">{tab.label}</span>
          </button>
        ))}
      </nav>
    </div>
  );
};

export default DashboardPage;
