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