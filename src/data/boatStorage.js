import { apiRequest } from './api';

export function getBoats(clientSlug) {
  return apiRequest(`/api/manager/${encodeURIComponent(clientSlug)}/boats`, {
    authenticated: true,
  });
}

export function addBoat(clientSlug, boat) {
  return apiRequest(`/api/manager/${encodeURIComponent(clientSlug)}/boats`, {
    method: 'POST',
    body: boat,
    authenticated: true,
  });
}
