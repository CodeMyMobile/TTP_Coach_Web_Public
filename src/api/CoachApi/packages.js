import { apiRequest } from '../apiRequest';

const buildPackagesPath = (includeInactive) =>
  includeInactive ? '/coach/packages?includeInactive=true' : '/coach/packages';

const buildPackagePath = (id) => `/coach/packages/${id}`;

export const listCoachPackages = async ({ includeInactive = false } = {}) =>
  apiRequest(buildPackagesPath(includeInactive), {
    method: 'GET'
  });

export const updateCoachPackage = async (id, payload) =>
  apiRequest(buildPackagePath(id), {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });

export const deleteCoachPackage = async (id) =>
  apiRequest(buildPackagePath(id), {
    method: 'DELETE'
  });

export default {
  listCoachPackages,
  updateCoachPackage,
  deleteCoachPackage
};
