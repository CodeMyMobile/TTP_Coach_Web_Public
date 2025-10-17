export const SPLASH_SCREEN_REDIRECT_DELAY = 3000;

export const USER_TYPES = {
  coach: 1,
  player: 2
};

export const STATUS = {
  PENDING: 0,
  CONFIRMED: 1,
  CANCELLED: 2
};

export const NOTIFICATION_TYPES = {
  0: {
    0: 'lesson-created',
    1: 'lesson-confirmed',
    2: 'lesson-declined',
    3: 'lesson-cancelled',
    4: 'lesson-scheduled'
  },
  1: {
    0: 'relation-created-by-player',
    1: 'relation-created-by-coach',
    2: 'relation-declined-by-coach'
  }
};

export const LESSON_TYPES = {
  LESSON_CREATED: 'lesson-created',
  LESSON_CONFIRMED: 'lesson-confirmed',
  LESSON_DECLINED: 'lesson-declined',
  LESSON_CANCELLED: 'lesson-cancelled',
  LESSON_SCHEDULED: 'lesson-scheduled'
};

export const RELATION_TYPES = {
  RELATION_CREATED_BY_COACH: 'relation-created-by-coach',
  RELATION_DECLINED_BY_COACH: 'relation-declined-by-coach',
  RELATION_CREATED_BY_PLAYER: 'relation-created-by-player'
};
