// A player who isn't on the coach's roster asking for lessons: the answers they gave, as the
// coach reads them. The keys are the API's (ttp-api src/services/coachLessonRequests.js).

const EXPERIENCE = {
  new: 'New to tennis',
  beginner: 'Beginner',
  intermediate: 'Intermediate',
  advanced: 'Advanced',
  competitive: 'Competitive'
};
const GOALS = {
  basics: 'Learn the basics',
  technique: 'Improve technique',
  match_play: 'Match play & strategy',
  fitness: 'Fitness & fun',
  competition: 'League or tournament prep'
};
const TIMES_OF_DAY = {
  weekday_mornings: 'Weekday mornings',
  weekday_afternoons: 'Weekday afternoons',
  weekday_evenings: 'Weekday evenings',
  weekends: 'Weekends'
};
// Who the lessons are for, from the coach's side.
const FOR_WHOM = { my_child: 'their child', someone_else: 'someone else' };

const labelList = (values, labels) =>
  (Array.isArray(values) ? values : []).map((value) => labels[value] || value).join(', ');

export const playerFirstName = (view) => String(view?.player?.name || '').split(/\s+/)[0] || 'The player';

/** "Sam R. would like lessons for their child" */
export const requestHeadline = (view) => {
  const forWhom = FOR_WHOM[view?.request?.who_for];
  return `${view?.player?.name || 'A player'} would like lessons${forWhom ? ` for ${forWhom}` : ''}`;
};

/** [label, value] rows of the player's answers. */
export const answerRows = (view) => {
  const request = view?.request || {};
  const name = view?.player?.name || 'The player';
  const lessonsFor =
    request.who_for === 'my_child'
      ? `${playerFirstName(view)}'s child`
      : request.who_for === 'someone_else'
        ? 'Someone else'
        : name;
  return [
    ['Lessons for', lessonsFor],
    ['Experience', EXPERIENCE[request.experience] || request.experience || ''],
    ['Looking to', labelList(request.goals, GOALS)],
    ['Best times', labelList(request.times_of_day, TIMES_OF_DAY)],
    ...(request.note ? [['Note', request.note]] : [])
  ];
};

export const hasPreferredTime = (view) =>
  (view?.open_times || []).some((day) => (day.slots || []).some((slot) => slot.matches_preference));

/** What to tell the coach when the API refuses an answer, by its error code. */
export const answerErrorMessage = (code) => {
  switch (code) {
    case 'calendar_not_confirmed':
      return 'Tick the box to confirm your calendar is up to date.';
    case 'no_open_times':
      return "You don't have any open times in the next two weeks. Add some first.";
    case 'lesson_request_expired':
      return 'This request has expired.';
    case 'lesson_request_not_found':
      return 'This request is no longer available.';
    default:
      return 'Something went wrong. Please try again.';
  }
};

export default { answerErrorMessage, answerRows, hasPreferredTime, playerFirstName, requestHeadline };
