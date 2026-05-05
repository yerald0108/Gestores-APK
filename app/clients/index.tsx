import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, FlatList,
  ActivityIndicator, Alert, Linking
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SPACING, FONT, RADIUS, TRANSPORT_CONFIG } from '@/constants/theme';
import { reservationsRepository } from '@/database/reservationsRepository';
import { Reservation, calcFinancials } from '@/types';

function formatDate(dateStr: string) {
  const d = new Date(dateStr);
  return d.toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' });
}

// ── Fila de dato financiero ──────────────────────────────────────────────────
function FinRow({ label, value, valueColor, bold }: {
  label: string; value: string; valueColor?: string; bold?: boolean;
}) {
  return (
    <View style={fr.row}>
      <Text style={[fr.label, bold && fr.labelBold]}>{label}</Text>
      <Text style={[fr.value, bold && fr.valueBold, valueColor ? { color: valueColor } : null]}>
        {value}
      </Text>
    </View>
  );
}
const fr = StyleSheet.create({
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 3 },
  label: { fontSize: FONT.sizes.sm, color: COLORS.text.secondary },
  labelBold: { color: COLORS.text.primary, fontWeight: FONT.weights.bold, fontSize: FONT.sizes.md },
  value: { fontSize: FONT.sizes.sm, color: COLORS.text.primary, fontWeight: FONT.weights.medium },
  valueBold: { fontSize: FONT.sizes.lg, fontWeight: FONT.weights.extrabold },
});

// ── Tarjeta de reserva ───────────────────────────────────────────────────────
function ReservationCard({ item, onDelete, onWhatsApp }: {
  item: Reservation;
  onDelete: () => void;
  onWhatsApp: () => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const tc = TRANSPORT_CONFIG[item.transport];
  const fin = calcFinancials(item);

  const gananciaColor = fin.ganancia >= 0 ? COLORS.accent.success : COLORS.accent.danger;
  const gananciaIcon = fin.ganancia >= 0 ? 'trending-up' : 'trending-down';

  return (
    <View style={[card.container, { borderColor: tc.color + '33' }]}>
      {/* ── Top: transporte + estado ── */}
      <View style={card.topRow}>
        <View style={[card.transportBadge, { backgroundColor: tc.color + '1A' }]}>
          <Ionicons name={tc.icon as any} size={13} color={tc.color} />
          <Text style={[card.transportLabel, { color: tc.color }]}>{tc.label}</Text>
        </View>
        <View style={[card.reservadoBadge, { backgroundColor: COLORS.accent.success + '1A' }]}>
          <View style={[card.dot, { backgroundColor: COLORS.accent.success }]} />
          <Text style={[card.reservadoText, { color: COLORS.accent.success }]}>Reservado</Text>
        </View>
      </View>

      {/* ── Ruta ── */}
      <View style={card.routeRow}>
        <Text style={card.city} numberOfLines={1}>{item.origin}</Text>
        <View style={card.arrow}>
          <View style={[card.line, { backgroundColor: tc.color + '44' }]} />
          <Ionicons name="airplane" size={12} color={tc.color} />
          <View style={[card.line, { backgroundColor: tc.color + '44' }]} />
        </View>
        <Text style={card.city} numberOfLines={1}>{item.destination}</Text>
      </View>

      {/* ── Info básica ── */}
      <View style={card.infoRow}>
        <View style={card.infoItem}>
          <Ionicons name="people-outline" size={12} color={COLORS.text.muted} />
          <Text style={card.infoText} numberOfLines={1}>
            {fin.passengerCount} pasajero{fin.passengerCount !== 1 ? 's' : ''}
          </Text>
        </View>
        <View style={card.infoItem}>
          <Ionicons name="calendar-outline" size={12} color={COLORS.text.muted} />
          <Text style={card.infoText} numberOfLines={1}>{formatDate(item.travel_date)}</Text>
        </View>
        <View style={card.infoItem}>
          <Ionicons name="call-outline" size={12} color={COLORS.text.muted} />
          <Text style={card.infoText} numberOfLines={1}>{item.phone}</Text>
        </View>
      </View>

      {/* ── Ganancia destacada ── */}
      <View style={[card.gananciaBar, { backgroundColor: gananciaColor + '12', borderColor: gananciaColor + '33' }]}>
        <View style={card.gananciaLeft}>
          <View style={[card.gananciaIcon, { backgroundColor: gananciaColor + '22' }]}>
            <Ionicons name={gananciaIcon} size={16} color={gananciaColor} />
          </View>
          <View>
            <Text style={[card.gananciaLabel, { color: COLORS.text.muted }]}>Ganancia</Text>
            <Text style={[card.gananciaVal, { color: gananciaColor }]}>
              {fin.ganancia >= 0 ? '+' : ''}{fin.ganancia.toFixed(2)} CUP
            </Text>
          </View>
        </View>
        <View style={card.gananciaRight}>
          <Text style={[card.gananciaLabel, { color: COLORS.text.muted, textAlign: 'right' }]} numberOfLines={1}>
            {item.is_gestor === 1 ? 'Vía gestor' : 'Vía app'}
          </Text>
          <Text style={[card.gananciaLabel, { color: COLORS.text.secondary, textAlign: 'right' }]} numberOfLines={1}>
            {fin.costPerPassenger.toFixed(0)}×{fin.passengerCount}={fin.totalCost.toFixed(2)} CUP
          </Text>
        </View>
      </View>

      {/* ── Resto a cobrar ── */}
      {fin.restToCobrar > 0 && (
        <View style={[card.cobroBar, { backgroundColor: COLORS.accent.warning + '12', borderColor: COLORS.accent.warning + '33' }]}>
          <Ionicons name="cash-outline" size={15} color={COLORS.accent.warning} />
          <Text style={[card.cobroText, { color: COLORS.accent.warning }]}>
            Pendiente de cobro: <Text style={{ fontWeight: FONT.weights.extrabold }}>{fin.restToCobrar.toFixed(2)} CUP</Text>
          </Text>
        </View>
      )}
      {fin.restToCobrar === 0 && (
        <View style={[card.cobroBar, { backgroundColor: COLORS.accent.success + '10', borderColor: COLORS.accent.success + '33' }]}>
          <Ionicons name="checkmark-circle-outline" size={15} color={COLORS.accent.success} />
          <Text style={[card.cobroText, { color: COLORS.accent.success }]}>Cobro completo</Text>
        </View>
      )}

      {/* ── Expandible: detalles ── */}
      <TouchableOpacity style={card.expandBtn} onPress={() => setExpanded(!expanded)} activeOpacity={0.7}>
        <Text style={card.expandText}>{expanded ? 'Ocultar detalles' : 'Ver análisis completo'}</Text>
        <Ionicons name={expanded ? 'chevron-up' : 'chevron-down'} size={16} color={COLORS.text.muted} />
      </TouchableOpacity>

      {expanded && (
        <View style={card.details}>
          {/* Pasajeros */}
          <Text style={card.detailsSection}>Pasajeros</Text>
          {(item.passengers ?? []).map((p, i) => (
            <View key={i} style={[card.passengerRow, { borderColor: tc.color + '22' }]}>
              <View style={[card.passengerNum, { backgroundColor: tc.color + '1A' }]}>
                <Text style={[card.passengerNumText, { color: tc.color }]}>{i + 1}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={card.passengerName}>{p.full_name}</Text>
                <Text style={card.passengerCI}>CI: {p.identity_card}</Text>
              </View>
            </View>
          ))}

          {/* Análisis financiero completo */}
          <Text style={[card.detailsSection, { marginTop: SPACING.md }]}>Análisis financiero</Text>
          <View style={[card.finBox, { borderColor: tc.color + '22' }]}>
            <FinRow
              label={`Precio cliente × ${fin.passengerCount} pasajero${fin.passengerCount !== 1 ? 's' : ''}`}
              value={`${fin.totalClientPrice.toFixed(2)} CUP`}
            />
            {fin.advancePaid > 0 && (
              <FinRow
                label="— Anticipo pagado"
                value={`-${fin.advancePaid.toFixed(2)} CUP`}
                valueColor={COLORS.accent.success}
              />
            )}
            <FinRow
              label="Resto a cobrar al cliente"
              value={`${fin.restToCobrar.toFixed(2)} CUP`}
              valueColor={fin.restToCobrar > 0 ? COLORS.accent.warning : COLORS.accent.success}
            />

            <View style={[card.finDivider, { backgroundColor: COLORS.border.default }]} />

            <FinRow
              label={`Costo ${item.is_gestor === 1 ? 'gestor' : 'app'} × ${fin.passengerCount}`}
              value={`-${fin.totalCost.toFixed(2)} CUP`}
              valueColor={COLORS.accent.danger}
            />
            <FinRow
              label={`  (${fin.costPerPassenger.toFixed(2)} CUP/pasajero)`}
              value={item.is_gestor === 1 ? 'Gestor' : 'App'}
              valueColor={item.is_gestor === 1 ? COLORS.accent.warning : COLORS.accent.secondary}
            />

            <View style={[card.finDivider, { backgroundColor: gananciaColor + '55' }]} />

            <FinRow
              label="GANANCIA REAL"
              value={`${fin.ganancia >= 0 ? '+' : ''}${fin.ganancia.toFixed(2)} CUP`}
              valueColor={gananciaColor}
              bold
            />
          </View>

          {/* Fechas */}
          <Text style={[card.detailsSection, { marginTop: SPACING.md }]}>Fechas</Text>
          <View style={card.datesRow}>
            <View style={card.dateItem}>
              <Text style={card.dateLabel}>Reservado el</Text>
              <Text style={card.dateVal}>{formatDate(item.reservation_date)}</Text>
            </View>
            <View style={card.dateItem}>
              <Text style={card.dateLabel}>Viaja el</Text>
              <Text style={card.dateVal}>{formatDate(item.travel_date)}</Text>
            </View>
          </View>
        </View>
      )}

      {/* ── Acciones ── */}
      <View style={card.actions}>
        <TouchableOpacity style={[card.actionBtn, card.waBtn]} onPress={onWhatsApp}>
          <Ionicons name="logo-whatsapp" size={16} color="#25D366" />
          <Text style={[card.actionText, { color: '#25D366' }]}>WhatsApp</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[card.actionBtn, card.deleteBtn]} onPress={onDelete}>
          <Ionicons name="trash-outline" size={16} color={COLORS.accent.danger} />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const card = StyleSheet.create({
  container: { backgroundColor: COLORS.bg.card, borderRadius: RADIUS.xl, padding: SPACING.lg, borderWidth: 1, gap: SPACING.md },
  topRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  transportBadge: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: SPACING.sm, paddingVertical: 3, borderRadius: RADIUS.full },
  transportLabel: { fontSize: FONT.sizes.xs, fontWeight: FONT.weights.semibold },
  reservadoBadge: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: SPACING.sm, paddingVertical: 3, borderRadius: RADIUS.full },
  dot: { width: 6, height: 6, borderRadius: 3 },
  reservadoText: { fontSize: FONT.sizes.xs, fontWeight: FONT.weights.semibold },
  routeRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm },
  city: { flex: 1, fontSize: FONT.sizes.md, color: COLORS.text.primary, fontWeight: FONT.weights.bold },
  arrow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  line: { width: 16, height: 1 },
  infoRow: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.sm },
  infoItem: { flexDirection: 'row', alignItems: 'center', gap: 3, flexShrink: 1 },
  infoText: { fontSize: FONT.sizes.xs, color: COLORS.text.muted, flexShrink: 1 },
  gananciaBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: SPACING.md, borderRadius: RADIUS.lg, borderWidth: 1 },
  gananciaLeft: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm },
  gananciaIcon: { width: 34, height: 34, borderRadius: RADIUS.full, justifyContent: 'center', alignItems: 'center' },
  gananciaLabel: { fontSize: FONT.sizes.xs },
  gananciaVal: { fontSize: FONT.sizes.lg, fontWeight: FONT.weights.extrabold },
  gananciaRight: { alignItems: 'flex-end', gap: 2, maxWidth: '45%' },
  cobroBar: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm, paddingHorizontal: SPACING.md, paddingVertical: SPACING.sm, borderRadius: RADIUS.lg, borderWidth: 1 },
  cobroText: { fontSize: FONT.sizes.sm, flex: 1 },
  expandBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: SPACING.xs, paddingVertical: SPACING.xs },
  expandText: { fontSize: FONT.sizes.sm, color: COLORS.text.muted },
  details: { gap: SPACING.sm, paddingTop: SPACING.xs },
  detailsSection: { fontSize: FONT.sizes.xs, color: COLORS.text.muted, fontWeight: FONT.weights.semibold, textTransform: 'uppercase', letterSpacing: 0.8 },
  passengerRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm, backgroundColor: COLORS.bg.elevated, borderRadius: RADIUS.md, padding: SPACING.sm, borderWidth: 1 },
  passengerNum: { width: 28, height: 28, borderRadius: RADIUS.full, justifyContent: 'center', alignItems: 'center' },
  passengerNumText: { fontSize: FONT.sizes.sm, fontWeight: FONT.weights.bold },
  passengerName: { fontSize: FONT.sizes.sm, color: COLORS.text.primary, fontWeight: FONT.weights.semibold },
  passengerCI: { fontSize: FONT.sizes.xs, color: COLORS.text.muted },
  finBox: { backgroundColor: COLORS.bg.elevated, borderRadius: RADIUS.lg, padding: SPACING.md, borderWidth: 1, gap: 2 },
  finDivider: { height: 1, marginVertical: SPACING.xs },
  datesRow: { flexDirection: 'row', gap: SPACING.md },
  dateItem: { flex: 1, backgroundColor: COLORS.bg.elevated, borderRadius: RADIUS.md, padding: SPACING.sm, alignItems: 'center' },
  dateLabel: { fontSize: FONT.sizes.xs, color: COLORS.text.muted },
  dateVal: { fontSize: FONT.sizes.sm, color: COLORS.text.primary, fontWeight: FONT.weights.semibold, marginTop: 2 },
  actions: { flexDirection: 'row', gap: SPACING.sm, paddingTop: SPACING.xs, borderTopWidth: 1, borderTopColor: COLORS.border.default },
  actionBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: SPACING.xs, paddingVertical: SPACING.sm, borderRadius: RADIUS.lg, borderWidth: 1 },
  waBtn: { flex: 1, backgroundColor: '#25D36614', borderColor: '#25D36644' },
  deleteBtn: { width: 42, backgroundColor: COLORS.accent.danger + '14', borderColor: COLORS.accent.danger + '44' },
  actionText: { fontSize: FONT.sizes.sm, fontWeight: FONT.weights.semibold },
});

// ── Pantalla principal ───────────────────────────────────────────────────────
export default function ClientsScreen() {
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const data = await reservationsRepository.getReserved();
      setReservations(data);
    } catch {
      Alert.alert('Error', 'No se pudieron cargar las reservas');
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  // Totales globales
  const totals = reservations.reduce((acc, r) => {
    const fin = calcFinancials(r);
    acc.ganancia += fin.ganancia;
    acc.porCobrar += fin.restToCobrar;
    acc.pasajeros += fin.passengerCount;
    return acc;
  }, { ganancia: 0, porCobrar: 0, pasajeros: 0 });

  const handleDelete = (r: Reservation) => {
    Alert.alert('Eliminar reserva', `¿Eliminar la reserva #${r.id}?`, [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Eliminar', style: 'destructive',
        onPress: async () => { await reservationsRepository.delete(r.id); load(); }
      },
    ]);
  };

  const handleWhatsApp = (item: Reservation) => {
    const tc = TRANSPORT_CONFIG[item.transport];
    const fin = calcFinancials(item);
    const passengerList = (item.passengers ?? [])
      .map((p, i) => `  ${i + 1}. ${p.full_name} (CI: ${p.identity_card})`).join('\n');
    const msg = [
      `✅ *Reserva #${item.id} confirmada — Viajando*`,
      ``,
      `🚌 *Transporte:* ${tc.label}`,
      `📍 *Ruta:* ${item.origin} → ${item.destination}`,
      `📋 *Fecha de reserva:* ${new Date(item.reservation_date).toLocaleDateString('es-ES')}`,
      `📅 *Fecha de viaje:* ${new Date(item.travel_date).toLocaleDateString('es-ES')}`,
      ``,
      `👥 *Pasajeros (${fin.passengerCount}):*`,
      passengerList,
      ``,
      `💰 *Precio/pasajero:* ${item.route_price.toFixed(2)} CUP`,
      fin.advancePaid > 0 ? `✅ *Anticipo pagado:* ${fin.advancePaid.toFixed(2)} CUP` : '',
      `💳 *Pendiente de pago:* ${fin.restToCobrar.toFixed(2)} CUP`,
    ].filter(Boolean).join('\n');
    const clean = item.phone.replace(/\D/g, '');
    Linking.openURL(`whatsapp://send?phone=53${clean}&text=${encodeURIComponent(msg)}`)
      .catch(() => Alert.alert('WhatsApp no disponible'));
  };

  return (
    <SafeAreaView style={s.container}>
      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity style={s.backBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={20} color={COLORS.text.primary} />
        </TouchableOpacity>
        <View style={s.headerInfo}>
          <Text style={s.title}>Reservas</Text>
          <Text style={s.subtitle}>{reservations.length} reserva{reservations.length !== 1 ? 's' : ''} confirmada{reservations.length !== 1 ? 's' : ''}</Text>
        </View>
      </View>

      {/* Resumen global — solo si hay reservas */}
      {!loading && reservations.length > 0 && (
        <View style={s.summaryStrip}>
          <View style={[s.summaryItem, { borderColor: COLORS.accent.success + '33' }]}>
            <View style={[s.summaryIconWrap, { backgroundColor: COLORS.accent.success + '1A' }]}>
              <Ionicons name="trending-up" size={16} color={COLORS.accent.success} />
            </View>
            <Text style={s.summaryLabel}>Ganancia total</Text>
            <Text style={[s.summaryVal, { color: COLORS.accent.success }]} numberOfLines={1} adjustsFontSizeToFit>
              {totals.ganancia >= 0 ? '+' : ''}{totals.ganancia.toFixed(2)}
            </Text>
            <Text style={s.summaryCurrency}>CUP</Text>
          </View>
          <View style={[s.summaryItem, { borderColor: COLORS.accent.warning + '33' }]}>
            <View style={[s.summaryIconWrap, { backgroundColor: COLORS.accent.warning + '1A' }]}>
              <Ionicons name="cash-outline" size={16} color={COLORS.accent.warning} />
            </View>
            <Text style={s.summaryLabel}>Por cobrar</Text>
            <Text style={[s.summaryVal, { color: COLORS.accent.warning }]} numberOfLines={1} adjustsFontSizeToFit>
              {totals.porCobrar.toFixed(2)}
            </Text>
            <Text style={s.summaryCurrency}>CUP</Text>
          </View>
          <View style={[s.summaryItem, { borderColor: COLORS.accent.primary + '33' }]}>
            <View style={[s.summaryIconWrap, { backgroundColor: COLORS.accent.primary + '1A' }]}>
              <Ionicons name="people" size={16} color={COLORS.accent.primary} />
            </View>
            <Text style={s.summaryLabel}>Pasajeros</Text>
            <Text style={[s.summaryVal, { color: COLORS.accent.primary }]} numberOfLines={1}>
              {totals.pasajeros}
            </Text>
            <Text style={s.summaryCurrency}>total</Text>
          </View>
        </View>
      )}

      {loading ? (
        <View style={s.centered}>
          <ActivityIndicator color={COLORS.accent.success} size="large" />
        </View>
      ) : reservations.length === 0 ? (
        <View style={s.centered}>
          <View style={s.emptyIcon}>
            <Ionicons name="checkmark-circle-outline" size={48} color={COLORS.accent.success} />
          </View>
          <Text style={s.emptyTitle}>Sin reservas aún</Text>
          <Text style={s.emptyText}>
            Cuando marques un pedido como "Reservado" aparecerá aquí con su análisis financiero.
          </Text>
          <TouchableOpacity style={s.emptyBtn} onPress={() => router.push('/reservations' as any)}>
            <Ionicons name="arrow-forward" size={16} color="#fff" />
            <Text style={s.emptyBtnText}>Ir a Pedidos</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={reservations}
          keyExtractor={(item) => item.id.toString()}
          contentContainerStyle={s.list}
          showsVerticalScrollIndicator={false}
          renderItem={({ item }) => (
            <ReservationCard
              item={item}
              onDelete={() => handleDelete(item)}
              onWhatsApp={() => handleWhatsApp(item)}
            />
          )}
        />
      )}
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg.primary },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: SPACING.lg, paddingTop: SPACING.md, paddingBottom: SPACING.lg, gap: SPACING.sm },
  backBtn: { width: 40, height: 40, borderRadius: RADIUS.full, backgroundColor: COLORS.bg.card, borderWidth: 1, borderColor: COLORS.border.default, justifyContent: 'center', alignItems: 'center' },
  headerInfo: { flex: 1 },
  title: { fontSize: FONT.sizes.xl, color: COLORS.text.primary, fontWeight: FONT.weights.bold },
  subtitle: { fontSize: FONT.sizes.xs, color: COLORS.text.muted, marginTop: 2 },
  summaryStrip: { flexDirection: 'row', gap: SPACING.sm, paddingHorizontal: SPACING.lg, marginBottom: SPACING.md },
  summaryItem: { flex: 1, flexDirection: 'column', alignItems: 'center', backgroundColor: COLORS.bg.card, borderRadius: RADIUS.lg, paddingVertical: SPACING.sm + 2, paddingHorizontal: SPACING.xs, borderWidth: 1, gap: 2 },
  summaryIconWrap: { width: 30, height: 30, borderRadius: RADIUS.full, justifyContent: 'center', alignItems: 'center', marginBottom: 2 },
  summaryLabel: { fontSize: 9, color: COLORS.text.muted, textAlign: 'center', letterSpacing: 0.3 },
  summaryVal: { fontSize: FONT.sizes.md, fontWeight: FONT.weights.extrabold, textAlign: 'center' },
  summaryCurrency: { fontSize: 9, color: COLORS.text.muted, textAlign: 'center' },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: SPACING.md, padding: SPACING.xl },
  emptyIcon: { width: 96, height: 96, borderRadius: RADIUS.xl, backgroundColor: COLORS.accent.success + '1A', justifyContent: 'center', alignItems: 'center' },
  emptyTitle: { fontSize: FONT.sizes.xl, color: COLORS.text.primary, fontWeight: FONT.weights.bold },
  emptyText: { fontSize: FONT.sizes.md, color: COLORS.text.secondary, textAlign: 'center', lineHeight: 22 },
  emptyBtn: { flexDirection: 'row', alignItems: 'center', gap: SPACING.xs, paddingHorizontal: SPACING.lg, paddingVertical: SPACING.sm + 2, borderRadius: RADIUS.full, backgroundColor: COLORS.accent.success, marginTop: SPACING.sm },
  emptyBtnText: { color: '#fff', fontWeight: FONT.weights.semibold, fontSize: FONT.sizes.md },
  list: { padding: SPACING.lg, gap: SPACING.md, paddingBottom: SPACING.xxl },
});