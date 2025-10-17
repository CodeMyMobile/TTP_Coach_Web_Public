import { API_URL } from '../constants/urls';

const parseJson = async (response) => {
  try {
    return await response.json();
  } catch (error) {
    return null;
  }
};

export const logIn = async (email, password) => {
  if (!email || !password) {
    throw new Error('Email and password are both required to log in.');
  }

  const response = await fetch(`${API_URL}/auth/login/`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json;charset=UTF-8'
    },
    body: JSON.stringify({ email, password })
  });

  const data = await parseJson(response);

  return {
    ok: response.ok,
    status: response.status,
    data
  };
};

export const coachSignup = async (payload = {}) => {
  const response = await fetch(`${API_URL}/coach/signup/`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json;charset=UTF-8'
    },
    body: JSON.stringify(payload)
  });

  const data = await parseJson(response);

  return {
    ok: response.ok,
    status: response.status,
    data
  };
};

export default {
  logIn,
  coachSignup
};
