import { apiRequest } from '../apiRequest';

const buildPackagesPath = (includeInactive) =>
  includeInactive ? '/coach/packages?includeInactive=true' : '/coach/packages';

export const listCoachPackages = async ({ includeInactive = false } = {}) =>
  apiRequest(buildPackagesPath(includeInactive), {
    method: 'GET'
  });

export default {
  listCoachPackages
};
