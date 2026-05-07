import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
  Alert, ActivityIndicator, KeyboardAvoidingView, Platform,
  Modal, FlatList, TextInput, Keyboard, LayoutAnimation, UIManager
} from 'react-native';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import DateTimePickerModal from 'react-native-modal-datetime-picker';
import { COLORS, SPACING, FONT, RADIUS, TRANSPORT_CONFIG } from '@/constants/theme';
import { getProvincesForTransport } from '@/constants/provinces';
import { routesRepository } from '@/database/routesRepository';
import { reservationsRepository } from '@/database/reservationsRepository';
import { getDatabase } from '@/database/db';
import { Route, TransportType, Passenger } from '@/types';
import PaymentMethodSelector, { PaymentSelection } from '@/components/PaymentMethodSelector';
import { BANK_CONFIG, userProfileService } from '@/services/userProfileService';
import { useGlobalToast } from '@/components/ui/Toast';
import AnimatedSwitch from '@/components/ui/AnimatedSwitch';

// ── Modal selector genérico ─────────────────────────────────────────────────
function ListSelectorModal<T>({ visible, title, subtitle, items, selected, renderItem, keyExtractor, onClose, searchable, searchExtract }: {
  visible: boolean; title: string; subtitle?: string;
  items: T[]; selected?: string; keyExtractor: (item: T) => string;
  renderItem: (item: T, isSelected: boolean, onPress: () => void) => React.ReactElement;
  onClose: () => void;
  searchable?: boolean;
  searchExtract?: (item: T) => string;
}) {
  const [search, setSearch] = useState('');

  useEffect(() => {
    if (!visible) setSearch('');
  }, [visible]);

  const filteredItems = React.useMemo(() => {
    if (!searchable || !search.trim() || !searchExtract) return items;
    const lower = search.toLowerCase();
    return items.filter(item => searchExtract(item).toLowerCase().includes(lower));
  }, [items, search, searchable, searchExtract]);
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={ms.overlay}>
        <View style={ms.sheet}>
          <View style={ms.handle} />
          <View style={ms.header}>
            <View>
              <Text style={ms.title}>{title}</Text>
              {subtitle && <Text style={ms.subtitle}>{subtitle}</Text>}
            </View>
            <TouchableOpacity style={ms.closeBtn} onPress={onClose}>
              <Ionicons name="close" size={20} color={COLORS.text.secondary} />
            </TouchableOpacity>
          </View>
          {searchable && (
            <View style={ms.searchContainer}>
              <Ionicons name="search" size={18} color={COLORS.text.muted} />
              <TextInput
                style={ms.searchInput}
                placeholder="Buscar..."
                placeholderTextColor={COLORS.text.muted}
                value={search}
                onChangeText={setSearch}
              />
              {search.length > 0 && (
                <TouchableOpacity onPress={() => setSearch('')}>
                  <Ionicons name="close-circle" size={18} color={COLORS.text.muted} />
                </TouchableOpacity>
              )}
            </View>
          )}
          <FlatList
            data={filteredItems}
            keyExtractor={keyExtractor}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={ms.list}
            renderItem={({ item }) => {
              const isSel = keyExtractor(item) === selected;
              return renderItem(item, isSel, () => onClose());
            }}
          />
        </View>
      </View>
    </Modal>
  );
}

const ms = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.65)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: COLORS.bg.secondary, borderTopLeftRadius: 28, borderTopRightRadius: 28, paddingBottom: 40, maxHeight: '85%' },
  handle: { width: 40, height: 4, backgroundColor: COLORS.border.default, borderRadius: 2, alignSelf: 'center', marginTop: 12, marginBottom: 8 },
  header: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', paddingHorizontal: SPACING.lg, paddingVertical: SPACING.md },
  title: { fontSize: FONT.sizes.lg, color: COLORS.text.primary, fontWeight: FONT.weights.bold },
  subtitle: { fontSize: FONT.sizes.sm, color: COLORS.text.muted, marginTop: 2 },
  closeBtn: { width: 36, height: 36, borderRadius: RADIUS.full, backgroundColor: COLORS.bg.elevated, justifyContent: 'center', alignItems: 'center' },
  searchContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.bg.elevated, marginHorizontal: SPACING.lg, marginBottom: SPACING.md, borderRadius: RADIUS.lg, paddingHorizontal: SPACING.md, paddingVertical: SPACING.xs, gap: SPACING.sm },
  searchInput: { flex: 1, color: COLORS.text.primary, fontSize: FONT.sizes.md, paddingVertical: 8 },
  list: { paddingHorizontal: SPACING.lg, paddingBottom: SPACING.lg, gap: SPACING.xs },
});

// ── Tarjeta de pasajero ─────────────────────────────────────────────────────
function PassengerCard({ index, passenger, color, onChange, onRemove, canRemove }: {
  index: number; passenger: Passenger; color: string;
  onChange: (field: keyof Passenger, value: string) => void;
  onRemove: () => void; canRemove: boolean;
}) {
  return (
    <View style={[pc.card, { borderColor: color + '33' }]}>
      <View style={pc.cardHeader}>
        <View style={[pc.badge, { backgroundColor: color + '22' }]}>
          <Ionicons name="person" size={14} color={color} />
          <Text style={[pc.badgeText, { color }]}>Pasajero {index + 1}</Text>
        </View>
        {canRemove && (
          <TouchableOpacity style={pc.removeBtn} onPress={onRemove}>
            <Ionicons name="close" size={16} color={COLORS.accent.danger} />
          </TouchableOpacity>
        )}
      </View>
      <View style={pc.field}>
        <Text style={pc.label}>Nombre completo</Text>
        <TextInput
          style={pc.input}
          placeholder="Ej: Juan Carlos Pérez López"
          placeholderTextColor={COLORS.text.muted}
          value={passenger.full_name}
          onChangeText={(v) => onChange('full_name', v)}
          autoCapitalize="words"
        />
      </View>
      <View style={pc.field}>
        <Text style={pc.label}>Carnet de identidad</Text>
        <TextInput
          style={pc.input}
          placeholder="11 dígitos"
          placeholderTextColor={COLORS.text.muted}
          value={passenger.identity_card}
          onChangeText={(v) => onChange('identity_card', v.replace(/\D/g, '').slice(0, 11))}
          keyboardType="numeric"
          maxLength={11}
        />
        {passenger.identity_card.length > 0 && passenger.identity_card.length < 11 && (
          <Text style={pc.hint}>{11 - passenger.identity_card.length} dígitos restantes</Text>
        )}
      </View>
    </View>
  );
}

const pc = StyleSheet.create({
  card: { backgroundColor: COLORS.bg.elevated, borderRadius: RADIUS.lg, padding: SPACING.md, borderWidth: 1, gap: SPACING.md },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  badge: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: SPACING.sm, paddingVertical: 4, borderRadius: RADIUS.full },
  badgeText: { fontSize: FONT.sizes.xs, fontWeight: FONT.weights.semibold },
  removeBtn: { width: 28, height: 28, borderRadius: RADIUS.full, backgroundColor: COLORS.accent.danger + '1A', justifyContent: 'center', alignItems: 'center' },
  field: { gap: 6 },
  label: { fontSize: FONT.sizes.xs, color: COLORS.text.secondary, fontWeight: FONT.weights.semibold },
  input: { backgroundColor: COLORS.bg.input, borderRadius: RADIUS.md, borderWidth: 1, borderColor: COLORS.border.default, paddingHorizontal: SPACING.md, paddingVertical: SPACING.sm + 2, fontSize: FONT.sizes.md, color: COLORS.text.primary },
  hint: { fontSize: FONT.sizes.xs, color: COLORS.accent.warning },
});

// ── Helpers de fecha ────────────────────────────────────────────────────────
function formatDateDisplay(date: Date): string {
  const d = date.getDate().toString().padStart(2, '0');
  const m = (date.getMonth() + 1).toString().padStart(2, '0');
  const y = date.getFullYear();
  return `${d}/${m}/${y}`;
}

function formatDateISO(date: Date): string {
  const d = date.getDate().toString().padStart(2, '0');
  const m = (date.getMonth() + 1).toString().padStart(2, '0');
  const y = date.getFullYear();
  return `${y}-${m}-${d}`;
}

function isoToDate(iso: string): Date {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d);
}

// ── Sección header ──────────────────────────────────────────────────────────
function SectionHeader({ icon, label, color }: { icon: string; label: string; color: string }) {
  return (
    <View style={sh.row}>
      <View style={[sh.icon, { backgroundColor: color + '1A' }]}>
        <Ionicons name={icon as any} size={14} color={color} />
      </View>
      <Text style={sh.label}>{label}</Text>
      <View style={sh.line} />
    </View>
  );
}

const sh = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm, marginTop: SPACING.sm },
  icon: { width: 28, height: 28, borderRadius: RADIUS.full, justifyContent: 'center', alignItems: 'center' },
  label: { fontSize: FONT.sizes.sm, color: COLORS.text.secondary, fontWeight: FONT.weights.semibold, textTransform: 'uppercase', letterSpacing: 0.8 },
  line: { flex: 1, height: 1, backgroundColor: COLORS.border.default },
});

// ── Pantalla principal ──────────────────────────────────────────────────────
export default function AddReservationScreen() {
  const { editId } = useLocalSearchParams<{ editId?: string }>();
  const isEditing = !!editId;
  const toast = useGlobalToast();

  const scrollViewRef = useRef<ScrollView>(null);

  const [phone, setPhone] = useState('');
  const [transport, setTransport] = useState<TransportType | ''>('');
  const [origin, setOrigin] = useState('');
  const [destination, setDestination] = useState('');
  const [travelDate, setTravelDate] = useState<Date | null>(null);
  const [reservationDate, setReservationDate] = useState<Date | null>(null);
  const [passengers, setPassengers] = useState<Passenger[]>([{ full_name: '', identity_card: '' }]);
  const [advanceEnabled, setAdvanceEnabled] = useState(false);
  const [advance, setAdvance] = useState('');
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isReserved, setIsReserved] = useState(false);

  // ── Campos de gestor ──
  const [isGestor, setIsGestor] = useState<boolean | null>(null);
  const [gestorCost, setGestorCost] = useState('');

  // ── Método de pago ──
  const [paymentSelection, setPaymentSelection] = useState<PaymentSelection | null>(null);
  const [showPaymentSelector, setShowPaymentSelector] = useState(false);

  const [routes, setRoutes] = useState<Route[]>([]);
  const [availableRoutes, setAvailableRoutes] = useState<Route[]>([]);
  const [selectedRoute, setSelectedRoute] = useState<Route | null>(null);

  const [showTransportModal, setShowTransportModal] = useState(false);
  const [showOriginModal, setShowOriginModal] = useState(false);
  const [showDestModal, setShowDestModal] = useState(false);
  const [showTravelPicker, setShowTravelPicker] = useState(false);
  const [showReservationPicker, setShowReservationPicker] = useState(false);

  useEffect(() => {
    routesRepository.getAll().then(setRoutes);
  }, []);

  useEffect(() => {
    if (isEditing) {
      reservationsRepository.getById(Number(editId)).then((r) => {
        if (!r) return;
        setPhone(r.phone);
        setTransport(r.transport);
        setOrigin(r.origin);
        setDestination(r.destination);
        setTravelDate(isoToDate(r.travel_date));
        setReservationDate(isoToDate(r.reservation_date));
        setPassengers(r.passengers ?? [{ full_name: '', identity_card: '' }]);
        if (r.advance > 0) {
          setAdvanceEnabled(true);
          setAdvance(r.advance.toString());
        }
        const wasReserved = r.status === 'Reservado';
        setIsReserved(wasReserved);
        if (wasReserved) {
          setIsGestor(r.is_gestor === 1);
          if (r.is_gestor === 1) {
            setGestorCost(r.gestor_cost_per_passenger.toString());
          }
        }
        // Cargar método de pago si existe
        if (r.payment_method) {
          // Reconstruimos la selección mínima para mostrar el badge
          userProfileService.get().then((profile: any) => {
            const card = profile.cards.find((c: any) => c.bank === r.payment_method);
            if (card) {
              setPaymentSelection({ card, confirmNumber: r.payment_confirm_number });
            }
          });
        }
      });
    }
  }, [editId]);

  useEffect(() => {
    if (transport) {
      const filtered = routes.filter((r) => r.transport === transport);
      setAvailableRoutes(filtered);
      if (!isEditing) {
        setOrigin('');
        setDestination('');
        setSelectedRoute(null);
      }
    }
  }, [transport, routes]);

  useEffect(() => {
    if (origin && destination && transport) {
      const route =
        routes.find((r) => r.transport === transport && r.origin === origin && r.destination === destination) ??
        routes.find((r) => r.transport === transport && r.origin === destination && r.destination === origin);
      setSelectedRoute(route ?? null);
    } else {
      setSelectedRoute(null);
    }
  }, [origin, destination, transport, routes]);

  // Cuando se desactiva "Reservado", limpiamos estado gestor
  const handleToggleReserved = (newVal: boolean) => {
    setIsReserved(newVal);
    if (!newVal) {
      setIsGestor(null);
      setGestorCost('');
    }
  };

  const availableOrigins = [...new Set(availableRoutes.map((r) => r.origin).concat(availableRoutes.map((r) => r.destination)))];
  const availableDestinations = [...new Set(
    availableRoutes
      .filter((r) => r.origin === origin || r.destination === origin)
      .map((r) => r.origin === origin ? r.destination : r.origin)
  )];

  const routePrice = selectedRoute?.price ?? 0;
  const appPrice = selectedRoute?.app_price ?? 0;
  const passengerCount = passengers.length;
  const advanceNum = advanceEnabled ? (parseFloat(advance) || 0) : 0;
  const subtotal = routePrice * passengerCount;
  const total = Math.max(0, subtotal - advanceNum);

  // Cálculo de ganancia preview (solo cuando está reservado)
  const gestorCostNum = parseFloat(gestorCost) || 0;
  const costPerPassenger = isGestor ? gestorCostNum : appPrice;
  const totalCost = costPerPassenger * passengerCount;
  const gananciaPreview = subtotal - totalCost;

  const swapOriginDestination = () => {
    const temp = origin;
    setOrigin(destination);
    setDestination(temp);
  };

  const addPassenger = () => {
    if (passengers.length < 20) setPassengers([...passengers, { full_name: '', identity_card: '' }]);
  };

  const removePassenger = (index: number) => {
    setPassengers(passengers.filter((_, i) => i !== index));
  };

  const updatePassenger = (index: number, field: keyof Passenger, value: string) => {
    const updated = [...passengers];
    updated[index] = { ...updated[index], [field]: value };
    setPassengers(updated);
  };

  const validate = (): boolean => {
    const e: Record<string, string> = {};
    if (!phone.trim() || phone.replace(/\D/g, '').length < 8) e.phone = 'Teléfono inválido';
    if (!transport) e.transport = 'Selecciona un medio de transporte';
    if (!origin) e.origin = 'Selecciona el origen';
    if (!destination) e.destination = 'Selecciona el destino';
    if (!selectedRoute) e.route = 'No existe ruta para este trayecto';
    if (!travelDate) e.travelDate = 'Selecciona la fecha de viaje';
    if (!reservationDate) e.reservationDate = 'Selecciona la fecha de reserva';
    passengers.forEach((p, i) => {
      if (!p.full_name.trim()) e[`p_name_${i}`] = 'Nombre requerido';
      if (p.identity_card.length !== 11) e[`p_ci_${i}`] = 'CI debe tener 11 dígitos';
    });
    // Validar gestor si está marcado como reservado
    if (isReserved) {
      if (isGestor === null) e.gestor = 'Indica si fue comprado por un gestor';
      if (isGestor === true && gestorCostNum <= 0) e.gestorCost = 'Ingresa el costo del gestor por pasajero';
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSave = async () => {
    if (!validate()) {
      Alert.alert('Datos incompletos', 'Por favor revisa los campos marcados.');
      return;
    }
    setLoading(true);
    try {
      const travelISO = formatDateISO(travelDate!);
      const reservationISO = formatDateISO(reservationDate!);
      const finalIsGestor = isReserved ? (isGestor ? 1 : 0) : 0;
      const finalGestorCost = isReserved && isGestor ? gestorCostNum : 0;
      const finalAppCost = appPrice;
      const finalPaymentMethod = paymentSelection?.card.bank ?? '';
      const finalPaymentConfirm = paymentSelection?.confirmNumber ?? '';
      const finalPaymentCardNumber = paymentSelection?.card.cardNumber ?? '';

      if (isEditing) {
        const db = await getDatabase();
        await db.runAsync(
          `UPDATE reservations SET phone=?, transport=?, origin=?, destination=?,
          route_price=?, travel_date=?, reservation_date=?, advance=?, total=?,
          status=?, is_gestor=?, gestor_cost_per_passenger=?, app_cost_per_passenger=?,
          payment_method=?, payment_confirm_number=?, payment_card_number=?,
          updated_at=?
          WHERE id=?`,
          [phone.trim(), transport, origin, destination, routePrice,
          travelISO, reservationISO, advanceNum, total,
          isReserved ? 'Reservado' : 'Pendiente',
          finalIsGestor, finalGestorCost, finalAppCost,
          finalPaymentMethod, finalPaymentConfirm, finalPaymentCardNumber,
          new Date().toISOString(),
          Number(editId)]
        );
        await db.runAsync('DELETE FROM passengers WHERE reservation_id = ?', [Number(editId)]);
        for (const p of passengers) {
          await db.runAsync(
            'INSERT INTO passengers (reservation_id, full_name, identity_card) VALUES (?, ?, ?)',
            [Number(editId), p.full_name, p.identity_card]
          );
        }
      } else {
        await reservationsRepository.create({
          phone: phone.trim(),
          transport: transport as TransportType,
          origin, destination,
          route_price: routePrice,
          travel_date: travelISO,
          reservation_date: reservationISO,
          advance: advanceNum,
          total,
          status: isReserved ? 'Reservado' : 'Pendiente',
          is_gestor: finalIsGestor,
          gestor_cost_per_passenger: finalGestorCost,
          app_cost_per_passenger: finalAppCost,
          payment_method: finalPaymentMethod,
          payment_confirm_number: finalPaymentConfirm,
          payment_card_number: finalPaymentCardNumber,
          passengers,
        });
      }
      toast.show({
        message: isEditing ? 'Cambios guardados' : 'Pedido guardado',
        type: 'success',
      });
      setTimeout(() => router.back(), 800);
    } catch (e) {
      console.error(e);
      toast.show({
        message: 'No se pudo guardar el pedido',
        type: 'error',
      });
    } finally {
      setLoading(false);
    }
  };

  const tc = transport ? TRANSPORT_CONFIG[transport as TransportType] : null;
  const accentColor = tc?.color ?? COLORS.accent.primary;

  return (
    <SafeAreaView style={s.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 24}
      >
        {/* Header */}
        <View style={s.header}>
          <TouchableOpacity style={s.backBtn} onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={20} color={COLORS.text.primary} />
          </TouchableOpacity>
          <View style={{ flex: 1 }}>
            <Text style={s.title}>{isEditing ? 'Editar Pedido' : 'Nuevo Pedido'}</Text>
            <Text style={s.subtitle}>{isEditing ? 'Modifica los datos de la reserva' : 'Completa todos los datos del cliente'}</Text>
          </View>
        </View>

        <ScrollView
          ref={scrollViewRef}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={s.content}
          keyboardShouldPersistTaps="handled"
        >

          {/* ── Contacto ── */}
          <SectionHeader icon="call" label="Contacto" color={accentColor} />
          <View style={s.fieldGroup}>
            <Text style={s.label}>Número de teléfono</Text>
            <View style={[s.inputRow, errors.phone ? s.inputError : null]}>
              <View style={[s.inputIcon, { backgroundColor: accentColor + '1A' }]}>
                <Ionicons name="call" size={16} color={accentColor} />
              </View>
              <TextInput
                style={s.textInput}
                placeholder="Ej: 55123456"
                placeholderTextColor={COLORS.text.muted}
                value={phone}
                onChangeText={(v) => { setPhone(v); setErrors((e) => ({ ...e, phone: '' })); }}
                keyboardType="phone-pad"
              />
            </View>
            {errors.phone ? <Text style={s.error}>{errors.phone}</Text> : null}
          </View>

          {/* ── Transporte ── */}
          <SectionHeader icon="navigate" label="Transporte y Ruta" color={accentColor} />
          <View style={s.fieldGroup}>
            <Text style={s.label}>Medio de transporte</Text>
            <TouchableOpacity style={[s.selector, errors.transport ? s.inputError : null]} onPress={() => setShowTransportModal(true)}>
              {tc ? (
                <View style={[s.inputIcon, { backgroundColor: tc.color + '1A' }]}>
                  <Ionicons name={tc.icon as any} size={16} color={tc.color} />
                </View>
              ) : (
                <View style={[s.inputIcon, { backgroundColor: COLORS.bg.elevated }]}>
                  <Ionicons name="car-outline" size={16} color={COLORS.text.muted} />
                </View>
              )}
              <Text style={[s.selText, !transport && s.placeholder]}>
                {tc ? tc.label : 'Selecciona el transporte'}
              </Text>
              <Ionicons name="chevron-down" size={18} color={COLORS.text.muted} />
            </TouchableOpacity>
            {errors.transport ? <Text style={s.error}>{errors.transport}</Text> : null}
          </View>

          {transport !== '' && (
            <>
              <View style={s.fieldGroup}>
                <Text style={s.label}>Origen</Text>
                <TouchableOpacity
                  style={[s.selector, errors.origin ? s.inputError : null]}
                  onPress={() => availableOrigins.length > 0
                    ? setShowOriginModal(true)
                    : Alert.alert('Sin rutas', `No hay rutas de ${tc?.label} registradas.`)}
                >
                  <View style={[s.inputIcon, { backgroundColor: accentColor + '1A' }]}>
                    <Ionicons name="location" size={16} color={accentColor} />
                  </View>
                  <Text style={[s.selText, !origin && s.placeholder]}>
                    {origin || 'Provincia de origen'}
                  </Text>
                  <Ionicons name="chevron-down" size={18} color={COLORS.text.muted} />
                </TouchableOpacity>
                {errors.origin ? <Text style={s.error}>{errors.origin}</Text> : null}
              </View>

              <View style={s.swapRow}>
                <View style={[s.swapLine, { backgroundColor: accentColor + '33' }]} />
                <TouchableOpacity
                  style={[s.swapBtn, { backgroundColor: accentColor + '22', borderColor: accentColor + '55' }]}
                  onPress={swapOriginDestination}
                  disabled={!origin && !destination}
                >
                  <Ionicons name="swap-vertical" size={18} color={accentColor} />
                </TouchableOpacity>
                <View style={[s.swapLine, { backgroundColor: accentColor + '33' }]} />
              </View>

              <View style={s.fieldGroup}>
                <Text style={s.label}>Destino</Text>
                <TouchableOpacity
                  style={[s.selector, errors.destination ? s.inputError : null]}
                  onPress={() => origin
                    ? setShowDestModal(true)
                    : Alert.alert('Selecciona origen', 'Primero selecciona la provincia de origen')}
                >
                  <View style={[s.inputIcon, { backgroundColor: accentColor + '1A' }]}>
                    <Ionicons name="flag" size={16} color={accentColor} />
                  </View>
                  <Text style={[s.selText, !destination && s.placeholder]}>
                    {destination || 'Provincia de destino'}
                  </Text>
                  <Ionicons name="chevron-down" size={18} color={COLORS.text.muted} />
                </TouchableOpacity>
                {errors.destination ? <Text style={s.error}>{errors.destination}</Text> : null}
              </View>

              {selectedRoute && (
                <View style={[s.routePriceCard, { borderColor: accentColor + '44', backgroundColor: accentColor + '0D' }]}>
                  <Ionicons name="checkmark-circle" size={18} color={accentColor} />
                  <Text style={[s.routePriceText, { color: accentColor }]}>
                    Ruta encontrada — {selectedRoute.price.toFixed(2)} CUP por pasajero
                  </Text>
                </View>
              )}
              {errors.route ? <Text style={s.error}>{errors.route}</Text> : null}
            </>
          )}

          {/* ── Fechas ── */}
          <SectionHeader icon="calendar" label="Fechas" color={accentColor} />

          <View style={s.fieldGroup}>
            <Text style={s.label}>Fecha de reserva</Text>
            <TouchableOpacity
              style={[s.selector, errors.reservationDate ? s.inputError : null]}
              onPress={() => setShowReservationPicker(true)}
            >
              <View style={[s.inputIcon, { backgroundColor: accentColor + '1A' }]}>
                <Ionicons name="calendar" size={16} color={accentColor} />
              </View>
              <Text style={[s.selText, !reservationDate && s.placeholder]}>
                {reservationDate ? formatDateDisplay(reservationDate) : 'Selecciona la fecha de reserva'}
              </Text>
              {reservationDate
                ? <Ionicons name="checkmark-circle" size={18} color={COLORS.accent.success} />
                : <Ionicons name="calendar-outline" size={18} color={COLORS.text.muted} />}
            </TouchableOpacity>
            {errors.reservationDate ? <Text style={s.error}>{errors.reservationDate}</Text> : null}
          </View>

          <View style={s.fieldGroup}>
            <Text style={s.label}>Fecha de viaje</Text>
            <TouchableOpacity
              style={[s.selector, errors.travelDate ? s.inputError : null]}
              onPress={() => setShowTravelPicker(true)}
            >
              <View style={[s.inputIcon, { backgroundColor: accentColor + '1A' }]}>
                <Ionicons name="calendar" size={16} color={accentColor} />
              </View>
              <Text style={[s.selText, !travelDate && s.placeholder]}>
                {travelDate ? formatDateDisplay(travelDate) : 'Selecciona la fecha de viaje'}
              </Text>
              {travelDate
                ? <Ionicons name="checkmark-circle" size={18} color={COLORS.accent.success} />
                : <Ionicons name="calendar-outline" size={18} color={COLORS.text.muted} />}
            </TouchableOpacity>
            {errors.travelDate ? <Text style={s.error}>{errors.travelDate}</Text> : null}
          </View>

          {/* ── Pasajeros ── */}
          <SectionHeader icon="people" label={`Pasajeros (${passengerCount})`} color={accentColor} />
          {passengers.map((p, i) => (
            <PassengerCard
              key={i} index={i} passenger={p} color={accentColor}
              onChange={(f, v) => updatePassenger(i, f, v)}
              onRemove={() => removePassenger(i)}
              canRemove={passengers.length > 1}
            />
          ))}
          <TouchableOpacity style={[s.addPassBtn, { borderColor: accentColor + '55' }]} onPress={addPassenger}>
            <Ionicons name="add-circle-outline" size={20} color={accentColor} />
            <Text style={[s.addPassText, { color: accentColor }]}>Añadir otro pasajero</Text>
          </TouchableOpacity>

          {/* ── Estado de reserva ── */}
          {isEditing && (
            <>
              <SectionHeader icon="checkmark-circle" label="Estado" color={accentColor} />
              <TouchableOpacity
                style={[
                  s.toggleRow,
                  {
                    borderColor: isReserved ? COLORS.accent.success + '88' : COLORS.border.default,
                    backgroundColor: isReserved ? COLORS.accent.success + '0D' : COLORS.bg.input,
                  }
                ]}
                onPress={() => {
                  LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
                  setIsReserved(!isReserved);
                }}
                activeOpacity={0.7}
              >
                <View style={[s.inputIcon, { backgroundColor: isReserved ? COLORS.accent.success + '22' : COLORS.bg.elevated }]}>
                  <Ionicons
                    name={isReserved ? 'checkmark-circle' : 'time-outline'}
                    size={16}
                    color={isReserved ? COLORS.accent.success : COLORS.text.muted}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[s.toggleLabel, { color: isReserved ? COLORS.accent.success : COLORS.text.primary }]}>
                    {isReserved ? 'Reservado' : 'Pedido pendiente'}
                  </Text>
                  <Text style={s.toggleHint}>
                    {isReserved ? 'Este pedido pasará a ser una reserva' : 'Toca para marcar como reservado'}
                  </Text>
                </View>
                <AnimatedSwitch value={isReserved} color={COLORS.accent.success} />
              </TouchableOpacity>

              {/* ── Bloque gestor (aparece cuando isReserved = true) ── */}
              {isReserved && (
                <View style={s.gestorBlock}>
                  {/* Encabezado */}
                  <View style={s.gestorHeader}>
                    <View style={[s.gestorIconWrap, { backgroundColor: COLORS.accent.warning + '1A' }]}>
                      <Ionicons name="person-circle-outline" size={16} color={COLORS.accent.warning} />
                    </View>
                    <Text style={s.gestorTitle}>¿Comprado por un gestor?</Text>
                  </View>
                  {errors.gestor ? <Text style={s.error}>{errors.gestor}</Text> : null}

                  {/* Botones Sí / No */}
                  <View style={s.gestorBtnRow}>
                    <TouchableOpacity
                      style={[
                        s.gestorBtn,
                        isGestor === true && { backgroundColor: COLORS.accent.warning + '22', borderColor: COLORS.accent.warning },
                      ]}
                      onPress={() => { setIsGestor(true); setErrors(e => ({ ...e, gestor: '' })); }}
                    >
                      <Ionicons
                        name={isGestor === true ? 'checkmark-circle' : 'ellipse-outline'}
                        size={18}
                        color={isGestor === true ? COLORS.accent.warning : COLORS.text.muted}
                      />
                      <Text style={[s.gestorBtnText, isGestor === true && { color: COLORS.accent.warning }]}>
                        Sí, por gestor
                      </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[
                        s.gestorBtn,
                        isGestor === false && { backgroundColor: COLORS.accent.primary + '22', borderColor: COLORS.accent.primary },
                      ]}
                      onPress={() => { setIsGestor(false); setGestorCost(''); setErrors(e => ({ ...e, gestor: '', gestorCost: '' })); }}
                    >
                      <Ionicons
                        name={isGestor === false ? 'checkmark-circle' : 'ellipse-outline'}
                        size={18}
                        color={isGestor === false ? COLORS.accent.primary : COLORS.text.muted}
                      />
                      <Text style={[s.gestorBtnText, isGestor === false && { color: COLORS.accent.primary }]}>
                        No, por app
                      </Text>
                    </TouchableOpacity>
                  </View>

                  {/* Campo costo gestor */}
                  {isGestor === true && (
                    <View style={s.fieldGroup}>
                      <Text style={s.label}>Costo pagado al gestor (por pasajero)</Text>
                      <View style={[s.inputRow, errors.gestorCost ? s.inputError : null]}>
                        <View style={[s.inputIcon, { backgroundColor: COLORS.accent.warning + '1A' }]}>
                          <Ionicons name="cash-outline" size={16} color={COLORS.accent.warning} />
                        </View>
                        <TextInput
                          style={s.textInput}
                          placeholder="0.00"
                          placeholderTextColor={COLORS.text.muted}
                          value={gestorCost}
                          onChangeText={(v) => { setGestorCost(v); setErrors(e => ({ ...e, gestorCost: '' })); }}
                          keyboardType="decimal-pad"
                          autoFocus
                        />
                        <View style={[s.cupBadge, { backgroundColor: COLORS.accent.warning }]}>
                          <Text style={s.cupText}>CUP</Text>
                        </View>
                      </View>
                      {errors.gestorCost ? <Text style={s.error}>{errors.gestorCost}</Text> : null}
                    </View>
                  )}

                  {/* Info automática cuando es por app */}
                  {isGestor === false && selectedRoute && (
                    <View style={[s.appCostInfo, { borderColor: COLORS.accent.primary + '44', backgroundColor: COLORS.accent.primary + '0D' }]}>
                      <Ionicons name="phone-portrait-outline" size={16} color={COLORS.accent.primary} />
                      <Text style={[s.appCostText, { color: COLORS.accent.primary }]}>
                        Costo por app: {appPrice.toFixed(2)} CUP/pasajero × {passengerCount} = {(appPrice * passengerCount).toFixed(2)} CUP
                      </Text>
                    </View>
                  )}

                  {/* Preview ganancia */}
                  {isGestor !== null && selectedRoute && (
                    <View style={[s.gananciaPreview, { borderColor: gananciaPreview >= 0 ? COLORS.accent.success + '44' : COLORS.accent.danger + '44' }]}>
                      <View style={s.gananciaRow}>
                        <Text style={s.gananciaLabel}>Ingresos brutos</Text>
                        <Text style={s.gananciaVal}>{subtotal.toFixed(2)} CUP</Text>
                      </View>
                      <View style={s.gananciaRow}>
                        <Text style={s.gananciaLabel}>
                          Costo {isGestor ? '(gestor)' : '(app)'} total
                        </Text>
                        <Text style={[s.gananciaVal, { color: COLORS.accent.danger }]}>
                          -{totalCost.toFixed(2)} CUP
                        </Text>
                      </View>
                      <View style={[s.gananciaDivider, { backgroundColor: gananciaPreview >= 0 ? COLORS.accent.success + '33' : COLORS.accent.danger + '33' }]} />
                      <View style={s.gananciaRow}>
                        <Text style={[s.gananciaLabelBold]}>Ganancia estimada</Text>
                        <Text style={[s.gananciaBig, { color: gananciaPreview >= 0 ? COLORS.accent.success : COLORS.accent.danger }]}>
                          {gananciaPreview >= 0 ? '+' : ''}{gananciaPreview.toFixed(2)} CUP
                        </Text>
                      </View>
                    </View>
                  )}
                </View>
              )}
            </>
          )}

          {/* ── Pago ── */}
          <SectionHeader icon="wallet" label="Pago" color={accentColor} />

          {/* Método de pago */}
          <TouchableOpacity
            style={[
              s.toggleRow,
              {
                borderColor: paymentSelection
                  ? BANK_CONFIG[paymentSelection.card.bank].color + '88'
                  : COLORS.border.default,
                backgroundColor: paymentSelection
                  ? BANK_CONFIG[paymentSelection.card.bank].color + '0D'
                  : COLORS.bg.input,
              },
            ]}
            onPress={() => setShowPaymentSelector(true)}
            activeOpacity={0.7}
          >
            <View style={[
              s.inputIcon,
              {
                backgroundColor: paymentSelection
                  ? BANK_CONFIG[paymentSelection.card.bank].color + '22'
                  : COLORS.bg.elevated,
              },
            ]}>
              <Ionicons
                name={paymentSelection ? BANK_CONFIG[paymentSelection.card.bank].icon as any : 'card-outline'}
                size={16}
                color={paymentSelection ? BANK_CONFIG[paymentSelection.card.bank].color : COLORS.text.muted}
              />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[
                s.toggleLabel,
                { color: paymentSelection ? BANK_CONFIG[paymentSelection.card.bank].color : COLORS.text.primary },
              ]}>
                {paymentSelection ? BANK_CONFIG[paymentSelection.card.bank].label : 'Método de pago'}
              </Text>
              <Text style={s.toggleHint}>
                {paymentSelection
                  ? `Confirmar: ${paymentSelection.confirmNumber}`
                  : 'Opcional — elige una tarjeta configurada'}
              </Text>
            </View>
            {paymentSelection
              ? <TouchableOpacity
                  onPress={(e) => { e.stopPropagation(); setPaymentSelection(null); }}
                  style={{ padding: 4 }}
                >
                  <Ionicons name="close-circle" size={20} color={COLORS.text.muted} />
                </TouchableOpacity>
              : <Ionicons name="chevron-forward" size={18} color={COLORS.text.muted} />
            }
          </TouchableOpacity>

          <TouchableOpacity
            style={[s.toggleRow, { borderColor: advanceEnabled ? accentColor + '55' : COLORS.border.default }]}
            onPress={() => {
              LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
              const nextEnabled = !advanceEnabled;
              setAdvanceEnabled(nextEnabled);
              if (!nextEnabled) {
                setAdvance('');
                Keyboard.dismiss();
              } else {
                // Espera a que el campo se renderice y el teclado aparezca,
                // luego hace scroll hasta el final para que el input quede visible
                setTimeout(() => scrollViewRef.current?.scrollToEnd({ animated: true }), 350);
              }
            }}
            activeOpacity={0.7}
          >
            <View style={[s.inputIcon, { backgroundColor: accentColor + '1A' }]}>
              <Ionicons name="cash-outline" size={16} color={accentColor} />
            </View>
            <Text style={s.toggleLabel}>Anticipo</Text>
            <Text style={s.toggleHint}>Opcional</Text>
            <AnimatedSwitch value={advanceEnabled} color={accentColor} />
          </TouchableOpacity>

          {advanceEnabled && (
            <View style={s.fieldGroup}>
              <View style={[s.inputRow, { marginTop: -SPACING.xs }]}>
                <View style={[s.inputIcon, { backgroundColor: accentColor + '1A' }]}>
                  <Ionicons name="pricetag" size={16} color={accentColor} />
                </View>
                <TextInput
                  style={s.textInput}
                  placeholder="Monto del anticipo"
                  placeholderTextColor={COLORS.text.muted}
                  value={advance}
                  onChangeText={setAdvance}
                  keyboardType="decimal-pad"
                  autoFocus
                />
                <View style={[s.cupBadge, { backgroundColor: accentColor }]}>
                  <Text style={s.cupText}>CUP</Text>
                </View>
              </View>
            </View>
          )}

          {selectedRoute && (
            <View style={[s.summaryCard, { borderColor: accentColor + '33' }]}>
              <Text style={s.summaryTitle}>Resumen de pago</Text>
              <View style={s.summaryRow}>
                <Text style={s.summaryLabel}>Precio por pasajero</Text>
                <Text style={s.summaryVal}>{routePrice.toFixed(2)} CUP</Text>
              </View>
              <View style={s.summaryRow}>
                <Text style={s.summaryLabel}>× {passengerCount} pasajero{passengerCount !== 1 ? 's' : ''}</Text>
                <Text style={s.summaryVal}>{subtotal.toFixed(2)} CUP</Text>
              </View>
              {advanceEnabled && advanceNum > 0 && (
                <View style={s.summaryRow}>
                  <Text style={s.summaryLabel}>− Anticipo</Text>
                  <Text style={[s.summaryVal, { color: COLORS.accent.success }]}>−{advanceNum.toFixed(2)} CUP</Text>
                </View>
              )}
              <View style={[s.summaryDivider, { backgroundColor: accentColor + '33' }]} />
              <View style={s.summaryRow}>
                <Text style={s.summaryTotalLabel}>Total a pagar</Text>
                <Text style={[s.summaryTotal, { color: accentColor }]}>{total.toFixed(2)} CUP</Text>
              </View>
            </View>
          )}

        </ScrollView>

        {/* Guardar */}
        <View style={s.footer}>
          <TouchableOpacity
            style={[s.saveBtn, { backgroundColor: accentColor }, loading && s.btnDisabled]}
            onPress={handleSave}
            disabled={loading}
          >
            {loading ? <ActivityIndicator color="#fff" /> : (
              <>
                <Ionicons name="checkmark" size={20} color="#fff" />
                <Text style={s.saveBtnText}>{isEditing ? 'Guardar cambios' : 'Guardar pedido'}</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>

      <DateTimePickerModal
        isVisible={showTravelPicker}
        mode="date"
        onConfirm={(date) => { setTravelDate(date); setShowTravelPicker(false); setErrors((e) => ({ ...e, travelDate: '' })); }}
        onCancel={() => setShowTravelPicker(false)}
        date={travelDate ?? new Date()}
        minimumDate={new Date()}
        locale="es_ES"
        confirmTextIOS="Confirmar"
        cancelTextIOS="Cancelar"
      />
      <DateTimePickerModal
        isVisible={showReservationPicker}
        mode="date"
        onConfirm={(date) => { setReservationDate(date); setShowReservationPicker(false); setErrors((e) => ({ ...e, reservationDate: '' })); }}
        onCancel={() => setShowReservationPicker(false)}
        date={reservationDate ?? new Date()}
        locale="es_ES"
        confirmTextIOS="Confirmar"
        cancelTextIOS="Cancelar"
      />

      {/* Modal transporte */}
      <ListSelectorModal
        visible={showTransportModal}
        title="Medio de transporte"
        subtitle="Solo muestra transportes con rutas registradas"
        items={Object.values(TRANSPORT_CONFIG).filter((t) => routes.some((r) => r.transport === t.key))}
        selected={transport}
        keyExtractor={(t) => t.key}
        onClose={() => setShowTransportModal(false)}
        renderItem={(item, isSel, close) => (
          <TouchableOpacity
            key={item.key}
            style={{ flexDirection: 'row', alignItems: 'center', gap: SPACING.md, padding: SPACING.md, borderRadius: RADIUS.lg, borderWidth: 1, borderColor: isSel ? item.color : COLORS.border.default, backgroundColor: isSel ? item.color + '1A' : COLORS.bg.card, marginBottom: SPACING.xs }}
            onPress={() => { setTransport(item.key); setErrors((e) => ({ ...e, transport: '' })); close(); }}
          >
            <View style={{ width: 44, height: 44, borderRadius: RADIUS.lg, backgroundColor: item.color + '22', justifyContent: 'center', alignItems: 'center' }}>
              <Ionicons name={item.icon as any} size={22} color={item.color} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: FONT.sizes.md, color: isSel ? item.color : COLORS.text.primary, fontWeight: FONT.weights.semibold }}>{item.label}</Text>
              <Text style={{ fontSize: FONT.sizes.xs, color: COLORS.text.muted }}>{routes.filter((r) => r.transport === item.key).length} rutas disponibles</Text>
            </View>
            {isSel && <Ionicons name="checkmark-circle" size={22} color={item.color} />}
          </TouchableOpacity>
        )}
      />

      <ListSelectorModal
        visible={showOriginModal}
        title="Provincia de Origen"
        items={availableOrigins}
        selected={origin}
        keyExtractor={(p) => p}
        searchable={true}
        searchExtract={(p) => p}
        onClose={() => setShowOriginModal(false)}
        renderItem={(item, isSel, close) => (
          <TouchableOpacity
            style={{ flexDirection: 'row', alignItems: 'center', gap: SPACING.md, padding: SPACING.md, borderRadius: RADIUS.lg, borderWidth: 1, borderColor: isSel ? accentColor : COLORS.border.default, backgroundColor: isSel ? accentColor + '1A' : COLORS.bg.card, marginBottom: SPACING.xs }}
            onPress={() => { setOrigin(item); setDestination(''); setErrors((e) => ({ ...e, origin: '' })); close(); }}
          >
            <View style={{ width: 32, height: 32, borderRadius: RADIUS.full, backgroundColor: isSel ? accentColor : COLORS.bg.elevated, justifyContent: 'center', alignItems: 'center' }}>
              {isSel && <Ionicons name="checkmark" size={14} color="#fff" />}
            </View>
            <Text style={{ flex: 1, fontSize: FONT.sizes.md, color: isSel ? accentColor : COLORS.text.primary, fontWeight: isSel ? FONT.weights.semibold : FONT.weights.regular }}>{item}</Text>
          </TouchableOpacity>
        )}
      />

      <ListSelectorModal
        visible={showDestModal}
        title="Provincia de Destino"
        items={availableDestinations}
        selected={destination}
        keyExtractor={(p) => p}
        searchable={true}
        searchExtract={(p) => p}
        onClose={() => setShowDestModal(false)}
        renderItem={(item, isSel, close) => (
          <TouchableOpacity
            style={{ flexDirection: 'row', alignItems: 'center', gap: SPACING.md, padding: SPACING.md, borderRadius: RADIUS.lg, borderWidth: 1, borderColor: isSel ? accentColor : COLORS.border.default, backgroundColor: isSel ? accentColor + '1A' : COLORS.bg.card, marginBottom: SPACING.xs }}
            onPress={() => { setDestination(item); setErrors((e) => ({ ...e, destination: '' })); close(); }}
          >
            <View style={{ width: 32, height: 32, borderRadius: RADIUS.full, backgroundColor: isSel ? accentColor : COLORS.bg.elevated, justifyContent: 'center', alignItems: 'center' }}>
              {isSel && <Ionicons name="checkmark" size={14} color="#fff" />}
            </View>
            <Text style={{ flex: 1, fontSize: FONT.sizes.md, color: isSel ? accentColor : COLORS.text.primary, fontWeight: isSel ? FONT.weights.semibold : FONT.weights.regular }}>{item}</Text>
          </TouchableOpacity>
        )}
      />
      {/* Selector de método de pago */}
      <PaymentMethodSelector
        visible={showPaymentSelector}
        onSelect={(sel) => setPaymentSelection(sel)}
        onClose={() => setShowPaymentSelector(false)}
      />
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg.primary },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: SPACING.lg, paddingTop: SPACING.md, paddingBottom: SPACING.lg, gap: SPACING.sm },
  backBtn: { width: 40, height: 40, borderRadius: RADIUS.full, backgroundColor: COLORS.bg.card, borderWidth: 1, borderColor: COLORS.border.default, justifyContent: 'center', alignItems: 'center' },
  title: { fontSize: FONT.sizes.xl, color: COLORS.text.primary, fontWeight: FONT.weights.bold },
  subtitle: { fontSize: FONT.sizes.xs, color: COLORS.text.muted, marginTop: 2 },
  content: { paddingHorizontal: SPACING.lg, paddingBottom: SPACING.xl, gap: SPACING.md },
  fieldGroup: { gap: SPACING.xs },
  label: { fontSize: FONT.sizes.sm, color: COLORS.text.secondary, fontWeight: FONT.weights.semibold, marginBottom: 2 },
  inputRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm, backgroundColor: COLORS.bg.input, borderRadius: RADIUS.lg, borderWidth: 1, borderColor: COLORS.border.default, paddingHorizontal: SPACING.md, paddingVertical: SPACING.sm },
  inputError: { borderColor: COLORS.accent.danger },
  inputIcon: { width: 32, height: 32, borderRadius: RADIUS.md, justifyContent: 'center', alignItems: 'center' },
  textInput: { flex: 1, fontSize: FONT.sizes.md, color: COLORS.text.primary, paddingVertical: SPACING.xs },
  selector: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm, backgroundColor: COLORS.bg.input, borderRadius: RADIUS.lg, borderWidth: 1, borderColor: COLORS.border.default, paddingHorizontal: SPACING.md, paddingVertical: SPACING.md },
  selText: { flex: 1, fontSize: FONT.sizes.md, color: COLORS.text.primary },
  placeholder: { color: COLORS.text.muted },
  swapRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm },
  swapLine: { flex: 1, height: 1 },
  swapBtn: { width: 40, height: 40, borderRadius: RADIUS.full, borderWidth: 1.5, justifyContent: 'center', alignItems: 'center' },
  routePriceCard: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm, padding: SPACING.md, borderRadius: RADIUS.lg, borderWidth: 1 },
  routePriceText: { fontSize: FONT.sizes.sm, fontWeight: FONT.weights.semibold, flex: 1 },
  addPassBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: SPACING.sm, padding: SPACING.md, borderRadius: RADIUS.lg, borderWidth: 1.5, borderStyle: 'dashed' },
  addPassText: { fontSize: FONT.sizes.md, fontWeight: FONT.weights.semibold },
  toggleRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm, backgroundColor: COLORS.bg.input, borderRadius: RADIUS.lg, borderWidth: 1, paddingHorizontal: SPACING.md, paddingVertical: SPACING.md },
  toggleLabel: { flex: 1, fontSize: FONT.sizes.md, color: COLORS.text.primary, fontWeight: FONT.weights.medium },
  toggleHint: { fontSize: FONT.sizes.xs, color: COLORS.text.muted },
  toggle: { width: 42, height: 24, borderRadius: 12, justifyContent: 'center' },
  toggleThumb: { width: 20, height: 20, borderRadius: 10, backgroundColor: '#fff' },
  cupBadge: { paddingHorizontal: SPACING.sm, paddingVertical: 4, borderRadius: RADIUS.md },
  cupText: { fontSize: FONT.sizes.xs, color: '#fff', fontWeight: FONT.weights.bold },
  summaryCard: { backgroundColor: COLORS.bg.card, borderRadius: RADIUS.xl, padding: SPACING.lg, borderWidth: 1, gap: SPACING.sm },
  summaryTitle: { fontSize: FONT.sizes.sm, color: COLORS.text.muted, fontWeight: FONT.weights.semibold, textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: SPACING.xs },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  summaryLabel: { fontSize: FONT.sizes.md, color: COLORS.text.secondary },
  summaryVal: { fontSize: FONT.sizes.md, color: COLORS.text.primary, fontWeight: FONT.weights.medium },
  summaryDivider: { height: 1, marginVertical: SPACING.xs },
  summaryTotalLabel: { fontSize: FONT.sizes.md, color: COLORS.text.primary, fontWeight: FONT.weights.bold },
  summaryTotal: { fontSize: FONT.sizes.xl, fontWeight: FONT.weights.extrabold },
  error: { fontSize: FONT.sizes.xs, color: COLORS.accent.danger, marginTop: 2 },
  footer: { padding: SPACING.lg, paddingBottom: SPACING.xl },
  saveBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: SPACING.sm, paddingVertical: SPACING.md, borderRadius: RADIUS.full },
  btnDisabled: { opacity: 0.6 },
  saveBtnText: { color: '#fff', fontSize: FONT.sizes.md, fontWeight: FONT.weights.bold },

  // ── Gestor styles ──
  gestorBlock: { backgroundColor: COLORS.bg.card, borderRadius: RADIUS.xl, padding: SPACING.lg, borderWidth: 1, borderColor: COLORS.accent.warning + '33', gap: SPACING.md },
  gestorHeader: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm },
  gestorIconWrap: { width: 32, height: 32, borderRadius: RADIUS.full, justifyContent: 'center', alignItems: 'center' },
  gestorTitle: { fontSize: FONT.sizes.md, color: COLORS.text.primary, fontWeight: FONT.weights.bold, flex: 1 },
  gestorBtnRow: { flexDirection: 'row', gap: SPACING.sm },
  gestorBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: SPACING.xs, paddingVertical: SPACING.sm + 2, borderRadius: RADIUS.lg, borderWidth: 1.5, borderColor: COLORS.border.default, backgroundColor: COLORS.bg.input },
  gestorBtnText: { fontSize: FONT.sizes.sm, color: COLORS.text.secondary, fontWeight: FONT.weights.semibold },
  appCostInfo: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm, padding: SPACING.md, borderRadius: RADIUS.lg, borderWidth: 1 },
  appCostText: { fontSize: FONT.sizes.sm, fontWeight: FONT.weights.medium, flex: 1 },
  gananciaPreview: { backgroundColor: COLORS.bg.elevated, borderRadius: RADIUS.lg, padding: SPACING.md, borderWidth: 1, gap: SPACING.sm },
  gananciaRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  gananciaLabel: { fontSize: FONT.sizes.sm, color: COLORS.text.secondary },
  gananciaVal: { fontSize: FONT.sizes.sm, color: COLORS.text.primary, fontWeight: FONT.weights.medium },
  gananciaDivider: { height: 1 },
  gananciaLabelBold: { fontSize: FONT.sizes.md, color: COLORS.text.primary, fontWeight: FONT.weights.bold },
  gananciaBig: { fontSize: FONT.sizes.lg, fontWeight: FONT.weights.extrabold },
});