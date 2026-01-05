import React, { useCallback, useMemo, useState } from 'react';
import {
  coachStripePaymentIntent,
  updateCoachLesson
} from '../../api/CoachApi/coachDashboard';
import useCoachPlayerDetail from '../../hooks/useCoachPlayerDetail';
import CoachModal from './CoachModal';

const resolveLessonId = (lesson) => lesson?.id ?? lesson?.lesson_id ?? lesson?.lessonId;

const isPendingStatus = (value) => {
  if (typeof value === 'string') {
    return value.toLowerCase() === 'pending';
  }
  return value === 0;
};

const isLessonPending = (lesson) =>
  isPendingStatus(lesson?.status ?? lesson?.lesson_status ?? lesson?.lessonStatus);

const formatName = (entity) =>
  entity?.name ||
  entity?.full_name ||
  entity?.fullName ||
  [entity?.first_name, entity?.last_name].filter(Boolean).join(' ') ||
  'Unknown';

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

const discountPresets = [5, 10, 15, 20, 25];

const CoachPlayerDetail = ({ playerId, coachId, onBack }) => {
  const [activeTab, setActiveTab] = useState('upcoming');
  const [lessonModal, setLessonModal] = useState(null);
  const [discountModal, setDiscountModal] = useState(false);
  const [discountInput, setDiscountInput] = useState('');
  const [mutationLoading, setMutationLoading] = useState(false);

  const {
    player,
    playerLoading,
    playerError,
    refreshPlayer,
    upcomingLessons,
    previousLessons,
    updateDiscount
  } = useCoachPlayerDetail({ playerId, enabled: true });

  const activeLessons = activeTab === 'upcoming' ? upcomingLessons : previousLessons;
  const lessons = activeLessons.items;
  const lessonsHasMore = activeLessons.hasMore;
  const lessonsLoading = activeLessons.loading;
  const lessonsLoadingMore = activeLessons.loadingMore;
  const lessonsRefreshing = activeLessons.refreshing;

  const lessonPendingNeedsConfirm =
    lessonModal &&
    isLessonPending(lessonModal) &&
    String(lessonModal?.created_by ?? lessonModal?.createdBy) !== String(coachId);

  const discountValue = Number(player?.discount_percentage ?? 0) || 0;

  const handleLessonAction = async (lesson, action) => {
    const lessonId = resolveLessonId(lesson);
    if (!lessonId) {
      return;
    }

    setMutationLoading(true);
    const previous = activeLessons.items;

    try {
      if (action === 'cancel') {
        activeLessons.setItems((prev) =>
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

      await activeLessons.refresh();
      setLessonModal(null);
    } catch (error) {
      activeLessons.setItems(previous);
      console.error('Lesson update failed', error);
    } finally {
      setMutationLoading(false);
    }
  };

  const handleDiscountSave = async (value) => {
    const resolved = Number(value);
    setMutationLoading(true);
    try {
      await updateDiscount(Number.isFinite(resolved) ? resolved : 0);
      setDiscountModal(false);
      setDiscountInput('');
    } catch (error) {
      console.error('Discount update failed', error);
    } finally {
      setMutationLoading(false);
    }
  };

  const handleDiscountPreset = (value) => {
    setDiscountInput(String(value));
  };

  const handleLoadMore = useCallback(
    (event) => {
      if (!lessonsHasMore || lessonsLoadingMore) {
        return;
      }
      const { scrollTop, scrollHeight, clientHeight } = event.currentTarget;
      if (scrollTop + clientHeight >= scrollHeight - 40) {
        activeLessons.loadMore();
      }
    },
    [activeLessons, lessonsHasMore, lessonsLoadingMore]
  );

  const profileName = formatName(player);
  const profileImage = player?.profile_picture || player?.avatar || player?.image;
  const phone = player?.phone || player?.phone_number;

  const listTitle = activeTab === 'upcoming' ? 'Upcoming lessons' : 'Lesson history';
  const emptyMessage =
    activeTab === 'upcoming'
      ? 'No upcoming lessons for this player.'
      : 'No previous lessons recorded yet.';

  const discountBadge = discountValue > 0 ? `${discountValue}% off` : 'No discount';

  return (
    <div className="space-y-6">
      <header className="flex items-center justify-between rounded-2xl bg-white p-6 shadow-sm">
        <button
          type="button"
          onClick={onBack}
          className="rounded-full border border-gray-200 px-4 py-2 text-sm font-medium text-gray-600"
        >
          Back
        </button>
        <button
          type="button"
          onClick={() => setDiscountModal(true)}
          className="rounded-full bg-blue-600 px-4 py-2 text-sm font-medium text-white"
        >
          Discount
        </button>
      </header>

      <section className="rounded-2xl bg-white p-6 shadow-sm">
        {playerLoading ? (
          <p className="text-sm text-gray-500">Loading player...</p>
        ) : playerError ? (
          <div className="flex items-center justify-between">
            <p className="text-sm text-red-500">Failed to load player.</p>
            <button
              type="button"
              onClick={refreshPlayer}
              className="rounded-full border border-gray-200 px-3 py-1 text-xs text-gray-600"
            >
              Retry
            </button>
          </div>
        ) : (
          <div className="flex flex-wrap items-center gap-5">
            <div className="h-20 w-20 overflow-hidden rounded-full bg-gray-100">
              {profileImage ? (
                <img src={profileImage} alt={profileName} className="h-full w-full object-cover" />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-xl font-semibold text-gray-500">
                  {profileName.charAt(0)}
                </div>
              )}
            </div>
            <div className="flex-1 space-y-1">
              <h2 className="text-xl font-semibold text-gray-900">{profileName}</h2>
              {player?.email && <p className="text-sm text-gray-600">{player.email}</p>}
              {phone && (
                <a href={`sms:${phone}`} className="text-sm text-blue-600">
                  {phone}
                </a>
              )}
            </div>
            <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-semibold text-gray-700">
              {discountBadge}
            </span>
          </div>
        )}
      </section>

      <section className="rounded-2xl bg-white p-6 shadow-sm">
        <div className="flex items-center gap-4">
          {['upcoming', 'history'].map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => setActiveTab(tab)}
              className={`rounded-full px-4 py-2 text-sm font-medium ${
                activeTab === tab ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600'
              }`}
            >
              {tab === 'upcoming' ? 'Upcoming Lessons' : 'History'}
            </button>
          ))}
          <button
            type="button"
            onClick={activeLessons.refresh}
            className="ml-auto rounded-full border border-gray-200 px-3 py-1 text-xs text-gray-600"
          >
            Refresh
          </button>
        </div>

        <div className="mt-5">
          <h3 className="text-sm font-semibold text-gray-900">{listTitle}</h3>

          {lessonsLoading && lessons.length === 0 ? (
            <p className="mt-4 text-sm text-gray-500">Loading lessons...</p>
          ) : lessons.length === 0 ? (
            <p className="mt-4 text-sm text-gray-500">{emptyMessage}</p>
          ) : (
            <div
              onScroll={handleLoadMore}
              className="mt-4 max-h-72 space-y-3 overflow-auto pr-2"
            >
              {lessons.map((lesson) => (
                <button
                  key={resolveLessonId(lesson)}
                  type="button"
                  onClick={() => setLessonModal(lesson)}
                  className="flex w-full items-center justify-between rounded-xl border border-gray-200 px-4 py-3 text-left hover:border-blue-200"
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
              {lessonsLoadingMore && <p className="text-xs text-gray-500">Loading more...</p>}
            </div>
          )}

          {lessonsRefreshing && <p className="mt-3 text-xs text-gray-500">Refreshing...</p>}
        </div>
      </section>

      <CoachModal
        open={Boolean(lessonModal)}
        title={lessonPendingNeedsConfirm ? 'Confirm lesson request' : 'Lesson details'}
        description={
          lessonPendingNeedsConfirm
            ? 'This lesson is pending your confirmation.'
            : 'Review lesson details and manage the session.'
        }
        onClose={() => setLessonModal(null)}
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
        open={discountModal}
        title="Adjust discount"
        description="Apply a discount to this player's lessons."
        onClose={() => setDiscountModal(false)}
        actions={[
          <button
            key="remove"
            type="button"
            onClick={() => handleDiscountSave(0)}
            disabled={mutationLoading}
            className="rounded-full border border-gray-200 px-4 py-2 text-sm font-medium text-gray-600 disabled:opacity-60"
          >
            Remove Discount
          </button>,
          <button
            key="save"
            type="button"
            onClick={() => handleDiscountSave(discountInput || discountValue)}
            disabled={mutationLoading}
            className="rounded-full bg-blue-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
          >
            Save
          </button>
        ]}
      >
        <div className="space-y-3">
          <div className="flex flex-wrap gap-2">
            {discountPresets.map((preset) => (
              <button
                key={preset}
                type="button"
                onClick={() => handleDiscountPreset(preset)}
                className="rounded-full border border-gray-200 px-3 py-1 text-xs font-medium text-gray-600"
              >
                {preset}%
              </button>
            ))}
          </div>
          <div>
            <label className="text-xs font-semibold text-gray-600">Custom %</label>
            <input
              type="number"
              min="0"
              max="100"
              value={discountInput}
              onChange={(event) => setDiscountInput(event.target.value)}
              placeholder="0"
              className="mt-2 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
            />
          </div>
        </div>
      </CoachModal>
    </div>
  );
};

export default CoachPlayerDetail;
