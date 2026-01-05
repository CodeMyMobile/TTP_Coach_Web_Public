import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  getPlayerPreviousLessons,
  getPlayerUpcomingLessons,
  getSingleCoachPlayer,
  updateCoachPlayer
} from '../api/CoachApi/coachDashboard';
import usePaginatedResource from './usePaginatedResource';

export const useCoachPlayerDetail = ({ playerId, enabled = true } = {}) => {
  const [player, setPlayer] = useState(null);
  const [playerLoading, setPlayerLoading] = useState(Boolean(enabled && playerId));
  const [playerError, setPlayerError] = useState(null);

  const loadPlayer = useCallback(async () => {
    if (!enabled || !playerId) {
      setPlayerLoading(false);
      return null;
    }

    setPlayerLoading(true);
    try {
      const payload = await getSingleCoachPlayer(playerId);
      setPlayer(payload?.player || payload?.data || payload || null);
      setPlayerError(null);
      return payload;
    } catch (err) {
      const normalisedError = err instanceof Error ? err : new Error('Failed to load player details');
      setPlayerError(normalisedError);
      return null;
    } finally {
      setPlayerLoading(false);
    }
  }, [enabled, playerId]);

  useEffect(() => {
    loadPlayer();
  }, [loadPlayer]);

  const upcomingFetcher = useMemo(
    () => ({ page, perPage }) => getPlayerUpcomingLessons({ playerId, page, perPage }),
    [playerId]
  );

  const historyFetcher = useMemo(
    () => ({ page, perPage }) => getPlayerPreviousLessons({ playerId, page, perPage }),
    [playerId]
  );

  const upcomingLessons = usePaginatedResource({
    fetcher: upcomingFetcher,
    perPage: 10,
    enabled: enabled && Boolean(playerId),
    listKeys: ['lessons'],
    dependencies: [playerId]
  });

  const previousLessons = usePaginatedResource({
    fetcher: historyFetcher,
    perPage: 10,
    enabled: enabled && Boolean(playerId),
    listKeys: ['lessons'],
    dependencies: [playerId]
  });

  const updateDiscount = useCallback(
    async (discountPercentage) => {
      if (!playerId) {
        throw new Error('A player id is required to update discount.');
      }

      const resolved = Number.isFinite(Number(discountPercentage))
        ? Number(discountPercentage)
        : 0;
      const previous = player;

      setPlayer((prev) => ({
        ...(prev || {}),
        discount_percentage: resolved
      }));

      try {
        const payload = await updateCoachPlayer(playerId, { discount_percentage: resolved });
        if (payload && typeof payload === 'object') {
          setPlayer((prev) => ({ ...(prev || {}), ...(payload.player || payload.data || payload) }));
        }
        return payload;
      } catch (err) {
        setPlayer(previous);
        throw err;
      }
    },
    [player, playerId]
  );

  return {
    player,
    setPlayer,
    playerLoading,
    playerError,
    refreshPlayer: loadPlayer,
    upcomingLessons,
    previousLessons,
    updateDiscount
  };
};

export default useCoachPlayerDetail;
