const getResponseErrorDetail = async (response, fallbackMessage) => {
  const errorBody = await response?.json?.().catch(() => null);
  const detail = errorBody?.detail || errorBody?.error || errorBody?.message;
  return typeof detail === 'string' && detail ? detail : fallbackMessage;
};

export const getCoachLessonDetail = (payload) => payload?.lesson || payload?.data?.lesson || payload?.data || payload;

export const getWaitlistPromotionPaymentMethod = (selection) =>
  selection === 'comped' ? 'comped' : undefined;

export const loadCoachLessonDetail = async ({ lessonId, fetchLessonDetail, updateSelectedLesson }) => {
  const payload = await fetchLessonDetail({ lessonId });
  const lesson = getCoachLessonDetail(payload);
  if (!lesson || typeof lesson !== 'object') {
    throw new Error('Lesson detail response was empty.');
  }

  updateSelectedLesson((previousLesson) => ({ ...previousLesson, ...lesson }));
  return lesson;
};

export const runCoachWaitlistAction = async ({
  action,
  fetchLessonDetail,
  lessonId,
  updateSelectedLesson,
  refreshSchedule,
  fallbackMessage
}) => {
  const response = await action();

  if (!response?.ok) {
    throw new Error(await getResponseErrorDetail(response, fallbackMessage));
  }

  const lesson = await loadCoachLessonDetail({ lessonId, fetchLessonDetail, updateSelectedLesson });
  await refreshSchedule();
  return lesson;
};
