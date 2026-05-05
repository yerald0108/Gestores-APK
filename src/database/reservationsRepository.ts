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

  async getPending(): Promise<Reservation[]> {
    const db = await getDatabase();
    const reservations = await db.getAllAsync<Reservation>(
      "SELECT * FROM reservations WHERE status = 'Pendiente' ORDER BY created_at DESC"
    );
    for (const r of reservations) {
      r.passengers = await db.getAllAsync<Passenger>(
        'SELECT * FROM passengers WHERE reservation_id = ?', [r.id]
      );
    }
    return reservations;
  },

  async getReserved(): Promise<Reservation[]> {
    const db = await getDatabase();
    const reservations = await db.getAllAsync<Reservation>(
      "SELECT * FROM reservations WHERE status = 'Reservado' ORDER BY created_at DESC"
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
        (phone, transport, origin, destination, route_price, travel_date, reservation_date,
         advance, total, status, is_gestor, gestor_cost_per_passenger, app_cost_per_passenger)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [data.phone, data.transport, data.origin, data.destination,
       data.route_price, data.travel_date, data.reservation_date,
       data.advance, data.total, data.status,
       data.is_gestor ?? 0,
       data.gestor_cost_per_passenger ?? 0,
       data.app_cost_per_passenger ?? 0]
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

  async markAsReserved(
    id: number,
    isGestor: boolean,
    gestorCostPerPassenger: number,
    appCostPerPassenger: number,
  ): Promise<void> {
    const db = await getDatabase();
    await db.runAsync(
      `UPDATE reservations
       SET status = 'Reservado',
           is_gestor = ?,
           gestor_cost_per_passenger = ?,
           app_cost_per_passenger = ?,
           updated_at = ?
       WHERE id = ?`,
      [
        isGestor ? 1 : 0,
        gestorCostPerPassenger,
        appCostPerPassenger,
        new Date().toISOString(),
        id,
      ]
    );
  },

  async delete(id: number): Promise<void> {
    const db = await getDatabase();
    await db.runAsync('DELETE FROM reservations WHERE id = ?', [id]);
  },
};