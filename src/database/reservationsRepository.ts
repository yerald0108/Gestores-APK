import { getDatabase } from './db';
import { Reservation, CreateReservationDTO, Passenger } from '../types';

export const reservationsRepository = {
  async getAll(): Promise<Reservation[]> {
    const db = await getDatabase();
    const reservations = await db.getAllAsync<Reservation>(
      'SELECT * FROM reservations ORDER BY created_at DESC'
    );
    for (const r of reservations) {
      r.passengers = await db.getAllAsync<Passenger>(
        'SELECT * FROM passengers WHERE reservation_id = ?', [r.id]
      );
    }
    return reservations;
  },

  async getById(id: number): Promise<Reservation | null> {
    const db = await getDatabase();
    const r = await db.getFirstAsync<Reservation>(
      'SELECT * FROM reservations WHERE id = ?', [id]
    );
    if (!r) return null;
    r.passengers = await db.getAllAsync<Passenger>(
      'SELECT * FROM passengers WHERE reservation_id = ?', [r.id]
    );
    return r;
  },

  async create(data: CreateReservationDTO): Promise<Reservation> {
    const db = await getDatabase();
    const result = await db.runAsync(
      `INSERT INTO reservations 
        (phone, transport, origin, destination, route_price, travel_date, reservation_date, advance, total, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [data.phone, data.transport, data.origin, data.destination,
       data.route_price, data.travel_date, data.reservation_date,
       data.advance, data.total, data.status]
    );
    const reservationId = result.lastInsertRowId;
    for (const p of data.passengers) {
      await db.runAsync(
        'INSERT INTO passengers (reservation_id, full_name, identity_card) VALUES (?, ?, ?)',
        [reservationId, p.full_name, p.identity_card]
      );
    }
    return (await this.getById(reservationId))!;
  },

  async updateStatus(id: number, status: string): Promise<void> {
    const db = await getDatabase();
    await db.runAsync(
      'UPDATE reservations SET status = ?, updated_at = ? WHERE id = ?',
      [status, new Date().toISOString(), id]
    );
  },

  async toggleReserved(id: number, isReserved: boolean): Promise<void> {
    const db = await getDatabase();
    await db.runAsync(
      'UPDATE reservations SET status = ?, updated_at = ? WHERE id = ?',
      [isReserved ? 'Reservado' : 'Pendiente', new Date().toISOString(), id]
    );
  },

  async delete(id: number): Promise<void> {
    const db = await getDatabase();
    await db.runAsync('DELETE FROM reservations WHERE id = ?', [id]);
  },
};