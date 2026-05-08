import React, { useState, useCallback, useMemo, useRef } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, FlatList,
  ActivityIndicator, Alert, Linking, TextInput, RefreshControl,
  Animated, Pressable
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SPACING, FONT, RADIUS, TRANSPORT_CONFIG } from '@/constants/theme';
import { reservationsRepository } from '@/database/reservationsRepository';
import { BANK_CONFIG } from '@/services/userProfileService';
import { Reservation, formatCurrency } from '@/types';
import Skeleton from '@/components/ui/Skeleton';
import { useGlobalToast } from '@/components/ui/Toast';
import { formatDateDisplay, getSafeDateParts } from '@/utils/dateUtils';

function formatDate(dateStr: string) {
  return formatDateDisplay(dateStr);
}

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

function ReservationCard({ item, onPress, onEdit, onWhatsApp, onDelete }: any) {
  const tc = TRANSPORT_CONFIG[item.transport as keyof typeof TRANSPORT_CONFIG];
  const passengerCount = item.passengers?.length ?? 0;

  const scale = useRef(new Animated.Value(1)).current;

  const handlePressIn = () => {
    Animated.spring(scale, { toValue: 0.97, useNativeDriver: true, damping: 20, stiffness: 300 }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scale, { toValue: 1, useNativeDriver: true, damping: 20, stiffness: 300 }).start();
  };

  return (
    <AnimatedPressable
      style={[s.card, { transform: [{ scale }] }]}
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
    >
      <View style={s.cardTop}>
        <View style={[s.transportBadge, { backgroundColor: tc.color + '1A' }]}>
          <Ionicons name={tc.icon as any} size={14} color={tc.color} />
          <Text style={[s.transportLabel, { color: tc.color }]}>{tc.label}</Text>
        </View>
        <View style={[s.statusBadge, { backgroundColor: COLORS.accent.warning + '1A' }]}>
          <View style={[s.statusDot, { backgroundColor: COLORS.accent.warning }]} />
          <Text style={[s.statusText, { color: COLORS.accent.warning }]}>Pendiente</Text>
        </View>
      </View>

      <View style={s.routeRow}>
        <Text style={s.cityText} numberOfLines={1}>{item.origin}</Text>
        <View style={s.routeArrow}>
          <View style={[s.routeLine, { backgroundColor: tc.color + '44' }]} />
          <Ionicons name="airplane" size={12} color={tc.color} />
          <View style={[s.routeLine, { backgroundColor: tc.color + '44' }]} />
        </View>
        <Text style={s.cityText} numberOfLines={1}>{item.destination}</Text>
      </View>

      <View style={s.infoRow}>
        <View style={s.infoItem}>
          <Ionicons name="people-outline" size={13} color={COLORS.text.muted} />
          <Text style={s.infoText}>{passengerCount} pasajero{passengerCount !== 1 ? 's' : ''}</Text>
        </View>
        <View style={s.infoItem}>
          <Ionicons name="calendar-outline" size={13} color={COLORS.text.muted} />
          <Text style={s.infoText}>{formatDate(item.travel_date)}</Text>
        </View>
        <View style={s.infoItem}>
          <Ionicons name="call-outline" size={13} color={COLORS.text.muted} />
          <Text style={s.infoText}>{item.phone}</Text>
        </View>
      </View>

      <View style={s.cardBottom}>
        <View style={s.totalSection}>
          <Text style={s.totalLabel}>Total a pagar</Text>
          <Text style={[s.totalAmount, { color: COLORS.accent.success }]}>
            {formatCurrency(item.total)} CUP
          </Text>
        </View>

        <View style={s.actionsGroup}>
          <TouchableOpacity style={s.actionBtn} onPress={onEdit}>
            <Ionicons name="pencil" size={16} color={COLORS.accent.primary} />
          </TouchableOpacity>

          <TouchableOpacity style={[s.actionBtn, s.whatsappBtn]} onPress={onWhatsApp}>
            <Ionicons name="logo-whatsapp" size={18} color="#25D366" />
          </TouchableOpacity>

          <TouchableOpacity style={[s.actionBtn, s.deleteBtn]} onPress={onDelete}>
            <Ionicons name="trash-outline" size={16} color={COLORS.accent.danger} />
          </TouchableOpacity>
        </View>
      </View>
    </AnimatedPressable>
  );
}

export default function ReservationsScreen() {
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const toast = useGlobalToast();

  const load = useCallback(async (isRefresh = false) => {
    try {
      if (isRefresh) setRefreshing(true);
      else setLoading(true);
      // Solo carga los pedidos pendientes — los reservados van a /clients
      const data = await reservationsRepository.getPending();
      setReservations(data);
    } catch {
      Alert.alert('Error', 'No se pudieron cargar los pedidos');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const filteredReservations = useMemo(() => {
    if (!search.trim()) return reservations;
    const lower = search.toLowerCase();
    return reservations.filter(r =>
      r.origin.toLowerCase().includes(lower) ||
      r.destination.toLowerCase().includes(lower) ||
      r.phone.includes(lower) ||
      r.passengers?.some(p => p.full_name.toLowerCase().includes(lower))
    );
  }, [reservations, search]);

  const handleDelete = (r: Reservation) => {
    Alert.alert('Eliminar pedido', `¿Eliminar el pedido #${r.id}?`, [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Eliminar', style: 'destructive',
        onPress: async () => {
          await reservationsRepository.delete(r.id);
          toast.show({ message: 'Pedido eliminado', type: 'success' });
          load();
        }
      },
    ]);
  };

  const handleWhatsApp = (item: Reservation) => {
    const tc = TRANSPORT_CONFIG[item.transport];
    const passengerList = (item.passengers ?? []).map((p, i) =>
      `  ${i + 1}. ${p.full_name} (CI: ${p.identity_card})`
    ).join('\n');
    const passengerCount = item.passengers?.length ?? 0;
    const totalCost = item.route_price * passengerCount;
    const isFullAdvance = item.advance >= totalCost;
    const pendingAmount = Math.max(0, totalCost - item.advance);

    // Línea de método de pago
    let paymentLine = '';
    if (item.payment_method) {
      const bankLabel = BANK_CONFIG[item.payment_method as keyof typeof BANK_CONFIG]?.label ?? item.payment_method;

      if (item.payment_method === 'mitransfer') {
        paymentLine = `📲 *Pago:* MiTransfer — ${item.payment_confirm_number}`;
      } else {
        const cardPart = (item.payment_card_number && !isFullAdvance)
          ? `Tarjeta: \`${item.payment_card_number}\``
          : bankLabel;

        paymentLine = isFullAdvance
          ? `💳 *Pago:* ${bankLabel}`
          : `💳 *Pago:* ${bankLabel}\n${cardPart}\nConfirmar al: ${item.payment_confirm_number}`;
      }
    }

    const travelParts = getSafeDateParts(item.travel_date);
    const resParts = getSafeDateParts(item.reservation_date);

    const msg = [
      `🧳 *Resumen de su pedido*`,
      ``,
      `🚌 *Transporte:* ${tc.label}`,
      `📍 *Ruta:* ${item.origin} → ${item.destination}`,
      `📋 *Fecha de reserva:* ${resParts.d}/${resParts.m}/${resParts.y}`,
      `📅 *Fecha de viaje:* ${travelParts.d}/${travelParts.m}/${travelParts.y}`,
      ``,
      `👥 *Pasajeros (${passengerCount}):*`,
      passengerList,
      ``,
      `💰 *Costo Total:* ${formatCurrency(totalCost)} CUP`,
      item.advance > 0 ? `✅ *Anticipo:* ${formatCurrency(item.advance)} CUP` : '',
      isFullAdvance
        ? `🎊 *¡Pago completo realizado!*`
        : `⚠️ *Pendiente a pagar:* ${formatCurrency(pendingAmount)} CUP`,
      !isFullAdvance ? paymentLine : '',
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
          <Text style={s.title}>Pedidos</Text>
          <Text style={s.subtitle}>{reservations.length} pedido{reservations.length !== 1 ? 's' : ''} pendiente{reservations.length !== 1 ? 's' : ''}</Text>
        </View>
        <TouchableOpacity
          style={s.addBtn}
          onPress={() => router.push('/reservations/add' as any)}
        >
          <Ionicons name="add" size={22} color="#fff" />
        </TouchableOpacity>
      </View>

      {/* Barra de búsqueda */}
      {reservations.length > 0 && (
        <View style={s.searchContainer}>
          <View style={s.searchBar}>
            <Ionicons name="search" size={20} color={COLORS.text.muted} />
            <TextInput
              style={s.searchInput}
              placeholder="Buscar nombre, teléfono o ruta..."
              placeholderTextColor={COLORS.text.muted}
              value={search}
              onChangeText={setSearch}
            />
            {search.length > 0 && (
              <TouchableOpacity onPress={() => setSearch('')}>
                <Ionicons name="close-circle" size={20} color={COLORS.text.muted} />
              </TouchableOpacity>
            )}
          </View>
        </View>
      )}

      {loading ? (
        <View style={s.list}>
          {[1, 2, 3, 4, 5].map(key => (
            <Skeleton key={key} height={110} borderRadius={RADIUS.xl} style={{ marginBottom: SPACING.md }} />
          ))}
        </View>
      ) : reservations.length === 0 ? (
        <View style={s.centered}>
          <View style={s.emptyIcon}>
            <Ionicons name="calendar-outline" size={48} color={COLORS.accent.primary} />
          </View>
          <Text style={s.emptyTitle}>Sin pedidos pendientes</Text>
          <Text style={s.emptyText}>Añade el primer pedido tocando el botón + o revisa la sección Reservas</Text>
          <TouchableOpacity style={s.emptyBtn} onPress={() => router.push('/reservations/add' as any)}>
            <Ionicons name="add" size={18} color="#fff" />
            <Text style={s.emptyBtnText}>Nuevo pedido</Text>
          </TouchableOpacity>
        </View>
      ) : filteredReservations.length === 0 ? (
        <View style={s.centered}>
          <View style={s.emptyIcon}>
            <Ionicons name="search" size={48} color={COLORS.accent.primary} />
          </View>
          <Text style={s.emptyTitle}>No hay resultados</Text>
          <Text style={s.emptyText}>No se encontraron pedidos que coincidan con "{search}"</Text>
        </View>
      ) : (
        <FlatList
          data={filteredReservations}
          keyExtractor={(item) => item.id.toString()}
          contentContainerStyle={s.list}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={() => load(true)} tintColor={COLORS.accent.primary} />
          }
          renderItem={({ item }) => (
            <ReservationCard
              item={item}
              onPress={() => router.push({ pathname: '/reservations/detail', params: { id: item.id.toString() } } as any)}
              onEdit={() => router.push({ pathname: '/reservations/add', params: { editId: item.id.toString() } } as any)}
              onWhatsApp={() => handleWhatsApp(item)}
              onDelete={() => handleDelete(item)}
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
  addBtn: { width: 44, height: 44, borderRadius: RADIUS.full, backgroundColor: COLORS.accent.primary, justifyContent: 'center', alignItems: 'center' },
  searchContainer: { paddingHorizontal: SPACING.lg, paddingBottom: SPACING.sm },
  searchBar: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm, backgroundColor: COLORS.bg.card, borderRadius: RADIUS.lg, borderWidth: 1, borderColor: COLORS.border.default, paddingHorizontal: SPACING.md, paddingVertical: SPACING.xs },
  searchInput: { flex: 1, fontSize: FONT.sizes.md, color: COLORS.text.primary, paddingVertical: 8 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: SPACING.md, padding: SPACING.xl },
  emptyIcon: { width: 96, height: 96, borderRadius: RADIUS.xl, backgroundColor: COLORS.accent.primary + '1A', justifyContent: 'center', alignItems: 'center' },
  emptyTitle: { fontSize: FONT.sizes.xl, color: COLORS.text.primary, fontWeight: FONT.weights.bold },
  emptyText: { fontSize: FONT.sizes.md, color: COLORS.text.secondary, textAlign: 'center', lineHeight: 22 },
  emptyBtn: { flexDirection: 'row', alignItems: 'center', gap: SPACING.xs, paddingHorizontal: SPACING.lg, paddingVertical: SPACING.sm + 2, borderRadius: RADIUS.full, backgroundColor: COLORS.accent.primary, marginTop: SPACING.sm },
  emptyBtnText: { color: '#fff', fontWeight: FONT.weights.semibold, fontSize: FONT.sizes.md },
  list: { padding: SPACING.lg, gap: SPACING.md },
  card: { backgroundColor: COLORS.bg.card, borderRadius: RADIUS.xl, padding: SPACING.lg, borderWidth: 1, borderColor: COLORS.border.default, gap: SPACING.md },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  transportBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: SPACING.sm, paddingVertical: 4, borderRadius: RADIUS.full },
  transportLabel: { fontSize: FONT.sizes.xs, fontWeight: FONT.weights.semibold },
  statusBadge: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: SPACING.sm, paddingVertical: 4, borderRadius: RADIUS.full },
  statusDot: { width: 6, height: 6, borderRadius: 3 },
  statusText: { fontSize: FONT.sizes.xs, fontWeight: FONT.weights.medium },
  routeRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm },
  cityText: { fontSize: FONT.sizes.md, color: COLORS.text.primary, fontWeight: FONT.weights.bold, flex: 1 },
  routeArrow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  routeLine: { width: 20, height: 1 },
  infoRow: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.sm },
  infoItem: { flexDirection: 'row', alignItems: 'center', gap: 4, flexShrink: 1 },
  infoText: { fontSize: FONT.sizes.xs, color: COLORS.text.muted, flexShrink: 1 },
  cardBottom: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: SPACING.sm,
    borderTopWidth: 1,
    borderTopColor: COLORS.border.default,
  },
  totalSection: { flex: 1 },
  totalLabel: { fontSize: FONT.sizes.xs, color: COLORS.text.muted },
  totalAmount: { fontSize: FONT.sizes.lg, fontWeight: FONT.weights.extrabold },
  actionsGroup: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm },
  actionBtn: {
    width: 36, height: 36, borderRadius: RADIUS.full,
    backgroundColor: COLORS.accent.primary + '1A',
    borderWidth: 1, borderColor: COLORS.accent.primary + '55',
    justifyContent: 'center', alignItems: 'center',
  },
  whatsappBtn: { backgroundColor: '#25D36622', borderColor: '#25D36655' },
  deleteBtn: { backgroundColor: COLORS.accent.danger + '1A', borderColor: COLORS.accent.danger + '55' },
});