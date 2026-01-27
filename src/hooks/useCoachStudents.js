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

export const useCoachStudents = ({ enabled = true, perPage = 5, search = '' } = {}) => {
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(Boolean(enabled));
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState(null);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [refreshTick, setRefreshTick] = useState(0);

  const fetchStudents = useCallback(async (pageToLoad) => {
    if (!enabled) {
      setLoading(false);
      return [];
    }

    if (pageToLoad === 1) {
      setLoading(true);
    } else {
      setLoadingMore(true);
    }

    try {
      const response = await getCoachStudents({ perPage, page: pageToLoad, search });
      const data = normaliseStudents(response);
      setStudents((previous) => (pageToLoad === 1 ? data : [...previous, ...data]));
      setHasMore(data.length >= perPage);
      setError(null);
      return data;
    } catch (err) {
      const normalisedError = err instanceof Error ? err : new Error('Failed to load students');
      setError(normalisedError);
      return [];
    } finally {
      if (pageToLoad === 1) {
        setLoading(false);
      } else {
        setLoadingMore(false);
      }
    }
  }, [enabled, perPage, search]);

  useEffect(() => {
    if (!enabled) {
      setLoading(false);
      return;
    }

    setStudents([]);
    setHasMore(true);
    setLoadingMore(false);
    setPage(1);
  }, [enabled, perPage, search]);

  useEffect(() => {
    if (!enabled) {
      return;
    }

    fetchStudents(page);
  }, [enabled, fetchStudents, page, refreshTick]);

  const refresh = useCallback(() => {
    setStudents([]);
    setHasMore(true);
    setPage(1);
    setRefreshTick((current) => current + 1);
  }, []);

  const loadMore = useCallback(() => {
    if (loadingMore || loading || !hasMore) {
      return;
    }

    setPage((current) => current + 1);
  }, [hasMore, loading, loadingMore]);

  return {
    students,
    setStudents,
    loading,
    loadingMore,
    error,
    hasMore,
    loadMore,
    page,
    perPage,
    refresh
  };
};

export default useCoachStudents;
