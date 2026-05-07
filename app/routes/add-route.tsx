import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView, 
  Alert, ActivityIndicator, KeyboardAvoidingView,
  Platform, Modal, FlatList, TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SPACING, FONT, RADIUS, TRANSPORT_CONFIG } from '@/constants/theme';
import { getProvincesForTransport } from '@/constants/provinces';
import { routesRepository } from '@/database/routesRepository';
import { TransportType } from '@/types';

function ProvinceSelectorModal({ visible, title, selected, excluded, color, transport, onSelect, onClose }: {
  visible: boolean; title: string; selected: string;
  excluded?: string; color: string; transport: TransportType;
  onSelect: (p: string) => void; onClose: () => void;
}) {
  const [search, setSearch] = useState('');

  useEffect(() => {
    if (!visible) setSearch('');
  }, [visible]);

  const available = getProvincesForTransport(transport).filter((p) => p !== excluded);

  const filteredItems = React.useMemo(() => {
    if (!search.trim()) return available;
    const lower = search.toLowerCase();
    return available.filter(item => item.toLowerCase().includes(lower));
  }, [available, search]);

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={ms.overlay}>
        <View style={ms.sheet}>
          <View style={ms.handle} />
          <View style={ms.header}>
            <Text style={ms.title}>{title}</Text>
            <TouchableOpacity style={ms.closeBtn} onPress={onClose}>
              <Ionicons name="close" size={20} color={COLORS.text.secondary} />
            </TouchableOpacity>
          </View>
          <Text style={ms.subtitle}>Selecciona una localidad</Text>
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
          <FlatList
            data={filteredItems}
            keyExtractor={(item) => item}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={ms.list}
            renderItem={({ item }) => {
              const sel = item === selected;
              return (
                <TouchableOpacity
                  style={[ms.item, sel && { backgroundColor: color + '1A', borderColor: color }]}
                  onPress={() => { onSelect(item); onClose(); }}
                  activeOpacity={0.7}
                >
                  <View style={[ms.dot, { backgroundColor: sel ? color : COLORS.bg.elevated }]}>
                    {sel && <Ionicons name="checkmark" size={12} color="#fff" />}
                  </View>
                  <Text style={[ms.itemText, sel && { color, fontWeight: FONT.weights.semibold }]}>
                    {item}
                  </Text>
                  {sel && <Ionicons name="checkmark-circle" size={18} color={color} style={{ marginLeft: 'auto' }} />}
                </TouchableOpacity>
              );
            }}
          />
        </View>
      </View>
    </Modal>
  );
}

const ms = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.65)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: COLORS.bg.secondary, borderTopLeftRadius: 28, borderTopRightRadius: 28, paddingBottom: 40, maxHeight: '80%' },
  handle: { width: 40, height: 4, backgroundColor: COLORS.border.default, borderRadius: 2, alignSelf: 'center', marginTop: 12, marginBottom: 8 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: SPACING.lg, paddingTop: SPACING.sm },
  title: { fontSize: FONT.sizes.lg, color: COLORS.text.primary, fontWeight: FONT.weights.bold },
  closeBtn: { width: 36, height: 36, borderRadius: RADIUS.full, backgroundColor: COLORS.bg.elevated, justifyContent: 'center', alignItems: 'center' },
  subtitle: { fontSize: FONT.sizes.sm, color: COLORS.text.muted, paddingHorizontal: SPACING.lg, marginTop: 4, marginBottom: SPACING.md },
  searchContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.bg.elevated, marginHorizontal: SPACING.lg, marginBottom: SPACING.md, borderRadius: RADIUS.lg, paddingHorizontal: SPACING.md, paddingVertical: SPACING.xs, gap: SPACING.sm },
  searchInput: { flex: 1, color: COLORS.text.primary, fontSize: FONT.sizes.md, paddingVertical: 8 },
  list: { paddingHorizontal: SPACING.lg, paddingBottom: SPACING.lg, gap: SPACING.xs },
  item: { flexDirection: 'row', alignItems: 'center', gap: SPACING.md, paddingVertical: SPACING.sm + 2, paddingHorizontal: SPACING.md, borderRadius: RADIUS.lg, borderWidth: 1, borderColor: COLORS.border.default, backgroundColor: COLORS.bg.card },
  dot: { width: 24, height: 24, borderRadius: RADIUS.full, justifyContent: 'center', alignItems: 'center' },
  itemText: { fontSize: FONT.sizes.md, color: COLORS.text.primary, flex: 1 },
});

export default function AddRouteScreen() {
  const { transport, editId } = useLocalSearchParams<{ transport: string; editId?: string }>();
  const transportKey = transport as TransportType;
  const config = TRANSPORT_CONFIG[transportKey];
  const isEditing = !!editId;

  const [origin, setOrigin] = useState('');
  const [destination, setDestination] = useState('');
  const [price, setPrice] = useState('');
  const [appPrice, setAppPrice] = useState('');
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [showOriginModal, setShowOriginModal] = useState(false);
  const [showDestModal, setShowDestModal] = useState(false);

  useEffect(() => {
    if (isEditing) {
      routesRepository.getAll().then((routes) => {
        const route = routes.find((r) => r.id === Number(editId));
        if (route) {
          setOrigin(route.origin);
          setDestination(route.destination);
          setPrice(route.price.toString());
          setAppPrice((route.app_price ?? 0).toString());
        }
      });
    }
  }, [editId]);

  const validate = () => {
    const e: Record<string, string> = {};
    if (!origin) e.origin = 'Selecciona el origen';
    if (!destination) e.destination = 'Selecciona el destino';
    if (origin && destination && origin === destination) e.destination = 'El destino debe ser diferente al origen';
    if (!price || isNaN(Number(price)) || Number(price) <= 0) e.price = 'Ingresa un precio válido mayor a 0';
    if (!appPrice || isNaN(Number(appPrice)) || Number(appPrice) <= 0) e.appPrice = 'Ingresa un precio de app válido mayor a 0';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSave = async () => {
    if (!validate()) return;
    setLoading(true);
    try {
      const data = {
        transport: transportKey,
        origin,
        destination,
        price: parseFloat(price),
        app_price: parseFloat(appPrice),
        currency: 'CUP',
      };
      isEditing
        ? await routesRepository.update(Number(editId), data)
        : await routesRepository.create(data);
      router.back();
    } catch {
      Alert.alert('Error', 'No se pudo guardar la ruta');
    } finally {
      setLoading(false);
    }
  };

  if (!config) return null;

  return (
    <SafeAreaView style={s.container}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>

        {/* Header */}
        <View style={s.header}>
          <TouchableOpacity style={s.backBtn} onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={20} color={COLORS.text.primary} />
          </TouchableOpacity>
          <View style={[s.tIcon, { backgroundColor: config.color + '22' }]}>
            <Ionicons name={config.icon as any} size={20} color={config.color} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={s.title}>{isEditing ? 'Editar Ruta' : 'Nueva Ruta'}</Text>
            <Text style={s.subtitle}>{config.label}</Text>
          </View>
        </View>

        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.content}>

          {/* Origen */}
          <View style={s.fieldGroup}>
            <Text style={s.label}>Origen</Text>
            <TouchableOpacity
              style={[s.selector, errors.origin ? s.selectorError : null]}
              onPress={() => setShowOriginModal(true)}
              activeOpacity={0.7}
            >
              <View style={[s.selIcon, { backgroundColor: config.color + '1A' }]}>
                <Ionicons name="location" size={16} color={config.color} />
              </View>
              <Text style={[s.selText, !origin && s.placeholder]}>
                {origin || 'Selecciona provincia de origen'}
              </Text>
              <Ionicons name="chevron-down" size={18} color={COLORS.text.muted} />
            </TouchableOpacity>
            {errors.origin ? <Text style={s.error}>{errors.origin}</Text> : null}
          </View>

          {/* Flecha visual */}
          <View style={s.arrowRow}>
            <View style={[s.arrowLine, { backgroundColor: config.color + '33' }]} />
            <View style={[s.arrowIcon, { backgroundColor: config.color + '22' }]}>
              <Ionicons name="arrow-down" size={16} color={config.color} />
            </View>
            <View style={[s.arrowLine, { backgroundColor: config.color + '33' }]} />
          </View>

          {/* Destino */}
          <View style={s.fieldGroup}>
            <Text style={s.label}>Destino</Text>
            <TouchableOpacity
              style={[s.selector, errors.destination ? s.selectorError : null]}
              onPress={() => setShowDestModal(true)}
              activeOpacity={0.7}
            >
              <View style={[s.selIcon, { backgroundColor: config.color + '1A' }]}>
                <Ionicons name="flag" size={16} color={config.color} />
              </View>
              <Text style={[s.selText, !destination && s.placeholder]}>
                {destination || 'Selecciona provincia de destino'}
              </Text>
              <Ionicons name="chevron-down" size={18} color={COLORS.text.muted} />
            </TouchableOpacity>
            {errors.destination ? <Text style={s.error}>{errors.destination}</Text> : null}
          </View>

          {/* Sección precios */}
          <View style={s.priceSection}>
            <View style={s.priceSectionHeader}>
              <Ionicons name="pricetags" size={16} color={config.color} />
              <Text style={[s.priceSectionTitle, { color: config.color }]}>Precios</Text>
            </View>

            {/* Precio cliente */}
            <View style={s.fieldGroup}>
              <View style={s.priceLabelRow}>
                <View style={[s.priceDot, { backgroundColor: config.color }]} />
                <Text style={s.label}>Precio para el cliente</Text>
              </View>
              <View style={[s.priceRow, errors.price ? s.selectorError : null]}>
                <View style={[s.selIcon, { backgroundColor: config.color + '1A' }]}>
                  <Ionicons name="person" size={16} color={config.color} />
                </View>
                <TextInput
                  style={s.priceInput}
                  placeholder="0.00"
                  placeholderTextColor={COLORS.text.muted}
                  value={price}
                  onChangeText={(t) => { setPrice(t); setErrors((e) => ({ ...e, price: '' })); }}
                  keyboardType="decimal-pad"
                />
                <View style={[s.cupBadge, { backgroundColor: config.color }]}>
                  <Text style={s.cupText}>CUP</Text>
                </View>
              </View>
              {errors.price ? <Text style={s.error}>{errors.price}</Text> : null}
            </View>

            {/* Precio app */}
            <View style={s.fieldGroup}>
              <View style={s.priceLabelRow}>
                <View style={[s.priceDot, { backgroundColor: COLORS.accent.secondary }]} />
                <Text style={s.label}>Precio por la aplicación</Text>
              </View>
              <View style={[s.priceRow, errors.appPrice ? s.selectorError : null]}>
                <View style={[s.selIcon, { backgroundColor: COLORS.accent.secondary + '1A' }]}>
                  <Ionicons name="phone-portrait" size={16} color={COLORS.accent.secondary} />
                </View>
                <TextInput
                  style={s.priceInput}
                  placeholder="0.00"
                  placeholderTextColor={COLORS.text.muted}
                  value={appPrice}
                  onChangeText={(t) => { setAppPrice(t); setErrors((e) => ({ ...e, appPrice: '' })); }}
                  keyboardType="decimal-pad"
                />
                <View style={[s.cupBadge, { backgroundColor: COLORS.accent.secondary }]}>
                  <Text style={s.cupText}>CUP</Text>
                </View>
              </View>
              {errors.appPrice ? <Text style={s.error}>{errors.appPrice}</Text> : null}
            </View>
          </View>

          {/* Vista previa */}
          {origin && destination && price && appPrice ? (
            <View style={[s.preview, { borderColor: config.color + '44' }]}>
              <Text style={s.previewLabel}>Vista previa</Text>
              <Text style={s.previewRoute}>{origin} → {destination}</Text>
              <View style={s.previewPrices}>
                <View style={s.previewPriceItem}>
                  <Text style={s.previewPriceLabel}>Cliente</Text>
                  <Text style={[s.previewPrice, { color: config.color }]}>
                    {parseFloat(price || '0').toFixed(2)} CUP
                  </Text>
                </View>
                <View style={[s.previewDivider, { backgroundColor: COLORS.border.default }]} />
                <View style={s.previewPriceItem}>
                  <Text style={s.previewPriceLabel}>App</Text>
                  <Text style={[s.previewPrice, { color: COLORS.accent.secondary }]}>
                    {parseFloat(appPrice || '0').toFixed(2)} CUP
                  </Text>
                </View>
              </View>
            </View>
          ) : null}

        </ScrollView>

        {/* Guardar */}
        <View style={s.footer}>
          <TouchableOpacity
            style={[s.saveBtn, { backgroundColor: config.color }, loading && s.btnDisabled]}
            onPress={handleSave}
            disabled={loading}
          >
            {loading ? <ActivityIndicator color="#fff" /> : (
              <>
                <Ionicons name={isEditing ? 'checkmark' : 'add'} size={20} color="#fff" />
                <Text style={s.saveBtnText}>{isEditing ? 'Guardar cambios' : 'Añadir ruta'}</Text>
              </>
            )}
          </TouchableOpacity>
        </View>

      </KeyboardAvoidingView>

      <ProvinceSelectorModal
        visible={showOriginModal}
        title="Provincia de Origen"
        selected={origin}
        excluded={destination}
        color={config.color}
        transport={transportKey}
        onSelect={(p) => { setOrigin(p); setErrors((e) => ({ ...e, origin: '' })); }}
        onClose={() => setShowOriginModal(false)}
      />
      <ProvinceSelectorModal
        visible={showDestModal}
        title="Provincia de Destino"
        selected={destination}
        excluded={origin}
        color={config.color}
        transport={transportKey}
        onSelect={(p) => { setDestination(p); setErrors((e) => ({ ...e, destination: '' })); }}
        onClose={() => setShowDestModal(false)}
      />
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg.primary },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: SPACING.lg, paddingTop: SPACING.xl, paddingBottom: SPACING.lg, gap: SPACING.sm },
  backBtn: { width: 40, height: 40, borderRadius: RADIUS.full, backgroundColor: COLORS.bg.card, borderWidth: 1, borderColor: COLORS.border.default, justifyContent: 'center', alignItems: 'center' },
  tIcon: { width: 40, height: 40, borderRadius: RADIUS.lg, justifyContent: 'center', alignItems: 'center' },
  title: { fontSize: FONT.sizes.lg, color: COLORS.text.primary, fontWeight: FONT.weights.bold },
  subtitle: { fontSize: FONT.sizes.xs, color: COLORS.text.muted },
  content: { paddingHorizontal: SPACING.lg, paddingBottom: SPACING.xl, gap: SPACING.lg },
  fieldGroup: { gap: SPACING.xs },
  label: { fontSize: FONT.sizes.sm, color: COLORS.text.secondary, fontWeight: FONT.weights.semibold, marginBottom: 4 },
  selector: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm, backgroundColor: COLORS.bg.input, borderRadius: RADIUS.lg, borderWidth: 1, borderColor: COLORS.border.default, paddingHorizontal: SPACING.md, paddingVertical: SPACING.md },
  selectorError: { borderColor: COLORS.accent.danger },
  selIcon: { width: 32, height: 32, borderRadius: RADIUS.md, justifyContent: 'center', alignItems: 'center' },
  selText: { flex: 1, fontSize: FONT.sizes.md, color: COLORS.text.primary },
  placeholder: { color: COLORS.text.muted },
  arrowRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm },
  arrowLine: { flex: 1, height: 1 },
  arrowIcon: { width: 32, height: 32, borderRadius: RADIUS.full, justifyContent: 'center', alignItems: 'center' },
  priceSection: { backgroundColor: COLORS.bg.card, borderRadius: RADIUS.xl, padding: SPACING.lg, borderWidth: 1, borderColor: COLORS.border.default, gap: SPACING.md },
  priceSectionHeader: { flexDirection: 'row', alignItems: 'center', gap: SPACING.xs, marginBottom: SPACING.xs },
  priceSectionTitle: { fontSize: FONT.sizes.md, fontWeight: FONT.weights.bold, textTransform: 'uppercase', letterSpacing: 0.8 },
  priceLabelRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING.xs },
  priceDot: { width: 8, height: 8, borderRadius: 4 },
  priceRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm, backgroundColor: COLORS.bg.input, borderRadius: RADIUS.lg, borderWidth: 1, borderColor: COLORS.border.default, paddingHorizontal: SPACING.md, paddingVertical: SPACING.sm },
  priceInput: { flex: 1, fontSize: FONT.sizes.md, color: COLORS.text.primary, paddingVertical: SPACING.xs },
  cupBadge: { paddingHorizontal: SPACING.sm, paddingVertical: 4, borderRadius: RADIUS.md },
  cupText: { fontSize: FONT.sizes.xs, color: '#fff', fontWeight: FONT.weights.bold },
  error: { fontSize: FONT.sizes.xs, color: COLORS.accent.danger, marginTop: 2 },
  preview: { backgroundColor: COLORS.bg.card, borderRadius: RADIUS.xl, padding: SPACING.lg, borderWidth: 1, gap: SPACING.sm },
  previewLabel: { fontSize: FONT.sizes.xs, color: COLORS.text.muted, textTransform: 'uppercase', letterSpacing: 1 },
  previewRoute: { fontSize: FONT.sizes.lg, color: COLORS.text.primary, fontWeight: FONT.weights.bold },
  previewPrices: { flexDirection: 'row', alignItems: 'center', gap: SPACING.md, marginTop: SPACING.xs },
  previewPriceItem: { flex: 1, alignItems: 'center', gap: 4 },
  previewPriceLabel: { fontSize: FONT.sizes.xs, color: COLORS.text.muted, textTransform: 'uppercase', letterSpacing: 0.5 },
  previewPrice: { fontSize: FONT.sizes.xl, fontWeight: FONT.weights.extrabold },
  previewDivider: { width: 1, height: 40 },
  footer: { padding: SPACING.lg, paddingBottom: SPACING.xl },
  saveBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: SPACING.sm, paddingVertical: SPACING.md + 2, borderRadius: RADIUS.full },
  btnDisabled: { opacity: 0.6 },
  saveBtnText: { color: '#fff', fontSize: FONT.sizes.md, fontWeight: FONT.weights.bold },
});