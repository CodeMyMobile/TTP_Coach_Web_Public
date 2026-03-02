/**
 * @typedef {'confirm' | 'approve' | 'decline'} RequestAction
 */

/**
 * @typedef {Object} LessonRequestPayload
 * @property {number} id
 * @property {number} lessontype_id
 * @property {string} lesson_type_name
 * @property {string} start_date_time
 * @property {string} start_date_time_tz
 * @property {string} end_date_time
 * @property {string} end_date_time_tz
 * @property {string} location
 * @property {string} latitude
 * @property {string} longitude
 * @property {number} requested_price
 * @property {Record<string, unknown>} metadata
 */

/**
 * @typedef {Object} RosterRequestPayload
 * @property {number} relation_id
 * @property {number | null} discount_percentage
 */

/**
 * @typedef {Object} CoachRequestItem
 * @property {'lesson_request' | 'roster_request' | 'awaiting_player_confirmation'} request_type
 * @property {number} request_id
 * @property {string} created_at
 * @property {'PENDING'} status
 * @property {{ id: number, full_name: string, phone?: string, email?: string }} player
 * @property {LessonRequestPayload=} lesson
 * @property {RosterRequestPayload=} roster
 * @property {{ endpoint?: string, method?: 'PATCH' | 'GET', confirm?: string, approve?: string, decline?: string, view?: string }} actions
 */

export {};
