import React, { useCallback, useEffect, useMemo, useState } from 'react';
import moment from 'moment';
import { Bell, ChevronLeft, RefreshCw } from 'lucide-react';
import { getCoachRequests, updateCoachRequest } from '../../services/coach';

const formatLessonTime = (value) => {
  if (!value) {
    return null;
  }

  const parsed = moment.utc(value);
  return parsed.isValid() ? parsed : null;
};

const formatLessonSummary = (lesson) => {
  if (!lesson) {
    return '';
  }

  const startMoment = formatLessonTime(lesson?.start_date_time);
  const endMoment = formatLessonTime(lesson?.end_date_time);
  const timeRange =
    startMoment && endMoment ? `${startMoment.format('hh:mm a')} - ${endMoment.format('hh:mm a')}` : '';
  const dateLabel = startMoment ? startMoment.format('MMM DD') : '';
  const locationLabel = lesson?.location || '';

  return [dateLabel, timeRange, locationLabel, lesson?.requested_price ? `$${lesson.requested_price}` : '']
    .filter(Boolean)
    .join(' · ');
};

const getErrorMessage = (error, fallbackMessage) => {
  if (typeof error?.body?.detail === 'string' && error.body.detail.trim()) {
    return error.body.detail;
  }

  if (error instanceof Error && error.message) {
    return error.message;
  }

  return fallbackMessage;
};

const NotificationsPage = ({ onBack }) => {
  const [requests, setRequests] = useState([]);
  const [awaitingPlayerItems, setAwaitingPlayerItems] = useState([]);
  const [page, setPage] = useState(1);
  const [perPage] = useState(20);
  const [count, setCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [actionLoading, setActionLoading] = useState({});

  const hasMore = page * perPage < count;

  const fetchRequests = useCallback(
    async ({ pageToLoad = 1 } = {}) => {
      setLoading(true);
      setError(null);

      try {
        const response = await getCoachRequests({ perPage, page: pageToLoad });
        const nextItems = Array.isArray(response?.requests) ? response.requests : [];
        const waitingItems = Array.isArray(response?.awaiting_player_confirmation)
          ? response.awaiting_player_confirmation
          : [];
        setRequests(nextItems);
        setAwaitingPlayerItems(waitingItems);

        const totalCount =
          typeof response?.breakdown?.awaiting_player_confirmation === 'number'
            ? (response?.count || 0) + response.breakdown.awaiting_player_confirmation
            : nextItems.length + waitingItems.length;
        setCount(totalCount);
      } catch (err) {
        setError(getErrorMessage(err, 'Failed to load requests.'));
      } finally {
        setLoading(false);
      }
    },
    [perPage]
  );

  useEffect(() => {
    fetchRequests({ pageToLoad: page });
  }, [fetchRequests, page]);

  const handleRefresh = () => {
    fetchRequests({ pageToLoad: page });
  };

  const handleAction = async (requestItem, action) => {
    const key = `${requestItem.request_type}-${requestItem.request_id}`;
    const snapshot = [...requests];

    setActionLoading((prev) => ({ ...prev, [key]: action }));
    setRequests((prev) =>
      prev.filter(
        (item) => !(item.request_id === requestItem.request_id && item.request_type === requestItem.request_type)
      )
    );

    try {
      await updateCoachRequest({
        requestType: requestItem.request_type,
        requestId: requestItem.request_id,
        endpoint: requestItem?.actions?.endpoint,
        action
      });
      setCount((prev) => Math.max(prev - 1, 0));
    } catch (err) {
      const status = Number(err?.status);
      if (status === 404) {
        setError('Request no longer available.');
        fetchRequests({ pageToLoad: page });
      } else if (status === 409) {
        fetchRequests({ pageToLoad: page });
      } else {
        setRequests(snapshot);
        setError(getErrorMessage(err, 'Failed to update request.'));
      }
    } finally {
      setActionLoading((prev) => {
        const next = { ...prev };
        delete next[key];
        return next;
      });
    }
  };

  const actionableCards = useMemo(
    () =>
      requests.map((item) => {
        const isLesson = item.request_type === 'lesson_request';

        return {
          key: `${item.request_type}-${item.request_id}`,
          item,
          title: item?.player?.full_name || 'Player',
          subtitle: isLesson ? 'Lesson request' : 'Roster request',
          detail: isLesson
            ? formatLessonSummary(item.lesson)
            : item?.player?.email || item?.player?.phone || 'Pending roster request',
          createdAt: item?.created_at ? moment(item.created_at).fromNow() : '',
          approveLabel: isLesson ? 'Confirm' : 'Approve'
        };
      }),
    [requests]
  );

  const awaitingCards = useMemo(
    () =>
      awaitingPlayerItems.map((item) => ({
        key: `awaiting-${item.request_id}`,
        item,
        title: item?.player?.full_name || 'Player',
        subtitle: 'Awaiting player confirmation',
        detail: formatLessonSummary(item.lesson),
        createdAt: item?.created_at ? moment(item.created_at).fromNow() : '',
        viewUrl: item?.actions?.view || item?.actions?.endpoint || ''
      })),
    [awaitingPlayerItems]
  );

  const resolvedCount = count || actionableCards.length + awaitingCards.length;
  const emptyState = !loading && actionableCards.length === 0 && awaitingCards.length === 0;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="border-b bg-white">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-50 text-purple-600">
              <Bell className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs uppercase text-gray-400">Requests</p>
              <h1 className="text-2xl font-semibold text-gray-900">Updates {resolvedCount ? `(${resolvedCount})` : ''}</h1>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleRefresh}
              className="inline-flex items-center gap-2 rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-600 hover:bg-gray-50"
            >
              <RefreshCw className="h-4 w-4" />
              Refresh
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
        {error && <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}

        {loading && <div className="rounded-xl border border-dashed border-gray-200 bg-white px-4 py-10 text-center text-sm text-gray-500">Loading requests...</div>}

        {emptyState && <div className="rounded-xl border border-dashed border-gray-200 bg-white px-4 py-10 text-center text-sm text-gray-500">No pending requests.</div>}

        {!loading && (actionableCards.length > 0 || awaitingCards.length > 0) && (
          <div className="space-y-4">
            {actionableCards.map(({ key, item, title, subtitle, detail, createdAt, approveLabel }) => (
              <div key={key} className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-xs text-purple-500">{subtitle}</p>
                    <h3 className="text-sm font-semibold text-gray-900">{title}</h3>
                    <p className="mt-1 text-sm text-gray-500">{detail}</p>
                  </div>
                  <span className="text-xs text-gray-400">{createdAt}</span>
                </div>
                <div className="mt-3 flex gap-2">
                  <button
                    type="button"
                    onClick={() => handleAction(item, item.request_type === 'lesson_request' ? 'confirm' : 'approve')}
                    disabled={Boolean(actionLoading[key])}
                    className="rounded-lg bg-purple-600 px-3 py-2 text-xs font-semibold text-white transition hover:bg-purple-700 disabled:cursor-not-allowed disabled:bg-purple-300"
                  >
                    {actionLoading[key] === 'confirm' || actionLoading[key] === 'approve' ? 'Processing...' : approveLabel}
                  </button>
                  <button
                    type="button"
                    onClick={() => handleAction(item, 'decline')}
                    disabled={Boolean(actionLoading[key])}
                    className="rounded-lg border border-gray-200 px-3 py-2 text-xs font-semibold text-gray-700 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:text-gray-400"
                  >
                    {actionLoading[key] === 'decline' ? 'Processing...' : 'Decline'}
                  </button>
                </div>
              </div>
            ))}

            {awaitingCards.map(({ key, title, subtitle, detail, createdAt, viewUrl }) => (
              <div key={key} className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-xs text-amber-500">{subtitle}</p>
                    <h3 className="text-sm font-semibold text-gray-900">{title}</h3>
                    <p className="mt-1 text-sm text-gray-500">{detail}</p>
                  </div>
                  <span className="text-xs text-gray-400">{createdAt}</span>
                </div>
                <div className="mt-3 flex gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      if (viewUrl) {
                        window.open(viewUrl, '_blank', 'noopener,noreferrer');
                      }
                    }}
                    className="rounded-lg bg-gray-900 px-3 py-2 text-xs font-semibold text-white transition hover:bg-gray-800"
                  >
                    View
                  </button>
                </div>
              </div>
            ))}

            <div className="flex justify-center gap-2">
              <button
                type="button"
                onClick={() => setPage((prev) => Math.max(prev - 1, 1))}
                disabled={loading || page <= 1}
                className="rounded-lg border border-gray-200 px-4 py-2 text-sm text-gray-600 hover:bg-gray-50 disabled:cursor-not-allowed"
              >
                Prev
              </button>
              <button
                type="button"
                onClick={() => setPage((prev) => prev + 1)}
                disabled={loading || !hasMore}
                className="rounded-lg border border-gray-200 px-4 py-2 text-sm text-gray-600 hover:bg-gray-50 disabled:cursor-not-allowed"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default NotificationsPage;
