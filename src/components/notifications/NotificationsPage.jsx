import React, { useCallback, useEffect, useMemo, useState } from 'react';
import moment from 'moment';
import { Bell, ChevronLeft, ChevronRight, RefreshCw } from 'lucide-react';
import useAuth from '../../hooks/useAuth';
import { getCoachRequests, patchCoachRequest } from '../../services/coach';

const resolveRequestsPayload = (payload) => {
  if (Array.isArray(payload)) {
    return {
      requests: payload,
      count: payload.length,
      page: 1,
      perPage: payload.length,
      breakdown: {
        lesson_requests: payload.filter((item) => item.request_type === 'lesson_request').length,
        roster_requests: payload.filter((item) => item.request_type === 'roster_request').length
      }
    };
  }

  return {
    requests: Array.isArray(payload?.requests) ? payload.requests : [],
    count: typeof payload?.count === 'number' ? payload.count : 0,
    page: typeof payload?.page === 'number' ? payload.page : 1,
    perPage: typeof payload?.perPage === 'number' ? payload.perPage : 20,
    breakdown: payload?.breakdown || {
      lesson_requests: 0,
      roster_requests: 0
    }
  };
};

const formatLessonTime = (value) => {
  if (!value) {
    return null;
  }

  const parsed = moment(value);
  return parsed.isValid() ? parsed : null;
};


const getRequestActionEndpoint = (item, action) => {
  const actions = item?.actions || {};

  if (typeof actions[action] === 'string' && actions[action].trim()) {
    return actions[action];
  }

  if (typeof actions.endpoint === 'string' && actions.endpoint.trim()) {
    return actions.endpoint;
  }

  return null;
};

const getErrorMessage = (error, fallback) => {
  if (error?.body?.detail) {
    return error.body.detail;
  }

  return error?.message || fallback;
};

const NotificationsPage = ({ onBack }) => {
  const { user } = useAuth();
  const accessToken = user?.session?.access_token;

  const [requests, setRequests] = useState([]);
  const [expandedCards, setExpandedCards] = useState({});
  const [actionLoading, setActionLoading] = useState({});
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [toast, setToast] = useState(null);
  const [count, setCount] = useState(0);
  const [breakdown, setBreakdown] = useState({ lesson_requests: 0, roster_requests: 0 });
  const [page, setPage] = useState(1);

  const perPage = 20;

  const showToast = useCallback((message) => {
    setToast(message);
    window.setTimeout(() => {
      setToast((current) => (current === message ? null : current));
    }, 3000);
  }, []);

  const fetchRequests = useCallback(
    async ({ pageToLoad = 1, silent = false } = {}) => {
      if (!accessToken) {
        return;
      }

      if (silent) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      setError(null);

      try {
        const payload = await getCoachRequests({ perPage, page: pageToLoad });
        const resolved = resolveRequestsPayload(payload);
        setRequests(resolved.requests);
        setCount(resolved.count);
        setBreakdown(resolved.breakdown);
        setPage(resolved.page || pageToLoad);
      } catch (fetchError) {
        setError(getErrorMessage(fetchError, 'Failed to load requests.'));
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [accessToken]
  );

  useEffect(() => {
    fetchRequests({ pageToLoad: 1 });
  }, [fetchRequests]);

  const totalPages = useMemo(() => {
    if (!count || !perPage) {
      return 1;
    }

    return Math.max(1, Math.ceil(count / perPage));
  }, [count]);

  const toggleExpanded = (key) => {
    setExpandedCards((prev) => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  const getFallbackEndpoint = (item) => {
    const type = item.request_type === 'roster_request' ? 'roster_request' : 'lesson_request';
    return `/api/coach/requests/${type}/${item.request_id}`;
  };

  const handleRequestAction = async (item, action) => {
    const key = `${item.request_type}-${item.request_id}`;
    const previous = requests;

    setActionLoading((prev) => ({ ...prev, [key]: action }));
    setRequests((prev) => prev.filter((request) => `${request.request_type}-${request.request_id}` !== key));

    try {
      await patchCoachRequest({
        requestType: item.request_type,
        requestId: item.request_id,
        action,
        endpoint: getRequestActionEndpoint(item, action) || getFallbackEndpoint(item),
        method: item?.actions?.method || 'PATCH'
      });
    } catch (actionError) {
      const status = actionError?.status;

      if (status === 409) {
        await fetchRequests({ pageToLoad: page, silent: true });
        return;
      }

      if (status === 404) {
        showToast('Request no longer available');
        return;
      }

      setRequests(previous);
      showToast(getErrorMessage(actionError, 'Failed to update request.'));
    } finally {
      setActionLoading((prev) => {
        const { [key]: _, ...rest } = prev;
        return rest;
      });
    }
  };

  const handleRefresh = () => {
    fetchRequests({ pageToLoad: page, silent: true });
  };

  const emptyState = !loading && requests.length === 0;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="border-b bg-white">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-50 text-purple-600">
              <Bell className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs uppercase text-gray-400">Notifications</p>
              <h1 className="text-2xl font-semibold text-gray-900">Requests ({count || requests.length})</h1>
              <p className="text-sm text-gray-500">Lesson and roster requests in one queue.</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleRefresh}
              className="inline-flex items-center gap-2 rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-600 hover:bg-gray-50"
            >
              <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
              Reload
            </button>
            <button
              type="button"
              onClick={onBack}
              className="inline-flex items-center gap-2 rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-600 hover:bg-gray-50"
            >
              <ChevronLeft className="h-4 w-4" />
              Back to Dashboard
            </button>
          </div>
        </div>
      </div>

      <main className="mx-auto max-w-5xl px-4 py-6">
        {toast && <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">{toast}</div>}

        {error && <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}

        {loading && (
          <div className="rounded-xl border border-dashed border-gray-200 bg-white px-4 py-10 text-center text-sm text-gray-500">
            Loading requests...
          </div>
        )}

        {emptyState && (
          <div className="rounded-xl border border-dashed border-gray-200 bg-white px-4 py-10 text-center text-sm text-gray-500">
            No requests right now.
          </div>
        )}

        {!loading && requests.length > 0 && (
          <div className="space-y-4">
            <div className="rounded-xl border border-amber-100 bg-amber-50 px-4 py-3 text-sm text-amber-900">
              <span className="font-semibold">Requests</span> · Lessons: {breakdown.lesson_requests || 0} · Roster: {breakdown.roster_requests || 0}
            </div>

            {requests.map((item) => {
              const key = `${item.request_type}-${item.request_id}`;
              const expanded = Boolean(expandedCards[key]);
              const loadingAction = actionLoading[key];
              const isLesson = item.request_type === 'lesson_request';
              const playerName = item?.player?.full_name || 'Player';
              const createdAt = item?.created_at ? moment(item.created_at).fromNow() : '';
              const startMoment = formatLessonTime(item?.lesson?.start_date_time);
              const endMoment = formatLessonTime(item?.lesson?.end_date_time);
              const meta = isLesson
                ? [
                    startMoment ? startMoment.format('ddd, MMM D') : '',
                    startMoment && endMoment ? `${startMoment.format('h:mm A')} - ${endMoment.format('h:mm A')}` : '',
                    item?.lesson?.location || '',
                    item?.lesson?.requested_price ? `$${item.lesson.requested_price}` : ''
                  ]
                    .filter(Boolean)
                    .join(' · ')
                : 'Wants to join your roster';

              return (
                <div key={key} className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className={`text-xs font-semibold ${isLesson ? 'text-emerald-600' : 'text-violet-600'}`}>
                        {isLesson ? '🎾 Lesson Request' : '👤 Roster Request'}
                      </p>
                      <h3 className="text-sm font-semibold text-gray-900">{playerName}</h3>
                      <p className="text-sm text-gray-500">{meta}</p>
                    </div>
                    <span className="text-xs text-gray-400">{createdAt}</span>
                  </div>

                  {expanded && (
                    <div className="mt-3 rounded-lg bg-gray-50 p-3 text-sm text-gray-600">
                      {isLesson ? (
                        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                          <p>Type: {item?.lesson?.lesson_type_name || 'N/A'}</p>
                          <p>Phone: {item?.player?.phone || 'N/A'}</p>
                          <p>Email: {item?.player?.email || 'N/A'}</p>
                          <p>Location: {item?.lesson?.location || 'N/A'}</p>
                        </div>
                      ) : (
                        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                          <p>Phone: {item?.player?.phone || 'N/A'}</p>
                          <p>Email: {item?.player?.email || 'N/A'}</p>
                          <p>Discount: {typeof item?.roster?.discount_percentage === 'number' ? `${item.roster.discount_percentage}%` : 'N/A'}</p>
                          <p>Relation: {item?.roster?.relation_id || 'N/A'}</p>
                        </div>
                      )}
                    </div>
                  )}

                  <div className="mt-3 flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => toggleExpanded(key)}
                      className="rounded-lg border border-gray-200 px-3 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-50"
                    >
                      {expanded ? 'Hide details' : 'Details'}
                    </button>
                    <button
                      type="button"
                      onClick={() => handleRequestAction(item, 'decline')}
                      disabled={Boolean(loadingAction)}
                      className="rounded-lg border border-red-200 px-3 py-2 text-xs font-semibold text-red-600 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {loadingAction === 'decline' ? 'Declining...' : 'Decline'}
                    </button>
                    <button
                      type="button"
                      onClick={() => handleRequestAction(item, isLesson ? 'confirm' : 'approve')}
                      disabled={Boolean(loadingAction)}
                      className={`rounded-lg px-3 py-2 text-xs font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60 ${
                        isLesson ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-violet-600 hover:bg-violet-700'
                      }`}
                    >
                      {loadingAction === (isLesson ? 'confirm' : 'approve')
                        ? isLesson
                          ? 'Confirming...'
                          : 'Approving...'
                        : isLesson
                          ? 'Confirm'
                          : 'Approve'}
                    </button>
                  </div>
                </div>
              );
            })}

            <div className="flex items-center justify-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => fetchRequests({ pageToLoad: Math.max(1, page - 1), silent: true })}
                disabled={page <= 1 || refreshing}
                className="inline-flex items-center gap-1 rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-600 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <ChevronLeft className="h-4 w-4" />
                Previous
              </button>
              <p className="text-sm text-gray-500">
                Page {page} of {totalPages}
              </p>
              <button
                type="button"
                onClick={() => fetchRequests({ pageToLoad: Math.min(totalPages, page + 1), silent: true })}
                disabled={page >= totalPages || refreshing}
                className="inline-flex items-center gap-1 rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-600 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Next
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default NotificationsPage;
