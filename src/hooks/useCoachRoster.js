import { useMemo } from 'react';
import { getCoachPlayersList } from '../api/CoachApi/coachDashboard';
import usePaginatedResource from './usePaginatedResource';

export const useCoachRoster = ({ perPage = 5, search = '', enabled = true } = {}) => {
  const fetcher = useMemo(
    () => ({ page, perPage: size }) => getCoachPlayersList({ page, perPage: size, search }),
    [search]
  );

  return usePaginatedResource({
    fetcher,
    perPage,
    enabled,
    listKeys: ['players'],
    dependencies: [search]
  });
};

export default useCoachRoster;
