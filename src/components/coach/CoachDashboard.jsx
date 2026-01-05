import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  coachStripePaymentIntent,
  updateCoachLesson,
  updateCoachPlayer
} from '../../api/CoachApi/coachDashboard';
import useCoachUpcomingLessons from '../../hooks/useCoachUpcomingLessons';
import useCoachRoster from '../../hooks/useCoachRoster';
import CoachModal from './CoachModal';

const resolveLessonId = (lesson) => lesson?.id ?? lesson?.lesson_id ?? lesson?.lessonId;
const resolvePlayerId = (player) => player?.id ?? player?.player_id ?? player?.playerId;

const isPendingStatus = (value) => {
  if (typeof value === 'string') {
    return value.toLowerCase() === 'pending';
  }
  return value === 0;
};

const isLessonPending = (lesson) =>
  isPendingStatus(lesson?.status ?? lesson?.lesson_status ?? lesson?.lessonStatus);

const isPlayerPending = (player) =>
  isPendingStatus(player?.status ?? player?.player_status ?? player?.statusCode);

const isPlayerActive = (player) => {
  const status = player?.status ?? player?.player_status;
  if (typeof status === 'string') {
    return status.toLowerCase() === 'active';
  }
  if (typeof status === 'number') {
    return status === 1;
  }
  return Boolean(player?.is_active ?? player?.isActive ?? player?.approved);
};

const formatLessonTime = (lesson) => {
  const dateValue = lesson?.date || lesson?.lesson_date || lesson?.scheduled_at || lesson?.start_time;
  const date = dateValue ? new Date(dateValue) : null;
  if (!date || Number.isNaN(date.getTime())) {
    return 'TBD';
  }
  return new Intl.DateTimeFormat('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit'
  }).format(date);
};

const formatName = (entity) =>
  entity?.name ||
  entity?.full_name ||
  entity?.fullName ||
  [entity?.first_name, entity?.last_name].filter(Boolean).join(' ') ||
  'Unknown';

const CoachDashboard = ({
  coach,
  coachId,
  deepLinkLessonId,
  onSelectPlayer,
  onScheduleLesson,
  onAddPlayer
}) => {
  const resolvedCoachId = coachId ?? coach?.id ?? coach?.coach_id;
  const [lessonExpanded, setLessonExpanded] = useState(false);
  const [lessonModal, setLessonModal] = useState(null);
  const [playerModal, setPlayerModal] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [mutationLoading, setMutationLoading] = useState(false);
  const lessonListRef = useRef(null);
  const playerListRef = useRef(null);

  const {
    items: lessons,
    setItems: setLessons,
    loading: lessonsLoading,
    loadingMore: lessonsLoadingMore,
    refreshing: lessonsRefreshing,
    error: lessonsError,
    refresh: refreshLessons,
    loadMore: loadMoreLessons,
    hasMore: lessonsHasMore
  } = useCoachUpcomingLessons({ perPage: 5, enabled: true });

  const {
    items: players,
    setItems: setPlayers,
    loading: playersLoading,
    loadingMore: playersLoadingMore,
    refreshing: playersRefreshing,
    error: playersError,
    refresh: refreshPlayers,
    loadMore: loadMorePlayers,
    hasMore: playersHasMore
  } = useCoachRoster({ perPage: 5, search: searchQuery, enabled: true });

  const visibleLessons = useMemo(
    () => (lessonExpanded ? lessons : lessons.slice(0, 2)),
    [lessonExpanded, lessons]
  );

  useEffect(() => {
    if (!deepLinkLessonId || lessons.length === 0) {
      return;
    }

    const match = lessons.find((lesson) => String(resolveLessonId(lesson)) === String(deepLinkLessonId));
    if (match) {
      setLessonModal(match);
    }
  }, [deepLinkLessonId, lessons]);

  const handleLessonScroll = useCallback(
    (event) => {
      if (!lessonExpanded || !lessonsHasMore || lessonsLoadingMore) {
        return;
      }

      const { scrollTop, scrollHeight, clientHeight } = event.currentTarget;
      if (scrollTop + clientHeight >= scrollHeight - 40) {
        loadMoreLessons();
      }
    },
    [lessonExpanded, lessonsHasMore, lessonsLoadingMore, loadMoreLessons]
  );

  const handlePlayerScroll = useCallback(
    (event) => {
      if (!playersHasMore || playersLoadingMore) {
        return;
      }

      const { scrollTop, scrollHeight, clientHeight } = event.currentTarget;
      if (scrollTop + clientHeight >= scrollHeight - 40) {
        loadMorePlayers();
      }
    },
    [playersHasMore, playersLoadingMore, loadMorePlayers]
  );

  const openLessonModal = (lesson) => {
    setLessonModal(lesson);
  };

  const closeLessonModal = () => setLessonModal(null);
  const closePlayerModal = () => setPlayerModal(null);

  const handleLessonAction = async (lesson, action) => {
    const lessonId = resolveLessonId(lesson);
    if (!lessonId) {
      return;
    }

    setMutationLoading(true);
    const previous = lessons;

    try {
      if (action === 'cancel') {
        setLessons((prev) =>
          prev.map((item) =>
            resolveLessonId(item) === lessonId
              ? { ...item, status: 'cancelled', lesson_status: 'cancelled' }
              : item
          )
        );
        await updateCoachLesson(lessonId, { status: 'cancelled', lesson_status: 'cancelled' });
      }

      if (action === 'confirm') {
        await coachStripePaymentIntent({ lessonId });
      }

      await refreshLessons();
      closeLessonModal();
    } catch (error) {
      setLessons(previous);
      console.error('Lesson update failed', error);
    } finally {
      setMutationLoading(false);
    }
  };

  const handlePlayerAction = async (player, action) => {
    const playerId = resolvePlayerId(player);
    if (!playerId) {
      return;
    }

    setMutationLoading(true);
    const previous = players;

    try {
      const nextStatus = action === 'confirm' ? 'confirmed' : 'declined';
      setPlayers((prev) =>
        prev.map((item) =>
          resolvePlayerId(item) === playerId ? { ...item, status: nextStatus } : item
        )
      );

      await updateCoachPlayer(playerId, { status: nextStatus });
      await refreshPlayers();
      closePlayerModal();
    } catch (error) {
      setPlayers(previous);
      console.error('Player update failed', error);
    } finally {
      setMutationLoading(false);
    }
  };

  const handlePlayerClick = (player) => {
    if (isPlayerActive(player)) {
      onSelectPlayer?.(player);
      return;
    }

    setPlayerModal(player);
  };

  const coachName = formatName(coach);
  const coachAvatar = coach?.profile_picture || coach?.avatar || coach?.image || coach?.photo;

  const lessonPendingNeedsConfirm =
    lessonModal && isLessonPending(lessonModal) &&
    String(lessonModal?.created_by ?? lessonModal?.createdBy) !== String(resolvedCoachId);

  const playerModalPendingFromPlayer =
    playerModal &&
    String(playerModal?.created_by ?? playerModal?.createdBy) ===
      String(resolvePlayerId(playerModal));

  return (
    <div className="space-y-8">
      <header className="flex flex-wrap items-center justify-between gap-4 rounded-2xl bg-white p-6 shadow-sm">
        <div className="flex items-center gap-4">
          <div className="h-14 w-14 overflow-hidden rounded-full bg-gray-100">
            {coachAvatar ? (
              <img src={coachAvatar} alt={coachName} className="h-full w-full object-cover" />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-lg font-semibold text-gray-500">
                {coachName.charAt(0)}
              </div>
            )}
          </div>
          <div>
            <p className="text-sm text-gray-500">Welcome back</p>
            <h2 className="text-xl font-semibold text-gray-900">{coachName}</h2>
          </div>
        </div>
      </header>

      <section className="rounded-2xl bg-white p-6 shadow-sm">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Upcoming lessons</h3>
            <p className="text-sm text-gray-500">Next 5 sessions</p>
          </div>
          <button
            type="button"
            onClick={() => setLessonExpanded((prev) => !prev)}
            className="text-sm font-medium text-blue-600"
          >
            {lessonExpanded ? 'Collapse' : 'Expand'}
          </button>
        </div>

        {lessonsLoading && lessons.length === 0 ? (
          <div className="mt-6 text-sm text-gray-500">Loading lessons...</div>
        ) : lessonsError ? (
          <div className="mt-6 text-sm text-red-500">Failed to load lessons.</div>
        ) : lessons.length === 0 ? (
          <div className="mt-6 rounded-xl border border-dashed border-gray-300 p-6 text-center">
            <p className="text-sm text-gray-600">No upcoming lessons.</p>
            <button
              type="button"
              onClick={onScheduleLesson}
              className="mt-3 inline-flex rounded-full bg-blue-600 px-4 py-2 text-sm font-medium text-white"
            >
              Schedule Lesson
            </button>
          </div>
        ) : (
          <div
            ref={lessonListRef}
            onScroll={handleLessonScroll}
            className={`mt-6 space-y-3 ${lessonExpanded ? 'max-h-64 overflow-auto pr-2' : ''}`}
          >
            {visibleLessons.map((lesson) => (
              <button
                key={resolveLessonId(lesson)}
                type="button"
                onClick={() => openLessonModal(lesson)}
                className="flex w-full items-center justify-between rounded-xl border border-gray-200 bg-white px-4 py-3 text-left transition hover:border-blue-200"
              >
                <div>
                  <p className="text-sm font-semibold text-gray-900">
                    {lesson?.title || lesson?.lesson_type || 'Lesson'}
                  </p>
                  <p className="text-xs text-gray-500">{formatLessonTime(lesson)}</p>
                </div>
                <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-600">
                  {(lesson?.status || lesson?.lesson_status || 'scheduled').toString()}
                </span>
              </button>
            ))}
            {lessonExpanded && lessonsLoadingMore && (
              <div className="text-xs text-gray-500">Loading more lessons...</div>
            )}
          </div>
        )}

        {lessonsRefreshing && <p className="mt-3 text-xs text-gray-500">Refreshing...</p>}
      </section>

      <section className="rounded-2xl bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">My players</h3>
            <p className="text-sm text-gray-500">Roster overview</p>
          </div>
          <input
            type="search"
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            placeholder="Search players"
            className="w-full max-w-xs rounded-full border border-gray-200 px-4 py-2 text-sm focus:border-blue-300 focus:outline-none"
          />
        </div>

        {playersLoading && players.length === 0 ? (
          <div className="mt-6 text-sm text-gray-500">Loading players...</div>
        ) : playersError ? (
          <div className="mt-6 text-sm text-red-500">Failed to load players.</div>
        ) : players.length === 0 ? (
          <div className="mt-6 rounded-xl border border-dashed border-gray-300 p-6 text-center">
            <p className="text-sm text-gray-600">No players added yet.</p>
            <button
              type="button"
              onClick={onAddPlayer}
              className="mt-3 inline-flex rounded-full bg-blue-600 px-4 py-2 text-sm font-medium text-white"
            >
              Add Player
            </button>
          </div>
        ) : (
          <div
            ref={playerListRef}
            onScroll={handlePlayerScroll}
            className="mt-6 max-h-72 space-y-3 overflow-auto pr-2"
          >
            {players.map((player) => (
              <button
                key={resolvePlayerId(player)}
                type="button"
                onClick={() => handlePlayerClick(player)}
                className="flex w-full items-center justify-between rounded-xl border border-gray-200 bg-white px-4 py-3 text-left transition hover:border-blue-200"
              >
                <div>
                  <p className="text-sm font-semibold text-gray-900">{formatName(player)}</p>
                  <p className="text-xs text-gray-500">{player?.email || player?.phone || ''}</p>
                </div>
                <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-600">
                  {(player?.status || player?.player_status || 'pending').toString()}
                </span>
              </button>
            ))}
            {playersLoadingMore && <div className="text-xs text-gray-500">Loading more players...</div>}
          </div>
        )}

        {playersRefreshing && <p className="mt-3 text-xs text-gray-500">Refreshing...</p>}
      </section>

      <CoachModal
        open={Boolean(lessonModal)}
        title={
          lessonPendingNeedsConfirm ? 'Confirm lesson request' : 'Lesson details'
        }
        description={
          lessonPendingNeedsConfirm
            ? 'This lesson is pending your confirmation.'
            : 'Review lesson details and manage the session.'
        }
        onClose={closeLessonModal}
        actions={
          lessonModal
            ? [
                lessonPendingNeedsConfirm && (
                  <button
                    key="confirm"
                    type="button"
                    onClick={() => handleLessonAction(lessonModal, 'confirm')}
                    disabled={mutationLoading}
                    className="rounded-full bg-blue-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
                  >
                    Confirm & Charge
                  </button>
                ),
                <button
                  key="cancel"
                  type="button"
                  onClick={() => handleLessonAction(lessonModal, 'cancel')}
                  disabled={mutationLoading}
                  className="rounded-full border border-red-200 px-4 py-2 text-sm font-medium text-red-600 disabled:opacity-60"
                >
                  Cancel Lesson
                </button>
              ].filter(Boolean)
            : null
        }
      >
        {lessonModal && (
          <div className="space-y-2 text-sm text-gray-600">
            <p>
              <span className="font-semibold text-gray-900">Lesson:</span>{' '}
              {lessonModal?.title || lessonModal?.lesson_type || 'Lesson'}
            </p>
            <p>
              <span className="font-semibold text-gray-900">When:</span> {formatLessonTime(lessonModal)}
            </p>
            <p>
              <span className="font-semibold text-gray-900">Status:</span>{' '}
              {(lessonModal?.status || lessonModal?.lesson_status || 'scheduled').toString()}
            </p>
          </div>
        )}
      </CoachModal>

      <CoachModal
        open={Boolean(playerModal)}
        title={
          playerModalPendingFromPlayer ? 'Confirm player request' : 'Pending from player'
        }
        description={
          playerModalPendingFromPlayer
            ? 'This player is waiting for your approval.'
            : 'You have a pending request awaiting the player.'
        }
        onClose={closePlayerModal}
        actions={
          playerModalPendingFromPlayer
            ? [
                <button
                  key="confirm-player"
                  type="button"
                  onClick={() => handlePlayerAction(playerModal, 'confirm')}
                  disabled={mutationLoading}
                  className="rounded-full bg-blue-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
                >
                  Confirm
                </button>,
                <button
                  key="decline-player"
                  type="button"
                  onClick={() => handlePlayerAction(playerModal, 'decline')}
                  disabled={mutationLoading}
                  className="rounded-full border border-red-200 px-4 py-2 text-sm font-medium text-red-600 disabled:opacity-60"
                >
                  Decline
                </button>
              ]
            : [
                <button
                  key="pending-player"
                  type="button"
                  onClick={closePlayerModal}
                  className="rounded-full border border-gray-200 px-4 py-2 text-sm font-medium text-gray-600"
                >
                  Got it
                </button>
              ]
        }
      >
        {playerModal && (
          <div className="space-y-2 text-sm text-gray-600">
            <p>
              <span className="font-semibold text-gray-900">Player:</span>{' '}
              {formatName(playerModal)}
            </p>
            <p>
              <span className="font-semibold text-gray-900">Contact:</span>{' '}
              {playerModal?.email || playerModal?.phone || 'N/A'}
            </p>
          </div>
        )}
      </CoachModal>
    </div>
  );
};

export default CoachDashboard;
