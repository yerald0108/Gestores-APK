/**
 * Utilidades para manejar fechas sin problemas de zona horaria (timezone).
 * En Javascript, new Date("YYYY-MM-DD") interpreta la cadena como UTC,
 * lo que resta un día en zonas horarias occidentales (como Cuba -04:00).
 */

/**
 * Parsea una cadena ISO "YYYY-MM-DD" a un objeto Date local a medianoche.
 */
export function parseISODate(isoStr: string): Date {
  if (!isoStr) return new Date();
  const clean = isoStr.split('T')[0].split(' ')[0];
  const [year, month, day] = clean.split('-').map(Number);
  // Al usar el constructor de Date con números, se crea en la zona horaria local.
  return new Date(year, month - 1, day);
}

/**
 * Formatea un objeto Date a una cadena ISO "YYYY-MM-DD" usando valores locales.
 */
export function formatISODate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/**
 * Formatea una fecha ISO a un formato legible: "DD/MM/YYYY"
 */
export function formatDateDisplay(isoStr: string): string {
  if (!isoStr) return '';
  const clean = isoStr.split('T')[0].split(' ')[0];
  const [year, month, day] = clean.split('-');
  return `${day}/${month}/${year}`;
}

/**
 * Formatea una fecha ISO a un formato largo: "lunes, 27 de octubre de 2023"
 */
export function formatDateLong(isoStr: string): string {
  if (!isoStr) return '';
  const clean = isoStr.split('T')[0].split(' ')[0];
  const [year, month, day] = clean.split('-').map(Number);
  
  // Usamos las 12:00:00 como margen de seguridad para evitar saltos de día por TZ
  const dateObj = new Date(year, month - 1, day, 12, 0, 0);
  
  return dateObj.toLocaleDateString('es-ES', { 
    weekday: 'long', 
    day: 'numeric', 
    month: 'long', 
    year: 'numeric' 
  });
}

/**
 * Obtiene partes de la fecha de forma segura
 */
export function getSafeDateParts(dateStr: string) {
  if (!dateStr) return { d: '', m: '', y: '', weekday: '', monthLong: '' };
  const clean = dateStr.split('T')[0].split(' ')[0];
  const [year, month, day] = clean.split('-');
  
  if (!year || !month || !day) return { d: '', m: '', y: '', weekday: '', monthLong: '' };

  const dateObj = new Date(Number(year), Number(month) - 1, Number(day), 12, 0, 0);
  const weekday = dateObj.toLocaleDateString('es-ES', { weekday: 'long' });
  const monthLong = dateObj.toLocaleDateString('es-ES', { month: 'long' });

  return {
    d: day.padStart(2, '0'),
    m: month.padStart(2, '0'),
    y: year,
    weekday,
    monthLong
  };
}
