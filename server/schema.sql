CREATE DATABASE IF NOT EXISTS taxi_nautico
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_0900_ai_ci;

USE taxi_nautico;

CREATE TABLE IF NOT EXISTS clients (
  slug VARCHAR(80) PRIMARY KEY,
  name VARCHAR(180) NOT NULL,
  data JSON NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS companies (
  client_slug VARCHAR(80) PRIMARY KEY,
  name VARCHAR(180) NOT NULL,
  data JSON NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT companies_client_fk FOREIGN KEY (client_slug) REFERENCES clients (slug)
    ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS boats (
  id VARCHAR(80) PRIMARY KEY,
  client_slug VARCHAR(80) NOT NULL,
  name VARCHAR(180) NOT NULL,
  capacity SMALLINT UNSIGNED NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY boats_client_name_unique (client_slug, name),
  CONSTRAINT boats_client_fk FOREIGN KEY (client_slug) REFERENCES clients (slug)
    ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS schedules (
  client_slug VARCHAR(80) PRIMARY KEY,
  config JSON NOT NULL,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT schedules_client_fk FOREIGN KEY (client_slug) REFERENCES clients (slug)
    ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS bookings (
  id VARCHAR(80) PRIMARY KEY,
  client_slug VARCHAR(80) NOT NULL,
  trip_id VARCHAR(80) NOT NULL,
  trip_kind VARCHAR(20) NOT NULL,
  travel_date DATE NOT NULL,
  route VARCHAR(360) NOT NULL,
  departure TIME NOT NULL,
  price VARCHAR(80) NOT NULL,
  customer_name VARCHAR(180) NOT NULL,
  customer_phone VARCHAR(80) NOT NULL,
  passengers SMALLINT UNSIGNED NOT NULL,
  notes TEXT NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY bookings_client_trip_date (client_slug, travel_date, trip_id),
  CONSTRAINT bookings_client_fk FOREIGN KEY (client_slug) REFERENCES clients (slug)
    ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS expenses (
  id VARCHAR(80) PRIMARY KEY,
  client_slug VARCHAR(80) NOT NULL,
  expense_date DATE NOT NULL,
  category VARCHAR(50) NOT NULL,
  description VARCHAR(500) NOT NULL,
  amount DECIMAL(12, 2) NOT NULL,
  recurring BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY expenses_client_date (client_slug, expense_date),
  CONSTRAINT expenses_client_fk FOREIGN KEY (client_slug) REFERENCES clients (slug)
    ON DELETE CASCADE
);
