import { API_URL } from '../../constants/urls';

export const getFutureLesson = async (coach = null, params = {}) => {
  if (!coach) {
    return null;
  }

  const query = new URLSearchParams();
  if (typeof params.perPage === 'number') {
    query.set('perPage', String(params.perPage));
  }
  if (typeof params.page === 'number') {
    query.set('page', String(params.page));
  }

  const path = query.toString()
    ? `${API_URL}/coach/lessons?${query.toString()}`
    : `${API_URL}/coach/lessons`;

  return fetch(path, {
    method: 'GET',
    headers: {
      Authorization: `token ${coach}`
    }
  });
};

export const getFutureLessonByDate = async (coach = null, date = null) => {
  if (!coach || !date) {
    return null;
  }

  return fetch(`${API_URL}/coach/lessons/${date}`, {
    method: 'GET',
    headers: {
      Authorization: `token ${coach}`
    }
  });
};

export const getCoachLessonById = async (coach = null, lessonId = null) => {
  if (!coach || !lessonId) {
    return null;
  }

  return fetch(`${API_URL}/coach/lesson/${lessonId}`, {
    method: 'GET',
    headers: {
      Authorization: `token ${coach}`
    }
  });
};

export const getCoachScheduleByDay = async (coach = null, day = null) => {
  if (!coach || !day) {
    return null;
  }

  return fetch(`${API_URL}/coach/schedule/${day}`, {
    method: 'GET',
    headers: {
      Authorization: `token ${coach}`
    }
  });
};

export const getAllCoachSchedule = async (coach = null) => {
  if (!coach) {
    return null;
  }

  return fetch(`${API_URL}/coach/schedule`, {
    method: 'GET',
    headers: {
      Authorization: `token ${coach}`
    }
  });
};

export const addCoachLesson = async (
  coach = null,
  playerId = null,
  startDateTime = null,
  endDateTime = null,
  locationId = null,
  court = 0,
  status = null
) => {
  if (!coach || !playerId || !startDateTime || !endDateTime || !locationId || status === null || court === null) {
    return null;
  }

  const params = {
    player_id: playerId,
    start_date_time: startDateTime,
    end_date_time: endDateTime,
    location_id: locationId,
    court,
    status
  };

  return fetch(`${API_URL}/coach/lessons`, {
    method: 'POST',
    headers: {
      'Content-type': 'application/json;charset=UTF-8',
      Authorization: `token ${coach}`
    },
    body: JSON.stringify({ ...params })
  });
};

export const addPlayerInCoachLesson = async (coach, playerId, lessonId) => {
  if (!coach || !playerId || !lessonId) {
    return null;
  }

  return fetch(`${API_URL}/coach/lessons/${lessonId}/addplayer`, {
    method: 'POST',
    headers: {
      'Content-type': 'application/json;charset=UTF-8',
      Authorization: `token ${coach}`
    },
    body: JSON.stringify({ player_id: playerId })
  });
};

export const addCoachSchedule = async (
  coach = null,
  from = null,
  to = null,
  day = null,
  locationId = null,
  court = 0
) => {
  if (!coach || !from || !to || !day || !locationId || court === null) {
    return null;
  }

  const params = {
    from,
    to,
    day,
    location_id: locationId,
    court
  };

  return fetch(`${API_URL}/coach/schedule`, {
    method: 'POST',
    headers: {
      'Content-type': 'application/json;charset=UTF-8',
      Authorization: `token ${coach}`
    },
    body: JSON.stringify({ ...params })
  });
};

export const addCoachScheduleInBulk = async (coach = null, scheduleBulk = []) => {
  if (!coach || scheduleBulk.length === 0) {
    return null;
  }

  return fetch(`${API_URL}/coach/schedule/bulk`, {
    method: 'POST',
    headers: {
      'Content-type': 'application/json;charset=UTF-8',
      Authorization: `token ${coach}`
    },
    body: JSON.stringify(scheduleBulk)
  });
};

export const updateCoachLesson = async (coach = null, lessonId = null, changes = {}) => {
  if (!coach || !lessonId) {
    throw new Error('Must pass coach token and lesson id');
  }

  return fetch(`${API_URL}/coach/lesson/${lessonId}`, {
    method: 'PATCH',
    headers: {
      'Content-type': 'application/json;charset=UTF-8',
      Authorization: `token ${coach}`
    },
    body: JSON.stringify(changes)
  });
};

export const updateCoachScheduleById = async (coach = null, id = null, params = null) => {
  if (!coach || !params || !id) {
    return null;
  }

  return fetch(`${API_URL}/coach/schedule/${id}`, {
    method: 'PATCH',
    headers: {
      'Content-type': 'application/json;charset=UTF-8',
      Authorization: `token ${coach}`
    },
    body: JSON.stringify({ ...params })
  });
};

export const replaceCoachScheduleById = async (coach = null, params = null, id = null) => {
  if (!coach || !params || !id) {
    return null;
  }

  return fetch(`${API_URL}/coach/schedule/${id}`, {
    method: 'PUT',
    headers: {
      'Content-type': 'application/json;charset=UTF-8',
      Authorization: `token ${coach}`
    },
    body: JSON.stringify({ ...params })
  });
};

export const deleteCoachSchedule = async (coach = null, scheduleId = null) => {
  if (!coach || !scheduleId) {
    return null;
  }

  return fetch(`${API_URL}/coach/schedule/${scheduleId}`, {
    method: 'DELETE',
    headers: {
      'Content-type': 'application/json;charset=UTF-8',
      Authorization: `token ${coach}`
    }
  });
};

export default {
  getFutureLesson,
  getFutureLessonByDate,
  getCoachLessonById,
  getCoachScheduleByDay,
  getAllCoachSchedule,
  addCoachLesson,
  addPlayerInCoachLesson,
  addCoachSchedule,
  addCoachScheduleInBulk,
  updateCoachLesson,
  updateCoachScheduleById,
  replaceCoachScheduleById,
  deleteCoachSchedule
};
