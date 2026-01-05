import { useMemo } from 'react';
import { getCoachUpcomingLessons } from '../api/CoachApi/coachDashboard';
import usePaginatedResource from './usePaginatedResource';

export const useCoachUpcomingLessons = ({ perPage = 5, enabled = true } = {}) => {
  const fetcher = useMemo(
    () => ({ page, perPage: size }) => getCoachUpcomingLessons({ page, perPage: size }),
    []
  );

  return usePaginatedResource({
    fetcher,
    perPage,
    enabled,
    listKeys: ['lessons'],
    dependencies: []
  });
};

export default useCoachUpcomingLessons;
