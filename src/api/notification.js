import { API_URL } from '../constants/urls';

export const getNotification = async (token = null, perPage = null, page = null) => {
  if (!token) {
    return null;
  }

  const params = new URLSearchParams();
  if (perPage !== null && perPage !== undefined) {
    params.append('perPage', String(perPage));
  }
  if (page !== null && page !== undefined) {
    params.append('page', String(page));
  }

  const suffix = params.toString() ? `?${params.toString()}` : '';
  return fetch(`${API_URL}/notification${suffix}`, {
    method: 'GET',
    headers: {
      Authorization: `token ${token}`
    }
  });
};

export const getNotificationCount = async (token = null, perPage = null, page = null) => {
  if (!token) {
    return null;
  }

  const params = new URLSearchParams();
  if (perPage !== null && perPage !== undefined) {
    params.append('perPage', String(perPage));
  }
  if (page !== null && page !== undefined) {
    params.append('page', String(page));
  }

  const suffix = params.toString() ? `?${params.toString()}` : '';
  return fetch(`${API_URL}/notification_count${suffix}`, {
    method: 'GET',
    headers: {
      Authorization: `token ${token}`
    }
  });
};
