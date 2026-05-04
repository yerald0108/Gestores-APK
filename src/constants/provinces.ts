import { TransportType } from '../types';

// Todas las provincias
export const ALL_PROVINCES = [
  'Pinar del Río (Autopista)',
  'Pinar del Río (Carretera Central)',
  'La Habana',
  'Artemisa',
  'San José de las Lajas',
  'Matanzas',
  'Cienfuegos',
  'Santa Clara',
  'Sancti Spíritus',
  'Ciego de Ávila',
  'Camagüey',
  'Guáimaro',
  'Las Tunas',
  'Puerto Padre',
  'Holguín',
  'Moa',
  'Mayarí',
  'Bayamo',
  'Manzanillo',
  'Bayamo_Manzanillo',
  'Baracoa',
  'Santiago de Cuba',
  'Guantánamo',
  'Nueva Gerona',  // ← antes "Isla de la Juventud"
] as const;

// Provincias excluidas por transporte
const EXCLUDED: Partial<Record<TransportType, string[]>> = {
  omnibus: ['Nueva Gerona', 'Bayamo_Manzanillo'],
  tren: [
    'Nueva Gerona', 
    'Pinar del Río (Autopista)', 
    'Pinar del Río (Carretera Central)', 
    'Nueva Gerona', 
    'San José de las Lajas',
    'Artemisa',
    'Guáimaro',
    'Cienfuegos', 
    'Santa Clara',
    'Sancti Spíritus',
    'Ciego de Ávila',
    'Puerto Padre',
    'Mayarí',
    'Baracoa',
    'Moa',
    'Pilón'],
  catamaran: [
    'Artemisa', 
    'San José de las Lajas',
    'Matanzas', 
    'Pinar del Río', 
    'Cienfuegos', 
    'Santa Clara', 
    'Sancti Spíritus', 
    'Ciego de Ávila', 
    'Camagüey', 
    'Las Tunas', 
    'Holguín', 
    'Bayamo',
    'Manzanillo',
    'Bayamo_Manzanillo',
    'Pinar del Río (Autopista)',
    'Pinar del Río (Carretera Central)',
    'Puerto Padre',
    'Santiago de Cuba',
    'Mayarí',
    'Baracoa',
    'Puerto Padre',
    'Moa',
    'Guáimaro',
    'Guantánamo'],
    avion: [
      'Pinar del Río (Autopista)',
      'Pinar del Río (Carretera Central)',
      'Artemisa',
      'San José de las Lajas',
      'Matanzas',
      'Cienfuegos',
      'Santa Clara',
      'Sancti Spíritus',
      'Ciego de Ávila',
      'Camagüey',
      'Guáimaro',
      'Moa',
      'Mayarí',
      'Bayamo_Manzanillo',
      'Bayamo',
      'Manzanillo',
      'Puerto Padre',
      'Baracoa',
    ]
};

export function getProvincesForTransport(transport: TransportType | ''): string[] {
  if (!transport) return [...ALL_PROVINCES];
  const excluded = EXCLUDED[transport] ?? [];
  return ALL_PROVINCES.filter((p) => !excluded.includes(p));
}