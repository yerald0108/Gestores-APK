import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { Reservation } from '../types';
import { parseISODate } from '../utils/dateUtils';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export const notificationService = {
  /**
   * Solicita permisos para notificaciones locales.
   */
  async requestPermissions() {
    if (Platform.OS === 'web') return false;
    
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;
    
    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }
    
    if (finalStatus !== 'granted') {
      return false;
    }

    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'default',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#FF231F7C',
      });
    }

    return true;
  },

  /**
   * Programa un recordatorio para el día antes del viaje.
   */
  async scheduleTripReminder(reservation: Reservation) {
    if (Platform.OS === 'web') return;

    // Solo programar si el status es 'Reservado'
    if (reservation.status !== 'Reservado') {
      await this.cancelTripReminder(reservation.id);
      return;
    }

    const travelDate = parseISODate(reservation.travel_date);
    // Un día antes del viaje
    const reminderDate = new Date(travelDate);
    reminderDate.setDate(travelDate.getDate() - 1);
    // A las 9:00 AM
    reminderDate.setHours(9, 0, 0, 0);

    // Si la fecha ya pasó (el viaje es mañana o hoy), intentar programar para hoy mismo si es posible
    // o simplemente no programar si ya es muy tarde.
    const now = new Date();
    if (reminderDate.getTime() <= now.getTime()) {
      // Si el viaje es mañana, y ya pasaron las 9am de hoy, programamos para dentro de 1 minuto
      const tomorrow = new Date(now);
      tomorrow.setDate(now.getDate() + 1);
      tomorrow.setHours(0, 0, 0, 0);
      
      const isTravelTomorrow = travelDate.getTime() === tomorrow.getTime();
      
      if (isTravelTomorrow) {
        // Programar en 1 minuto
        reminderDate.setTime(now.getTime() + 60000);
      } else {
        // El viaje ya pasó o es hoy, no programar
        return;
      }
    }

    const passengerName = reservation.passengers && reservation.passengers.length > 0 
      ? reservation.passengers[0].full_name 
      : 'Cliente';
    
    const title = '🚢 Viaje próximo';
    const body = `Mañana viaja ${passengerName} (${reservation.origin} → ${reservation.destination})`;

    // Cancelar cualquier notificación previa para esta reserva
    await this.cancelTripReminder(reservation.id);

    await Notifications.scheduleNotificationAsync({
      identifier: `reservation_${reservation.id}`,
      content: {
        title,
        body,
        data: { reservationId: reservation.id },
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date: reminderDate,
      },
    });
    
    console.log(`Notificación programada para reserva ${reservation.id} en ${reminderDate}`);
  },

  /**
   * Cancela el recordatorio de una reserva.
   */
  async cancelTripReminder(reservationId: number) {
    if (Platform.OS === 'web') return;
    await Notifications.cancelScheduledNotificationAsync(`reservation_${reservationId}`);
  }
};
