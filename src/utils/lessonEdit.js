import { getLessonType } from './lessonDisplay.js';
import { resolveBookingPaymentState } from './bookingPaymentState.js';

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

// The players an edit starts with: those still on the class. A player who cancelled
// stays in group_players, and saving the edit sends every listed player back, which
// the API takes as re-adding them: a cancelled player came back as a pending invite.
export const existingLessonPlayerIds = (lesson) => {
  const players = Array.isArray(lesson?.group_players)
    ? lesson.group_players
    : Array.isArray(lesson?.groupPlayers)
      ? lesson.groupPlayers
      : [];
  return players
    .filter((player) => resolveBookingPaymentState({
      status: player?.status,
      paymentStatus: player?.payment_status ?? player?.paymentStatus,
      paymentMethod: player?.payment_method ?? player?.paymentMethod
    }).key !== 'cancelled')
    .map((player) => Number(player?.player_id ?? player?.playerId ?? player?.id))
    .filter((id) => Number.isFinite(id) && id > 0);
};

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
