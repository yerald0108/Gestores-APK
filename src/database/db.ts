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
      is_gestor INTEGER NOT NULL DEFAULT 0,
      gestor_cost_per_passenger REAL NOT NULL DEFAULT 0,
      app_cost_per_passenger REAL NOT NULL DEFAULT 0,
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

  await runMigrations(database);
};

const runMigrations = async (database: SQLite.SQLiteDatabase): Promise<void> => {
  /**
   * Ejecuta un ALTER TABLE de forma idempotente.
   * SQLite lanza un error cuando la columna ya existe; ese caso concreto
   * se ignora (es el comportamiento esperado en re-ejecuciones).
   * Cualquier otro error se propaga para no ocultar bugs reales.
   */
  const addColumnIfNotExists = async (sql: string): Promise<void> => {
    try {
      await database.execAsync(sql);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      if (!message.toLowerCase().includes('duplicate column name')) {
        throw err;
      }
    }
  };

  // Migración 1: añadir app_price a routes si no existe
  await addColumnIfNotExists(
    `ALTER TABLE routes ADD COLUMN app_price REAL NOT NULL DEFAULT 0;`
  );

  // Migración 2: campos de gestor en reservations
  await addColumnIfNotExists(
    `ALTER TABLE reservations ADD COLUMN is_gestor INTEGER NOT NULL DEFAULT 0;`
  );
  await addColumnIfNotExists(
    `ALTER TABLE reservations ADD COLUMN gestor_cost_per_passenger REAL NOT NULL DEFAULT 0;`
  );
  await addColumnIfNotExists(
    `ALTER TABLE reservations ADD COLUMN app_cost_per_passenger REAL NOT NULL DEFAULT 0;`
  );

  // Migración 3: método de pago en reservations
  await addColumnIfNotExists(
    `ALTER TABLE reservations ADD COLUMN payment_method TEXT NOT NULL DEFAULT '';`
  );
  await addColumnIfNotExists(
    `ALTER TABLE reservations ADD COLUMN payment_confirm_number TEXT NOT NULL DEFAULT '';`
  );

  // Migración 4: número de tarjeta (se muestra en la factura de WhatsApp)
  await addColumnIfNotExists(
    `ALTER TABLE reservations ADD COLUMN payment_card_number TEXT NOT NULL DEFAULT '';`
  );
};