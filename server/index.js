import 'dotenv/config';
import express from 'express';
import { createHash, randomBytes, timingSafeEqual } from 'node:crypto';
import { createPool } from './database.js';

const app = express();
const pool = createPool();
const sessions = new Map();
const sessionLifetimeMs = 8 * 60 * 60 * 1000;
const port = Number(process.env.API_PORT || 3001);

app.use(express.json({ limit: '100kb' }));

function sendError(response, status, message) {
  response.status(status).json({ error: message });
}

function passwordsMatch(provided, expected) {
  const providedHash = createHash('sha256').update(provided).digest();
  const expectedHash = createHash('sha256').update(expected).digest();
  return timingSafeEqual(providedHash, expectedHash);
}

function requireManager(request, response, next) {
  const token = request.get('authorization')?.replace(/^Bearer\s+/i, '');
  const session = token ? sessions.get(token) : null;

  if (!session || session.expiresAt <= Date.now()) {
    if (token) sessions.delete(token);
    sendError(response, 401, 'Sessão inválida ou expirada. Entre novamente.');
    return;
  }

  if (session.clientSlug !== request.params.slug) {
    sendError(response, 403, 'Acesso não autorizado para este cliente.');
    return;
  }

  request.manager = session;
  next();
}

async function requireClient(slug, response) {
  const [rows] = await pool.execute('SELECT slug FROM clients WHERE slug = ?', [slug]);
  if (rows.length === 0) {
    sendError(response, 404, 'Cliente não encontrado.');
    return false;
  }
  return true;
}

function normalizeJson(value) {
  return typeof value === 'string' ? JSON.parse(value) : value;
}

function validateSchedule(config) {
  return config
    && Array.isArray(config.weekly)
    && Array.isArray(config.tours)
    && Array.isArray(config.special);
}

function dateValue(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function isWithinBookingWindow(date) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return false;
  const parsedDate = new Date(`${date}T00:00:00Z`);
  if (Number.isNaN(parsedDate.getTime()) || parsedDate.toISOString().slice(0, 10) !== date) {
    return false;
  }
  const today = new Date();
  const lastDate = new Date(today);
  lastDate.setDate(lastDate.getDate() + 10);
  return date >= dateValue(today) && date <= dateValue(lastDate);
}

function tripForBooking(schedule, kind, tripId, date) {
  const trips = schedule[kind];
  if (!Array.isArray(trips)) return null;

  if (kind === 'special') {
    return trips.find((trip) => trip.id === tripId && trip.date === date) ?? null;
  }

  const weekday = new Date(`${date}T12:00:00`).getDay();
  return trips.find((trip) => (
    trip.id === tripId
    && Array.isArray(trip.daysOfWeek)
    && trip.daysOfWeek.includes(weekday)
  )) ?? null;
}

app.get('/api/health', async (request, response) => {
  try {
    await pool.query('SELECT 1');
    response.json({ status: 'ok', database: 'connected' });
  } catch (error) {
    console.error('Falha ao verificar conexão com MySQL:', error.message);
    sendError(response, 503, 'Não foi possível conectar ao banco taxi_nautico.');
  }
});

app.get('/api/clients', async (request, response) => {
  try {
    const [rows] = await pool.execute('SELECT data FROM clients ORDER BY slug');
    response.json(rows.map((row) => normalizeJson(row.data)));
  } catch (error) {
    console.error('Falha ao carregar clientes:', error.message);
    sendError(response, 500, 'Não foi possível carregar os clientes.');
  }
});

app.post('/api/auth/login', async (request, response) => {
  const { username, password } = request.body ?? {};
  const passwordVariable = `MANAGER_PASSWORD_${String(username).toUpperCase()}`;
  const expectedPassword = process.env[passwordVariable];

  if (typeof username !== 'string' || typeof password !== 'string') {
    sendError(response, 400, 'Login não configurado ou dados inválidos.');
    return;
  }

  try {
    if (!(await requireClient(username, response))) return;
    if (!expectedPassword || expectedPassword.length < 12) {
      sendError(response, 503, `Configure ${passwordVariable} com pelo menos 12 caracteres no .env.`);
      return;
    }
    if (!passwordsMatch(password, expectedPassword)) {
      sendError(response, 401, 'Usuário ou senha incorretos.');
      return;
    }

    const token = randomBytes(32).toString('hex');
    sessions.set(token, { clientSlug: username, expiresAt: Date.now() + sessionLifetimeMs });
    response.json({ token });
  } catch (error) {
    console.error('Falha no login:', error.message);
    sendError(response, 500, 'Não foi possível entrar no gerenciamento.');
  }
});

app.post('/api/auth/logout', (request, response) => {
  const token = request.get('authorization')?.replace(/^Bearer\s+/i, '');
  if (token) sessions.delete(token);
  response.status(204).end();
});

app.get('/api/clients/:slug/schedule', async (request, response) => {
  try {
    const [rows] = await pool.execute(
      'SELECT config FROM schedules WHERE client_slug = ?',
      [request.params.slug],
    );
    if (rows.length === 0) {
      sendError(response, 404, 'Horários não encontrados. Execute npm run db:seed.');
      return;
    }
    response.json(normalizeJson(rows[0].config));
  } catch (error) {
    console.error('Falha ao carregar horários:', error.message);
    sendError(response, 500, 'Não foi possível carregar os horários.');
  }
});

app.post('/api/clients/:slug/bookings', async (request, response) => {
  const booking = request.body ?? {};
  const requiredStrings = ['date', 'tripId', 'kind', 'route', 'departure', 'price', 'nome', 'telefone'];
  if (
    requiredStrings.some((field) => typeof booking[field] !== 'string' || !booking[field].trim())
    || !/^\d{4}-\d{2}-\d{2}$/.test(booking.date)
    || booking.nome.length > 180
    || booking.telefone.length > 80
    || booking.tripId.length > 80
    || booking.route.length > 360
    || (booking.observacao !== undefined && typeof booking.observacao !== 'string')
    || (typeof booking.observacao === 'string' && booking.observacao.length > 5000)
    || !Number.isInteger(booking.passageiros)
    || booking.passageiros < 1
    || !['weekly', 'tour', 'special'].includes(booking.kind)
    || !isWithinBookingWindow(booking.date)
  ) {
    sendError(response, 400, 'Dados da reserva inválidos.');
    return;
  }

  let connection;
  let transactionStarted = false;
  try {
    if (!(await requireClient(request.params.slug, response))) return;
    connection = await pool.getConnection();
    await connection.beginTransaction();
    transactionStarted = true;
    const [rows] = await connection.execute(
      'SELECT config FROM schedules WHERE client_slug = ? FOR UPDATE',
      [request.params.slug],
    );
    const schedule = rows[0] ? normalizeJson(rows[0].config) : null;
    const trip = schedule && tripForBooking(schedule, booking.kind, booking.tripId, booking.date);

    if (
      !trip
      || trip.route !== booking.route
      || trip.departure !== booking.departure
      || trip.price !== booking.price
    ) {
      await connection.rollback();
      transactionStarted = false;
      sendError(response, 400, 'A viagem selecionada não está disponível nesta data.');
      return;
    }
    if (booking.passageiros > Number(trip.capacity)) {
      await connection.rollback();
      transactionStarted = false;
      sendError(response, 400, 'A quantidade de passageiros excede a capacidade da embarcação.');
      return;
    }

    const [bookedRows] = await connection.execute(
      `SELECT COALESCE(SUM(passengers), 0) AS booked
       FROM bookings
       WHERE client_slug = ? AND trip_id = ? AND trip_kind = ? AND travel_date = ?`,
      [request.params.slug, booking.tripId, booking.kind, booking.date],
    );
    if (Number(bookedRows[0].booked) + booking.passageiros > Number(trip.capacity)) {
      await connection.rollback();
      transactionStarted = false;
      sendError(response, 409, 'Não há capacidade suficiente nesta viagem para essa reserva.');
      return;
    }

    const id = randomBytes(16).toString('hex');
    await connection.execute(
      `INSERT INTO bookings
        (id, client_slug, trip_id, trip_kind, travel_date, route, departure, price,
         customer_name, customer_phone, passengers, notes)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        request.params.slug,
        booking.tripId,
        booking.kind,
        booking.date,
        booking.route,
        booking.departure,
        booking.price,
        booking.nome.trim(),
        booking.telefone.trim(),
        booking.passageiros,
        typeof booking.observacao === 'string' ? booking.observacao.trim() : '',
      ],
    );
    await connection.commit();
    transactionStarted = false;
    response.status(201).json({ id, createdAt: new Date().toISOString() });
  } catch (error) {
    if (transactionStarted) await connection.rollback();
    console.error('Falha ao salvar reserva:', error.message);
    sendError(response, 500, 'Não foi possível registrar a reserva.');
  } finally {
    connection?.release();
  }
});

app.get('/api/manager/:slug/schedule', requireManager, async (request, response) => {
  try {
    const [rows] = await pool.execute(
      'SELECT config FROM schedules WHERE client_slug = ?',
      [request.params.slug],
    );
    if (rows.length === 0) {
      sendError(response, 404, 'Horários não encontrados. Execute npm run db:seed.');
      return;
    }
    response.json(normalizeJson(rows[0].config));
  } catch (error) {
    console.error('Falha ao carregar horários:', error.message);
    sendError(response, 500, 'Não foi possível carregar os horários.');
  }
});

app.put('/api/manager/:slug/schedule', requireManager, async (request, response) => {
  if (!validateSchedule(request.body)) {
    sendError(response, 400, 'Configuração de horários inválida.');
    return;
  }

  try {
    const trips = [
      ...request.body.weekly,
      ...request.body.tours,
      ...request.body.special,
    ];
    for (const trip of trips) {
      if (!trip.boatId) continue;
      const [boats] = await pool.execute(
        'SELECT name, capacity FROM boats WHERE id = ? AND client_slug = ?',
        [trip.boatId, request.params.slug],
      );
      if (
        !boats[0]
        || boats[0].name !== trip.boatName
        || Number(boats[0].capacity) !== Number(trip.capacity)
      ) {
        sendError(response, 400, 'A embarcação de um ou mais horários não corresponde ao cadastro.');
        return;
      }
    }

    await pool.execute(
      `INSERT INTO schedules (client_slug, config) VALUES (?, ?)
       ON DUPLICATE KEY UPDATE config = VALUES(config)`,
      [request.params.slug, JSON.stringify(request.body)],
    );
    response.json({ saved: true });
  } catch (error) {
    console.error('Falha ao salvar horários:', error.message);
    sendError(response, 500, 'Não foi possível salvar os horários.');
  }
});

app.get('/api/manager/:slug/boats', requireManager, async (request, response) => {
  try {
    const [rows] = await pool.execute(
      'SELECT id, name, capacity FROM boats WHERE client_slug = ? ORDER BY name',
      [request.params.slug],
    );
    response.json(rows);
  } catch (error) {
    console.error('Falha ao carregar embarcações:', error.message);
    sendError(response, 500, 'Não foi possível carregar as embarcações.');
  }
});

app.post('/api/manager/:slug/boats', requireManager, async (request, response) => {
  const { id, name, capacity } = request.body ?? {};
  if (
    typeof id !== 'string'
    || typeof name !== 'string'
    || !name.trim()
    || !Number.isInteger(capacity)
    || capacity < 1
    || capacity > 1000
  ) {
    sendError(response, 400, 'Dados da embarcação inválidos.');
    return;
  }

  try {
    await pool.execute(
      'INSERT INTO boats (id, client_slug, name, capacity) VALUES (?, ?, ?, ?)',
      [id, request.params.slug, name.trim(), capacity],
    );
    response.status(201).json({ id, name: name.trim(), capacity });
  } catch (error) {
    if (error.code === 'ER_DUP_ENTRY') {
      sendError(response, 409, 'Já existe uma embarcação com esse nome.');
      return;
    }
    console.error('Falha ao salvar embarcação:', error.message);
    sendError(response, 500, 'Não foi possível salvar a embarcação.');
  }
});

app.get('/api/manager/:slug/bookings', requireManager, async (request, response) => {
  try {
    const [rows] = await pool.execute(
      `SELECT id, trip_id AS tripId, trip_kind AS kind,
        DATE_FORMAT(travel_date, '%Y-%m-%d') AS date, route,
        TIME_FORMAT(departure, '%H:%i') AS departure, price,
        customer_name AS nome, customer_phone AS telefone,
        passengers AS passageiros, notes AS observacao,
        created_at AS createdAt
       FROM bookings WHERE client_slug = ? ORDER BY travel_date, departure, created_at`,
      [request.params.slug],
    );
    response.json(rows);
  } catch (error) {
    console.error('Falha ao carregar reservas:', error.message);
    sendError(response, 500, 'Não foi possível carregar as reservas.');
  }
});

app.get('/api/manager/:slug/expenses', requireManager, async (request, response) => {
  try {
    const [rows] = await pool.execute(
      `SELECT id, DATE_FORMAT(expense_date, '%Y-%m-%d') AS date,
        category, description, amount, recurring
       FROM expenses WHERE client_slug = ? ORDER BY expense_date DESC, created_at DESC`,
      [request.params.slug],
    );
    response.json(rows.map((expense) => ({ ...expense, amount: Number(expense.amount), recurring: Boolean(expense.recurring) })));
  } catch (error) {
    console.error('Falha ao carregar gastos:', error.message);
    sendError(response, 500, 'Não foi possível carregar os gastos.');
  }
});

app.put('/api/manager/:slug/expenses', requireManager, async (request, response) => {
  if (!Array.isArray(request.body)) {
    sendError(response, 400, 'A lista de gastos é inválida.');
    return;
  }

  let connection;
  let transactionStarted = false;
  try {
    connection = await pool.getConnection();
    await connection.beginTransaction();
    transactionStarted = true;
    await connection.execute('DELETE FROM expenses WHERE client_slug = ?', [request.params.slug]);
    for (const expense of request.body) {
      if (
        typeof expense.id !== 'string'
        || typeof expense.date !== 'string'
        || typeof expense.category !== 'string'
        || typeof expense.description !== 'string'
        || !Number.isFinite(Number(expense.amount))
        || Number(expense.amount) <= 0
      ) {
        throw new Error('INVALID_EXPENSE');
      }
      await connection.execute(
        `INSERT INTO expenses
          (id, client_slug, expense_date, category, description, amount, recurring)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
          expense.id,
          request.params.slug,
          expense.date,
          expense.category,
          expense.description,
          Number(expense.amount),
          Boolean(expense.recurring),
        ],
      );
    }
    await connection.commit();
    transactionStarted = false;
    response.json({ saved: true });
  } catch (error) {
    if (transactionStarted) await connection.rollback();
    if (error.message === 'INVALID_EXPENSE') {
      sendError(response, 400, 'Um ou mais gastos têm dados inválidos.');
      return;
    }
    console.error('Falha ao salvar gastos:', error.message);
    sendError(response, 500, 'Não foi possível salvar os gastos.');
  } finally {
    connection?.release();
  }
});

app.post('/api/manager/:slug/import-local', requireManager, async (request, response) => {
  const { boats = [], bookings = [], expenses = [], schedule } = request.body ?? {};
  if (
    !Array.isArray(boats)
    || !Array.isArray(bookings)
    || !Array.isArray(expenses)
    || (schedule !== undefined && !validateSchedule(schedule))
  ) {
    sendError(response, 400, 'Dados locais inválidos para importação.');
    return;
  }

  let connection;
  let transactionStarted = false;
  try {
    connection = await pool.getConnection();
    await connection.beginTransaction();
    transactionStarted = true;
    if (schedule) {
      await connection.execute(
        `INSERT INTO schedules (client_slug, config) VALUES (?, ?)
         ON DUPLICATE KEY UPDATE config = VALUES(config)`,
        [request.params.slug, JSON.stringify(schedule)],
      );
    }

    for (const boat of boats) {
      if (typeof boat.id !== 'string' || typeof boat.name !== 'string' || !Number.isInteger(Number(boat.capacity))) {
        throw new Error('INVALID_IMPORT');
      }
      await connection.execute(
        `INSERT INTO boats (id, client_slug, name, capacity) VALUES (?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE name = VALUES(name), capacity = VALUES(capacity)`,
        [boat.id, request.params.slug, boat.name, Number(boat.capacity)],
      );
    }

    for (const expense of expenses) {
      await connection.execute(
        `INSERT IGNORE INTO expenses
          (id, client_slug, expense_date, category, description, amount, recurring)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
          expense.id,
          request.params.slug,
          expense.date,
          expense.category,
          expense.description,
          Number(expense.amount),
          Boolean(expense.recurring),
        ],
      );
    }

    for (const booking of bookings) {
      await connection.execute(
        `INSERT IGNORE INTO bookings
          (id, client_slug, trip_id, trip_kind, travel_date, route, departure, price,
           customer_name, customer_phone, passengers, notes)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          booking.id,
          request.params.slug,
          booking.tripId ?? `${booking.route}|${booking.departure}`,
          booking.kind ?? 'weekly',
          booking.date,
          booking.route,
          booking.departure,
          booking.price ?? '',
          booking.nome,
          booking.telefone,
          Number(booking.passageiros),
          booking.observacao ?? '',
        ],
      );
    }

    await connection.commit();
    transactionStarted = false;
    response.json({ imported: true });
  } catch (error) {
    if (transactionStarted) await connection.rollback();
    if (error.message === 'INVALID_IMPORT') {
      sendError(response, 400, 'Uma ou mais embarcações têm dados inválidos.');
      return;
    }
    console.error('Falha ao importar dados locais:', error.message);
    sendError(response, 500, 'Não foi possível importar os dados locais.');
  } finally {
    connection?.release();
  }
});

app.use((error, request, response, next) => {
  if (error instanceof SyntaxError && 'body' in error) {
    sendError(response, 400, 'O corpo da requisição não contém JSON válido.');
    return;
  }
  console.error('Erro não tratado na API:', error.message);
  sendError(response, 500, 'Erro interno na API.');
});

const server = app.listen(port, '127.0.0.1', () => {
  console.log(`API Táxi Náutico escutando em http://127.0.0.1:${port}`);
});

async function shutdown() {
  server.close();
  await pool.end();
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
