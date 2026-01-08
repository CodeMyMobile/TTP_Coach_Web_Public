import { NOTIFICATION_TYPES } from '../constants';

export const getNotificationType = (entity, action) => {
  if (entity === null || entity === undefined || action === null || action === undefined) {
    return null;
  }

  return NOTIFICATION_TYPES?.[entity]?.[action] ?? null;
};
