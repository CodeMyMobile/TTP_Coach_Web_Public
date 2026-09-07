const getResponseErrorDetail = async (response, fallbackMessage) => {
  const errorBody = await response?.json?.().catch(() => null);
  const detail = errorBody?.detail || errorBody?.error || errorBody?.message;
  return typeof detail === 'string' && detail ? detail : fallbackMessage;
};

export const getCoachLessonDetail = (payload) => payload?.lesson || payload?.data?.lesson || payload?.data || payload;

export const getWaitlistPromotionPaymentMethod = (selection) =>
  selection === 'comped' ? 'comped' : undefined;

export const createCoachLessonWaitlistCallbacks = ({
  controller,
  selectedLesson,
  coachAccessToken,
  confirmRemoval,
  refreshSchedule
}) => {
  const lessonId = selectedLesson?.id ?? selectedLesson?.lesson_id ?? selectedLesson?.lessonId;

  const requirePlayerId = (participant) => {
    const playerId = Number(participant?.playerId ?? participant?.player_id);
    if (!lessonId || !Number.isFinite(playerId) || playerId <= 0) {
      throw new Error('This waitlist player is unavailable.');
    }
    return playerId;
  };

  return {
    onRemoveWaitlistPlayer: async (participant) => {
      const playerId = requirePlayerId(participant);
      const playerName = participant?.name || 'this player';
      if (!confirmRemoval(`Remove ${playerName} from this lesson waitlist?`)) {
        return;
      }

      return controller.removeWaitlistPlayer({
        coachAccessToken,
        lessonId,
        playerId,
        refreshSchedule
      });
    },
    onPromoteWaitlistPlayer: async (participant, paymentMethod) => {
      const playerId = requirePlayerId(participant);
      return controller.promoteWaitlistPlayer({
        coachAccessToken,
        lessonId,
        playerId,
        paymentMethod,
        refreshSchedule
      });
    }
  };
};

export const loadCoachLessonDetail = async ({
  lessonId,
  fetchLessonDetail,
  updateSelectedLesson,
  shouldApply = () => true
}) => {
  const payload = await fetchLessonDetail({ lessonId });
  const lesson = getCoachLessonDetail(payload);
  if (!lesson || typeof lesson !== 'object') {
    throw new Error('Lesson detail response was empty.');
  }

  if (shouldApply()) {
    updateSelectedLesson((previousLesson) => ({
      ...previousLesson,
      ...lesson,
      waitlistDetailLoading: false,
      waitlistDetailError: ''
    }));
  }
  return lesson;
};

export const createCoachLessonWaitlistController = ({
  fetchLessonDetail,
  updateSelectedLesson,
  removePlayerFromLessonWaitlist,
  addPlayerToLesson
}) => {
  let latestSelection = 0;
  let currentLessonId = null;

  const isCurrentSelection = (lessonId, selection) =>
    currentLessonId === null || (currentLessonId === lessonId && latestSelection === selection);

  const adoptLesson = (summaryLesson) => {
    const selection = ++latestSelection;
    const lessonId = summaryLesson?.id ?? summaryLesson?.lesson_id ?? summaryLesson?.lessonId;
    currentLessonId = lessonId ?? null;
    updateSelectedLesson({
      ...summaryLesson,
      waitlistDetailLoading: Boolean(lessonId),
      waitlistDetailError: ''
    });

    return { lessonId, selection };
  };

  const select = async (summaryLesson) => {
    const { lessonId, selection } = adoptLesson(summaryLesson);

    if (!lessonId) {
      return summaryLesson;
    }

    try {
      return await loadCoachLessonDetail({
        lessonId,
        fetchLessonDetail,
        updateSelectedLesson,
        shouldApply: () => isCurrentSelection(lessonId, selection)
      });
    } catch (error) {
      if (isCurrentSelection(lessonId, selection)) {
        updateSelectedLesson((previousLesson) => ({
          ...previousLesson,
          waitlistDetailLoading: false,
          waitlistDetailError: error?.message || 'Unable to load participants and waitlist.'
        }));
      }
      throw error;
    }
  };

  const runCurrentWaitlistAction = ({ action, lessonId, refreshSchedule, fallbackMessage, playerId }) => {
    const selection = latestSelection;

    return runCoachWaitlistAction({
      action,
      fetchLessonDetail,
      lessonId,
      updateSelectedLesson,
      refreshSchedule,
      fallbackMessage,
      shouldApply: () => isCurrentSelection(lessonId, selection)
    }).then((result) => {
      if (playerId && isCurrentSelection(lessonId, selection)) {
        updateSelectedLesson((previousLesson) => {
          const waitlist = Array.isArray(previousLesson?.waitlist)
            ? previousLesson.waitlist.filter((entry) => String(entry?.player_id ?? entry?.playerId ?? entry?.id) !== String(playerId))
            : previousLesson?.waitlist;
          const waitlistCount = Number(previousLesson?.waitlist_count ?? previousLesson?.waitlistCount);
          return {
            ...previousLesson,
            ...(Array.isArray(waitlist) ? { waitlist } : {}),
            ...(Number.isFinite(waitlistCount) ? { waitlist_count: Math.max(waitlistCount - 1, 0) } : {})
          };
        });
      }
      return result;
    });
  };

  return {
    select,
    adoptLesson,
    removeWaitlistPlayer: ({ coachAccessToken, lessonId, playerId, refreshSchedule }) =>
      runCurrentWaitlistAction({
        action: () => removePlayerFromLessonWaitlist({ coachAccessToken, lessonId, playerId }),
        lessonId,
        refreshSchedule,
        fallbackMessage: 'Unable to remove this player from the waitlist.',
        playerId
      }),
    promoteWaitlistPlayer: ({ coachAccessToken, lessonId, playerId, paymentMethod, refreshSchedule }) =>
      runCurrentWaitlistAction({
        action: () => addPlayerToLesson({ coachAccessToken, lessonId, playerId, paymentMethod }),
        lessonId,
        refreshSchedule,
        fallbackMessage: 'Unable to promote this player from the waitlist.',
        playerId
      }),
    addCompedPlayer: ({ coachAccessToken, lessonId, playerId, refreshSchedule }) =>
      runCurrentWaitlistAction({
        action: () => addPlayerToLesson({ coachAccessToken, lessonId, playerId, paymentMethod: 'comped' }),
        lessonId,
        refreshSchedule,
        fallbackMessage: 'Unable to add this player without charging them.'
      })
  };
};

export const runCoachWaitlistAction = async ({
  action,
  fetchLessonDetail,
  lessonId,
  updateSelectedLesson,
  refreshSchedule,
  fallbackMessage,
  shouldApply
}) => {
  const response = await action();

  if (!response?.ok) {
    throw new Error(await getResponseErrorDetail(response, fallbackMessage));
  }

  const refreshWarnings = [];
  let lesson = {};

  try {
    lesson = await loadCoachLessonDetail({
      lessonId,
      fetchLessonDetail,
      updateSelectedLesson,
      shouldApply
    });
  } catch (error) {
    refreshWarnings.push(error?.message || 'Lesson detail refresh failed.');
  }

  try {
    await refreshSchedule();
  } catch (error) {
    refreshWarnings.push(error?.message || 'Schedule refresh failed.');
  }

  return { ...lesson, refreshWarnings };
};
