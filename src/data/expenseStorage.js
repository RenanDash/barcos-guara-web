import { apiRequest } from './api';

export const EXPENSE_CATEGORIES = [
  { value: 'combustivel', label: 'Combustível' },
  { value: 'marinheiro', label: 'Marinheiro' },
  { value: 'manutencao', label: 'Manutenção' },
  { value: 'taxas', label: 'Taxas' },
  { value: 'outros', label: 'Outros' },
];

export function getExpenses(clientSlug) {
  return apiRequest(`/api/manager/${encodeURIComponent(clientSlug)}/expenses`, {
    authenticated: true,
  });
}

export function saveExpenses(clientSlug, expenses) {
  return apiRequest(`/api/manager/${encodeURIComponent(clientSlug)}/expenses`, {
    method: 'PUT',
    body: expenses,
    authenticated: true,
  });
}

function monthlyOccurrenceDate(startDate, year, month) {
  const day = Number(startDate.slice(8, 10));
  const lastDay = new Date(year, month, 0).getDate();
  return `${year}-${String(month).padStart(2, '0')}-${String(Math.min(day, lastDay)).padStart(2, '0')}`;
}

export function getExpenseOccurrences(expenses, startDate, endDate) {
  if (!startDate || !endDate || startDate > endDate) {
    return [];
  }

  return expenses.flatMap((expense) => {
    if (!expense.recurring) {
      return expense.date >= startDate && expense.date <= endDate
        ? [{ ...expense, occurrenceDate: expense.date }]
        : [];
    }

    const occurrences = [];
    const startYear = Number(expense.date.slice(0, 4));
    const startMonth = Number(expense.date.slice(5, 7));
    const rangeStartYear = Number(startDate.slice(0, 4));
    const rangeStartMonth = Number(startDate.slice(5, 7));
    const rangeEndYear = Number(endDate.slice(0, 4));
    const rangeEndMonth = Number(endDate.slice(5, 7));
    const firstMonth = Math.max(startYear * 12 + startMonth - 1, rangeStartYear * 12 + rangeStartMonth - 1);
    const lastMonth = rangeEndYear * 12 + rangeEndMonth - 1;

    for (let monthIndex = firstMonth; monthIndex <= lastMonth; monthIndex += 1) {
      const year = Math.floor(monthIndex / 12);
      const month = (monthIndex % 12) + 1;
      const occurrenceDate = monthlyOccurrenceDate(expense.date, year, month);

      if (occurrenceDate >= startDate && occurrenceDate <= endDate) {
        occurrences.push({ ...expense, occurrenceDate });
      }
    }

    return occurrences;
  });
}
