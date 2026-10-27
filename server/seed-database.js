import 'dotenv/config';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { createPool } from './database.js';

const readJson = async (relativePath) => JSON.parse(await readFile(
  fileURLToPath(new URL(relativePath, import.meta.url)),
  'utf8',
));
const clients = await readJson('../src/data/clients.json');
const companies = await readJson('../src/data/companies.json');
const demoSchedules = await readJson('../src/data/demoSchedules.json');
const pool = createPool();

function dateFromToday(daysFromToday) {
  const date = new Date();
  date.setDate(date.getDate() + daysFromToday);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

try {
  for (const client of clients) {
    await pool.execute(
      `INSERT INTO clients (slug, name, data)
       VALUES (?, ?, ?)
       ON DUPLICATE KEY UPDATE name = VALUES(name), data = VALUES(data)`,
      [client.slug, client.name, JSON.stringify(client)],
    );

    const company = companies.find((item) => item.slugCliente === client.slug);
    if (company) {
      await pool.execute(
        `INSERT INTO companies (client_slug, name, data)
         VALUES (?, ?, ?)
         ON DUPLICATE KEY UPDATE name = VALUES(name), data = VALUES(data)`,
        [client.slug, company.nome, JSON.stringify(company)],
      );
    }

    const schedule = demoSchedules[client.slug] ?? { tours: [], special: [] };
    const config = {
      weekly: client.schedule.map((trip, index) => ({
        ...trip,
        id: `default-${index}`,
        daysOfWeek: [0, 1, 2, 3, 4, 5, 6],
      })),
      tours: schedule.tours ?? [],
      special: (schedule.special ?? []).map(({ daysFromToday, ...trip }) => ({
        ...trip,
        date: dateFromToday(daysFromToday),
      })),
    };

    await pool.execute(
      `INSERT INTO schedules (client_slug, config)
       VALUES (?, ?)
       ON DUPLICATE KEY UPDATE client_slug = VALUES(client_slug)`,
      [client.slug, JSON.stringify(config)],
    );
  }

  console.log(`Dados iniciais importados para ${clients.length} clientes.`);
} finally {
  await pool.end();
}
