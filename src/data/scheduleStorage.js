import demoSchedules from './demoSchedules.json';

const STORAGE_KEY = 'barcos-guara-schedules';
const WEEK_DAYS = [0, 1, 2, 3, 4, 5, 6];

function dateFromToday(daysFromToday) {
  const date = new Date();
  date.setDate(date.getDate() + daysFromToday);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function createDefaultSchedule(client) {
  const demoSchedule = demoSchedules[client.slug];

  return {
    weekly: client.schedule.map((trip, index) => ({
      ...trip,
      id: `default-${index}`,
      daysOfWeek: WEEK_DAYS,
    })),
    tours: demoSchedule?.tours ?? [],
    special: (demoSchedule?.special ?? []).map(({ daysFromToday, ...trip }) => ({
      ...trip,
      date: dateFromToday(daysFromToday),
    })),
  };
}

export function getScheduleConfig(client) {
  const schedules = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
  const savedSchedule = schedules[client.slug];

  if (!savedSchedule) {
    return createDefaultSchedule(client);
  }

  if (!Array.isArray(savedSchedule.weekly) || !Array.isArray(savedSchedule.special)) {
    throw new Error('As configurações de horários salvas estão inválidas.');
  }

  return {
    ...savedSchedule,
    tours: Array.isArray(savedSchedule.tours) ? savedSchedule.tours : [],
  };
}

export function saveScheduleConfig(clientSlug, scheduleConfig) {
  const schedules = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
  schedules[clientSlug] = scheduleConfig;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(schedules));
}

export function getTripsForDate(client, date) {
  const schedule = getScheduleConfig(client);
  const dayOfWeek = new Date(`${date}T12:00:00`).getDay();
  const weeklyTrips = schedule.weekly
    .filter((trip) => trip.daysOfWeek.includes(dayOfWeek))
    .map(({ id, daysOfWeek, ...trip }) => ({ ...trip, kind: 'weekly' }));
  const tourTrips = schedule.tours
    .filter((trip) => trip.daysOfWeek.includes(dayOfWeek))
    .map(({ id, daysOfWeek, ...trip }) => ({ ...trip, kind: 'tour' }));
  const specialTrips = schedule.special
    .filter((trip) => trip.date === date)
    .map(({ id, date: specialDate, ...trip }) => ({ ...trip, kind: 'special' }));

  return [...weeklyTrips, ...tourTrips, ...specialTrips];
}
