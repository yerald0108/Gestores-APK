import * as SQLite from 'expo-sqlite';

let db: SQLite.SQLiteDatabase | null = null;

export const getDatabase = async (): Promise<SQLite.SQLiteDatabase> => {
  if (db) return db;
  db = await SQLite.openDatabaseAsync('viajando.db');
  await initializeDatabase(db);
  return db;
};

const initializeDatabase = async (database: SQLite.SQLiteDatabase): Promise<void> => {
  await database.execAsync(`
    PRAGMA journal_mode = WAL;
    PRAGMA foreign_keys = ON;

    CREATE TABLE IF NOT EXISTS routes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      transport TEXT NOT NULL CHECK(transport IN ('omnibus', 'tren', 'catamaran', 'avion')),
      origin TEXT NOT NULL,
      destination TEXT NOT NULL,
      price REAL NOT NULL CHECK(price >= 0),
      app_price REAL NOT NULL DEFAULT 0 CHECK(app_price >= 0),
      currency TEXT NOT NULL DEFAULT 'CUP',
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS reservations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      phone TEXT NOT NULL,
      transport TEXT NOT NULL,
      origin TEXT NOT NULL,
      destination TEXT NOT NULL,
      route_price REAL NOT NULL,
      travel_date TEXT NOT NULL,
      reservation_date TEXT NOT NULL,
      advance REAL NOT NULL DEFAULT 0,
      total REAL NOT NULL,
      status TEXT NOT NULL DEFAULT 'Pendiente',
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS passengers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      reservation_id INTEGER NOT NULL,
      full_name TEXT NOT NULL,
      identity_card TEXT NOT NULL,
      FOREIGN KEY (reservation_id) REFERENCES reservations(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_routes_transport ON routes(transport);
    CREATE INDEX IF NOT EXISTS idx_reservations_status ON reservations(status);
    CREATE INDEX IF NOT EXISTS idx_passengers_reservation ON passengers(reservation_id);
  `);

  // Migraciones — se ejecutan por separado con try/catch individual
  await runMigrations(database);
};

const runMigrations = async (database: SQLite.SQLiteDatabase): Promise<void> => {
  // Migración 1: añadir app_price a routes si no existe
  try {
    await database.execAsync(
      `ALTER TABLE routes ADD COLUMN app_price REAL NOT NULL DEFAULT 0;`
    );
  } catch (_) {
    // Columna ya existe, ignorar
  }
};