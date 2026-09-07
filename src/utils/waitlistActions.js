const getResponseErrorDetail = async (response, fallbackMessage) => {
  const errorBody = await response?.json?.().catch(() => null);
  const detail = errorBody?.detail || errorBody?.error || errorBody?.message;
  return typeof detail === 'string' && detail ? detail : fallbackMessage;
};

export const getCoachLessonDetail = (payload) => payload?.lesson || payload?.data?.lesson || payload?.data || payload;

export const getWaitlistPromotionPaymentMethod = (selection) =>
  selection === 'comped' ? 'comped' : undefined;

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
    updateSelectedLesson((previousLesson) => ({ ...previousLesson, ...lesson }));
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
    updateSelectedLesson(summaryLesson);

    return { lessonId, selection };
  };

  const select = async (summaryLesson) => {
    const { lessonId, selection } = adoptLesson(summaryLesson);

    if (!lessonId) {
      return summaryLesson;
    }

    return loadCoachLessonDetail({
      lessonId,
      fetchLessonDetail,
      updateSelectedLesson,
      shouldApply: () => isCurrentSelection(lessonId, selection)
    });
  };

  const runCurrentWaitlistAction = ({ action, lessonId, refreshSchedule, fallbackMessage }) => {
    const selection = latestSelection;

    return runCoachWaitlistAction({
      action,
      fetchLessonDetail,
      lessonId,
      updateSelectedLesson,
      refreshSchedule,
      fallbackMessage,
      shouldApply: () => isCurrentSelection(lessonId, selection)
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
        fallbackMessage: 'Unable to remove this player from the waitlist.'
      }),
    promoteWaitlistPlayer: ({ coachAccessToken, lessonId, playerId, paymentMethod, refreshSchedule }) =>
      runCurrentWaitlistAction({
        action: () => addPlayerToLesson({ coachAccessToken, lessonId, playerId, paymentMethod }),
        lessonId,
        refreshSchedule,
        fallbackMessage: 'Unable to promote this player from the waitlist.'
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

  const lesson = await loadCoachLessonDetail({
    lessonId,
    fetchLessonDetail,
    updateSelectedLesson,
    shouldApply
  });
  await refreshSchedule();
  return lesson;
};
