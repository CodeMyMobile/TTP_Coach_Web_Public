import { apiRequest } from '../apiRequest';

const buildPackagesPath = (includeInactive) =>
  includeInactive ? '/coach/packages?includeInactive=true' : '/coach/packages';

const buildPackagePath = (id) => `/coach/packages/${id}`;

export const listCoachPackages = async ({ includeInactive = false } = {}) =>
  apiRequest(buildPackagesPath(includeInactive), {
    method: 'GET'
  });

export const createCoachPackage = async (payload) =>
  apiRequest('/coach/packages', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
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

export const getCoachPackagePurchases = async (id, params = {}) => {
  const query = new URLSearchParams();

  Object.entries(params).forEach(([key, value]) => {
    if (value === null || value === undefined || value === '') {
      return;
    }

    query.set(key, String(value));
  });

  const queryString = query.toString();
  const path = queryString
    ? `${buildPackagePath(id)}/purchases?${queryString}`
    : `${buildPackagePath(id)}/purchases`;

  return apiRequest(path, {
    method: 'GET'
  });
};

export default {
  createCoachPackage,
  listCoachPackages,
  updateCoachPackage,
  deleteCoachPackage,
  getCoachPackagePurchases
};
