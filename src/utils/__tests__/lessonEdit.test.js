import test from 'node:test';
import assert from 'node:assert/strict';

import {
  LESSON_DESCRIPTION_MAX_LENGTH,
  LESSON_TITLE_MAX_LENGTH,
  buildLessonUpdatePayload,
  getLessonMetadataLimitState,
  mergeSavedLessonDetail
} from '../lessonEdit.js';

test('buildLessonUpdatePayload strips summary fields and keeps group edit fields', () => {
  const payload = buildLessonUpdatePayload({
    lessontype_id: 3,
    player_summary: { total: 2 },
    metadata: { title: 'Cardio Tennis', description: 'Fast drills', level: 'Intermediate' },
    player_limit: '10',
    groupIds: ['4', 'bad'],
    playerIds: ['12', '13']
  });

  assert.deepEqual(payload, {
    metadata: {
      title: 'Cardio Tennis',
      description: 'Fast drills',
      level: 'Intermediate'
    },
    player_limit: 10,
    group_ids: [4],
    player_ids_arr: [{ player_id: 12 }, { player_id: 13 }]
  });
});

test('mergeSavedLessonDetail preserves group lesson shape when save response is partial', () => {
  const previousLesson = {
    id: 44,
    lessontype_id: 3,
    lesson_type_name: 'Group Lesson',
    start_date_time: '2026-06-27T17:00:00Z',
    group_players: [{ player_id: 1, full_name: 'Paul Cochrane' }],
    metadata: {
      title: 'Clinic and Liveball',
      description: 'Original',
      level: 'All'
    }
  };
  const editData = {
    ...previousLesson,
    metadata: {
      title: 'Clinic and Liveball',
      description: 'Updated',
      level: 'Intermediate'
    },
    player_limit: '8'
  };
  const savePayload = buildLessonUpdatePayload(editData);
  const partialResponse = {
    id: 44,
    metadata: {
      title: 'Clinic and Liveball',
      description: 'Updated',
      level: 'Intermediate'
    },
    player_limit: 8
  };

  const merged = mergeSavedLessonDetail(previousLesson, editData, savePayload, partialResponse);

  assert.equal(merged.lessontype_id, 3);
  assert.equal(merged.lesson_type_name, 'Group Lesson');
  assert.deepEqual(merged.group_players, previousLesson.group_players);
  assert.equal(merged.metadata.description, 'Updated');
  assert.equal(merged.player_limit, 8);
});

test('getLessonMetadataLimitState reports title and description character limits', () => {
  assert.equal(LESSON_TITLE_MAX_LENGTH, 100);
  assert.equal(LESSON_DESCRIPTION_MAX_LENGTH, 500);

  assert.deepEqual(getLessonMetadataLimitState('title', 'a'.repeat(101)), {
    count: 101,
    max: 100,
    isAtLimit: true,
    isOverLimit: true,
    label: '101/100'
  });

  assert.deepEqual(getLessonMetadataLimitState('description', 'a'.repeat(500)), {
    count: 500,
    max: 500,
    isAtLimit: true,
    isOverLimit: false,
    label: '500/500'
  });
});
