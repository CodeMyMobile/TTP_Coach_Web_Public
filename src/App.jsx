import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import CoachRoutes from './components/coach/CoachRoutes';
import OnboardingFlow from './components/onboarding/OnboardingFlow';
import LoginPage from './components/auth/LoginPage';
import { useCoachSchedule } from './hooks/useCoachSchedule';
import { useCoachStudents } from './hooks/useCoachStudents';
import useCoachProfile from './hooks/useCoachProfile';
import useAuth from './hooks/useAuth.jsx';
import { createDefaultProfile } from './constants/profile';
import { listCoachPackages } from './api/CoachApi/packages';

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
  const {
    profile: remoteProfile,
    isComplete: remoteProfileComplete,
    loading: profileLoading,
    error: profileError,
    hasFetched: profileFetched,
    saveProfile
  } = useCoachProfile({ enabled: isAuthenticated });
  const [isProfileComplete, setIsProfileComplete] = useState(false);
  const [profileData, setProfileData] = useState(defaultProfile);
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [onboardingInitialStep, setOnboardingInitialStep] = useState(0);
  const [dashboardTab, setDashboardTab] = useState('calendar');
  const [calendarView, setCalendarView] = useState('week');
  const [currentDate, setCurrentDate] = useState(new Date('2025-01-27'));
  const [mobileDayIndex, setMobileDayIndex] = useState(0);
  const [showAddLessonModal, setShowAddLessonModal] = useState(false);
  const [showCreatePackageModal, setShowCreatePackageModal] = useState(false);
  const [showLessonDetailModal, setShowLessonDetailModal] = useState(false);
  const [selectedLessonDetail, setSelectedLessonDetail] = useState(null);
  const [showCancelConfirmation, setShowCancelConfirmation] = useState(false);
  const [isEditingLesson, setIsEditingLesson] = useState(false);
  const [lessonEditData, setLessonEditData] = useState(null);
  const [studentSearchQuery, setStudentSearchQuery] = useState('');
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const [adHocSlot, setAdHocSlot] = useState({ date: '', start: '09:00', end: '10:00', location: '' });
  const [adHocAvailability, setAdHocAvailability] = useState({});
  const [isMobile, setIsMobile] = useState(false);
  const [packagesLoading, setPackagesLoading] = useState(false);
  const [packagesError, setPackagesError] = useState(null);
  const packagesFetchedRef = useRef(false);

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
    }
  }, [isAuthenticated]);

  const {
    students,
    loading: studentsLoading,
    error: studentsError,
    refresh: refreshStudents
  } = useCoachStudents({ enabled: isProfileComplete && isAuthenticated });

  const {
    lessons,
    availability: scheduleAvailability,
    stats: scheduleStats,
    loading: scheduleLoading,
    error: scheduleError,
    refresh: refreshSchedule,
    addAvailabilitySlot,
    updateLesson: persistLesson,
    mutationError: scheduleMutationError,
    mutationLoading: scheduleMutationLoading
  } = useCoachSchedule({ enabled: isProfileComplete && isAuthenticated });

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

  const handleAvailabilitySlotSelect = (availability) => {
    setSelectedLessonDetail(availability);
    setIsEditingLesson(false);
    setLessonEditData(null);
    setShowLessonDetailModal(true);
  };

  const handleEmptySlotSelect = ({ date, start, location }) => {
    setAdHocSlot({
      date,
      start,
      end: addMinutesToTime(start, 60),
      location: location || profileData.home_courts[0] || ''
    });
    setShowAddLessonModal(true);
  };

  const handleAddAvailabilityOpen = () => {
    const today = new Date().toISOString().split('T')[0];
    setAdHocSlot({
      date: today,
      start: '09:00',
      end: '10:00',
      location: profileData.home_courts[0] || ''
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
        location: adHocSlot.location
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
        setAdHocSlot({ date: '', start: '09:00', end: '10:00', location: '' });
      } catch (error) {
        console.error('Failed to add availability slot', error);
      }
    }
  };

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

  const handleAcceptRequest = () => {
    setShowLessonDetailModal(false);
  };

  const handleDeclineRequest = () => {
    setShowLessonDetailModal(false);
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
        isMobile={isMobile}
      />
    );
  }

  return <CoachRoutes coach={profileData} />;
}

export default App;
