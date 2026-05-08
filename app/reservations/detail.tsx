import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert, Linking } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SPACING, FONT, RADIUS, TRANSPORT_CONFIG } from '@/constants/theme';
import { reservationsRepository } from '@/database/reservationsRepository';
import { BANK_CONFIG } from '@/services/userProfileService';
import { Reservation, formatCurrency } from '@/types';
import { useGlobalToast } from '@/components/ui/Toast';
import { getSafeDateParts } from '@/utils/dateUtils';

function InfoRow({ icon, label, value, color }: { icon: string; label: string; value: string; color: string }) {
  return (
    <View style={d.infoRow}>
      <View style={[d.infoIcon, { backgroundColor: color + '1A' }]}>
        <Ionicons name={icon as any} size={14} color={color} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={d.infoLabel}>{label}</Text>
        <Text style={d.infoValue}>{value}</Text>
      </View>
    </View>
  );
}

export default function ReservationDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [reservation, setReservation] = useState<Reservation | null>(null);
  const toast = useGlobalToast();

  useFocusEffect(useCallback(() => {
    reservationsRepository.getById(Number(id)).then(setReservation);
  }, [id]));

  if (!reservation) return (
    <SafeAreaView style={d.container}>
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <Text style={{ color: COLORS.text.muted }}>Cargando...</Text>
      </View>
    </SafeAreaView>
  );

  const tc = TRANSPORT_CONFIG[reservation.transport];


    const travelParts = getSafeDateParts(reservation.travel_date);
    const resParts = getSafeDateParts(reservation.reservation_date);

    const handleShare = () => {
      const numPassengers = reservation.passengers?.length ?? 0;
      const totalCost = reservation.route_price * numPassengers;
      const isFullAdvance = reservation.advance >= totalCost;
      const pendingAmount = totalCost - reservation.advance;

      const passengerList = (reservation.passengers ?? []).map((p, i) =>
        `  ${i + 1}. ${p.full_name} (CI: ${p.identity_card})`
      ).join('\n');

      // Línea de método de pago
      let paymentLine = '';
      if (reservation.payment_method && !isFullAdvance) {
        const bankLabel = BANK_CONFIG[reservation.payment_method as keyof typeof BANK_CONFIG]?.label ?? reservation.payment_method;

        if (reservation.payment_method === 'mitransfer') {
          paymentLine = `📲 *Pago:* MiTransfer — ${reservation.payment_confirm_number}`;
        } else {
          const cardPart = reservation.payment_card_number
            ? `Tarjeta: \`${reservation.payment_card_number}\``
            : bankLabel;
          paymentLine = `💳 *Pago:* ${bankLabel}\n${cardPart}\nConfirmar al: ${reservation.payment_confirm_number}`;
        }
      }

      const msg = [
        `🧳 *Reservación #${reservation.id} — Viajando*`,
        ``,
        `🚌 *Transporte:* ${tc.label}`,
        `📍 *Ruta:* ${reservation.origin} → ${reservation.destination}`,
        `📅 *Fecha de viaje:* ${travelParts.d}/${travelParts.m}/${travelParts.y}`,
        `📅 *Fecha de reserva:* ${resParts.d}/${resParts.m}/${resParts.y}`,
        ``,
        `👥 *Pasajeros (${numPassengers}):*`,
        passengerList,
        ``,
        `💰 *Costo Total:* ${formatCurrency(totalCost)} CUP`,
        reservation.advance > 0 ? `✅ *Anticipo:* ${formatCurrency(reservation.advance)} CUP` : '',
        isFullAdvance 
          ? `🎊 *¡Pago completo realizado!*` 
          : `⚠️ *Pendiente a pagar:* ${formatCurrency(pendingAmount)} CUP`,
        paymentLine,
        ``,
        `📊 *Estado:* ${reservation.status}`,
      ].filter(Boolean).join('\n');

      const clean = reservation.phone.replace(/\D/g, '');
      Linking.openURL(`whatsapp://send?phone=53${clean}&text=${encodeURIComponent(msg)}`)
        .catch(() => Alert.alert('WhatsApp no disponible'));
    };

    const handleDelete = () => {
      Alert.alert('Eliminar', '¿Eliminar este pedido?', [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar', style: 'destructive',
          onPress: async () => {
            await reservationsRepository.delete(reservation.id);
            toast.show({ message: 'Pedido eliminado', type: 'success' });
            setTimeout(() => router.back(), 500);
          }
        },
      ]);
    };

    return (
      <SafeAreaView style={d.container}>
        {/* Header */}
        <View style={d.header}>
          <TouchableOpacity style={d.backBtn} onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={20} color={COLORS.text.primary} />
          </TouchableOpacity>
          <Text style={d.title}>Pedido #{reservation.id}</Text>
          <TouchableOpacity style={d.deleteBtn} onPress={handleDelete}>
            <Ionicons name="trash-outline" size={18} color={COLORS.accent.danger} />
          </TouchableOpacity>
        </View>
  
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={d.content}>
          {/* Hero card */}
          <View style={[d.heroCard, { borderColor: tc.color + '44' }]}>
            <View style={d.heroTop}>
              <View style={[d.transportBadge, { backgroundColor: tc.color + '1A' }]}>
                <Ionicons name={tc.icon as any} size={16} color={tc.color} />
                <Text style={[d.transportLabel, { color: tc.color }]}>{tc.label}</Text>
              </View>
              <View style={d.statusBadge}>
                <View style={[d.statusDot, { backgroundColor: COLORS.accent.warning }]} />
                <Text style={d.statusText}>{reservation.status}</Text>
              </View>
            </View>
            <View style={d.routeHero}>
              <Text style={d.cityHero}>{reservation.origin}</Text>
              <View style={[d.heroLine, { backgroundColor: tc.color + '55' }]}>
                <Ionicons name={tc.icon as any} size={18} color={tc.color} />
              </View>
              <Text style={d.cityHero}>{reservation.destination}</Text>
            </View>
          </View>
  
          {/* Info */}
          <View style={d.section}>
            <Text style={d.sectionTitle}>Información del cliente</Text>
            <InfoRow icon="call" label="Teléfono" value={reservation.phone} color={tc.color} />
            <InfoRow icon="airplane" label="Fecha de viaje" value={`${travelParts.weekday}, ${travelParts.d} de ${travelParts.monthLong} de ${travelParts.y}`} color={tc.color} />
            <InfoRow icon="calendar" label="Fecha de reserva" value={`${resParts.d} de ${resParts.monthLong} de ${resParts.y}`} color={tc.color} />
          </View>

        {/* Pasajeros */}
        <View style={d.section}>
          <Text style={d.sectionTitle}>Pasajeros ({reservation.passengers?.length ?? 0})</Text>
          {(reservation.passengers ?? []).map((p, i) => (
            <View key={i} style={[d.passengerCard, { borderColor: tc.color + '33' }]}>
              <View style={[d.passengerNum, { backgroundColor: tc.color + '1A' }]}>
                <Text style={[d.passengerNumText, { color: tc.color }]}>{i + 1}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={d.passengerName}>{p.full_name}</Text>
                <Text style={d.passengerCI}>CI: {p.identity_card}</Text>
              </View>
            </View>
          ))}
        </View>

        {/* Pago */}
        <View style={[d.payCard, { borderColor: tc.color + '33' }]}>
          <Text style={d.sectionTitle}>Resumen de pago</Text>
          <View style={d.payRow}>
            <Text style={d.payLabel}>Precio por pasajero</Text>
            <Text style={d.payVal}>{formatCurrency(reservation.route_price)} CUP</Text>
          </View>
          <View style={d.payRow}>
            <Text style={d.payLabel}>× {reservation.passengers?.length ?? 0} pasajeros</Text>
            <Text style={d.payVal}>{formatCurrency(reservation.route_price * (reservation.passengers?.length ?? 0))} CUP</Text>
          </View>
          {reservation.advance > 0 && (
            <View style={d.payRow}>
              <Text style={d.payLabel}>− Anticipo</Text>
              <Text style={[d.payVal, { color: COLORS.accent.success }]}>−{formatCurrency(reservation.advance)} CUP</Text>
            </View>
          )}
          <View style={[d.payDivider, { backgroundColor: tc.color + '33' }]} />
          <View style={d.payRow}>
            <Text style={d.payTotalLabel}>Total a pagar</Text>
            <Text style={[d.payTotal, { color: tc.color }]}>{formatCurrency(reservation.total)} CUP</Text>
          </View>
        </View>
      </ScrollView>

      {/* Footer */}
      <View style={d.footer}>
        <TouchableOpacity style={[d.waBtn, { backgroundColor: '#25D36622', borderColor: '#25D366' }]} onPress={handleShare}>
          <Ionicons name="logo-whatsapp" size={20} color="#25D366" />
          <Text style={d.waBtnText}>Compartir por WhatsApp</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const d = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg.primary },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: SPACING.lg, paddingTop: SPACING.md, paddingBottom: SPACING.lg, gap: SPACING.sm },
  backBtn: { width: 40, height: 40, borderRadius: RADIUS.full, backgroundColor: COLORS.bg.card, borderWidth: 1, borderColor: COLORS.border.default, justifyContent: 'center', alignItems: 'center' },
  title: { flex: 1, fontSize: FONT.sizes.lg, color: COLORS.text.primary, fontWeight: FONT.weights.bold },
  deleteBtn: { width: 40, height: 40, borderRadius: RADIUS.full, backgroundColor: COLORS.accent.danger + '1A', justifyContent: 'center', alignItems: 'center' },
  content: { paddingHorizontal: SPACING.lg, paddingBottom: SPACING.xxl, gap: SPACING.lg },
  heroCard: { backgroundColor: COLORS.bg.card, borderRadius: RADIUS.xl, padding: SPACING.lg, borderWidth: 1, gap: SPACING.md },
  heroTop: { flexDirection: 'row', justifyContent: 'space-between' },
  transportBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: SPACING.sm, paddingVertical: 4, borderRadius: RADIUS.full },
  transportLabel: { fontSize: FONT.sizes.xs, fontWeight: FONT.weights.semibold },
  statusBadge: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: SPACING.sm, paddingVertical: 4, borderRadius: RADIUS.full, backgroundColor: COLORS.accent.warning + '1A' },
  statusDot: { width: 6, height: 6, borderRadius: 3 },
  statusText: { fontSize: FONT.sizes.xs, color: COLORS.accent.warning, fontWeight: FONT.weights.medium },
  routeHero: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm },
  cityHero: { flex: 1, fontSize: FONT.sizes.xl, color: COLORS.text.primary, fontWeight: FONT.weights.extrabold },
  heroLine: { paddingHorizontal: SPACING.sm, paddingVertical: SPACING.xs, borderRadius: RADIUS.full },
  section: { gap: SPACING.sm },
  sectionTitle: { fontSize: FONT.sizes.sm, color: COLORS.text.muted, fontWeight: FONT.weights.semibold, textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: SPACING.xs },
  infoRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING.md, backgroundColor: COLORS.bg.card, borderRadius: RADIUS.lg, padding: SPACING.md, borderWidth: 1, borderColor: COLORS.border.default },
  infoIcon: { width: 36, height: 36, borderRadius: RADIUS.md, justifyContent: 'center', alignItems: 'center' },
  infoLabel: { fontSize: FONT.sizes.xs, color: COLORS.text.muted },
  infoValue: { fontSize: FONT.sizes.md, color: COLORS.text.primary, fontWeight: FONT.weights.medium, marginTop: 2 },
  passengerCard: { flexDirection: 'row', alignItems: 'center', gap: SPACING.md, backgroundColor: COLORS.bg.card, borderRadius: RADIUS.lg, padding: SPACING.md, borderWidth: 1 },
  passengerNum: { width: 36, height: 36, borderRadius: RADIUS.full, justifyContent: 'center', alignItems: 'center' },
  passengerNumText: { fontSize: FONT.sizes.md, fontWeight: FONT.weights.bold },
  passengerName: { fontSize: FONT.sizes.md, color: COLORS.text.primary, fontWeight: FONT.weights.semibold },
  passengerCI: { fontSize: FONT.sizes.xs, color: COLORS.text.muted, marginTop: 2 },
  payCard: { backgroundColor: COLORS.bg.card, borderRadius: RADIUS.xl, padding: SPACING.lg, borderWidth: 1, gap: SPACING.sm },
  payRow: { flexDirection: 'row', justifyContent: 'space-between' },
  payLabel: { fontSize: FONT.sizes.md, color: COLORS.text.secondary },
  payVal: { fontSize: FONT.sizes.md, color: COLORS.text.primary, fontWeight: FONT.weights.medium },
  payDivider: { height: 1, marginVertical: SPACING.xs },
  payTotalLabel: { fontSize: FONT.sizes.md, color: COLORS.text.primary, fontWeight: FONT.weights.bold },
  payTotal: { fontSize: FONT.sizes.xxl, fontWeight: FONT.weights.extrabold },
  footer: { padding: SPACING.lg, paddingBottom: SPACING.xl },
  waBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: SPACING.sm, paddingVertical: SPACING.md, borderRadius: RADIUS.full, borderWidth: 1.5 },
  waBtnText: { fontSize: FONT.sizes.md, color: '#25D366', fontWeight: FONT.weights.bold },
});