export const MANAGER_TOKEN_KEY = 'barcos-guara-manager-token';

export function getLocalData(clientSlug) {
  const readClientData = (key) => {
    const stored = localStorage.getItem(key);
    if (!stored) return undefined;
    const byClient = JSON.parse(stored);
    return byClient[clientSlug];
  };

  return {
    boats: readClientData('barcos-guara-boats'),
    bookings: readClientData('barcos-guara-bookings'),
    expenses: readClientData('barcos-guara-expenses'),
    schedule: readClientData('barcos-guara-schedules'),
  };
}

export async function apiRequest(path, { method = 'GET', body, authenticated = false } = {}) {
  const headers = { Accept: 'application/json' };
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  if (authenticated) {
    const token = sessionStorage.getItem(MANAGER_TOKEN_KEY);
    if (token) headers.Authorization = `Bearer ${token}`;
  }

  let response;
  try {
    response = await fetch(path, {
      method,
      headers,
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    });
  } catch (error) {
    throw new Error('Não foi possível conectar à API. Verifique se o servidor está iniciado.');
  }

  if (!response.ok) {
    const result = await response.json().catch(() => ({}));
    throw new Error(result.error || `A API retornou o erro ${response.status}.`);
  }

  if (response.status === 204) return null;
  return response.json();
}
