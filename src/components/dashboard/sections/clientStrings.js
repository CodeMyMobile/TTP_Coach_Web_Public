// A client's past setups and how they rated them, from GET /coach/restringing/players/:id/strings
// (ttp-api src/services/stringFeedback.js), shown in the order form so the coach can see
// "last time: Hyper-G at 52, 2/5, too stiff". Also their game profile, which prefills
// "Help me choose".

import { QUIZ_QUESTIONS } from './stringQuiz.js';

const FEEL_LABELS = { too_stiff: 'Too stiff', right: 'Felt right', too_soft: 'Too soft' };
const AGAIN_LABELS = { yes: 'Would get again', maybe: 'Maybe again', no: 'Wouldn’t get again' };

const stringName = string => [string?.brand, string?.name].filter(Boolean).join(' ').trim();

/** "Babolat RPM Blast", "Babolat RPM Blast / Wilson NXT", or the player's own string. */
export function setupName(row) {
  const mains = stringName(row?.string);
  const crosses = stringName(row?.crosses_string);
  if (mains && crosses && crosses !== mains) return `${mains} / ${crosses}`;
  if (mains) return mains;
  if (row?.own_string_text) return `Own string: ${row.own_string_text}`;
  return row?.custom_string_text || 'Stringer’s choice';
}

const tensionText = row => {
  const mains = Number(row?.tension_lbs_mains);
  const crosses = Number(row?.tension_lbs_crosses);
  if (!mains) return '';
  return crosses && crosses !== mains ? `${mains}/${crosses} lbs` : `${mains} lbs`;
};

const shortDate = value => {
  const date = value ? new Date(value) : null;
  return date && !Number.isNaN(date.getTime())
    ? date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' })
    : '';
};

/**
 * One line per racket, newest first: the setup, then racket and date, then the player's
 * rating in their own words. Only what they said; nothing for unrated rackets but "Not rated".
 */
export function clientStringLines(strings, limit = 4) {
  return (Array.isArray(strings) ? strings : []).slice(0, limit).map(row => {
    const feedback = row?.feedback || null;
    const rating = feedback
      ? [
        `${feedback.overall}/5`,
        FEEL_LABELS[feedback.feel],
        AGAIN_LABELS[feedback.again],
        feedback.arm_discomfort ? 'Arm discomfort' : ''
      ].filter(Boolean).join(' · ')
      : row?.can_rate ? 'Not rated yet' : '';
    return {
      key: row?.order_item_id,
      title: [setupName(row), row?.gauge, tensionText(row)].filter(Boolean).join(' · '),
      detail: [row?.racket_make_model, shortDate(row?.picked_up_at)].filter(Boolean).join(' · '),
      rating,
      rated: Boolean(feedback),
      comment: feedback?.comment || ''
    };
  });
}

/** The quiz answers the profile already holds, to start "Help me choose" from. */
export function quizAnswersFromProfile(profile) {
  const answers = {};
  for (const question of QUIZ_QUESTIONS) {
    const value = profile?.[question.key];
    if (value && question.options.some(option => option.value === value)) answers[question.key] = value;
  }
  return answers;
}
