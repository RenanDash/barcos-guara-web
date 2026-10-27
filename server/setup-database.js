import 'dotenv/config';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import mysql from 'mysql2/promise';

const schemaPath = fileURLToPath(new URL('./schema.sql', import.meta.url));
const schema = await readFile(schemaPath, 'utf8');
const dbName = process.env.DB_NAME || 'taxi_nautico';
const appUser = process.env.DB_USER;
const appPassword = process.env.DB_PASSWORD;
const adminUser = process.env.DB_ADMIN_USER || appUser;
const adminPassword = process.env.DB_ADMIN_PASSWORD ?? appPassword;

if (dbName !== 'taxi_nautico') {
  throw new Error('DB_NAME deve ser taxi_nautico para aplicar o esquema configurado.');
}
if (!appUser || !appPassword || !adminUser) {
  throw new Error('Configure DB_USER, DB_PASSWORD e DB_ADMIN_USER no arquivo .env.');
}

const connection = await mysql.createConnection({
  host: process.env.DB_HOST || '127.0.0.1',
  port: Number(process.env.DB_PORT || 3306),
  user: adminUser,
  password: adminPassword,
  multipleStatements: true,
  charset: 'utf8mb4',
});

try {
  await connection.query(schema);
  const appHost = process.env.DB_APP_HOST || '127.0.0.1';
  const userAccount = `${connection.escape(appUser)}@${connection.escape(appHost)}`;
  await connection.query(
    `CREATE USER IF NOT EXISTS ${userAccount} IDENTIFIED BY ${connection.escape(appPassword)}`,
  );
  await connection.query(
    `ALTER USER ${userAccount} IDENTIFIED BY ${connection.escape(appPassword)}`,
  );
  await connection.query(
    `GRANT SELECT, INSERT, UPDATE, DELETE ON taxi_nautico.* TO ${userAccount}`,
  );
  console.log('Banco taxi_nautico e tabelas prontos.');
} finally {
  await connection.end();
}
