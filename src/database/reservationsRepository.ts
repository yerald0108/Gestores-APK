import { getDatabase } from './db';
import { Reservation, CreateReservationDTO, Passenger } from '../types';

// ── Helpers internos ──────────────────────────────────────────────────────────

/**
 * Hidrata un array de reservaciones con sus pasajeros en exactamente 2 queries:
 * una para las reservaciones (ya cargadas) y otra para TODOS sus pasajeros.
 * Esto evita el patrón N+1 (una query por reservación).
 */
async function attachPassengers(
  db: Awaited<ReturnType<typeof getDatabase>>,
  reservations: Reservation[],
): Promise<Reservation[]> {
  if (reservations.length === 0) return reservations;

  const ids = reservations.map((r) => r.id);
  const placeholders = ids.map(() => '?').join(', ');

  const allPassengers = await db.getAllAsync<Passenger>(
    `SELECT * FROM passengers WHERE reservation_id IN (${placeholders})`,
    ids,
  );

  // Agrupa pasajeros por reservation_id en un Map para acceso O(1)
  const passengerMap = new Map<number, Passenger[]>();
  for (const p of allPassengers) {
    const rid = p.reservation_id!;
    if (!passengerMap.has(rid)) passengerMap.set(rid, []);
    passengerMap.get(rid)!.push(p);
  }

  for (const r of reservations) {
    r.passengers = passengerMap.get(r.id) ?? [];
  }

  return reservations;
}

// ── Repositorio ───────────────────────────────────────────────────────────────

export const reservationsRepository = {
  async getAll(): Promise<Reservation[]> {
    const db = await getDatabase();
    const reservations = await db.getAllAsync<Reservation>(
      'SELECT * FROM reservations ORDER BY created_at DESC',
    );
    return attachPassengers(db, reservations);
  },

  async getPending(): Promise<Reservation[]> {
    const db = await getDatabase();
    const reservations = await db.getAllAsync<Reservation>(
      "SELECT * FROM reservations WHERE status = 'Pendiente' ORDER BY created_at DESC",
    );
    return attachPassengers(db, reservations);
  },

  async getReserved(): Promise<Reservation[]> {
    const db = await getDatabase();
    const reservations = await db.getAllAsync<Reservation>(
      "SELECT * FROM reservations WHERE status = 'Reservado' ORDER BY created_at DESC",
    );
    return attachPassengers(db, reservations);
  },

  async getById(id: number): Promise<Reservation | null> {
    const db = await getDatabase();
    const r = await db.getFirstAsync<Reservation>(
      'SELECT * FROM reservations WHERE id = ?', [id],
    );
    if (!r) return null;
    const [hydrated] = await attachPassengers(db, [r]);
    return hydrated;
  },

  async create(data: CreateReservationDTO): Promise<Reservation> {
    const db = await getDatabase();
    const result = await db.runAsync(
      `INSERT INTO reservations 
        (phone, transport, origin, destination, route_price, travel_date, reservation_date,
         advance, total, status, is_gestor, gestor_cost_per_passenger, app_cost_per_passenger,
         payment_method, payment_confirm_number, payment_card_number)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [data.phone, data.transport, data.origin, data.destination,
       data.route_price, data.travel_date, data.reservation_date,
       data.advance, data.total, data.status,
       data.is_gestor ?? 0,
       data.gestor_cost_per_passenger ?? 0,
       data.app_cost_per_passenger ?? 0,
       data.payment_method ?? '',
       data.payment_confirm_number ?? '',
       data.payment_card_number ?? '']
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

  // ── Estadísticas para reportes ──────────────────────────────────────────
  async getStatsAll(): Promise<{
    totalGanancia: number;
    totalPasajeros: number;
    totalReservas: number;
    totalPedidos: number;
    gananciaGestor: number;
    gananciaApp: number;
  }> {
    const db = await getDatabase();

    const reservadas = await db.getAllAsync<any>(
      `SELECT r.*, COUNT(p.id) as pax
       FROM reservations r
       LEFT JOIN passengers p ON p.reservation_id = r.id
       WHERE r.status = 'Reservado'
       GROUP BY r.id`
    );
    let totalGanancia = 0;
    let totalPasajeros = 0;
    let gananciaGestor = 0;
    let gananciaApp = 0;
    for (const r of reservadas) {
      const pax = r.pax ?? 0;
      const ingresos = r.route_price * pax;
      const costo = r.is_gestor === 1
        ? r.gestor_cost_per_passenger * pax
        : r.app_cost_per_passenger * pax;
      const ganancia = ingresos - costo;
      totalGanancia += ganancia;
      totalPasajeros += pax;
      if (r.is_gestor === 1) gananciaGestor += ganancia;
      else gananciaApp += ganancia;
    }

    const pendientes = await db.getFirstAsync<{ cnt: number }>(
      `SELECT COUNT(*) as cnt FROM reservations WHERE status = 'Pendiente'`
    );

    return {
      totalGanancia,
      totalPasajeros,
      totalReservas: reservadas.length,
      totalPedidos: pendientes?.cnt ?? 0,
      gananciaGestor,
      gananciaApp,
    };
  },

  async getStatsByPeriod(period: 'day' | 'week' | 'month'): Promise<
    { label: string; ganancia: number; pasajeros: number; reservas: number }[]
  > {
    const db = await getDatabase();

    // Traemos todas las reservadas con pasajeros
    const rows = await db.getAllAsync<any>(
      `SELECT r.reservation_date, r.route_price, r.is_gestor,
              r.gestor_cost_per_passenger, r.app_cost_per_passenger,
              COUNT(p.id) as pax
       FROM reservations r
       LEFT JOIN passengers p ON p.reservation_id = r.id
       WHERE r.status = 'Reservado'
       GROUP BY r.id
       ORDER BY r.reservation_date ASC`
    );

    // Agrupamos en JS según el período
    const map = new Map<string, { ganancia: number; pasajeros: number; reservas: number }>();

    for (const r of rows) {
      const date = new Date(r.reservation_date);
      let label = '';

      if (period === 'day') {
        // Últimos 14 días — label: "DD/MM"
        label = `${String(date.getDate()).padStart(2, '0')}/${String(date.getMonth() + 1).padStart(2, '0')}`;
      } else if (period === 'week') {
        // Semana del año — label: "Sem N"
        const start = new Date(date);
        start.setDate(date.getDate() - date.getDay());
        label = `${String(start.getDate()).padStart(2, '0')}/${String(start.getMonth() + 1).padStart(2, '0')}`;
      } else {
        // Mes — label: "Ene 25"
        const months = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];
        label = `${months[date.getMonth()]} ${String(date.getFullYear()).slice(2)}`;
      }

      const pax = r.pax ?? 0;
      const ingresos = r.route_price * pax;
      const costo = r.is_gestor === 1
        ? r.gestor_cost_per_passenger * pax
        : r.app_cost_per_passenger * pax;
      const ganancia = ingresos - costo;

      if (!map.has(label)) map.set(label, { ganancia: 0, pasajeros: 0, reservas: 0 });
      const entry = map.get(label)!;
      entry.ganancia += ganancia;
      entry.pasajeros += pax;
      entry.reservas += 1;
    }

    // Limitamos a los últimos N períodos según tipo
    const limit = period === 'day' ? 14 : period === 'week' ? 8 : 6;
    const all = Array.from(map.entries()).map(([label, v]) => ({ label, ...v }));
    return all.slice(-limit);
  },
};