// Reading the API's Google Calendar answers.

/**
 * Whether the coach has connected Google Calendar, from GET /google-calendar/status:
 * true or false, or null when the answer doesn't say (e.g. an API that predates the
 * endpoint), so callers keep whatever they showed before.
 */
export const readGoogleConnected = (payload) =>
  typeof payload?.connected === 'boolean' ? payload.connected : null;

/** The API's own reason for a failed request; it sends it as `detail`. */
export const googleCalendarErrorMessage = (data, statusText) =>
  data?.message || data?.error || data?.detail || statusText || 'Request failed.';
