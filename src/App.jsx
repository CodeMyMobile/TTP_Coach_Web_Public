import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import DashboardPage from './components/dashboard/DashboardPage';
import OnboardingFlow from './components/onboarding/OnboardingFlow';
import AvailabilityModal from './components/modals/AvailabilityModal';
import ConfirmationDialog from './components/modals/ConfirmationDialog';
import CreatePackageModal from './components/modals/CreatePackageModal';
import LessonDetailModal from './components/modals/LessonDetailModal';
import LoginPage from './components/auth/LoginPage';
import { useCoachSchedule } from './hooks/useCoachSchedule';
import { useCoachStudents } from './hooks/useCoachStudents';
import useCoachProfile from './hooks/useCoachProfile';
import useAuth from './hooks/useAuth.jsx';
import { createDefaultProfile } from './constants/profile';
import { listCoachPackages } from './api/CoachApi/packages';
import {
  addCoachCustomLocation,
  addCoachLocation,
  deleteCoachLocation,
  getCoachLocations,
  scheduleCoachLesson
} from './api/coach';
import CreateLessonModal from './components/modals/CreateLessonModal';
import LessonCreatedSuccessModal from './components/modals/LessonCreatedSuccessModal';
import GoogleCalendarSyncPage from './components/settings/GoogleCalendarSyncPage';
import { coachStripePaymentIntent, updateCoachLessons } from './api/coach';
import NotificationsPage from './components/notifications/NotificationsPage';
import StudentDetailModal from './components/modals/StudentDetailModal';
import { getCoachPlayerPreviousLessons } from './services/coach';

const resolvePackagesFromPayload = (payload) => {
  if (Array.isArray(payload)) {
    return payload;
  }

  if (payload && typeof payload === 'object') {
    if (Array.isArray(payload.packages)) {
      return payload.packages;
    }

    if (Array.isArray(payload.data?.packages)) {
      return payload.data.packages;
    }

    if (Array.isArray(payload.data)) {
      return payload.data;
    }

    if (Array.isArray(payload.result)) {
      return payload.result;
    }

    if (Array.isArray(payload.items)) {
      return payload.items;
    }
  }

  return [];
};

const defaultProfile = createDefaultProfile();

const formatDuration = (duration) => {
  const hours = Math.floor(duration / 2);
  const hasHalfHour = duration % 2 === 1;

  if (hours === 0 && hasHalfHour) return '30 min';
  if (hours === 1 && !hasHalfHour) return '1 hour';
  if (hours === 1 && hasHalfHour) return '1.5 hours';
  if (hours > 1 && !hasHalfHour) return `${hours} hours`;
  if (hours > 1 && hasHalfHour) return `${hours}.5 hours`;
  return `${duration * 30} min`;
};

const addMinutesToTime = (time, minutes) => {
  const [hour, minute] = time.split(':').map(Number);
  const date = new Date();
  date.setHours(hour, minute + minutes, 0, 0);
  return date.toTimeString().slice(0, 5);
};

function App() {
  const { user, initialising: authInitialising, logout } = useAuth();
  const isAuthenticated = Boolean(user);
  const basePath = import.meta.env.BASE_URL || '/';
  const normalizePath = useCallback(
    (pathname) => {
      if (!pathname) {
        return '/';
      }

      if (basePath === '/') {
        return pathname;
      }

      const normalizedBase = basePath.endsWith('/') ? basePath : `${basePath}/`;

      if (!pathname.startsWith(normalizedBase)) {
        return pathname;
      }

      const remainder = pathname.slice(normalizedBase.length);
      return remainder ? `/${remainder}` : '/';
    },
    [basePath]
  );
  const buildPath = useCallback(
    (pathname) => {
      if (basePath === '/') {
        return pathname;
      }

      const normalizedBase = basePath.endsWith('/') ? basePath.slice(0, -1) : basePath;
      const normalizedPath = pathname.startsWith('/') ? pathname : `/${pathname}`;
      return `${normalizedBase}${normalizedPath}`;
    },
    [basePath]
  );
  const [currentPath, setCurrentPath] = useState(() => normalizePath(window.location.pathname));
  const {
    profile: remoteProfile,
    isComplete: remoteProfileComplete,
    loading: profileLoading,
    error: profileError,
    hasFetched: profileFetched,
    saveProfile,
    refreshProfile
  } = useCoachProfile({ enabled: isAuthenticated });
  const [isProfileComplete, setIsProfileComplete] = useState(false);
  const [profileData, setProfileData] = useState(defaultProfile);
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [onboardingInitialStep, setOnboardingInitialStep] = useState(0);
  const [dashboardTab, setDashboardTab] = useState('calendar');
  const [calendarView, setCalendarView] = useState('week');
  const [currentDate, setCurrentDate] = useState(() => new Date());
  const [visibleCalendarDates, setVisibleCalendarDates] = useState([]);
  const [showAddLessonModal, setShowAddLessonModal] = useState(false);
  const [showCreatePackageModal, setShowCreatePackageModal] = useState(false);
  const [showLessonDetailModal, setShowLessonDetailModal] = useState(false);
  const [showCreateLessonModal, setShowCreateLessonModal] = useState(false);
  const [lessonDraft, setLessonDraft] = useState(null);
  const [lessonSubmitError, setLessonSubmitError] = useState(null);
  const [lessonSubmitLoading, setLessonSubmitLoading] = useState(false);
  const [lessonCreatedSuccess, setLessonCreatedSuccess] = useState(null);
  const [selectedLessonDetail, setSelectedLessonDetail] = useState(null);
  const [showCancelConfirmation, setShowCancelConfirmation] = useState(false);
  const [isEditingLesson, setIsEditingLesson] = useState(false);
  const [lessonEditData, setLessonEditData] = useState(null);
  const [studentSearchQuery, setStudentSearchQuery] = useState('');
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [showStudentDetailModal, setShowStudentDetailModal] = useState(false);
  const [studentLessons, setStudentLessons] = useState([]);
  const [studentLessonsPage, setStudentLessonsPage] = useState(1);
  const [studentLessonsHasMore, setStudentLessonsHasMore] = useState(true);
  const [studentLessonsLoading, setStudentLessonsLoading] = useState(false);
  const [studentLessonsLoadingMore, setStudentLessonsLoadingMore] = useState(false);
  const [studentLessonsError, setStudentLessonsError] = useState(null);
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const [adHocSlot, setAdHocSlot] = useState({
    date: '',
    start: '09:00',
    end: '10:00',
    location: '',
    location_id: null
  });
  const [adHocAvailability, setAdHocAvailability] = useState({});
  const [isMobile, setIsMobile] = useState(false);
  const [packagesLoading, setPackagesLoading] = useState(false);
  const [packagesError, setPackagesError] = useState(null);
  const packagesFetchedRef = useRef(false);
  const [coachLocations, setCoachLocations] = useState([]);
  const [locationsLoading, setLocationsLoading] = useState(false);
  const [locationsError, setLocationsError] = useState(null);
  const isLoginRoute = currentPath === '/';
  const isDashboardRoute = currentPath === '/dashboard';
  const isSettingsRoute = currentPath === '/settings';
  const isNotificationsRoute = currentPath === '/notifications';
  const isGoogleCalendarRoute = currentPath === '/google-calendar';
  const isGoogleRedirectRoute = currentPath === '/redirect';

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  useEffect(() => {
    setProfileData(remoteProfile);
  }, [remoteProfile]);

  useEffect(() => {
    if (!isEditingProfile) {
      setIsProfileComplete(remoteProfileComplete);
    }
  }, [remoteProfileComplete, isEditingProfile]);

  useEffect(() => {
    if (profileError) {
      console.error('Failed to load coach profile', profileError);
    }
  }, [profileError]);

  useEffect(() => {
    if (!isAuthenticated) {
      setProfileData(defaultProfile);
      setIsProfileComplete(false);
      setIsEditingProfile(false);
      setOnboardingInitialStep(0);
      setPackagesLoading(false);
      setPackagesError(null);
      packagesFetchedRef.current = false;
      setCoachLocations([]);
      setLocationsLoading(false);
      setLocationsError(null);
    }
  }, [isAuthenticated]);

  const navigate = useCallback((nextPath, { replace = false } = {}) => {
    const targetPath = buildPath(nextPath);

    if (window.location.pathname === targetPath) {
      return;
    }

    if (replace) {
      window.history.replaceState(null, '', targetPath);
    } else {
      window.history.pushState(null, '', targetPath);
    }
    setCurrentPath(normalizePath(targetPath));
  }, [buildPath, normalizePath]);

  useEffect(() => {
    const handlePopState = () => setCurrentPath(normalizePath(window.location.pathname));
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [normalizePath]);

  useEffect(() => {
    if (authInitialising) {
      return;
    }

    if (!isAuthenticated && !isLoginRoute) {
      navigate('/', { replace: true });
      return;
    }

    if (
      isAuthenticated &&
      !isDashboardRoute &&
      !isSettingsRoute &&
      !isNotificationsRoute &&
      !isGoogleCalendarRoute &&
      !isGoogleRedirectRoute
    ) {
      navigate('/dashboard', { replace: true });
    }
  }, [
    authInitialising,
    isAuthenticated,
    isLoginRoute,
    isDashboardRoute,
    isSettingsRoute,
    isNotificationsRoute,
    isGoogleCalendarRoute,
    isGoogleRedirectRoute,
    navigate
  ]);

  const {
    students,
    loading: studentsLoading,
    loadingMore: studentsLoadingMore,
    error: studentsError,
    hasMore: studentsHasMore,
    loadMore: loadMoreStudents,
    page: studentsPage,
    perPage: studentsPerPage,
    refresh: refreshStudents
  } = useCoachStudents({
    enabled: isProfileComplete && isAuthenticated,
    perPage: 5,
    search: studentSearchQuery
  });

  const resolvePreviousLessons = useCallback((payload) => {
    if (Array.isArray(payload)) {
      return payload;
    }

    if (payload && Array.isArray(payload.lessons)) {
      return payload.lessons;
    }

    if (payload && Array.isArray(payload.data)) {
      return payload.data;
    }

    if (payload && Array.isArray(payload.items)) {
      return payload.items;
    }

    return [];
  }, []);

  const fetchStudentPreviousLessons = useCallback(
    async ({ playerId, page = 1, replace = false } = {}) => {
      if (!playerId) {
        return;
      }

      if (page === 1) {
        setStudentLessonsLoading(true);
      } else {
        setStudentLessonsLoadingMore(true);
      }

      setStudentLessonsError(null);

      try {
        const payload = await getCoachPlayerPreviousLessons({
          playerId,
          perPage: 10,
          page
        });
        const lessons = resolvePreviousLessons(payload);
        setStudentLessons((prev) => (replace ? lessons : [...prev, ...lessons]));
        setStudentLessonsHasMore(lessons.length >= 10);
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Failed to load previous lessons.';
        setStudentLessonsError(message);
      } finally {
        setStudentLessonsLoading(false);
        setStudentLessonsLoadingMore(false);
      }
    },
    [resolvePreviousLessons]
  );

  const {
    lessons,
    upcomingLessons,
    availability: scheduleAvailability,
    stats: scheduleStats,
    googleEvents: scheduleGoogleEvents,
    loading: scheduleLoading,
    error: scheduleError,
    refresh: refreshSchedule,
    addAvailabilitySlot,
    updateLesson: persistLesson,
    mutationError: scheduleMutationError,
    mutationLoading: scheduleMutationLoading
  } = useCoachSchedule({
    enabled: isProfileComplete && isAuthenticated,
    date: currentDate,
    dates: visibleCalendarDates
  });
  const handleCalendarRangeChange = useCallback((range) => {
    if (!range) {
      setVisibleCalendarDates([]);
      return;
    }

    if (Array.isArray(range)) {
      setVisibleCalendarDates(range);
      return;
    }

    if (range instanceof Date) {
      setVisibleCalendarDates([range]);
      return;
    }

    if (range?.start && range?.end) {
      const dates = [];
      const start = new Date(range.start);
      const end = new Date(range.end);

      if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
        setVisibleCalendarDates([]);
        return;
      }

      const cursor = new Date(start);
      cursor.setHours(0, 0, 0, 0);
      const endCursor = new Date(end);
      endCursor.setHours(0, 0, 0, 0);

      while (cursor <= endCursor) {
        dates.push(new Date(cursor));
        cursor.setDate(cursor.getDate() + 1);
      }

      setVisibleCalendarDates(dates);
      return;
    }

    setVisibleCalendarDates([]);
  }, []);

  const fetchPackages = useCallback(
    async ({ force = false } = {}) => {
      if (!isAuthenticated) {
        return;
      }

      if (packagesLoading && !force) {
        return;
      }

      setPackagesLoading(true);
      setPackagesError(null);

      try {
        const response = await listCoachPackages();

        if (!response) {
          throw new Error('Your session has expired. Please sign in again.');
        }

        if (!response.ok) {
          let message = 'Failed to load packages. Please try again.';
          try {
            const errorBody = await response.json();
            message =
              errorBody?.message ||
              errorBody?.error ||
              errorBody?.errors?.[0] ||
              message;
          } catch {
            // Ignore JSON parse errors.
          }

          throw new Error(message);
        }

        const payload = await response.json().catch(() => null);
        const packages = resolvePackagesFromPayload(payload);

        setProfileData((previousProfile) => ({
          ...previousProfile,
          packages
        }));
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Failed to load packages.';
        setPackagesError(message);
        console.error('Failed to fetch packages', error);
      } finally {
        packagesFetchedRef.current = true;
        setPackagesLoading(false);
      }
    },
    [isAuthenticated, packagesLoading, setProfileData, resolvePackagesFromPayload, packagesFetchedRef]
  );

  const refreshPackages = useCallback(() => fetchPackages({ force: true }), [fetchPackages]);

  const normalizeLocations = useCallback((payload) => {
    if (Array.isArray(payload)) {
      return payload;
    }

    if (payload && Array.isArray(payload.locations)) {
      return payload.locations;
    }

    if (payload && Array.isArray(payload.data)) {
      return payload.data;
    }

    if (payload && Array.isArray(payload.result)) {
      return payload.result;
    }

    return [];
  }, []);

  const fetchLocations = useCallback(async () => {
    if (!isAuthenticated) {
      return;
    }

    setLocationsLoading(true);
    setLocationsError(null);

    try {
      const response = await getCoachLocations(user?.session?.access_token);

      if (!response) {
        throw new Error('Your session has expired. Please sign in again.');
      }

      if (!response.ok) {
        let message = 'Failed to load locations. Please try again.';
        try {
          const errorBody = await response.json();
          message =
            errorBody?.message ||
            errorBody?.error ||
            errorBody?.errors?.[0] ||
            message;
        } catch {
          // Ignore JSON parse errors.
        }
        throw new Error(message);
      }

      const payload = await response.json().catch(() => null);
      setCoachLocations(normalizeLocations(payload));
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to load locations.';
      setLocationsError(message);
    } finally {
      setLocationsLoading(false);
    }
  }, [isAuthenticated, normalizeLocations, user?.session?.access_token]);

  const refreshLocations = useCallback(() => fetchLocations(), [fetchLocations]);

  useEffect(() => {
    if (!isAuthenticated || dashboardTab !== 'packages') {
      return;
    }

    if (!packagesFetchedRef.current) {
      fetchPackages();
    }
  }, [dashboardTab, fetchPackages, isAuthenticated, packagesFetchedRef]);

  useEffect(() => {
    if (dashboardTab !== 'packages') {
      packagesFetchedRef.current = false;
    }
  }, [dashboardTab, packagesFetchedRef]);

  const handleAddLocationById = useCallback(
    async (locationId) => {
      if (!locationId || !isAuthenticated) {
        return { error: 'A location id is required.' };
      }

      try {
        const response = await addCoachLocation({
          coachAccessToken: user?.session?.access_token,
          location_id: Number(locationId)
        });

        if (!response?.ok) {
          const errorBody = await response?.json().catch(() => null);
          throw new Error(errorBody?.message || errorBody?.error || 'Failed to add location.');
        }

        await fetchLocations();
        return { ok: true };
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Failed to add location.';
        return { error: message };
      }
    },
    [fetchLocations, isAuthenticated, user?.session?.access_token]
  );

  const handleAddCustomLocation = useCallback(
    async ({ location, latitude, longitude }) => {
      if (!location || latitude === '' || longitude === '' || !isAuthenticated) {
        return { error: 'Location name, latitude, and longitude are required.' };
      }

      try {
        const response = await addCoachCustomLocation({
          coachAccessToken: user?.session?.access_token,
          location,
          latitude: Number(latitude),
          longitude: Number(longitude)
        });

        if (!response?.ok) {
          const errorBody = await response?.json().catch(() => null);
          throw new Error(errorBody?.message || errorBody?.error || 'Failed to add location.');
        }

        await fetchLocations();
        return { ok: true };
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Failed to add location.';
        return { error: message };
      }
    },
    [fetchLocations, isAuthenticated, user?.session?.access_token]
  );

  const handleDeleteLocation = useCallback(
    async (locationId) => {
      if (!locationId || !isAuthenticated) {
        return { error: 'A location id is required.' };
      }

      try {
        const response = await deleteCoachLocation({
          coachAccessToken: user?.session?.access_token,
          location_id: locationId
        });

        if (!response?.ok) {
          const errorBody = await response?.json().catch(() => null);
          throw new Error(errorBody?.message || errorBody?.error || 'Failed to delete location.');
        }

        await fetchLocations();
        return { ok: true };
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Failed to delete location.';
        return { error: message };
      }
    },
    [fetchLocations, isAuthenticated, user?.session?.access_token]
  );

  useEffect(() => {
    if (!isAuthenticated || (dashboardTab !== 'locations' && dashboardTab !== 'calendar')) {
      return;
    }

    fetchLocations();
  }, [dashboardTab, fetchLocations, isAuthenticated]);

  const recurringAvailability = useMemo(() => {
    if (!scheduleAvailability?.weekly || Object.keys(scheduleAvailability.weekly).length === 0) {
      return profileData.availability;
    }
    return scheduleAvailability.weekly;
  }, [scheduleAvailability, profileData.availability]);

  const recurringAvailabilityLocations = useMemo(() => {
    if (!scheduleAvailability?.weeklyLocations || Object.keys(scheduleAvailability.weeklyLocations).length === 0) {
      return profileData.availabilityLocations;
    }
    return scheduleAvailability.weeklyLocations;
  }, [scheduleAvailability, profileData.availabilityLocations]);

  const remoteAdHocAvailability = useMemo(() => {
    if (!scheduleAvailability?.adHoc) {
      return {};
    }

    return scheduleAvailability.adHoc.reduce((acc, slot) => {
      const dateKey = slot?.date;
      const startKey = slot?.start || slot?.startTime;
      if (!dateKey || !startKey) {
        return acc;
      }

      const endTime = slot.end || slot.endTime || slot.finish;
      const location = slot.location || slot.court || '';

      if (!acc[dateKey]) {
        acc[dateKey] = {};
      }

      acc[dateKey][startKey] = {
        type: slot.type || 'ad-hoc',
        location,
        endTime
      };
      return acc;
    }, {});
  }, [scheduleAvailability]);

  const combinedAdHocAvailability = useMemo(() => {
    const merged = { ...remoteAdHocAvailability };
    Object.entries(adHocAvailability).forEach(([date, slots]) => {
      merged[date] = {
        ...(merged[date] || {}),
        ...slots
      };
    });
    return merged;
  }, [remoteAdHocAvailability, adHocAvailability]);

  const handleCancelLesson = () => setShowCancelConfirmation(true);

  const confirmCancelLesson = () => {
    setShowCancelConfirmation(false);
    setShowLessonDetailModal(false);
    setSelectedLessonDetail(null);
  };

  const handleEditLesson = () => {
    if (!selectedLessonDetail) {
      return;
    }
    setIsEditingLesson(true);
    setLessonEditData({ ...selectedLessonDetail });
  };

  const handleCancelEdit = () => {
    setIsEditingLesson(false);
    setLessonEditData(null);
  };

  const handleSaveLesson = async () => {
    if (!lessonEditData?.id) {
      handleCancelEdit();
      return;
    }

    try {
      const updatedLesson = await persistLesson(lessonEditData.id, lessonEditData);
      setSelectedLessonDetail(updatedLesson || lessonEditData);
      setIsEditingLesson(false);
    } catch (error) {
      console.error('Failed to save lesson', error);
    }
  };


  const handleLessonSelect = (lesson) => {
    setSelectedLessonDetail(lesson);
    setIsEditingLesson(false);
    setLessonEditData(null);
    setShowLessonDetailModal(true);
  };

  const handleStudentSelect = (student) => {
    if (!student?.playerId) {
      return;
    }

    setSelectedStudent(student);
    setShowStudentDetailModal(true);
    setStudentLessons([]);
    setStudentLessonsPage(1);
    setStudentLessonsHasMore(true);
    fetchStudentPreviousLessons({ playerId: student.playerId, page: 1, replace: true });
  };

  const handleAvailabilitySlotSelect = (availability) => {
    if (availability) {
      handleCreateLessonFromAvailability(availability);
      return;
    }

    setSelectedLessonDetail(availability);
    setIsEditingLesson(false);
    setLessonEditData(null);
    setShowLessonDetailModal(true);
  };

  const parseDateTime = (date, time) => {
    if (!date || !time) {
      return null;
    }
    const [hour, minute] = String(time).split(':').map(Number);
    const parsed = new Date(date);
    if (Number.isNaN(parsed.getTime())) {
      return null;
    }
    parsed.setHours(hour || 0, minute || 0, 0, 0);
    return parsed;
  };

  const handleCreateLessonFromAvailability = (availability) => {
    const start = parseDateTime(availability?.date, availability?.start);
    const end = parseDateTime(availability?.date, availability?.end);
    setLessonDraft({
      start,
      end,
      location_id: availability?.location_id ?? null,
      court: availability?.court ?? null,
      lessontype_id: 1,
      playerIds: [],
      invitees: [],
      metadata: {
        title: '',
        level: 'All',
        duration: start && end ? String(Math.max(0, Math.round((end - start) / 60000))) : '',
        description: '',
        recurrence: {
          frequency: '',
          count: ''
        }
      },
      price_per_person: '',
      player_limit: ''
    });
    setShowLessonDetailModal(false);
    setShowCreateLessonModal(true);
  };

  const handleCreateLessonOpen = () => {
    const defaultLocation = resolveDefaultLocation();
    setLessonDraft({
      start: null,
      end: null,
      location_id: defaultLocation.location_id ?? null,
      court: null,
      lessontype_id: 1,
      playerIds: [],
      invitees: [],
      metadata: {
        title: '',
        level: 'All',
        duration: '',
        description: '',
        recurrence: {
          frequency: '',
          count: ''
        }
      },
      price_per_person: '',
      player_limit: ''
    });
    setShowLessonDetailModal(false);
    setShowCreateLessonModal(true);
  };

  const handleCloseStudentDetail = () => {
    setShowStudentDetailModal(false);
    setSelectedStudent(null);
    setStudentLessonsError(null);
  };

  const handleLoadMoreStudentLessons = () => {
    if (!selectedStudent?.playerId || studentLessonsLoadingMore || !studentLessonsHasMore) {
      return;
    }

    const nextPage = studentLessonsPage + 1;
    setStudentLessonsPage(nextPage);
    fetchStudentPreviousLessons({ playerId: selectedStudent.playerId, page: nextPage });
  };

  const handleEmptySlotSelect = ({ date, start, location }) => {
    const defaultLocation = resolveDefaultLocation();
    setAdHocSlot({
      date,
      start,
      end: addMinutesToTime(start, 60),
      location: location || defaultLocation.location,
      location_id: defaultLocation.location_id
    });
    setShowAddLessonModal(true);
  };

  const handleAddAvailabilityOpen = () => {
    const today = new Date().toISOString().split('T')[0];
    const defaultLocation = resolveDefaultLocation();
    setAdHocSlot({
      date: today,
      start: '09:00',
      end: '10:00',
      location: defaultLocation.location,
      location_id: defaultLocation.location_id
    });
    setShowAddLessonModal(true);
  };

  const handleAddAdHocAvailability = async () => {
    if (adHocSlot.date && adHocSlot.start && adHocSlot.end && adHocSlot.location) {
      const payload = {
        type: 'ad-hoc',
        date: adHocSlot.date,
        start: adHocSlot.start,
        end: adHocSlot.end,
        location: adHocSlot.location,
        location_id: adHocSlot.location_id
      };

      try {
        const createdSlot = await addAvailabilitySlot(payload);
        const resolvedEndTime = createdSlot?.end || createdSlot?.endTime || adHocSlot.end;
        setAdHocAvailability((prev) => ({
          ...prev,
          [adHocSlot.date]: {
            ...(prev[adHocSlot.date] || {}),
            [adHocSlot.start]: {
              type: createdSlot?.type || 'ad-hoc',
              location: createdSlot?.location || adHocSlot.location,
              endTime: resolvedEndTime
            }
          }
        }));
        setShowAddLessonModal(false);
        setAdHocSlot({
          date: '',
          start: '09:00',
          end: '10:00',
          location: '',
          location_id: null
        });
      } catch (error) {
        console.error('Failed to add availability slot', error);
      }
    }
  };

  const handleCreateLessonSubmit = async (form) => {
    if (!form?.start || !form?.end) {
      setLessonSubmitError('Start and end time are required.');
      return;
    }

    const startMoment = new Date(form.start);
    const endMoment = new Date(form.end);
    if (Number.isNaN(startMoment.getTime()) || Number.isNaN(endMoment.getTime())) {
      setLessonSubmitError('Invalid date/time values.');
      return;
    }

    const durationMin = parseInt(form.metadata?.duration, 10);
    let resolvedEnd = endMoment;
    if (Number(form.lessontype_id) === 3 && Number.isFinite(durationMin) && durationMin > 0) {
      resolvedEnd = new Date(startMoment.getTime() + durationMin * 60000);
    }

    const formatLocalIso = (date) => {
      const pad = (value) => String(value).padStart(2, '0');
      return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}:00`;
    };

    const courtValue = form.court === '' || form.court === undefined || form.court === null
      ? null
      : Number.isFinite(Number(form.court))
        ? Number(form.court)
        : null;

    const recurrence = form.metadata?.recurrence || { frequency: 'NONE', count: '' };
    const selectedPlayerIds = Array.isArray(form.playerIds)
      ? form.playerIds
          .map((id) => Number(id))
          .filter((id) => Number.isFinite(id) && id > 0)
      : [];
    const invitees = Array.isArray(form.invitees)
      ? form.invitees
          .map((invitee) => {
            const fullName = String(invitee?.full_name || '').trim();
            const phone = String(invitee?.phone || '').trim();
            const email = String(invitee?.email || '').trim();

            if (!fullName || (!phone && !email)) {
              return null;
            }

            return phone ? { full_name: fullName, phone } : { full_name: fullName, email };
          })
          .filter(Boolean)
      : [];

    const selectedPlayersForSummary = resolvedStudents.filter((player) =>
      selectedPlayerIds.includes(Number(player.playerId ?? player.id ?? player.user_id))
    );

    const payload = {
      start_date_time: new Date(`${formatLocalIso(startMoment)}Z`).toISOString(),
      end_date_time: new Date(`${formatLocalIso(resolvedEnd)}Z`).toISOString(),
      start_date_time_tz: startMoment.toISOString(),
      end_date_time_tz: resolvedEnd.toISOString(),
      location_id: form.location_id,
      court: courtValue,
      status: 'PENDING',
      lessontype_id: Number(form.lessontype_id),
      recurrence: {
        frequency: recurrence.frequency || 'NONE',
        count: recurrence.count ?? ''
      },
      metadata: {
        title: form.metadata?.title || '',
        level: form.metadata?.level || 'All',
        description: form.metadata?.description || '',
        duration: String(Math.round((resolvedEnd - startMoment) / 60000)),
        recurrence
      }
    };

    if (payload.lessontype_id === 1) {
      const totalPrivatePlayers = selectedPlayerIds.length + invitees.length;
      if (totalPrivatePlayers !== 1) {
        setLessonSubmitError('Add exactly one player for a private lesson (existing player or phone/email invitee).');
        return;
      }

      if (selectedPlayerIds.length === 1) {
        payload.player_id = Number(selectedPlayerIds[0]);
      } else {
        payload.player = invitees[0];
      }
      delete payload.recurrence;
    } else if (payload.lessontype_id === 2) {
      const semiPrivatePlayers = [
        ...selectedPlayerIds.map((id) => ({ player_id: Number(id) })),
        ...invitees
      ];

      if (semiPrivatePlayers.length === 0) {
        setLessonSubmitError('Add at least one player for a semi-private lesson.');
        return;
      }
      if (!form.price_per_person) {
        setLessonSubmitError('Enter a price per person for a semi-private lesson.');
        return;
      }
      payload.player_ids_arr = semiPrivatePlayers;
      payload.price_per_person = Number(form.price_per_person);
      delete payload.recurrence;
    } else if (payload.lessontype_id === 3) {
      if (!form.price_per_person) {
        setLessonSubmitError('Enter a price per person for open group lessons.');
        return;
      }
      if (!form.player_limit) {
        setLessonSubmitError('Enter a player limit for open group lessons.');
        return;
      }
      if (recurrence?.frequency) {
        payload.recurrence = recurrence;
      }
      payload.price_per_person = Number(form.price_per_person);
      payload.player_limit = Number(form.player_limit);
      if (selectedPlayerIds.length > 0 || invitees.length > 0) {
        payload.player_ids_arr = [
          ...selectedPlayerIds.map((id) => ({ player_id: Number(id) })),
          ...invitees
        ];
      }
    }

    setLessonSubmitError(null);
    setLessonSubmitLoading(true);
    try {
      const response = await scheduleCoachLesson({
        coachAccessToken: user?.session?.access_token,
        lessonData: payload
      });

      if (!response?.ok) {
        const errorBody = await response?.json().catch(() => null);
        throw new Error(errorBody?.message || errorBody?.error || 'Failed to create lesson.');
      }

      await refreshSchedule();

      const primaryExistingPlayer = selectedPlayersForSummary[0];
      const primaryInvitee = invitees[0];
      const playerName = primaryExistingPlayer?.full_name || primaryExistingPlayer?.name || primaryInvitee?.full_name || 'Player';
      const playerFirstName = playerName.split(' ')[0] || playerName;
      const lessonTypeId = Number(payload.lessontype_id);
      const priceLabel = lessonTypeId === 1
        ? `$${Math.round(Number(profileData.hourly_rate ?? profileData.price_private ?? 0) || 0)}`
        : form.price_per_person
          ? `$${form.price_per_person} per person`
          : '$0';
      const coachFirstName = String(profileData.full_name || '').trim().split(' ')[0];

      setLessonCreatedSuccess({
        lessonId: response?.lesson?.id || response?.data?.id || null,
        start: startMoment,
        location: form.location,
        lessonTypeId,
        priceLabel,
        playerName,
        playerFirstName,
        playerPhone: primaryInvitee?.phone || '',
        coachName: coachFirstName ? `Coach ${coachFirstName}` : 'Coach',
        inviteMethod: primaryInvitee?.phone ? 'sms' : 'app'
      });

      setShowCreateLessonModal(false);
      setLessonDraft(null);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to create lesson.';
      setLessonSubmitError(message);
    } finally {
      setLessonSubmitLoading(false);
    }
  };

  const resolveDefaultLocation = useCallback(() => {
    if (coachLocations.length === 0) {
      return {
        location: profileData.home_courts[0] || '',
        location_id: null
      };
    }

    const first = coachLocations[0] || {};
    const location = first.location || first.name || first.address || '';
    const locationId = first.location_id ?? first.locationId ?? null;

    return {
      location,
      location_id: locationId
    };
  }, [coachLocations, profileData.home_courts]);

  const handlePackageCreated = (newPackage) => {
    if (!newPackage) {
      return;
    }

    setProfileData((previousProfile) => {
      const previousPackages = Array.isArray(previousProfile.packages)
        ? previousProfile.packages
        : [];

      const filteredPackages = previousPackages.filter(
        (existingPackage) => existingPackage?.id !== newPackage.id
      );

      return {
        ...previousProfile,
        packages: [newPackage, ...filteredPackages]
      };
    });
    setPackagesError(null);
    packagesFetchedRef.current = true;
  };

  const handleOnboardingComplete = async (data) => {
    try {
      const result = await saveProfile(data);
      const resolvedProfile = result?.profile ? { ...result.profile } : { ...profileData, ...data };
      setProfileData(resolvedProfile);
      setIsProfileComplete(Boolean(result?.isComplete ?? true));
      setIsEditingProfile(false);
      setOnboardingInitialStep(0);
      return { data: resolvedProfile };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to save profile';
      return { error: message };
    }
  };

  const handleEditProfile = () => {
    setOnboardingInitialStep(0);
    setIsEditingProfile(true);
    setIsProfileComplete(false);
  };

  const handleRequestAvailabilityOnboarding = () => {
    setOnboardingInitialStep(8);
    setIsEditingProfile(true);
    setIsProfileComplete(false);
  };

  const handleCloseLessonDetail = () => {
    setShowLessonDetailModal(false);
    setIsEditingLesson(false);
    setLessonEditData(null);
  };

  const handleAcceptRequest = async () => {
    if (!selectedLessonDetail?.id) {
      setShowLessonDetailModal(false);
      return;
    }

    if (selectedLessonDetail.status === 1) {
      setShowLessonDetailModal(false);
      return;
    }

    try {
      const response = await coachStripePaymentIntent({
        coachAccessToken: user?.session?.access_token,
        lessonId: selectedLessonDetail.id
      });

      await refreshSchedule();

      if (response?.status === 200 || response?.status === 201) {
        window.alert('The lesson booked successfully!!');
      } else {
        window.alert('Something went wrong!!');
      }
    } catch (error) {
      console.error('Failed to accept lesson request', error);
      window.alert('Something went wrong!!');
    } finally {
      setShowLessonDetailModal(false);
    }
  };

  const handleDeclineRequest = async () => {
    if (!selectedLessonDetail?.id) {
      setShowLessonDetailModal(false);
      return;
    }

    if (selectedLessonDetail.status === 'CANCELLED') {
      setShowLessonDetailModal(false);
      return;
    }

    try {
      const response = await updateCoachLessons(
        user?.session?.access_token,
        selectedLessonDetail.id,
        { status: 'CANCELLED' }
      );

      await refreshSchedule();

      if (response?.status === 200) {
        window.alert('The lesson cancelled successfully!!');
      } else {
        window.alert('Something went wrong!!');
      }
    } catch (error) {
      console.error('Failed to cancel lesson request', error);
      window.alert('Something went wrong!!');
    } finally {
      setShowLessonDetailModal(false);
    }
  };

  const resolvedStudents = useMemo(() => (
    Array.isArray(students) ? students : students?.students || []
  ), [students]);

  const shouldShowOnboarding = (!isProfileComplete || isEditingProfile) && isAuthenticated;

  if (authInitialising) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-white text-gray-600">
        Loading...
      </div>
    );
  }

  if (!isAuthenticated) {
    return <LoginPage />;
  }

  if (!isEditingProfile && !profileFetched && profileLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-white text-gray-600">
        Loading profile...
      </div>
    );
  }

  if (shouldShowOnboarding) {
    return (
      <OnboardingFlow
        initialData={profileData}
        initialStep={onboardingInitialStep}
        onComplete={handleOnboardingComplete}
        onRefreshProfile={refreshProfile}
        isMobile={isMobile}
      />
    );
  }

  return (
    <>
      {isSettingsRoute ? (
        <OnboardingFlow
          initialData={profileData}
          initialStep={0}
          onComplete={handleOnboardingComplete}
          onRefreshProfile={refreshProfile}
          isMobile={isMobile}
          isSettingsMode
          onBack={() => navigate('/dashboard')}
          onOpenGoogleCalendar={() => navigate('/google-calendar')}
        />
      ) : isGoogleCalendarRoute || isGoogleRedirectRoute ? (
        <GoogleCalendarSyncPage onBack={() => navigate('/settings')} />
      ) : isNotificationsRoute ? (
        <NotificationsPage onBack={() => navigate('/dashboard')} />
      ) : (
        <DashboardPage
          profile={profileData}
          isMobile={isMobile}
          dashboardTab={dashboardTab}
          onDashboardTabChange={setDashboardTab}
          calendarView={calendarView}
          onCalendarViewChange={setCalendarView}
          currentDate={currentDate}
          onCurrentDateChange={setCurrentDate}
          onRangeChange={handleCalendarRangeChange}
          studentsData={students}
          studentsLoading={studentsLoading}
          studentsLoadingMore={studentsLoadingMore}
          studentsError={studentsError}
          onRefreshStudents={refreshStudents}
          studentsHasMore={studentsHasMore}
          onLoadMoreStudents={loadMoreStudents}
          studentsPage={studentsPage}
          studentsPerPage={studentsPerPage}
          lessonsData={lessons}
          upcomingLessonsData={upcomingLessons}
          availabilityData={scheduleAvailability}
          googleEvents={scheduleGoogleEvents}
          statsData={scheduleStats}
          scheduleLoading={scheduleLoading}
          scheduleError={scheduleError}
          onRefreshSchedule={refreshSchedule}
          mutationError={scheduleMutationError}
          mutationLoading={scheduleMutationLoading}
          onLessonSelect={handleLessonSelect}
          onAvailabilitySlotSelect={handleAvailabilitySlotSelect}
          onEmptySlotSelect={handleEmptySlotSelect}
          onOpenAddAvailability={handleAddAvailabilityOpen}
          onOpenCreateLesson={handleCreateLessonOpen}
          onOpenCreatePackage={() => setShowCreatePackageModal(true)}
          onRequestAvailabilityOnboarding={handleRequestAvailabilityOnboarding}
          onOpenSettings={() => navigate('/settings')}
          onOpenNotifications={() => navigate('/notifications')}
          onLogout={logout}
          studentSearchQuery={studentSearchQuery}
          onStudentSearchQueryChange={setStudentSearchQuery}
          onStudentSelect={handleStudentSelect}
          showMobileMenu={showMobileMenu}
          onToggleMobileMenu={setShowMobileMenu}
          packagesLoading={packagesLoading}
          packagesError={packagesError}
          onRefreshPackages={refreshPackages}
          locationsData={coachLocations}
          locationsLoading={locationsLoading}
          locationsError={locationsError}
          onRefreshLocations={refreshLocations}
          onAddLocationById={handleAddLocationById}
          onAddCustomLocation={handleAddCustomLocation}
          onDeleteLocation={handleDeleteLocation}
        />
      )}

      <StudentDetailModal
        isOpen={showStudentDetailModal}
        student={selectedStudent}
        lessons={studentLessons}
        loading={studentLessonsLoading}
        loadingMore={studentLessonsLoadingMore}
        error={studentLessonsError}
        hasMore={studentLessonsHasMore}
        onClose={handleCloseStudentDetail}
        onLoadMore={handleLoadMoreStudentLessons}
      />

      <LessonDetailModal
        isOpen={showLessonDetailModal && !!selectedLessonDetail}
        lesson={selectedLessonDetail}
        onClose={handleCloseLessonDetail}
        isEditing={isEditingLesson}
        onStartEdit={handleEditLesson}
        onCancelEdit={handleCancelEdit}
        onSaveEdit={handleSaveLesson}
        editData={lessonEditData || selectedLessonDetail}
        onEditChange={setLessonEditData}
        mutationLoading={scheduleMutationLoading}
        onCancelLesson={handleCancelLesson}
        students={resolvedStudents}
        coachCourts={profileData.home_courts}
        coachHourlyRate={profileData.hourly_rate ?? profileData.price_private}
        formatDuration={formatDuration}
        onAcceptRequest={handleAcceptRequest}
        onDeclineRequest={handleDeclineRequest}
        onCreateLesson={handleCreateLessonFromAvailability}
      />

      <ConfirmationDialog
        isOpen={showCancelConfirmation}
        title="Cancel Lesson"
        description="Are you sure you want to cancel this lesson? This action cannot be undone and the student will be notified."
        confirmLabel="Cancel Lesson"
        cancelLabel="Keep Lesson"
        onConfirm={confirmCancelLesson}
        onCancel={() => setShowCancelConfirmation(false)}
      />

      <CreatePackageModal
        isOpen={showCreatePackageModal}
        onClose={() => setShowCreatePackageModal(false)}
        onCreated={handlePackageCreated}
      />

      <AvailabilityModal
        isOpen={showAddLessonModal}
        slot={adHocSlot}
        onChange={setAdHocSlot}
        onClose={() => setShowAddLessonModal(false)}
        onSubmit={handleAddAdHocAvailability}
        isSubmitting={scheduleMutationLoading}
        locations={coachLocations.length > 0 ? coachLocations : profileData.home_courts}
      />

      <CreateLessonModal
        isOpen={showCreateLessonModal}
        draft={lessonDraft}
        onClose={() => {
          setShowCreateLessonModal(false);
          setLessonDraft(null);
          setLessonSubmitError(null);
        }}
        onSubmit={handleCreateLessonSubmit}
        isSubmitting={lessonSubmitLoading}
        submitError={lessonSubmitError}
        players={resolvedStudents}
        locations={coachLocations.length > 0 ? coachLocations : profileData.home_courts}
      />

      <LessonCreatedSuccessModal
        isOpen={!!lessonCreatedSuccess}
        data={lessonCreatedSuccess}
        onClose={() => setLessonCreatedSuccess(null)}
        onViewLesson={() => {
          setLessonCreatedSuccess(null);
          refreshSchedule();
        }}
      />
    </>
  );
}

export default App;
