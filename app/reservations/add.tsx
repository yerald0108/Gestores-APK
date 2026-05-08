import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
  Alert, ActivityIndicator, KeyboardAvoidingView, Platform,
  Modal, FlatList, TextInput, Keyboard, LayoutAnimation, UIManager, Animated, PanResponder
} from 'react-native';


import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams, useNavigation } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import DateTimePickerModal from 'react-native-modal-datetime-picker';
import { COLORS, SPACING, FONT, RADIUS, TRANSPORT_CONFIG } from '@/constants/theme';
import { getProvincesForTransport } from '@/constants/provinces';
import { routesRepository } from '@/database/routesRepository';
import { reservationsRepository } from '@/database/reservationsRepository';
import { getDatabase } from '@/database/db';
import { Route, TransportType, Passenger, formatCurrency } from '@/types';
import PaymentMethodSelector, { PaymentSelection } from '@/components/PaymentMethodSelector';
import { BANK_CONFIG, userProfileService } from '@/services/userProfileService';
import { useGlobalToast } from '@/components/ui/Toast';
import AnimatedSwitch from '@/components/ui/AnimatedSwitch';
import { parseISODate, formatISODate } from '@/utils/dateUtils';
import { isValidCubanCI } from '@/utils/validationUtils';

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
  const [show, setShow] = useState(visible);
  const fadeAnim = React.useRef(new Animated.Value(0)).current;
  const slideAnim = React.useRef(new Animated.Value(500)).current;

  // PanResponder para el gesto de deslizar hacia abajo
  const panResponder = React.useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => false,
      onMoveShouldSetPanResponder: (_: any, gestureState: any) => {
        return gestureState.dy > 5;
      },
      onPanResponderMove: (_: any, gestureState: any) => {
        if (gestureState.dy > 0) {
          slideAnim.setValue(gestureState.dy);
        }
      },
      onPanResponderRelease: (_: any, gestureState: any) => {
        if (gestureState.dy > 120 || gestureState.vy > 0.5) {
          closeModal();
        } else {
          Animated.spring(slideAnim, {
            toValue: 0,
            useNativeDriver: true,
            bounciness: 5,
          }).start();
        }
      },
    })
  ).current;

  const closeModal = () => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 0, duration: 250, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 500, duration: 250, useNativeDriver: true }),
    ]).start(() => {
      setShow(false);
      onClose();
    });
  };

  useEffect(() => {
    if (visible) {
      setShow(true);
      Animated.parallel([
        Animated.timing(fadeAnim, { toValue: 1, duration: 300, useNativeDriver: true }),
        Animated.timing(slideAnim, { toValue: 0, duration: 300, useNativeDriver: true }),
      ]).start();
    } else {
      if (show) {
        Animated.parallel([
          Animated.timing(fadeAnim, { toValue: 0, duration: 250, useNativeDriver: true }),
          Animated.timing(slideAnim, { toValue: 500, duration: 250, useNativeDriver: true }),
        ]).start(() => setShow(false));
      }
    }
  }, [visible]);

  useEffect(() => {
    if (!visible) setSearch('');
  }, [visible]);

  const filteredItems = React.useMemo(() => {
    if (!searchable || !search.trim() || !searchExtract) return items;
    const lower = search.toLowerCase();
    return items.filter(item => searchExtract(item).toLowerCase().includes(lower));
  }, [items, search, searchable, searchExtract]);

  if (!show) return null;

  return (
    <Modal visible={show} transparent animationType="none" onRequestClose={onClose}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <Animated.View style={[ms.overlay, { opacity: fadeAnim }]}>
          <TouchableOpacity style={{ flex: 1, width: '100%' }} activeOpacity={1} onPress={closeModal} />
          <Animated.View 
            style={[
              ms.sheet, 
              { transform: [{ translateY: slideAnim }] }
            ]}
          >
            {/* Area de arrastre */}
            <View {...panResponder.panHandlers} style={ms.dragArea}>
              <View style={ms.handle} />
              <View style={ms.header}>
                <View>
                  <Text style={ms.title}>{title}</Text>
                  {subtitle && <Text style={ms.subtitle}>{subtitle}</Text>}
                </View>
                <TouchableOpacity style={ms.closeBtn} onPress={closeModal}>
                  <Ionicons name="close" size={20} color={COLORS.text.secondary} />
                </TouchableOpacity>
              </View>
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
                  autoFocus={false}
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
              keyboardShouldPersistTaps="handled"
              renderItem={({ item }) => {
                const isSel = keyExtractor(item) === selected;
                return renderItem(item, isSel, () => closeModal());
              }}
            />
          </Animated.View>
        </Animated.View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const ms = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: COLORS.bg.secondary, borderTopLeftRadius: 28, borderTopRightRadius: 28, paddingBottom: 40, maxHeight: '85%' },
  dragArea: { width: '100%', paddingTop: 4 },
  handle: { width: 40, height: 4, backgroundColor: COLORS.border.default, borderRadius: 2, alignSelf: 'center', marginTop: 8, marginBottom: 4 },
  header: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', paddingHorizontal: SPACING.lg, paddingTop: SPACING.sm, paddingBottom: SPACING.sm },
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


// ── Sección header ──────────────────────────────────────────────────────────
function SectionHeader({ icon, label, color }: { icon: string; label: string; color: string }) {
  return (
    <View style={sh.row}>
      <View style={[sh.icon, { backgroundColor: color + '1A' }]}>
        <Ionicons name={icon as any} size={14} color={color} />
      </View>
      <Text style={[sh.label, { color }]}>{label}</Text>
      <View style={[sh.line, { backgroundColor: color + '33' }]} />
    </View>
  );
}
const sh = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm, marginVertical: SPACING.xs },
  icon: { width: 28, height: 28, borderRadius: RADIUS.md, justifyContent: 'center', alignItems: 'center' },
  label: { fontSize: FONT.sizes.sm, fontWeight: FONT.weights.bold, textTransform: 'uppercase', letterSpacing: 0.5 },
  line: { flex: 1, height: 1 },
});


export default function AddReservationScreen() {
  const { id: editId } = useLocalSearchParams<{ id: string }>();
  const isEditing = !!editId;
  const toast = useGlobalToast();
  const navigation = useNavigation();

  // ── Estados de formulario ──
  const [phone, setPhone] = useState('');
  const [transport, setTransport] = useState<string>('');
  const [origin, setOrigin] = useState('');
  const [destination, setDestination] = useState('');
  const [travelDate, setTravelDate] = useState<Date | null>(null);
  const [reservationDate, setReservationDate] = useState<Date | null>(new Date());
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

  // ── Estados de UI ──
  const [routes, setRoutes] = useState<Route[]>([]);
  const [availableRoutes, setAvailableRoutes] = useState<Route[]>([]);
  const [selectedRoute, setSelectedRoute] = useState<Route | null>(null);
  const [showTransportModal, setShowTransportModal] = useState(false);
  const [showOriginModal, setShowOriginModal] = useState(false);
  const [showDestModal, setShowDestModal] = useState(false);
  const [showTravelPicker, setShowTravelPicker] = useState(false);
  const [showReservationPicker, setShowReservationPicker] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  useEffect(() => {
    routesRepository.getAll().then(setRoutes);
  }, []);

  const load = useCallback(async () => {
    if (isEditing) {
      setLoading(true);
      const r = await reservationsRepository.getById(Number(editId));
      if (r) {
        setPhone(r.phone);
        setTransport(r.transport);
        setOrigin(r.origin);
        setDestination(r.destination);
        setTravelDate(parseISODate(r.travel_date));
        setReservationDate(parseISODate(r.reservation_date));
        setAdvance(r.advance.toString());
        setAdvanceEnabled(r.advance > 0);
        setPassengers(r.passengers || []);
        setIsReserved(r.status === 'Reservado');
        setIsGestor(r.is_gestor === 1);
        setGestorCost(r.gestor_cost_per_passenger.toString());
        
        if (r.payment_method) {
          userProfileService.get().then((profile: any) => {
            const card = profile.cards.find((c: any) => 
              c.bank === r.payment_method && 
              (r.payment_card_number ? c.cardNumber === r.payment_card_number : true)
            );
            if (card) setPaymentSelection({ card, confirmNumber: r.payment_confirm_number });
          });
        }
      }
      setLoading(false);
      setTimeout(() => setHasUnsavedChanges(false), 500);
    }
  }, [editId, isEditing]);

  useEffect(() => {
    load();
  }, [load]);

  // UX #1: Confirmación de salida con cambios no guardados
  useEffect(() => {
    const unsubscribe = navigation.addListener('beforeRemove', (e) => {
      if (!hasUnsavedChanges) return;
      e.preventDefault();
      Alert.alert(
        'Cambios no guardados',
        'Tienes cambios sin guardar. ¿Estás seguro de que quieres salir?',
        [
          { text: 'Cancelar', style: 'cancel' },
          {
            text: 'Salir sin guardar',
            style: 'destructive',
            onPress: () => navigation.dispatch(e.data.action),
          },
        ]
      );
    });
    return unsubscribe;
  }, [navigation, hasUnsavedChanges]);

  // Detectar cambios para marcar como "sucio"
  useEffect(() => {
    if (!loading) setHasUnsavedChanges(true);
  }, [phone, transport, origin, destination, travelDate, passengers, advance, isReserved, isGestor, gestorCost, paymentSelection]);

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
    let isValid = true;
    if (!phone.trim() || phone.replace(/\D/g, '').length < 8) { e.phone = 'Teléfono inválido'; isValid = false; }
    if (!transport) { e.transport = 'Selecciona un medio de transporte'; isValid = false; }
    if (!origin) { e.origin = 'Selecciona el origen'; isValid = false; }
    if (!destination) { e.destination = 'Selecciona el destino'; isValid = false; }
    if (!selectedRoute) { e.route = 'No existe ruta para este trayecto'; isValid = false; }
    if (!travelDate) { e.travelDate = 'Selecciona la fecha de viaje'; isValid = false; }
    if (!reservationDate) { e.reservationDate = 'Selecciona la fecha de reserva'; isValid = false; }
    passengers.forEach((p, i) => {
      if (!p.full_name.trim()) { e[`p_name_${i}`] = 'Nombre requerido'; isValid = false; }
      if (!isValidCubanCI(p.identity_card)) { e[`p_ci_${i}`] = 'Carnet de identidad inválido'; isValid = false; }
    });
    if (isReserved) {
      if (isGestor === null) { e.gestor = 'Indica si fue comprado por un gestor'; isValid = false; }
      if (isGestor === true && gestorCostNum <= 0) { e.gestorCost = 'Ingresa el costo del gestor por pasajero'; isValid = false; }
    }
    if (advanceNum > subtotal) {
      e.advance = `El anticipo no puede ser mayor al total (${formatCurrency(subtotal)} CUP)`;
      isValid = false;
    }
    setErrors(e);
    return isValid;
  };

  const handleSave = async () => {
    if (!validate()) {
      Alert.alert('Datos incompletos', 'Por favor revisa los campos marcados.');
      return;
    }
    setLoading(true);
    try {
      const travelISO = formatISODate(travelDate!);
      const reservationISO = formatISODate(reservationDate!);
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
          passengers
        });
      }
      toast.show({ message: isEditing ? 'Pedido actualizado' : 'Pedido registrado', type: 'success' });
      setHasUnsavedChanges(false);
      router.back();
    } catch (err) {
      console.error(err);
      Alert.alert('Error', 'No se pudo guardar la reserva');
    } finally {
      setLoading(false);
    }
  };

  const accentColor = TRANSPORT_CONFIG[transport as keyof typeof TRANSPORT_CONFIG]?.color ?? COLORS.accent.primary;

  return (
    <SafeAreaView style={s.container}>
      <View style={s.header}>
        <TouchableOpacity style={s.backBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={20} color={COLORS.text.primary} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={s.title}>{isEditing ? 'Editar Pedido' : 'Nuevo Pedido'}</Text>
          <Text style={s.subtitle}>{isEditing ? `Pedido #${editId}` : 'Completa los datos del viaje'}</Text>
        </View>
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <ScrollView
          contentContainerStyle={s.content}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* ── Datos del Cliente ── */}
          <SectionHeader icon="person-outline" label="Cliente" color={accentColor} />
          <View style={s.fieldGroup}>
            <Text style={s.label}>Teléfono de contacto</Text>
            <View style={[s.inputRow, errors.phone ? s.inputError : null]}>
              <View style={[s.inputIcon, { backgroundColor: accentColor + '1A' }]}>
                <Ionicons name="call" size={16} color={accentColor} />
              </View>
              <TextInput
                style={s.textInput}
                placeholder="Ej: 52345678"
                placeholderTextColor={COLORS.text.muted}
                value={phone}
                onChangeText={(v) => { setPhone(v); setErrors((e) => ({ ...e, phone: '' })); }}
                keyboardType="phone-pad"
                maxLength={15}
              />
            </View>
            {errors.phone && <Text style={s.error}>{errors.phone}</Text>}
          </View>

          {/* ── Ruta y Transporte ── */}
          <SectionHeader icon="map-outline" label="Ruta y Transporte" color={accentColor} />
          <View style={s.fieldGroup}>
            <Text style={s.label}>Medio de transporte</Text>
            <TouchableOpacity
              style={[s.selector, errors.transport ? s.inputError : null]}
              onPress={() => setShowTransportModal(true)}
            >
              <Ionicons name={TRANSPORT_CONFIG[transport as keyof typeof TRANSPORT_CONFIG]?.icon as any ?? 'bus'} size={18} color={accentColor} />
              <Text style={[s.selText, !transport && s.placeholder]}>
                {TRANSPORT_CONFIG[transport as keyof typeof TRANSPORT_CONFIG]?.label ?? 'Selecciona transporte'}
              </Text>
              <Ionicons name="chevron-down" size={18} color={COLORS.text.muted} />
            </TouchableOpacity>
            {errors.transport && <Text style={s.error}>{errors.transport}</Text>}
          </View>

          <View style={s.swapRow}>
            <View style={s.fieldGroup}>
              <Text style={s.label}>Origen</Text>
              <TouchableOpacity
                style={[s.selector, { flex: 1 }, errors.origin ? s.inputError : null]}
                onPress={() => transport ? setShowOriginModal(true) : Alert.alert('Aviso', 'Selecciona primero el transporte')}
              >
                <Text style={[s.selText, !origin && s.placeholder]} numberOfLines={1}>{origin || 'Origen'}</Text>
              </TouchableOpacity>
            </View>

            <View style={{ paddingTop: 20 }}>
              <View style={[s.swapLine, { backgroundColor: COLORS.border.default }]} />
              <TouchableOpacity style={[s.swapBtn, { borderColor: accentColor, backgroundColor: COLORS.bg.card }]} onPress={swapOriginDestination}>
                <Ionicons name="swap-horizontal" size={18} color={accentColor} />
              </TouchableOpacity>
              <View style={[s.swapLine, { backgroundColor: COLORS.border.default }]} />
            </View>

            <View style={s.fieldGroup}>
              <Text style={s.label}>Destino</Text>
              <TouchableOpacity
                style={[s.selector, { flex: 1 }, errors.destination ? s.inputError : null]}
                onPress={() => origin ? setShowDestModal(true) : Alert.alert('Aviso', 'Selecciona primero el origen')}
              >
                <Text style={[s.selText, !destination && s.placeholder]} numberOfLines={1}>{destination || 'Destino'}</Text>
              </TouchableOpacity>
            </View>
          </View>
          {(errors.origin || errors.destination) && <Text style={s.error}>{errors.origin || errors.destination}</Text>}

          {selectedRoute && (
            <View style={[s.routePriceCard, { borderColor: accentColor + '33', backgroundColor: accentColor + '08' }]}>
              <Ionicons name="information-circle-outline" size={18} color={accentColor} />
              <Text style={[s.routePriceText, { color: COLORS.text.secondary }]}>
                Precio por pasajero: <Text style={{ color: accentColor, fontWeight: 'bold' }}>{formatCurrency(routePrice)} CUP</Text>
              </Text>
            </View>
          )}

          {/* ── Fechas ── */}
          <SectionHeader icon="calendar-outline" label="Fechas" color={accentColor} />
          <View style={{ flexDirection: 'row', gap: SPACING.md }}>
            <View style={[s.fieldGroup, { flex: 1 }]}>
              <Text style={s.label}>Fecha de viaje</Text>
              <TouchableOpacity
                style={[s.selector, errors.travelDate ? s.inputError : null]}
                onPress={() => setShowTravelPicker(true)}
              >
                <Ionicons name="airplane-outline" size={18} color={accentColor} />
                <Text style={[s.selText, !travelDate && s.placeholder]}>
                  {travelDate ? travelDate.toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' }) : 'Seleccionar'}
                </Text>
              </TouchableOpacity>
              {errors.travelDate && <Text style={s.error}>{errors.travelDate}</Text>}
            </View>

            <View style={[s.fieldGroup, { flex: 1 }]}>
              <Text style={s.label}>Fecha de reserva</Text>
              <TouchableOpacity
                style={[s.selector, errors.reservationDate ? s.inputError : null]}
                onPress={() => setShowReservationPicker(true)}
              >
                <Ionicons name="today-outline" size={18} color={accentColor} />
                <Text style={[s.selText, !reservationDate && s.placeholder]}>
                  {reservationDate ? reservationDate.toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' }) : 'Seleccionar'}
                </Text>
              </TouchableOpacity>
              {errors.reservationDate && <Text style={s.error}>{errors.reservationDate}</Text>}
            </View>
          </View>

          {/* ── Pasajeros ── */}
          <SectionHeader icon="people-outline" label={`Pasajeros (${passengerCount})`} color={accentColor} />
          {passengers.map((p, i) => (
            <PassengerCard
              key={i}
              index={i}
              passenger={p}
              color={accentColor}
              canRemove={passengers.length > 1}
              onRemove={() => removePassenger(i)}
              onChange={(f, v) => updatePassenger(i, f, v)}
            />
          ))}
          <TouchableOpacity style={[s.addPassBtn, { borderColor: accentColor + '55' }]} onPress={addPassenger}>
            <Ionicons name="add-circle-outline" size={20} color={accentColor} />
            <Text style={[s.addPassText, { color: accentColor }]}>Añadir otro pasajero</Text>
          </TouchableOpacity>

          {/* ── Estado de reserva ── */}
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
              handleToggleReserved(!isReserved);
            }}
            activeOpacity={0.7}
          >
            <View style={[s.inputIcon, { backgroundColor: isReserved ? COLORS.accent.success + '22' : COLORS.bg.elevated }]}>
              <Ionicons name="bookmark" size={16} color={isReserved ? COLORS.accent.success : COLORS.text.muted} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={s.toggleLabel}>Marcar como Reservado</Text>
              <Text style={s.toggleHint}>El viaje ya está pagado o confirmado</Text>
            </View>
            <AnimatedSwitch value={isReserved} color={COLORS.accent.success} />
          </TouchableOpacity>

          {/* Bloque de gestor (solo si es reservado) */}
          {isReserved && (
            <View style={s.gestorBlock}>
              <View style={s.gestorHeader}>
                <View style={[s.gestorIconWrap, { backgroundColor: COLORS.accent.warning + '1A' }]}>
                  <Ionicons name="cart" size={18} color={COLORS.accent.warning} />
                </View>
                <Text style={s.gestorTitle}>¿Quién compró el pasaje?</Text>
                <TouchableOpacity
                  style={[s.cupBadge, { backgroundColor: COLORS.accent.warning }]}
                  onPress={() => setShowPaymentSelector(true)}
                >
                  <Text style={s.cupText}>{paymentSelection ? paymentSelection.card.bank.toUpperCase() : 'PAGAR'}</Text>
                </TouchableOpacity>
              </View>

              {paymentSelection && (
                <View style={{ marginBottom: 4 }}>
                  <Text style={{ fontSize: 11, color: COLORS.text.muted, marginBottom: 4 }}>Método seleccionado:</Text>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <Ionicons name={BANK_CONFIG[paymentSelection.card.bank as keyof typeof BANK_CONFIG]?.icon as any ?? 'card'} size={14} color={COLORS.accent.warning} />
                    <Text style={{ fontSize: 13, fontWeight: 'bold', color: COLORS.text.primary }}>
                      {BANK_CONFIG[paymentSelection.card.bank as keyof typeof BANK_CONFIG]?.label ?? paymentSelection.card.bank} (****{paymentSelection.card.cardNumber.slice(-4)})
                    </Text>
                  </View>
                </View>
              )}

              <View style={s.gestorBtnRow}>
                <TouchableOpacity
                  style={[s.gestorBtn, isGestor === true && { borderColor: COLORS.accent.warning, backgroundColor: COLORS.accent.warning + '1A' }]}
                  onPress={() => { setIsGestor(true); setErrors((e) => ({ ...e, gestor: '' })); }}
                >
                  <Ionicons name="people" size={18} color={isGestor === true ? COLORS.accent.warning : COLORS.text.muted} />
                  <Text style={[s.gestorBtnText, isGestor === true && { color: COLORS.accent.warning }]}>Gestor</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[s.gestorBtn, isGestor === false && { borderColor: COLORS.accent.primary, backgroundColor: COLORS.accent.primary + '1A' }]}
                  onPress={() => { setIsGestor(false); setErrors((e) => ({ ...e, gestor: '' })); setGestorCost(''); }}
                >
                  <Ionicons name="phone-portrait" size={18} color={isGestor === false ? COLORS.accent.primary : COLORS.text.muted} />
                  <Text style={[s.gestorBtnText, isGestor === false && { color: COLORS.accent.primary }]}>App / Propio</Text>
                </TouchableOpacity>
              </View>
              {errors.gestor && <Text style={s.error}>{errors.gestor}</Text>}

              {isGestor === true && (
                <View style={s.fieldGroup}>
                  <Text style={s.label}>Costo del gestor (por pasajero)</Text>
                  <View style={[s.inputRow, errors.gestorCost ? s.inputError : null]}>
                    <Text style={{ color: COLORS.text.muted, fontWeight: 'bold' }}>$</Text>
                    <TextInput
                      style={s.textInput}
                      placeholder="Costo CUP"
                      placeholderTextColor={COLORS.text.muted}
                      value={gestorCost}
                      onChangeText={(v) => { setGestorCost(v); setErrors((e) => ({ ...e, gestorCost: '' })); }}
                      keyboardType="numeric"
                    />
                  </View>
                  {errors.gestorCost && <Text style={s.error}>{errors.gestorCost}</Text>}
                </View>
              )}

              {isGestor === false && (
                <View style={[s.appCostInfo, { borderColor: COLORS.accent.primary + '33', backgroundColor: COLORS.accent.primary + '08' }]}>
                  <Ionicons name="information-circle" size={18} color={COLORS.accent.primary} />
                  <Text style={s.appCostText}>
                    Se aplicará el costo configurado en la ruta: <Text style={{ fontWeight: 'bold' }}>{formatCurrency(appPrice)} CUP</Text>
                  </Text>
                </View>
              )}

              {/* Preview Ganancia */}
              {(isGestor === false || (isGestor === true && gestorCostNum > 0)) && (
                <View style={s.gananciaPreview}>
                  <View style={s.gananciaRow}>
                    <Text style={s.gananciaLabel}>Cobro al cliente ({passengerCount} pax)</Text>
                    <Text style={s.gananciaVal}>+ {formatCurrency(subtotal)}</Text>
                  </View>
                  <View style={s.gananciaRow}>
                    <Text style={s.gananciaLabel}>Costo total pasajes</Text>
                    <Text style={[s.gananciaVal, { color: COLORS.accent.danger }]}>- {formatCurrency(totalCost)}</Text>
                  </View>
                  <View style={[s.gananciaDivider, { backgroundColor: COLORS.border.default }]} />
                  <View style={s.gananciaRow}>
                    <Text style={s.gananciaLabelBold}>Ganancia estimada</Text>
                    <Text style={[s.gananciaBig, { color: gananciaPreview >= 0 ? COLORS.accent.success : COLORS.accent.danger }]}>
                      {gananciaPreview >= 0 ? '+' : ''}{formatCurrency(gananciaPreview)} CUP
                    </Text>
                  </View>
                </View>
              )}
            </View>
          )}

          {/* ── Resumen de Pago ── */}
          <SectionHeader icon="cash-outline" label="Pago" color={accentColor} />
          <View style={s.summaryCard}>
            <Text style={s.summaryTitle}>Resumen</Text>
            <View style={s.summaryRow}>
              <Text style={s.summaryLabel}>Pasaje ({passengerCount} pax)</Text>
              <Text style={s.summaryVal}>{formatCurrency(subtotal)} CUP</Text>
            </View>

            <View style={[s.summaryRow, { marginTop: SPACING.sm }]}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Text style={s.summaryLabel}>¿Dejó anticipo?</Text>
                <AnimatedSwitch size="sm" value={advanceEnabled} onToggle={setAdvanceEnabled} color={accentColor} />
              </View>
            </View>

            {advanceEnabled && (
              <View style={[s.inputRow, { marginTop: 4, height: 44 }, errors.advance ? s.inputError : null]}>
                <Text style={{ color: accentColor, fontWeight: 'bold' }}>$</Text>
                <TextInput
                  style={s.textInput}
                  placeholder="Monto CUP"
                  placeholderTextColor={COLORS.text.muted}
                  value={advance}
                  onChangeText={(v) => { setAdvance(v); setErrors((e) => ({ ...e, advance: '' })); }}
                  keyboardType="numeric"
                />
              </View>
            )}
            {errors.advance && <Text style={s.error}>{errors.advance}</Text>}

            <View style={[s.summaryDivider, { backgroundColor: COLORS.border.default }]} />

            <View style={s.summaryRow}>
              <Text style={s.summaryTotalLabel}>Pendiente a pagar</Text>
              <Text style={[s.summaryTotal, { color: accentColor }]}>{formatCurrency(total)} CUP</Text>
            </View>
          </View>
        </ScrollView>

        {/* Footer con Botón Guardar */}
        <View style={s.footer}>
          <TouchableOpacity
            style={[s.saveBtn, { backgroundColor: accentColor }, loading && s.btnDisabled]}
            onPress={handleSave}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <Ionicons name="checkmark-circle" size={20} color="#fff" />
                <Text style={s.saveBtnText}>{isEditing ? 'Guardar Cambios' : 'Registrar Pedido'}</Text>
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