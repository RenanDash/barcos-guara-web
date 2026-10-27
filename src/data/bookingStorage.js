import { apiRequest } from './api';

export function getBookings(clientSlug) {
  return apiRequest(`/api/manager/${encodeURIComponent(clientSlug)}/bookings`, {
    authenticated: true,
  });
}

export function addBooking(clientSlug, booking) {
  return apiRequest(`/api/clients/${encodeURIComponent(clientSlug)}/bookings`, {
    method: 'POST',
    body: booking,
  });
}
