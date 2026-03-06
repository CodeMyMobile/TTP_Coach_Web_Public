import React, { useCallback, useEffect, useMemo, useState } from 'react';
import moment from 'moment';
import { ArrowLeft, RefreshCw, Search } from 'lucide-react';
import {
  getCoachLessonById,
  getCoachLessons,
  getCoachLessonsByDate,
  getCoachRequests
} from '../../services/coach';
import LessonDetailCard from './LessonDetailCard';

const resolveLessons = (payload) => {
  if (Array.isArray(payload)) {
    return payload;
  }

  if (payload && Array.isArray(payload.lessons)) {
    return payload.lessons;
  }

  if (payload && Array.isArray(payload.data)) {
    return payload.data;
  }

  return [];
};

const resolveTotal = (payload, fallbackCount) => {
  const pagination = payload?.pagination || payload?.meta || payload?.pageInfo || null;
  if (!pagination) {
    return fallbackCount;
  }

  const total = Number(pagination.total || pagination.totalItems || pagination.total_items);
  return Number.isFinite(total) ? total : fallbackCount;
};

const toUtcMoment = (value) => {
  if (!value) {
    return null;
  }

  const parsed = moment.utc(value);
  return parsed.isValid() ? parsed : null;
};


const UpcomingLessonsPage = ({ onBack }) => {
  const [lessons, setLessons] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDate, setSelectedDate] = useState('');
  const [page, setPage] = useState(1);
  const [perPage] = useState(20);
  const [totalLessons, setTotalLessons] = useState(0);
  const [selectedLesson, setSelectedLesson] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [requestsCount, setRequestsCount] = useState(0);

  const resolveLessonId = (lesson) => lesson?.id ?? lesson?.lesson_id ?? lesson?.lessonId;

  const fetchLessonDetail = useCallback(async (lessonId, fallbackLessons = []) => {
    if (!lessonId) {
      return null;
    }

    setDetailLoading(true);
    try {
      const detail = await getCoachLessonById({ lessonId });
      const resolved = detail?.lesson || detail;
      setSelectedLesson(resolved);
      return resolved;
    } catch {
      const fallback = fallbackLessons.find((item) => String(resolveLessonId(item)) === String(lessonId)) || null;
      setSelectedLesson(fallback);
      return fallback;
    } finally {
      setDetailLoading(false);
    }
  }, []);

  const fetchRequests = useCallback(async () => {
    try {
      const payload = await getCoachRequests({ perPage: 1, page: 1 });
      const total = Number(payload?.count || payload?.total || payload?.pagination?.total || 0);
      setRequestsCount(Number.isFinite(total) ? total : 0);
    } catch {
      setRequestsCount(0);
    }
  }, []);

  const fetchLessons = useCallback(async () => {
    setLoading(true);
    setError('');

    try {
      const payload = selectedDate
        ? await getCoachLessonsByDate({ date: selectedDate })
        : await getCoachLessons({ perPage, page, search: searchQuery || undefined });

      const nextLessons = resolveLessons(payload);
      const now = moment.utc();
      const upcomingOnly = nextLessons.filter((lesson) => {
        const raw = lesson?.start_date_time || lesson?.startDateTime || lesson?.start;
        const parsed = toUtcMoment(raw);
        return parsed ? parsed.isSameOrAfter(now) : true;
      });

      setLessons(upcomingOnly);
      setTotalLessons(resolveTotal(payload, upcomingOnly.length));

      await fetchRequests();

      if (selectedDate) {
        const firstLessonId = resolveLessonId(upcomingOnly[0]);
        if (firstLessonId) {
          await fetchLessonDetail(firstLessonId, upcomingOnly);
        } else {
          setSelectedLesson(null);
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load upcoming lessons.');
      setLessons([]);
      setTotalLessons(0);
    } finally {
      setLoading(false);
    }
  }, [fetchLessonDetail, fetchRequests, page, perPage, searchQuery, selectedDate]);


  useEffect(() => {
    fetchLessons();
  }, [fetchLessons]);

  useEffect(() => {
    fetchRequests();
  }, [fetchRequests]);

  const handleSearchSubmit = (event) => {
    event.preventDefault();
    setPage(1);
    fetchLessons();
  };

  const openLessonDetail = async (lessonId) => {
    await fetchLessonDetail(lessonId, lessons);
  };

  const hasNextPage = useMemo(() => {
    if (selectedDate) {
      return false;
    }
    return page * perPage < totalLessons;
  }, [page, perPage, selectedDate, totalLessons]);

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="mx-auto max-w-7xl px-4 py-6">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <button
            type="button"
            onClick={onBack}
            className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to dashboard
          </button>
          <div className="rounded-lg bg-white px-3 py-2 text-sm text-gray-600 shadow-sm">
            Pending requests: <span className="font-semibold text-gray-900">{requestsCount}</span>
          </div>
        </div>

        <div className="mb-5 rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
          <div className="mb-2 text-xl font-semibold text-gray-900">Upcoming lessons</div>
          <div className="text-sm text-gray-500">View all upcoming lessons and open lesson details.</div>
          <form onSubmit={handleSearchSubmit} className="mt-4 grid gap-3 md:grid-cols-[1fr_220px_auto]">
            <label className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder="Search student or lesson"
                className="w-full rounded-lg border border-gray-200 py-2 pl-9 pr-3 text-sm"
              />
            </label>
            <input
              type="date"
              value={selectedDate}
              onChange={(event) => {
                setSelectedDate(event.target.value);
                setPage(1);
              }}
              className="rounded-lg border border-gray-200 px-3 py-2 text-sm"
            />
            <button
              type="button"
              onClick={fetchLessons}
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-purple-600 px-4 py-2 text-sm font-medium text-white hover:bg-purple-700"
            >
              <RefreshCw className="h-4 w-4" />
              Refresh
            </button>
          </form>
        </div>

        {error && <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>}

        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_360px]">
          <div className="space-y-3">
            {loading ? (
              <div className="rounded-lg border border-gray-200 bg-white p-4 text-sm text-gray-500">Loading lessons...</div>
            ) : lessons.length === 0 ? (
              <div className="rounded-lg border border-gray-200 bg-white p-4 text-sm text-gray-500">No upcoming lessons found.</div>
            ) : (
              lessons.map((lesson) => {
                const lessonId = resolveLessonId(lesson);

                return (
                  <div key={lessonId} className="space-y-2">
                    <LessonDetailCard lesson={lesson} />
                    <button
                      type="button"
                      onClick={() => openLessonDetail(lessonId)}
                      className="rounded-md border border-purple-200 bg-white px-3 py-1.5 text-xs font-medium text-purple-700 hover:bg-purple-50"
                    >
                      Open lesson details panel
                    </button>
                  </div>
                );
              })
            )}

            {!selectedDate && (
              <div className="flex items-center justify-between rounded-lg border border-gray-200 bg-white px-4 py-3">
                <button
                  type="button"
                  onClick={() => setPage((prev) => Math.max(prev - 1, 1))}
                  disabled={page === 1 || loading}
                  className="rounded-md border border-gray-200 px-3 py-1 text-sm disabled:opacity-40"
                >
                  Prev
                </button>
                <span className="text-sm text-gray-600">Page {page}</span>
                <button
                  type="button"
                  onClick={() => setPage((prev) => prev + 1)}
                  disabled={!hasNextPage || loading}
                  className="rounded-md border border-gray-200 px-3 py-1 text-sm disabled:opacity-40"
                >
                  Next
                </button>
              </div>
            )}
          </div>

          <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
            <div className="mb-3 text-sm font-semibold uppercase tracking-wide text-gray-500">Lesson details</div>
            {detailLoading ? (
              <div className="text-sm text-gray-500">Loading lesson detail...</div>
            ) : selectedLesson ? (
              <div className="space-y-2 text-sm text-gray-700">
                <div className="font-semibold text-gray-900">
                  {selectedLesson.metadata?.title || selectedLesson.title || selectedLesson.lesson_title || selectedLesson.full_name || 'Lesson'}
                </div>
                <div>
                  <span className="font-medium">Start:</span> {String(selectedLesson.start_date_time || selectedLesson.startDateTime || selectedLesson.start || 'N/A')}
                </div>
                <div>
                  <span className="font-medium">End:</span> {String(selectedLesson.end_date_time || selectedLesson.endDateTime || selectedLesson.end || 'N/A')}
                </div>
                <div>
                  <span className="font-medium">Location:</span> {selectedLesson.location || selectedLesson.court || 'Location TBD'}
                </div>
              </div>
            ) : (
              <div className="text-sm text-gray-500">Select a lesson from the list to load more detail data.</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default UpcomingLessonsPage;
