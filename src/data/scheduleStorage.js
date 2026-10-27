import { apiRequest } from './api';

export function getScheduleConfig(client) {
  return apiRequest(`/api/manager/${encodeURIComponent(client.slug)}/schedule`, {
    authenticated: true,
  });
}

export function getPublicScheduleConfig(client) {
  return apiRequest(`/api/clients/${encodeURIComponent(client.slug)}/schedule`);
}

export function saveScheduleConfig(clientSlug, scheduleConfig) {
  return apiRequest(`/api/manager/${encodeURIComponent(clientSlug)}/schedule`, {
    method: 'PUT',
    body: scheduleConfig,
    authenticated: true,
  });
}

export function getTripsForDate(schedule, date) {
  if (!schedule) return [];

  const dayOfWeek = new Date(`${date}T12:00:00`).getDay();
  const weeklyTrips = schedule.weekly
    .filter((trip) => trip.daysOfWeek.includes(dayOfWeek))
    .map(({ id, daysOfWeek, ...trip }) => ({ ...trip, tripId: id, kind: 'weekly' }));
  const tourTrips = schedule.tours
    .filter((trip) => trip.daysOfWeek.includes(dayOfWeek))
    .map(({ id, daysOfWeek, ...trip }) => ({ ...trip, tripId: id, kind: 'tour' }));
  const specialTrips = schedule.special
    .filter((trip) => trip.date === date)
    .map(({ id, date: specialDate, ...trip }) => ({ ...trip, tripId: id, kind: 'special' }));

  return [...weeklyTrips, ...tourTrips, ...specialTrips];
}
