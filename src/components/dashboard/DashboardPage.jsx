import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import moment from 'moment';
import {
  AlertCircle,
  Bell,
  Calendar,
  CalendarPlus,
  DollarSign,
  Menu,
  LogOut,
  Package,
  Plus,
  Settings,
  Shield,
  Edit,
  Users,
  MapPin
} from 'lucide-react';
import {
  getActivePlayerPackages,
  getCoachRequests,
  patchCoachRequest,
  updateCoachPlayer
} from '../../services/coach';
import StatsSummary from './sections/StatsSummary';
import CalendarSection from './sections/CalendarSection';
import StudentsSection from './sections/StudentsSection';
import EarningsSection from './sections/EarningsSection';
import PackagesSection from './sections/PackagesSection';
import LocationsSection from './sections/LocationsSection';
import CoachGroupsSection from './sections/CoachGroupsSection';
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


const resolveLessonPlayerStatus = (player) => {
  const rawStatus = player?.payment_status ?? player?.paymentStatus ?? player?.status;
  if (rawStatus === 1 || rawStatus === '1') {
    return 'confirmed';
  }
  if (rawStatus === 2 || rawStatus === '2') {
    return 'cancelled';
  }
  const normalizedStatus = typeof rawStatus === 'string' ? rawStatus.toLowerCase() : '';
  if (normalizedStatus.includes('confirm') || normalizedStatus.includes('accept')) {
    return 'confirmed';
  }
  if (normalizedStatus.includes('cancel') || normalizedStatus.includes('decline')) {
    return 'cancelled';
  }
  return 'pending';
};

const getPlayerName = (player) => {
  if (!player || typeof player !== 'object') {
    return '';
  }

  return (
    player.full_name ||
    player.player_name ||
    player.student_name ||
    player.name ||
    ''
  );
};

const toUniqueNames = (players = []) => {
  const names = players
    .map((player) => getPlayerName(player).trim())
    .filter(Boolean);

  return [...new Set(names)];
};

const getLessonTypeId = (lesson) =>
  Number(lesson?.lessontype_id ?? lesson?.lesson_type_id ?? lesson?.lessonTypeId);

const getLessonGroupPlayers = (lesson) => {
  if (Array.isArray(lesson?.group_players)) {
    return lesson.group_players;
  }
  if (Array.isArray(lesson?.groupPlayers)) {
    return lesson.groupPlayers;
  }
  return [];
};

const getPendingInvitationNames = (lesson) => {
  const groupPlayers = getLessonGroupPlayers(lesson);
  const pendingNames = toUniqueNames(
    groupPlayers.filter((player) => resolveLessonPlayerStatus(player) === 'pending')
  );

  if (pendingNames.length > 0) {
    return pendingNames;
  }

  return toUniqueNames(groupPlayers);
};

const getLessonMergeKey = (lesson) => {
  const groupLessonPriceId = lesson?.group_lesson_price_id ?? lesson?.groupLessonPriceId;
  if (groupLessonPriceId !== null && groupLessonPriceId !== undefined && String(groupLessonPriceId).trim() !== '') {
    return `semi-private-group-price:${groupLessonPriceId}`;
  }

  const startRaw = lesson?.start_date_time ?? lesson?.startDateTime ?? lesson?.start_time ?? '';
  const endRaw = lesson?.end_date_time ?? lesson?.endDateTime ?? lesson?.end_time ?? '';
  const locationRaw = lesson?.location ?? lesson?.courtName ?? lesson?.court ?? '';
  const coachRaw = lesson?.coach_id ?? lesson?.coachId ?? '';
  const typeRaw = getLessonTypeId(lesson);

  return `semi-private-fallback:${typeRaw}:${startRaw}:${endRaw}:${locationRaw}:${coachRaw}`;
};

const getLessonActionName = (lesson) => {
  if (!lesson) {
    return 'Lesson request';
  }

  const lessonTypeId = Number(lesson.lessontype_id ?? lesson.lesson_type_id ?? lesson.lessonTypeId);
  const groupPlayers = Array.isArray(lesson.group_players)
    ? lesson.group_players
    : Array.isArray(lesson.groupPlayers)
      ? lesson.groupPlayers
      : [];

  const pendingPlayerNames = toUniqueNames(
    groupPlayers.filter((player) => resolveLessonPlayerStatus(player) === 'pending')
  );
  const allGroupPlayerNames = toUniqueNames(groupPlayers);

  const primaryName =
    lesson.full_name ||
    lesson.player_name ||
    lesson.student_name ||
    lesson.studentName ||
    lesson.playerName ||
    '';

  if (lessonTypeId === 1) {
    return primaryName || allGroupPlayerNames[0] || 'Private lesson request';
  }

  if (lessonTypeId === 2) {
    const semiPrivateNames = pendingPlayerNames.length > 0 ? pendingPlayerNames : allGroupPlayerNames;
    if (semiPrivateNames.length > 0) {
      return semiPrivateNames.join(', ');
    }
    return primaryName || 'Semi private lesson request';
  }

  if (pendingPlayerNames.length > 0) {
    return pendingPlayerNames.join(', ');
  }

  if (allGroupPlayerNames.length > 0) {
    return allGroupPlayerNames.join(', ');
  }

  return primaryName || lesson.title || 'Lesson request';
};

const formatLessonInfo = (lesson) => {
  if (!lesson) {
    return '';
  }

  const startRaw = lesson.start_date_time || lesson.startDateTime || lesson.start_time;
  const endRaw = lesson.end_date_time || lesson.endDateTime || lesson.end_time;
  const startMoment = startRaw ? moment.utc(startRaw) : null;
  const endMoment = endRaw
    ? moment.utc(endRaw)
    : startMoment?.isValid()
      ? startMoment.clone().add(1, 'hour')
      : null;
  const hasStart = Boolean(startMoment?.isValid?.());
  const hasEnd = Boolean(endMoment?.isValid?.());

  const dateLabel = hasStart ? startMoment.format('MMM D') : '';
  const startTime = hasStart ? startMoment.format('hh:mm a') : '';
  const endTime = hasEnd ? endMoment.format('hh:mm a') : '';
  const timeRange = startTime && endTime ? `${startTime} - ${endTime}` : startTime;

  const lessonTypeId = Number(lesson.lessontype_id ?? lesson.lesson_type_id ?? lesson.lessonTypeId);
  const lessonTypeLabel =
    lesson.lesson_type_name ||
    lesson.lessonTypeName ||
    (lessonTypeId === 1
      ? 'Private'
      : lessonTypeId === 2
        ? 'Semi Private'
        : lessonTypeId === 3
          ? 'Open Group'
          : '');

  const locationLabel = lesson.court
    ? `${lesson.location || ''} · Court ${lesson.court}`
    : lesson.location || lesson.courtName || '';

  const groupPlayers = Array.isArray(lesson.group_players)
    ? lesson.group_players
    : Array.isArray(lesson.groupPlayers)
      ? lesson.groupPlayers
      : [];

  const confirmedPlayerCount = groupPlayers.filter(
    (player) => resolveLessonPlayerStatus(player) === 'confirmed'
  ).length;
  const pendingPlayerCount = groupPlayers.filter(
    (player) => resolveLessonPlayerStatus(player) === 'pending'
  ).length;
  const cancelledPlayerCount = groupPlayers.filter(
    (player) => resolveLessonPlayerStatus(player) === 'cancelled'
  ).length;

  const joinedPlayerCount = groupPlayers.length;
  const playerLimit = Number(lesson.player_limit ?? lesson.playerLimit);

  const groupMeta = [];
  if (joinedPlayerCount > 0) {
    groupMeta.push(
      `${confirmedPlayerCount} confirmed • ${pendingPlayerCount} pending` +
        (cancelledPlayerCount > 0 ? ` • ${cancelledPlayerCount} cancelled` : '')
    );
  }
  if (Number.isFinite(playerLimit) && playerLimit > 0) {
    const filledSpots = Math.min(confirmedPlayerCount, playerLimit);
    const availableSpots = Math.max(playerLimit - filledSpots, 0);
    groupMeta.push(`spots ${filledSpots}/${playerLimit} filled (${availableSpots} open)`);
  }

  const groupDetails = groupMeta.length > 0 ? `Players: ${groupMeta.join(' • ')}` : '';
  const displayType = lessonTypeLabel ? `${lessonTypeLabel} lesson` : '';

  return [displayType, dateLabel, timeRange, locationLabel, groupDetails].filter(Boolean).join(' • ');
};

const REQUEST_ACTION_LABELS = {
  confirm: 'Confirm',
  approve: 'Approve',
  decline: 'Decline'
};

const getRequestKey = (item) => `${item?.request_type || 'request'}-${item?.request_id ?? item?.id ?? 'unknown'}`;

const dedupeRequests = (items = []) => {
  const map = new Map();
  items.forEach((item) => {
    const key = getRequestKey(item);
    if (!map.has(key)) {
      map.set(key, item);
    }
  });
  return [...map.values()];
};



const getRequestActionEndpoint = (item, action) => {
  const actions = item?.actions || {};

  if (typeof actions[action] === 'string' && actions[action].trim()) {
    return actions[action];
  }

  if (typeof actions.endpoint === 'string' && actions.endpoint.trim()) {
    return actions.endpoint;
  }

  return undefined;
};

const isActionableCoachRequest = (item) => {
  const requestType = String(item?.request_type || '').toLowerCase();
  const status = String(item?.status || 'PENDING').toUpperCase();

  return status === 'PENDING' && (requestType === 'lesson_request' || requestType === 'roster_request');
};

const formatRelativeNotificationTime = (value) => {
  if (!value) {
    return 'Recently';
  }

  const time = moment(value);
  if (!time.isValid()) {
    return 'Recently';
  }

  return time.fromNow();
};

const isGroupLessonType = (lesson) => {
  const lessonTypeId = getLessonTypeId(lesson);
  if (lessonTypeId === 3) {
    return true;
  }

  const lessonTypeName = String(lesson?.lesson_type_name ?? lesson?.lessonTypeName ?? '').toLowerCase();
  return lessonTypeName.includes('group');
};

const getInitials = (name) => {
  if (!name) {
    return '🔔';
  }

  const parts = name
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2);

  if (parts.length === 0) {
    return '🔔';
  }

  return parts.map((part) => part.charAt(0).toUpperCase()).join('');
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
  upcomingLessonsData = [],
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
  onOpenCreateLesson,
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
  onDeleteLocation = () => {},
  groupsData = [],
  groupsLoading = false,
  groupsError = null,
  groupsActionError = null,
  groupsSaving = false,
  onRefreshGroups = () => {},
  onCreateGroup = () => {},
  onUpdateGroup = () => {},
  onDeleteGroup = () => {}
}) => {
  const bookedLessons = Array.isArray(lessonsData)
    ? lessonsData
    : lessonsData?.lessons || [];
  const upcomingLessons = Array.isArray(upcomingLessonsData)
    ? upcomingLessonsData
    : upcomingLessonsData?.lessons || [];

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
    upcomingLessons: statsData?.upcomingLessons ?? upcomingLessons.length,
    pendingRequests: statsData?.pendingRequests ?? 0
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
  const [coachRequests, setCoachRequests] = useState([]);
  const [coachRequestAction, setCoachRequestAction] = useState({});
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
  const [showQuickActions, setShowQuickActions] = useState(false);
  const [showSettingsMenu, setShowSettingsMenu] = useState(false);
  const [carouselIndex, setCarouselIndex] = useState(0);
  const [dismissedActionBar, setDismissedActionBar] = useState(false);
  const notificationRef = useRef(null);
  const quickActionsRef = useRef(null);
  const settingsMenuRef = useRef(null);

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


  const fetchCoachActionableRequests = useCallback(async () => {
    try {
      const response = await getCoachRequests({ perPage: 20, page: 1 });
      const requestItems = Array.isArray(response)
        ? response
        : Array.isArray(response?.requests)
          ? response.requests
          : [];
      const actionableRequests = requestItems.filter(isActionableCoachRequest);
      setCoachRequests(dedupeRequests(actionableRequests));
    } catch (error) {
      console.error('Failed to load coach requests', error);
    }
  }, []);

  useEffect(() => {
    fetchCoachActionableRequests();
  }, [fetchCoachActionableRequests]);

  const handleCoachRequestAction = useCallback(async (item, action) => {
    const requestKey = getRequestKey(item);
    const previousRequests = coachRequests;

    setCoachRequestAction((prev) => ({ ...prev, [requestKey]: action }));
    setCoachRequests((prev) => prev.filter((requestItem) => getRequestKey(requestItem) !== requestKey));

    try {
      await patchCoachRequest({
        requestType: item.request_type,
        requestId: item.request_id,
        action,
        endpoint: getRequestActionEndpoint(item, action),
        method: item?.actions?.method || 'PATCH'
      });
    } catch (error) {
      if (error?.status === 404) {
        window.alert('Request no longer available');
      } else if (error?.status === 409) {
        fetchCoachActionableRequests();
      } else {
        setCoachRequests(previousRequests);
        const message = error?.body?.detail || error?.message || 'Failed to update request.';
        window.alert(message);
      }
    } finally {
      setCoachRequestAction((prev) => {
        const { [requestKey]: _removed, ...rest } = prev;
        return rest;
      });
    }
  }, [coachRequests, fetchCoachActionableRequests]);


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

  useEffect(() => {
    if (!showQuickActions) {
      return;
    }

    const handleClickOutside = (event) => {
      if (quickActionsRef.current && !quickActionsRef.current.contains(event.target)) {
        setShowQuickActions(false);
      }
    };

    window.addEventListener('mousedown', handleClickOutside);
    return () => window.removeEventListener('mousedown', handleClickOutside);
  }, [showQuickActions]);

  useEffect(() => {
    if (!showSettingsMenu) {
      return;
    }

    const handleClickOutside = (event) => {
      if (settingsMenuRef.current && !settingsMenuRef.current.contains(event.target)) {
        setShowSettingsMenu(false);
      }
    };

    window.addEventListener('mousedown', handleClickOutside);
    return () => window.removeEventListener('mousedown', handleClickOutside);
  }, [showSettingsMenu]);

  const actionItems = coachRequests.map((item, index) => {
    const requestKey = getRequestKey(item);
    const isLessonRequest = item.request_type === 'lesson_request';
    const startMoment = item?.lesson?.start_date_time ? moment(item.lesson.start_date_time) : null;
    const meta = isLessonRequest
      ? [
          startMoment?.isValid?.() ? startMoment.format('ddd h:mma') : '',
          item?.lesson?.location || '',
          item?.lesson?.requested_price ? `$${item.lesson.requested_price}` : ''
        ]
          .filter(Boolean)
          .join(' · ')
      : 'Wants to join your roster';

    return {
      id: requestKey || `request-${index}`,
      type: isLessonRequest ? 'lesson' : 'roster',
      name: item?.player?.full_name || 'Player',
      detail: isLessonRequest ? 'sent a lesson request' : 'wants to join your roster',
      info: meta,
      timestamp: item?.created_at || null,
      avatarUrl: '',
      onAccept: () => handleCoachRequestAction(item, isLessonRequest ? 'confirm' : 'approve'),
      onDecline: () => handleCoachRequestAction(item, 'decline'),
      acceptLabel: isLessonRequest ? 'Confirm' : 'Approve',
      declineLabel: 'Decline',
      actionLoading: coachRequestAction[requestKey]
    };
  });
  const notificationItems = actionItems;


  useEffect(() => {
    if (actionItems.length > 0) {
      setDismissedActionBar(false);
    }
  }, [actionItems.length]);

  useEffect(() => {
    setCarouselIndex(0);
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
              <div className="relative" ref={quickActionsRef}>
                <button
                  type="button"
                  onClick={() => {
                    setShowQuickActions((prev) => !prev);
                    setShowNotificationsDropdown(false);
                  }}
                  className={`dashboard-header-btn dashboard-quick-action-btn ${
                    showQuickActions ? 'dashboard-quick-action-active' : ''
                  }`}
                  aria-expanded={showQuickActions}
                  aria-haspopup="true"
                >
                  <Plus className="h-5 w-5" />
                  <span className="sr-only">Open quick actions</span>
                </button>
                {showQuickActions && (
                  <div className="dashboard-quick-actions-dropdown">
                    <button
                      type="button"
                      className="dashboard-quick-actions-item"
                      onClick={() => {
                        onOpenCreateLesson?.();
                        setShowQuickActions(false);
                      }}
                    >
                      <span className="dashboard-quick-actions-icon">
                        <CalendarPlus className="h-4 w-4" />
                      </span>
                      <span>
                        <span className="dashboard-quick-actions-title">Add Lesson</span>
                        <span className="dashboard-quick-actions-subtitle">
                          Book a lesson with a student
                        </span>
                      </span>
                    </button>
                    <button
                      type="button"
                      className="dashboard-quick-actions-item"
                      onClick={() => {
                        onRequestAvailabilityOnboarding?.();
                        setShowQuickActions(false);
                      }}
                    >
                      <span className="dashboard-quick-actions-icon">
                        <Edit className="h-4 w-4" />
                      </span>
                      <span>
                        <span className="dashboard-quick-actions-title">Set Availability</span>
                        <span className="dashboard-quick-actions-subtitle">
                          Edit recurring days and times
                        </span>
                      </span>
                    </button>
                  </div>
                )}
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
                      <span className="notification-dropdown-title">Requests</span>
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
                            {item.avatarUrl ? (
                              <img src={item.avatarUrl} alt={item.name} className="notification-avatar-image" />
                            ) : (
                              <span className="notification-avatar-fallback">{getInitials(item.name)}</span>
                            )}
                          </div>
                          <div className="notification-content">
                            <div className="notification-text">
                              <strong>{item.name}</strong> {item.detail}
                            </div>
                            {item.info && <div className="notification-subtext">{item.info}</div>}
                            <div className="notification-actions">
                              {item.acceptLabel !== '' && (
                                <button
                                  type="button"
                                  className="notification-btn approve"
                                  onClick={item.onAccept || undefined}
                                  disabled={!item.onAccept || Boolean(item.actionLoading)}
                                >
                                  {item.actionLoading === 'confirm' || item.actionLoading === 'approve' ? `${REQUEST_ACTION_LABELS[item.actionLoading]}...` : item.acceptLabel || (item.type === 'lesson' ? 'Confirm' : 'Accept')}
                                </button>
                              )}
                              <button
                                type="button"
                                className="notification-btn decline"
                                onClick={item.onDecline || undefined}
                                disabled={!item.onDecline || Boolean(item.actionLoading)}
                              >
                                {item.actionLoading === 'decline' ? 'Declining...' : item.declineLabel || 'Decline'}
                              </button>
                            </div>
                            <div className="notification-time">{formatRelativeNotificationTime(item.timestamp)}</div>
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
              <div className="relative" ref={settingsMenuRef}>
                <button
                  type="button"
                  onClick={() => {
                    setShowSettingsMenu((prev) => !prev);
                    setShowQuickActions(false);
                    setShowNotificationsDropdown(false);
                  }}
                  className={`dashboard-header-btn ${showSettingsMenu ? 'dashboard-settings-btn-active' : ''}`}
                  aria-expanded={showSettingsMenu}
                  aria-haspopup="menu"
                >
                  <Settings className="h-5 w-5" />
                  <span className="sr-only">Open settings menu</span>
                </button>
                {showSettingsMenu && (
                  <div className="dashboard-settings-menu" role="menu">
                    <button
                      type="button"
                      className="dashboard-settings-menu-item"
                      onClick={() => {
                        setShowSettingsMenu(false);
                        onOpenSettings?.();
                      }}
                    >
                      <Settings className="h-4 w-4" />
                      <span>Settings</span>
                    </button>
                    <button
                      type="button"
                      className="dashboard-settings-menu-item dashboard-settings-menu-item-danger"
                      onClick={() => {
                        setShowSettingsMenu(false);
                        onLogout?.();
                      }}
                    >
                      <LogOut className="h-4 w-4" />
                      <span>Log out</span>
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </nav>

      {showQuickActions && (
        <button
          type="button"
          aria-label="Close quick actions"
          className="dashboard-quick-actions-overlay"
          onClick={() => setShowQuickActions(false)}
        />
      )}

      {showMobileMenu && (
        <div className="border-b bg-white shadow-lg md:hidden">
          <div className="space-y-2 px-4 py-4">
            {[
              { key: 'calendar', label: 'Calendar', icon: Calendar },
              { key: 'students', label: 'Students', icon: Users },
              { key: 'earnings', label: 'Earnings', icon: DollarSign },
              { key: 'packages', label: 'Packages', icon: Package },
              { key: 'locations', label: 'Locations', icon: MapPin },
              { key: 'groups', label: 'Groups', icon: Users }
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
              { key: 'locations', label: 'Locations', icon: MapPin },
              { key: 'groups', label: 'Groups', icon: Users }
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

          <div className="flex w-full items-center gap-2 text-xs text-gray-500 sm:w-auto sm:text-sm dashboard-secure-note">
            <Shield className="h-4 w-4 text-green-500" />
            <span className="whitespace-nowrap">Secure portal • Last synced moments ago</span>
          </div>
        </div>

        {actionItems.length > 0 && !dismissedActionBar && (
          <>
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
                    <div className="action-alert-text-group">
                      <span className="action-alert-primary">
                        {item.type === 'roster' ? '👤' : '📅'} <strong>{item.name}</strong> {item.detail}
                      </span>
                      {item.info && <span className="action-alert-info">{item.info}</span>}
                    </div>
                    <div className="action-alert-buttons">
                      {item.acceptLabel !== '' && (
                        <button
                          type="button"
                          className="action-alert-btn approve"
                          onClick={item.onAccept || undefined}
                          disabled={!item.onAccept || Boolean(item.actionLoading)}
                        >
                          {item.actionLoading === 'confirm' || item.actionLoading === 'approve' ? `${REQUEST_ACTION_LABELS[item.actionLoading]}...` : item.acceptLabel || (item.type === 'lesson' ? 'Confirm' : 'Accept')}
                        </button>
                      )}
                      <button
                        type="button"
                        className="action-alert-btn decline"
                        onClick={item.onDecline || undefined}
                        disabled={!item.onDecline || Boolean(item.actionLoading)}
                      >
                        {item.actionLoading === 'decline' ? 'Declining...' : item.declineLabel || 'Decline'}
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
            <div className="notification-carousel">
              <div className="notification-carousel-header">
                <div className="notification-carousel-title">
                  <span className="notification-carousel-icon">⚡</span>
                  <span>{actionItems.length} items need attention</span>
                </div>
                <button
                  type="button"
                  className="notification-carousel-dismiss"
                  onClick={() => setDismissedActionBar(true)}
                >
                  ×
                </button>
              </div>
              {actionItems.length > 0 && (
                <div className="notification-carousel-card">
                  <div className="notification-carousel-meta">
                    <div className="notification-carousel-avatar">
                      {(actionItems[carouselIndex]?.name || 'N')
                        .split(' ')
                        .map((part) => part[0])
                        .join('')
                        .slice(0, 2)
                        .toUpperCase()}
                    </div>
                    <div>
                      <div className="notification-carousel-name">
                        {actionItems[carouselIndex]?.name}
                      </div>
                      <div className="notification-carousel-detail">
                        {actionItems[carouselIndex]?.detail}
                      </div>
                      {actionItems[carouselIndex]?.info && (
                        <div className="notification-carousel-info">
                          {actionItems[carouselIndex]?.info}
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="notification-carousel-actions">
                    {actionItems[carouselIndex]?.acceptLabel !== '' && (
                      <button
                        type="button"
                        className="notification-carousel-btn approve"
                        onClick={actionItems[carouselIndex]?.onAccept || undefined}
                        disabled={!actionItems[carouselIndex]?.onAccept || Boolean(actionItems[carouselIndex]?.actionLoading)}
                      >
                        {actionItems[carouselIndex]?.actionLoading === 'confirm' || actionItems[carouselIndex]?.actionLoading === 'approve'
                          ? `${REQUEST_ACTION_LABELS[actionItems[carouselIndex]?.actionLoading]}...`
                          : actionItems[carouselIndex]?.acceptLabel ||
                            (actionItems[carouselIndex]?.type === 'lesson' ? 'Confirm' : 'Accept')}
                      </button>
                    )}
                    <button
                      type="button"
                      className="notification-carousel-btn decline"
                      onClick={actionItems[carouselIndex]?.onDecline || undefined}
                      disabled={!actionItems[carouselIndex]?.onDecline || Boolean(actionItems[carouselIndex]?.actionLoading)}
                    >
                      {actionItems[carouselIndex]?.actionLoading === 'decline' ? 'Declining...' : actionItems[carouselIndex]?.declineLabel || 'Decline'}
                    </button>
                  </div>
                </div>
              )}
              <div className="notification-carousel-controls">
                <button
                  type="button"
                  className="notification-carousel-nav"
                  onClick={() =>
                    setCarouselIndex((prev) =>
                      prev === 0 ? actionItems.length - 1 : prev - 1
                    )
                  }
                >
                  ‹
                </button>
                <div className="notification-carousel-dots">
                  {actionItems.map((item, index) => (
                    <button
                      key={item.id}
                      type="button"
                      className={`notification-carousel-dot ${
                        index === carouselIndex ? 'active' : ''
                      }`}
                      onClick={() => setCarouselIndex(index)}
                    />
                  ))}
                </div>
                <button
                  type="button"
                  className="notification-carousel-nav"
                  onClick={() =>
                    setCarouselIndex((prev) =>
                      prev === actionItems.length - 1 ? 0 : prev + 1
                    )
                  }
                >
                  ›
                </button>
              </div>
            </div>
          </>
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


        {dashboardTab === 'groups' && (
          <CoachGroupsSection
            groups={Array.isArray(groupsData) ? groupsData : []}
            groupsLoading={groupsLoading}
            groupsError={groupsError}
            groupsActionError={groupsActionError}
            groupsSaving={groupsSaving}
            onRefreshGroups={onRefreshGroups}
            onCreateGroup={onCreateGroup}
            onUpdateGroup={onUpdateGroup}
            onDeleteGroup={onDeleteGroup}
            players={filteredStudents}
          />
        )}

      </main>

      <nav className="dashboard-bottom-nav">
        {[
          { key: 'calendar', label: 'Calendar', icon: '📅' },
          { key: 'students', label: 'Students', icon: '👥' },
          { key: 'earnings', label: 'Earnings', icon: '💵' },
          { key: 'packages', label: 'Packages', icon: '📦' },
          { key: 'locations', label: 'Locations', icon: '📍' },
          { key: 'groups', label: 'Groups', icon: '🧩' }
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
