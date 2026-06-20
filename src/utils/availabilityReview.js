// Frontend-only throttle for the post-confirm availability reminder.
// Per-device (localStorage); a cross-device version would need a backend
// `last_reviewed` field — out of scope here.

const LAST_REVIEWED_KEY = 'coachAvailabilityLastReviewed';
export const REVIEW_WINDOW_DAYS = 14;

const memoryStore = new Map();

const storage =
  typeof window !== 'undefined' && window?.localStorage
    ? window.localStorage
    : {
        getItem: (key) => (memoryStore.has(key) ? memoryStore.get(key) : null),
        setItem: (key, value) => {
          memoryStore.set(key, value);
        },
        removeItem: (key) => {
          memoryStore.delete(key);
        }
      };

// True if the coach reviewed availability within the throttle window.
export const hasReviewedRecently = () => {
  try {
    const raw = storage.getItem(LAST_REVIEWED_KEY);
    if (!raw) {
      return false;
    }
    const last = new Date(raw).getTime();
    if (Number.isNaN(last)) {
      return false;
    }
    const ageMs = Date.now() - last;
    return ageMs >= 0 && ageMs < REVIEW_WINDOW_DAYS * 24 * 60 * 60 * 1000;
  } catch (error) {
    return false;
  }
};

// Record that the coach just reviewed availability (resets the throttle window).
export const markAvailabilityReviewed = () => {
  try {
    storage.setItem(LAST_REVIEWED_KEY, new Date().toISOString());
  } catch (error) {
    // Ignore storage failures — the reminder simply isn't throttled on this device.
  }
};

export default { hasReviewedRecently, markAvailabilityReviewed, REVIEW_WINDOW_DAYS };
