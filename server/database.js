import mysql from 'mysql2/promise';

export function createPool(includeDatabase = true) {
  if (!process.env.DB_USER || process.env.DB_PASSWORD === undefined) {
    throw new Error('Configure DB_USER e DB_PASSWORD no arquivo .env.');
  }

  const options = {
    host: process.env.DB_HOST || '127.0.0.1',
    port: Number(process.env.DB_PORT || 3306),
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    charset: 'utf8mb4',
  };

  if (includeDatabase) {
    options.database = process.env.DB_NAME || 'taxi_nautico';
  }

  return mysql.createPool(options);
}
