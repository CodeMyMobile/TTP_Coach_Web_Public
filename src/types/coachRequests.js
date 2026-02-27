/**
 * @typedef {'confirm' | 'approve' | 'decline'} RequestAction
 */

/**
 * @typedef {Object} LessonRequestPayload
 * @property {number} id
 * @property {number=} lessontype_id
 * @property {string=} lesson_type_name
 * @property {string=} start_date_time
 * @property {string=} start_date_time_tz
 * @property {string=} end_date_time
 * @property {string=} end_date_time_tz
 * @property {string=} location
 * @property {number=} latitude
 * @property {number=} longitude
 * @property {number=} requested_price
 * @property {Record<string, unknown>=} metadata
 */

/**
 * @typedef {Object} RosterRequestPayload
 * @property {number=} relation_id
 * @property {number=} discount_percentage
 */

/**
 * @typedef {Object} CoachRequestActionConfig
 * @property {string=} endpoint
 * @property {'PATCH'=} method
 * @property {boolean=} confirm
 * @property {boolean=} approve
 * @property {boolean=} decline
 */

/**
 * @typedef {Object} CoachRequestItem
 * @property {'lesson_request' | 'roster_request'} request_type
 * @property {number} request_id
 * @property {string=} created_at
 * @property {'PENDING' | string=} status
 * @property {{id?: number, full_name?: string, phone?: string, email?: string}=} player
 * @property {LessonRequestPayload=} lesson
 * @property {RosterRequestPayload=} roster
 * @property {CoachRequestActionConfig=} actions
 */

export {};
