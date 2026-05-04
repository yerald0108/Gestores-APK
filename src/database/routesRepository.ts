import { getDatabase } from './db';
import { Route, CreateRouteDTO, TransportType } from '../types';

export const routesRepository = {
  async getAll(): Promise<Route[]> {
    const db = await getDatabase();
    return await db.getAllAsync<Route>(
      'SELECT * FROM routes ORDER BY created_at DESC'
    );
  },

  async getByTransport(transport: TransportType): Promise<Route[]> {
    const db = await getDatabase();
    return await db.getAllAsync<Route>(
      'SELECT * FROM routes WHERE transport = ? ORDER BY origin ASC, destination ASC',
      [transport]
    );
  },

  async create(data: CreateRouteDTO): Promise<Route> {
    const db = await getDatabase();
    const result = await db.runAsync(
      `INSERT INTO routes (transport, origin, destination, price, app_price, currency)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [data.transport, data.origin.trim(), data.destination.trim(),
       data.price, data.app_price, data.currency]
    );
    const route = await db.getFirstAsync<Route>(
      'SELECT * FROM routes WHERE id = ?',
      [result.lastInsertRowId]
    );
    return route!;
  },

  async update(id: number, data: Partial<CreateRouteDTO>): Promise<void> {
    const db = await getDatabase();
    await db.runAsync(
      `UPDATE routes SET origin=?, destination=?, price=?, app_price=?, updated_at=? WHERE id=?`,
      [data.origin!, data.destination!, data.price!, data.app_price!, new Date().toISOString(), id]
    );
  },

  async delete(id: number): Promise<void> {
    const db = await getDatabase();
    await db.runAsync('DELETE FROM routes WHERE id = ?', [id]);
  },

  async getStats(): Promise<{ transport: TransportType; count: number; avg_price: number }[]> {
    const db = await getDatabase();
    return await db.getAllAsync(
      `SELECT transport, COUNT(*) as count, AVG(price) as avg_price
       FROM routes GROUP BY transport`
    );
  },
};