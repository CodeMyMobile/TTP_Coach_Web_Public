import React, { useEffect, useMemo, useState } from 'react';
import DashboardPage from './components/dashboard/DashboardPage';
import OnboardingFlow from './components/onboarding/OnboardingFlow';
import AvailabilityModal from './components/modals/AvailabilityModal';
import ConfirmationDialog from './components/modals/ConfirmationDialog';
import CreatePackageModal from './components/modals/CreatePackageModal';
import LessonDetailModal from './components/modals/LessonDetailModal';
import { useCoachSchedule } from './hooks/useCoachSchedule';
import { useCoachStudents } from './hooks/useCoachStudents';

const defaultProfile = {
  profileImage: '',
  profileImageFile: null,
  name: '',
  email: '',
  phone: '',
  bio: '',
  experience_years: '',
  certifications: '',
  home_courts: [],
  levels: [],
  specialties: [],
  formats: [],
  price_private: 100,
  price_semi: 75,
  price_group: 50,
  packages: [],
  languages: [],
  availability: {
    Monday: [],
    Tuesday: [],
    Wednesday: [],
    Thursday: [],
    Friday: [],
    Saturday: [],
    Sunday: []
  },
  availabilityLocations: {
    Monday: {},
    Tuesday: {},
    Wednesday: {},
    Thursday: {},
    Friday: {},
    Saturday: {},
    Sunday: {}
  },
  groupClasses: []
};

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
  const [isProfileComplete, setIsProfileComplete] = useState(false);
  const [profileData, setProfileData] = useState(defaultProfile);
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

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const {
    students,
    loading: studentsLoading,
    error: studentsError,
    refresh: refreshStudents
  } = useCoachStudents({ enabled: isProfileComplete });

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
  } = useCoachSchedule({ enabled: isProfileComplete });

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

  const handleOnboardingComplete = (data) => {
    setProfileData(data);
    setIsProfileComplete(true);
    setOnboardingInitialStep(0);
  };

  const handleEditProfile = () => {
    setOnboardingInitialStep(0);
    setIsProfileComplete(false);
  };

  const handleRequestAvailabilityOnboarding = () => {
    setOnboardingInitialStep(8);
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

  if (!isProfileComplete) {
    return (
      <OnboardingFlow
        initialData={profileData}
        initialStep={onboardingInitialStep}
        onComplete={handleOnboardingComplete}
        isMobile={isMobile}
      />
    );
  }

  return (
    <>
      <DashboardPage
        profile={profileData}
        isMobile={isMobile}
        dashboardTab={dashboardTab}
        onDashboardTabChange={setDashboardTab}
        calendarView={calendarView}
        onCalendarViewChange={setCalendarView}
        currentDate={currentDate}
        onCurrentDateChange={setCurrentDate}
        mobileDayIndex={mobileDayIndex}
        onMobileDayIndexChange={setMobileDayIndex}
        studentsData={students}
        studentsLoading={studentsLoading}
        studentsError={studentsError}
        onRefreshStudents={refreshStudents}
        lessonsData={lessons}
        availabilityData={scheduleAvailability}
        statsData={scheduleStats}
        scheduleLoading={scheduleLoading}
        scheduleError={scheduleError}
        onRefreshSchedule={refreshSchedule}
        mutationError={scheduleMutationError}
        mutationLoading={scheduleMutationLoading}
        combinedAdHocAvailability={combinedAdHocAvailability}
        recurringAvailability={recurringAvailability}
        recurringAvailabilityLocations={recurringAvailabilityLocations}
        onLessonSelect={handleLessonSelect}
        onAvailabilitySlotSelect={handleAvailabilitySlotSelect}
        onEmptySlotSelect={handleEmptySlotSelect}
        onOpenAddAvailability={handleAddAvailabilityOpen}
        onOpenCreatePackage={() => setShowCreatePackageModal(true)}
        onEditProfile={handleEditProfile}
        onRequestAvailabilityOnboarding={handleRequestAvailabilityOnboarding}
        studentSearchQuery={studentSearchQuery}
        onStudentSearchQueryChange={setStudentSearchQuery}
        showMobileMenu={showMobileMenu}
        onToggleMobileMenu={setShowMobileMenu}
        formatDuration={formatDuration}
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
        formatDuration={formatDuration}
        onAcceptRequest={handleAcceptRequest}
        onDeclineRequest={handleDeclineRequest}
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
      />

      <AvailabilityModal
        isOpen={showAddLessonModal}
        slot={adHocSlot}
        onChange={setAdHocSlot}
        onClose={() => setShowAddLessonModal(false)}
        onSubmit={handleAddAdHocAvailability}
        isSubmitting={scheduleMutationLoading}
        locations={profileData.home_courts}
      />
    </>
  );
}

export default App;
