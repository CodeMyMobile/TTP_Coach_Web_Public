import { getLessonType } from './lessonDisplay.js';

export const LESSON_TITLE_MAX_LENGTH = 100;
export const LESSON_DESCRIPTION_MAX_LENGTH = 500;

export const getLessonMetadataLimitState = (field, value = '') => {
  const max = field === 'description' ? LESSON_DESCRIPTION_MAX_LENGTH : LESSON_TITLE_MAX_LENGTH;
  const count = String(value || '').length;

  return {
    count,
    max,
    isAtLimit: count >= max,
    isOverLimit: count > max,
    label: `${count}/${max}`
  };
};

export const isEditableGroupLesson = (lesson) => getLessonType(lesson) === 'group';

const resolveSavedLessonPayload = (payload) => {
  if (!payload || typeof payload !== 'object') {
    return null;
  }

  return payload.lesson || payload.data?.lesson || payload.data || payload;
};

export const buildLessonUpdatePayload = (payload) => {
  const { player_summary: _playerSummary, ...payloadWithoutPlayerSummary } = payload || {};

  if (!isEditableGroupLesson(payloadWithoutPlayerSummary)) {
    return payloadWithoutPlayerSummary;
  }

  const nextMetadata = {
    ...(payloadWithoutPlayerSummary?.metadata || {}),
    title: payloadWithoutPlayerSummary?.title || payloadWithoutPlayerSummary?.lesson_title || payloadWithoutPlayerSummary?.metadata?.title || '',
    description: payloadWithoutPlayerSummary?.metadata?.description || payloadWithoutPlayerSummary?.description || '',
    level: payloadWithoutPlayerSummary?.metadata?.level || payloadWithoutPlayerSummary?.level || ''
  };

  const rawLimit =
    payloadWithoutPlayerSummary?.player_limit ??
    payloadWithoutPlayerSummary?.max_participants ??
    payloadWithoutPlayerSummary?.maxParticipants;
  const numericLimit = Number(rawLimit);
  const selectedGroupIds = Array.isArray(payloadWithoutPlayerSummary?.groupIds)
    ? payloadWithoutPlayerSummary.groupIds.map((id) => Number(id)).filter((id) => Number.isFinite(id) && id > 0)
    : [];
  const selectedPlayerIds = Array.isArray(payloadWithoutPlayerSummary?.playerIds)
    ? payloadWithoutPlayerSummary.playerIds.map((id) => Number(id)).filter((id) => Number.isFinite(id) && id > 0)
    : [];

  return {
    metadata: nextMetadata,
    ...(Number.isFinite(numericLimit) ? { player_limit: numericLimit } : {}),
    ...(selectedGroupIds.length > 0 ? { group_ids: selectedGroupIds } : {}),
    ...(selectedPlayerIds.length > 0
      ? { player_ids_arr: selectedPlayerIds.map((playerId) => ({ player_id: playerId })) }
      : {})
  };
};

export const mergeSavedLessonDetail = (previousLesson, editData, savePayload, saveResponse) => {
  const resolvedResponse = resolveSavedLessonPayload(saveResponse) || {};

  return {
    ...(previousLesson || {}),
    ...(editData || {}),
    ...(savePayload || {}),
    ...resolvedResponse,
    metadata: {
      ...(previousLesson?.metadata || {}),
      ...(editData?.metadata || {}),
      ...(savePayload?.metadata || {}),
      ...(resolvedResponse?.metadata || {})
    }
  };
};
