import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

const resolveList = (payload, listKeys = []) => {
  if (Array.isArray(payload)) {
    return payload;
  }

  const candidates = [
    ...listKeys,
    'items',
    'results',
    'data',
    'players',
    'lessons',
    'rows',
    'records'
  ];

  for (const key of candidates) {
    if (Array.isArray(payload?.[key])) {
      return payload[key];
    }

    if (Array.isArray(payload?.data?.[key])) {
      return payload.data[key];
    }
  }

  return [];
};

const resolveHasMore = (payload, page, perPage, receivedLength) => {
  const totalPages =
    payload?.pagination?.totalPages ??
    payload?.pagination?.total_pages ??
    payload?.meta?.total_pages ??
    payload?.totalPages;

  if (Number.isFinite(totalPages)) {
    return page < totalPages;
  }

  const totalItems =
    payload?.pagination?.total ??
    payload?.pagination?.total_items ??
    payload?.meta?.total ??
    payload?.total;

  if (Number.isFinite(totalItems)) {
    return page * perPage < totalItems;
  }

  return receivedLength >= perPage;
};

export const usePaginatedResource = ({
  fetcher,
  perPage = 5,
  enabled = true,
  listKeys = [],
  dependencies = []
}) => {
  const [items, setItems] = useState([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(Boolean(enabled));
  const [loadingMore, setLoadingMore] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const requestIdRef = useRef(0);

  const depsKey = useMemo(() => JSON.stringify(dependencies), [dependencies]);

  const fetchPage = useCallback(
    async (nextPage, { append = false, isRefresh = false } = {}) => {
      if (!enabled) {
        setLoading(false);
        return [];
      }

      const requestId = requestIdRef.current + 1;
      requestIdRef.current = requestId;

      if (isRefresh) {
        setRefreshing(true);
      } else if (append) {
        setLoadingMore(true);
      } else {
        setLoading(true);
      }

      try {
        const payload = await fetcher({ page: nextPage, perPage });
        if (requestId !== requestIdRef.current) {
          return [];
        }

        const list = resolveList(payload, listKeys);
        setItems((prev) => (append ? [...prev, ...list] : list));
        setPage(nextPage);
        setHasMore(resolveHasMore(payload, nextPage, perPage, list.length));
        setError(null);
        return list;
      } catch (err) {
        const normalisedError = err instanceof Error ? err : new Error('Failed to load data');
        setError(normalisedError);
        return [];
      } finally {
        setLoading(false);
        setLoadingMore(false);
        setRefreshing(false);
      }
    },
    [enabled, fetcher, listKeys, perPage]
  );

  useEffect(() => {
    if (!enabled) {
      setLoading(false);
      return;
    }

    setItems([]);
    setPage(1);
    setHasMore(true);
    fetchPage(1);
  }, [enabled, perPage, depsKey, fetchPage]);

  const refresh = useCallback(() => fetchPage(1, { append: false, isRefresh: true }), [fetchPage]);

  const loadMore = useCallback(() => {
    if (loadingMore || loading || !hasMore) {
      return;
    }
    fetchPage(page + 1, { append: true });
  }, [fetchPage, hasMore, loading, loadingMore, page]);

  return {
    items,
    setItems,
    page,
    hasMore,
    loading,
    loadingMore,
    refreshing,
    error,
    refresh,
    loadMore
  };
};

export default usePaginatedResource;
