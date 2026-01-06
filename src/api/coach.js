import { API_URL } from '../constants/urls';

export const createCoachAvailabilityBulk = async ({ coachAccessToken = null, allNewAvailability = [] }) => {
  if (!coachAccessToken || allNewAvailability.length === 0) {
    return null;
  }

  return fetch(`${API_URL}/coach/schedule/bulk`, {
    method: 'POST',
    headers: {
      'Content-type': 'application/json;charset=UTF-8',
      Authorization: `token ${coachAccessToken}`
    },
    body: JSON.stringify(allNewAvailability)
  });
};

export const updateCoachAvailability = async ({ coachAccessToken = null, scheduleId = null, updateAvailability = {} }) => {
  if (!coachAccessToken || !scheduleId) {
    return null;
  }

  return fetch(`${API_URL}/coach/schedule/${scheduleId}`, {
    method: 'PATCH',
    headers: {
      'Content-type': 'application/json;charset=UTF-8',
      Authorization: `token ${coachAccessToken}`
    },
    body: JSON.stringify(updateAvailability)
  });
};

export const replaceCoachAvailability = async ({ coachAccessToken = null, scheduleId = null, availability = {} }) => {
  if (!coachAccessToken || !scheduleId) {
    return null;
  }

  return fetch(`${API_URL}/coach/schedule/${scheduleId}`, {
    method: 'PUT',
    headers: {
      'Content-type': 'application/json;charset=UTF-8',
      Authorization: `token ${coachAccessToken}`
    },
    body: JSON.stringify(availability)
  });
};

export const deleteCoachAvailability = async ({ coachAccessToken = null, scheduleId = null }) => {
  if (!coachAccessToken || !scheduleId) {
    return null;
  }

  return fetch(`${API_URL}/coach/schedule/${scheduleId}`, {
    method: 'DELETE',
    headers: {
      'Content-type': 'application/json;charset=UTF-8',
      Authorization: `token ${coachAccessToken}`
    }
  });
};

export const getCoachAllAvailability = async (coachAccessToken) => {
  if (!coachAccessToken) {
    return null;
  }

  const response = await fetch(`${API_URL}/coach/schedule`, {
    method: 'GET',
    headers: {
      Authorization: `token ${coachAccessToken}`
    }
  });

  return response.json();
};

export const getCoachCurrentDayAvailability = async (coachAccessToken, currentDay) => {
  if (!coachAccessToken || !currentDay) {
    return null;
  }

  const response = await fetch(`${API_URL}/coach/schedule/${currentDay}`, {
    method: 'GET',
    headers: {
      Authorization: `token ${coachAccessToken}`
    }
  });

  return response.json();
};

export const getCoachUpcomingLessons = async (coachAccessToken, perPage = 5, page = 1) => {
  if (!coachAccessToken) {
    return null;
  }

  const response = await fetch(`${API_URL}/coach/lessons?perPage=${perPage}&page=${page}`, {
    method: 'GET',
    headers: {
      Authorization: `token ${coachAccessToken}`
    }
  });

  return response.json();
};

export const getCoachUpcomingLessonsByDate = async (coachAccessToken, date) => {
  if (!coachAccessToken || !date) {
    return null;
  }

  const response = await fetch(`${API_URL}/coach/lessons/${date}`, {
    method: 'GET',
    headers: {
      Authorization: `token ${coachAccessToken}`
    }
  });

  return response.json();
};

export const getCoachUpcomingLessonsById = async (coachAccessToken, lessonId = null) => {
  if (!coachAccessToken || lessonId === null) {
    return null;
  }

  const response = await fetch(`${API_URL}/coach/lesson/${lessonId}`, {
    method: 'GET',
    headers: {
      Authorization: `token ${coachAccessToken}`
    }
  });

  return response.json();
};

export const scheduleCoachLesson = async ({ coachAccessToken = null, lessonData = null }) => {
  if (!coachAccessToken || !lessonData) {
    return null;
  }

  return fetch(`${API_URL}/coach/lessons`, {
    method: 'POST',
    headers: {
      'Content-type': 'application/json;charset=UTF-8',
      Authorization: `token ${coachAccessToken}`
    },
    body: JSON.stringify({ ...lessonData })
  });
};

export const updateCoachLesson = async ({ coachAccessToken = null, lessonId = null, changes = {} }) => {
  if (!coachAccessToken || lessonId === null) {
    return null;
  }

  return fetch(`${API_URL}/coach/lesson/${lessonId}`, {
    method: 'PATCH',
    headers: {
      'Content-type': 'application/json;charset=UTF-8',
      Authorization: `token ${coachAccessToken}`
    },
    body: JSON.stringify(changes)
  });
};

export const updateCoachLessons = async (coachAccessToken = null, lessonId = null, changes = {}) => {
  if (!coachAccessToken || lessonId === null) {
    throw new Error('Must pass coach token and lesson id');
  }

  return fetch(`${API_URL}/coach/lesson/${lessonId}`, {
    method: 'PATCH',
    headers: {
      'Content-type': 'application/json;charset=UTF-8',
      Authorization: `token ${coachAccessToken}`
    },
    body: JSON.stringify(changes)
  });
};

export const coachStripePaymentIntent = async ({ coachAccessToken = null, lessonId = null } = {}) => {
  if (!coachAccessToken || lessonId === null) {
    return null;
  }

  return fetch(`${API_URL}/coach/stripe/paymentintent`, {
    method: 'POST',
    headers: {
      'Content-type': 'application/json;charset=UTF-8',
      Authorization: `token ${coachAccessToken}`
    },
    body: JSON.stringify({ lesson_id: lessonId })
  });
};

export const addPlayerToLesson = async ({ coachAccessToken = null, lessonId = null, playerId = null }) => {
  if (!coachAccessToken || lessonId === null || playerId === null) {
    return null;
  }

  return fetch(`${API_URL}/coach/lessons/${lessonId}/addplayer`, {
    method: 'POST',
    headers: {
      'Content-type': 'application/json;charset=UTF-8',
      Authorization: `token ${coachAccessToken}`
    },
    body: JSON.stringify({ player_id: playerId })
  });
};

export const getCoachLocations = async (coachAccessToken = null) => {
  if (!coachAccessToken) {
    return null;
  }

  return fetch(`${API_URL}/coach/locations`, {
    method: 'GET',
    headers: {
      Authorization: `token ${coachAccessToken}`
    }
  });
};

export const addCoachLocation = async ({ coachAccessToken, location_id }) => {
  if (!coachAccessToken) {
    return null;
  }

  return fetch(`${API_URL}/coach/locations`, {
    method: 'POST',
    headers: {
      'Content-type': 'application/json;charset=UTF-8',
      Authorization: `token ${coachAccessToken}`
    },
    body: JSON.stringify({ location_id })
  });
};

export const addCoachCustomLocation = async ({
  coachAccessToken,
  location_id,
  location,
  latitude,
  longitude,
  address_components
}) => {
  if (!coachAccessToken) {
    return null;
  }

  const params =
    location_id != null
      ? { location_id }
      : { location, latitude, longitude, address_components };

  return fetch(`${API_URL}/coach/location`, {
    method: 'POST',
    headers: {
      'Content-type': 'application/json;charset=UTF-8',
      Authorization: `token ${coachAccessToken}`
    },
    body: JSON.stringify(params)
  });
};

export const deleteCoachLocation = async ({ coachAccessToken = null, location_id = null }) => {
  if (!coachAccessToken || location_id === null) {
    return null;
  }

  return fetch(`${API_URL}/coach/locations/${location_id}`, {
    method: 'DELETE',
    headers: {
      'Content-type': 'application/json;charset=UTF-8',
      Authorization: `token ${coachAccessToken}`
    }
  });
};

export default {
  createCoachAvailabilityBulk,
  updateCoachAvailability,
  replaceCoachAvailability,
  deleteCoachAvailability,
  getCoachAllAvailability,
  getCoachCurrentDayAvailability,
  getCoachUpcomingLessons,
  getCoachUpcomingLessonsByDate,
  getCoachUpcomingLessonsById,
  scheduleCoachLesson,
  updateCoachLesson,
  updateCoachLessons,
  coachStripePaymentIntent,
  addPlayerToLesson,
  getCoachLocations,
  addCoachLocation,
  addCoachCustomLocation,
  deleteCoachLocation
};
