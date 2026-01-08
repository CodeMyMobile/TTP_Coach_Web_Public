import React, { useCallback, useEffect, useState } from 'react';
import moment from 'moment';
import { Bell, ChevronLeft, RefreshCw } from 'lucide-react';
import useAuth from '../../hooks/useAuth';
import { getNotification, getNotificationCount } from '../../api/notification';
import { coachStripePaymentIntent, updateCoachLessons } from '../../api/coach';
import { updateCoachPlayer } from '../../services/coach';
import { LESSON_TYPES, RELATION_TYPES } from '../../constants';
import { getNotificationType } from '../../utils/notifications';

const resolveNotifications = (payload) => {
  if (Array.isArray(payload)) {
    return payload;
  }

  if (payload && Array.isArray(payload.data)) {
    return payload.data;
  }

  if (payload && Array.isArray(payload.notifications)) {
    return payload.notifications;
  }

  if (payload && Array.isArray(payload.items)) {
    return payload.items;
  }

  return [];
};

const resolveCount = (payload) => {
  if (typeof payload === 'number') {
    return payload;
  }

  if (payload && typeof payload.count === 'number') {
    return payload.count;
  }

  if (payload && typeof payload.total === 'number') {
    return payload.total;
  }

  return null;
};

const formatLessonTime = (value) => {
  if (!value) {
    return null;
  }

  const raw = typeof value === 'string' && value.endsWith('Z') ? value.slice(0, -1) : value;
  const parsed = moment(raw);
  return parsed.isValid() ? parsed : null;
};

const NotificationsPage = ({ onBack }) => {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState(null);
  const [notificationCount, setNotificationCount] = useState(null);
  const [actionLoading, setActionLoading] = useState(null);

  const perPage = 10;

  const fetchNotifications = useCallback(
    async ({ pageToLoad = 1, replace = false } = {}) => {
      if (!user?.session?.access_token) {
        return;
      }

      if (pageToLoad === 1) {
        setLoading(true);
      } else {
        setLoadingMore(true);
      }

      setError(null);

      try {
        const response = await getNotification(user.session.access_token, perPage, pageToLoad);

        if (!response) {
          throw new Error('Failed to load notifications.');
        }

        if (!response.ok) {
          const errorBody = await response.json().catch(() => null);
          throw new Error(errorBody?.message || errorBody?.error || 'Failed to load notifications.');
        }

        const payload = await response.json().catch(() => null);
        const nextItems = resolveNotifications(payload);
        setHasMore(nextItems.length >= perPage);
        setNotifications((prev) => (replace ? nextItems : [...prev, ...nextItems]));
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load notifications.');
      } finally {
        setLoading(false);
        setLoadingMore(false);
      }
    },
    [user?.session?.access_token]
  );

  const fetchCount = useCallback(async () => {
    if (!user?.session?.access_token) {
      return;
    }

    try {
      const response = await getNotificationCount(user.session.access_token, perPage, 1);
      if (!response || !response.ok) {
        return;
      }

      const payload = await response.json().catch(() => null);
      setNotificationCount(resolveCount(payload));
    } catch (err) {
      // Ignore count errors.
    }
  }, [user?.session?.access_token]);

  useEffect(() => {
    setPage(1);
    fetchNotifications({ pageToLoad: 1, replace: true });
    fetchCount();
  }, [fetchNotifications, fetchCount]);

  const handleRefresh = () => {
    setPage(1);
    fetchNotifications({ pageToLoad: 1, replace: true });
    fetchCount();
  };

  const handleLoadMore = () => {
    if (loadingMore || !hasMore) {
      return;
    }

    const nextPage = page + 1;
    setPage(nextPage);
    fetchNotifications({ pageToLoad: nextPage });
  };

  const handleConfirmLesson = async (lessonId) => {
    if (!lessonId || !user?.session?.access_token) {
      return;
    }

    setActionLoading(`lesson-confirm-${lessonId}`);
    try {
      const response = await coachStripePaymentIntent({
        coachAccessToken: user.session.access_token,
        lessonId
      });

      if (response?.status === 200 || response?.status === 201) {
        await fetchNotifications({ pageToLoad: 1, replace: true });
      } else {
        window.alert('Failed to confirm lesson.');
      }
    } catch (err) {
      window.alert('Something went wrong!');
    } finally {
      setActionLoading(null);
    }
  };

  const handleDeclineLesson = async (lessonId) => {
    if (!lessonId || !user?.session?.access_token) {
      return;
    }

    setActionLoading(`lesson-decline-${lessonId}`);
    try {
      const response = await updateCoachLessons(user.session.access_token, lessonId, { status: 'CANCELLED' });
      if (response?.status === 200) {
        await fetchNotifications({ pageToLoad: 1, replace: true });
      } else {
        window.alert('Failed to decline lesson.');
      }
    } catch (err) {
      window.alert('Something went wrong!');
    } finally {
      setActionLoading(null);
    }
  };

  const handleConfirmRelation = async (playerId) => {
    if (!playerId) {
      return;
    }

    setActionLoading(`relation-confirm-${playerId}`);
    try {
      await updateCoachPlayer({ playerId, status: 'CONFIRMED' });
      await fetchNotifications({ pageToLoad: 1, replace: true });
    } catch (err) {
      window.alert('Failed to confirm roster request.');
    } finally {
      setActionLoading(null);
    }
  };

  const handleDeclineRelation = async (playerId) => {
    if (!playerId) {
      return;
    }

    setActionLoading(`relation-decline-${playerId}`);
    try {
      await updateCoachPlayer({ playerId, status: 'CANCELLED' });
      await fetchNotifications({ pageToLoad: 1, replace: true });
    } catch (err) {
      window.alert('Failed to decline roster request.');
    } finally {
      setActionLoading(null);
    }
  };

  const resolvedCount = notificationCount ?? notifications.length;

  const emptyState = !loading && notifications.length === 0;

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
              <h1 className="text-2xl font-semibold text-gray-900">
                Updates {resolvedCount ? `(${resolvedCount})` : ''}
              </h1>
              <p className="text-sm text-gray-500">Stay on top of lesson requests and roster updates.</p>
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
        {error && (
          <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        {loading && (
          <div className="rounded-xl border border-dashed border-gray-200 bg-white px-4 py-10 text-center text-sm text-gray-500">
            Loading notifications...
          </div>
        )}

        {emptyState && (
          <div className="rounded-xl border border-dashed border-gray-200 bg-white px-4 py-10 text-center text-sm text-gray-500">
            No notifications yet.
          </div>
        )}

        {!loading && notifications.length > 0 && (
          <div className="space-y-4">
            {notifications.map((item, index) => {
              const notificationType = getNotificationType(item.entity, item.action);
              const createdAt = item?.created_at ? moment(item.created_at).fromNow() : '';
              const lesson = item.lesson || item.lesson_details;
              const relation = item.cp_relation || item.relation;
              const lessonStatus = lesson?.status;
              const isLessonPending = lessonStatus === 0 || lessonStatus === 'PENDING';
              const startMoment = formatLessonTime(lesson?.start_date_time);
              const endMoment = formatLessonTime(lesson?.end_date_time);
              const timeRange =
                startMoment && endMoment ? `${startMoment.format('hh:mm a')} - ${endMoment.format('hh:mm a')}` : '';
              const dateLabel = startMoment ? startMoment.format('MMM DD') : '';
              const locationLabel = lesson?.court
                ? `${lesson?.location || ''} · Court ${lesson.court}`
                : lesson?.location || '';

              const showLessonActions = notificationType === LESSON_TYPES.LESSON_CREATED && isLessonPending;
              const showRelationActions = [
                RELATION_TYPES.RELATION_CREATED_BY_PLAYER,
                RELATION_TYPES.RELATION_DECLINED_BY_COACH
              ].includes(notificationType) && relation?.status === 0;

              const title =
                lesson?.full_name ||
                item?.title ||
                item?.message ||
                item?.actor_name ||
                'Notification';

              const detailText = item?.message || '';

              return (
                <div
                  key={`${item.id ?? index}`}
                  className={`rounded-xl border bg-white p-4 shadow-sm ${
                    item.seen ? 'border-gray-200' : 'border-purple-200'
                  }`}
                >
                  <div className="flex items-start gap-4">
                    <div className="h-12 w-12 overflow-hidden rounded-full bg-gray-100">
                      {item.profile_url ? (
                        <img
                          src={item.profile_url}
                          alt={title}
                          className="h-full w-full object-cover"
                          onError={(event) => {
                            event.currentTarget.src = '';
                          }}
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center text-sm font-semibold text-gray-500">
                          {title ? title.charAt(0).toUpperCase() : 'N'}
                        </div>
                      )}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <h3 className="text-sm font-semibold text-gray-900">{title}</h3>
                          {detailText && <p className="mt-1 text-sm text-gray-500">{detailText}</p>}
                        </div>
                        <span className="text-xs text-gray-400">{createdAt}</span>
                      </div>
                      {(timeRange || dateLabel || locationLabel) && (
                        <div className="mt-2 text-xs text-gray-500">
                          {dateLabel && <span className="mr-2">{dateLabel}</span>}
                          {timeRange && <span className="mr-2">{timeRange}</span>}
                          {locationLabel && <span>{locationLabel}</span>}
                        </div>
                      )}

                      {(showLessonActions || showRelationActions) && (
                        <div className="mt-3 flex flex-wrap gap-2">
                          <button
                            type="button"
                            onClick={() =>
                              showLessonActions
                                ? handleConfirmLesson(lesson?.id)
                                : handleConfirmRelation(item.actor_id)
                            }
                            disabled={actionLoading !== null}
                            className="rounded-lg bg-purple-600 px-3 py-2 text-xs font-semibold text-white transition hover:bg-purple-700 disabled:cursor-not-allowed disabled:bg-purple-300"
                          >
                            {actionLoading &&
                            (showLessonActions
                              ? actionLoading === `lesson-confirm-${lesson?.id}`
                              : actionLoading === `relation-confirm-${item.actor_id}`)
                              ? 'Confirming...'
                              : 'Confirm'}
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              showLessonActions
                                ? handleDeclineLesson(lesson?.id)
                                : handleDeclineRelation(item.actor_id)
                            }
                            disabled={actionLoading !== null}
                            className="rounded-lg border border-gray-200 px-3 py-2 text-xs font-semibold text-gray-700 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:text-gray-400"
                          >
                            {actionLoading &&
                            (showLessonActions
                              ? actionLoading === `lesson-decline-${lesson?.id}`
                              : actionLoading === `relation-decline-${item.actor_id}`)
                              ? 'Declining...'
                              : 'Decline'}
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}

            {hasMore && (
              <div className="flex justify-center">
                <button
                  type="button"
                  onClick={handleLoadMore}
                  disabled={loadingMore}
                  className="rounded-lg border border-gray-200 px-4 py-2 text-sm text-gray-600 hover:bg-gray-50 disabled:cursor-not-allowed"
                >
                  {loadingMore ? 'Loading...' : 'Load more'}
                </button>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
};

export default NotificationsPage;
