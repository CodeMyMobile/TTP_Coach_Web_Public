import { useCallback, useEffect, useState } from 'react';
import { getCoachStudents } from '../services/coach';

const normaliseStudents = (payload) => {
  if (Array.isArray(payload)) {
    return payload;
  }

  if (payload && Array.isArray(payload.students)) {
    return payload.students;
  }

  return [];
};

export const useCoachStudents = ({ enabled = true } = {}) => {
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(Boolean(enabled));
  const [error, setError] = useState(null);

  const fetchStudents = useCallback(async () => {
    if (!enabled) {
      setLoading(false);
      return [];
    }

    setLoading(true);
    try {
      const response = await getCoachStudents();
      const data = normaliseStudents(response);
      setStudents(data);
      setError(null);
      return data;
    } catch (err) {
      const normalisedError = err instanceof Error ? err : new Error('Failed to load students');
      setError(normalisedError);
      return [];
    } finally {
      setLoading(false);
    }
  }, [enabled]);

  useEffect(() => {
    if (!enabled) {
      setLoading(false);
      return;
    }

    fetchStudents();
  }, [enabled, fetchStudents]);

  const refresh = useCallback(() => fetchStudents(), [fetchStudents]);

  return {
    students,
    setStudents,
    loading,
    error,
    refresh
  };
};

export default useCoachStudents;
