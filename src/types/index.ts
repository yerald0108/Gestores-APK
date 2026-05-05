export type TransportType = 'omnibus' | 'tren' | 'catamaran' | 'avion';
export type ReservationStatus = 'Pendiente' | 'Reservado';

export interface Route {
  id: number;
  transport: TransportType;
  origin: string;
  destination: string;
  price: number;
  app_price: number;
  currency: string;
  created_at: string;
  updated_at: string;
}

export interface Passenger {
  id?: number;
  reservation_id?: number;
  full_name: string;
  identity_card: string;
}

export interface Reservation {
  id: number;
  phone: string;
  transport: TransportType;
  origin: string;
  destination: string;
  route_price: number;
  travel_date: string;
  reservation_date: string;
  advance: number;
  total: number;
  status: ReservationStatus;
  // Campos de gestor
  is_gestor: number;           // 0 = no, 1 = sí
  gestor_cost_per_passenger: number;
  app_cost_per_passenger: number;
  created_at: string;
  updated_at: string;
  passengers?: Passenger[];
}

export interface CreateReservationDTO {
  phone: string;
  transport: TransportType;
  origin: string;
  destination: string;
  route_price: number;
  travel_date: string;
  reservation_date: string;
  advance: number;
  total: number;
  status: ReservationStatus;
  is_gestor?: number;
  gestor_cost_per_passenger?: number;
  app_cost_per_passenger?: number;
  passengers: Omit<Passenger, 'id' | 'reservation_id'>[];
}

export interface CreateRouteDTO {
  transport: TransportType;
  origin: string;
  destination: string;
  price: number;
  app_price: number;
  currency: string;
}

export interface TransportInfo {
  key: TransportType;
  label: string;
  icon: string;
  color: string;
  gradient: [string, string];
  description: string;
}

// Utilidades de cálculo financiero para una reserva
export interface ReservationFinancials {
  passengerCount: number;
  totalClientPrice: number;      // route_price × pasajeros
  advancePaid: number;           // anticipo ya pagado
  restToCobrar: number;          // totalClientPrice - advance
  costPerPassenger: number;      // gestor_cost o app_cost
  totalCost: number;             // costPerPassenger × pasajeros
  ganancia: number;              // totalClientPrice - totalCost
  isGestor: boolean;
}

export function calcFinancials(r: Reservation): ReservationFinancials {
  const passengerCount = r.passengers?.length ?? 0;
  const totalClientPrice = r.route_price * passengerCount;
  const advancePaid = r.advance;
  const restToCobrar = Math.max(0, totalClientPrice - advancePaid);
  const costPerPassenger = r.is_gestor === 1
    ? r.gestor_cost_per_passenger
    : r.app_cost_per_passenger;
  const totalCost = costPerPassenger * passengerCount;
  const ganancia = totalClientPrice - totalCost;
  return {
    passengerCount,
    totalClientPrice,
    advancePaid,
    restToCobrar,
    costPerPassenger,
    totalCost,
    ganancia,
    isGestor: r.is_gestor === 1,
  };
}