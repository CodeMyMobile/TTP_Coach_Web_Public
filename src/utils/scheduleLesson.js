const lessonIdMatches = (lesson, lessonId) =>
  Number(lesson?.id ?? lesson?.lesson_id ?? lesson?.lessonId) === Number(lessonId);

const hasGroupRoster = (lesson) =>
  Array.isArray(lesson?.group_players) || Array.isArray(lesson?.groupPlayers);

export const findRosterCapableLesson = (schedule, lessonId) => [
  ...(schedule?.lessons || []),
  ...(schedule?.upcomingLessons || [])
].find((lesson) => lessonIdMatches(lesson, lessonId) && hasGroupRoster(lesson));
