import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SPACING, FONT, RADIUS, TRANSPORT_CONFIG } from '@/constants/theme';
import { routesRepository } from '@/database/routesRepository';
import { Route, TransportType, formatCurrency } from '@/types';
import { useGlobalToast } from '@/components/ui/Toast';

export default function TransportRoutesScreen() {
  const { transport } = useLocalSearchParams<{ transport: string }>();
  const transportKey = transport as TransportType;
  const config = TRANSPORT_CONFIG[transportKey];
  const toast = useGlobalToast();

  const [routes, setRoutes] = useState<Route[]>([]);
  const [loading, setLoading] = useState(true);

  const loadRoutes = useCallback(async () => {
    try {
      setLoading(true);
      const data = await routesRepository.getByTransport(transportKey);
      setRoutes(data);
    } catch (error) {
      Alert.alert('Error', 'No se pudieron cargar las rutas');
    } finally {
      setLoading(false);
    }
  }, [transportKey]);

  useFocusEffect(useCallback(() => { loadRoutes(); }, [loadRoutes]));

  const handleDelete = (route: Route) => {
    Alert.alert(
      'Eliminar ruta',
      `¿Eliminar ${route.origin} → ${route.destination}?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: async () => {
            await routesRepository.delete(route.id);
            toast.show({ message: 'Ruta eliminada', type: 'success' });
            loadRoutes();
          },
        },
      ]
    );
  };

  if (!config) return null;

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={20} color={COLORS.text.primary} />
        </TouchableOpacity>
        <View style={[styles.transportIcon, { backgroundColor: config.color + '22' }]}>
          <Ionicons name={config.icon as any} size={22} color={config.color} />
        </View>
        <View style={styles.headerInfo}>
          <Text style={styles.title}>{config.label}</Text>
          <Text style={styles.subtitle}>
            {routes.length} {routes.length === 1 ? 'ruta' : 'rutas'} registradas
          </Text>
        </View>
        <TouchableOpacity
          style={[styles.addBtn, { backgroundColor: config.color }]}
          onPress={() =>
            router.push({ pathname: '/routes/add-route', params: { transport: transportKey } } as any)
          }
        >
          <Ionicons name="add" size={22} color="#fff" />
        </TouchableOpacity>
      </View>

      {/* Content */}
      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator color={config.color} size="large" />
        </View>
      ) : routes.length === 0 ? (
        <View style={styles.centered}>
          <View style={[styles.emptyIcon, { backgroundColor: config.color + '1A' }]}>
            <Ionicons name={config.icon as any} size={48} color={config.color} />
          </View>
          <Text style={styles.emptyTitle}>Sin rutas aún</Text>
          <Text style={styles.emptyText}>
            Añade la primera ruta de {config.label.toLowerCase()} tocando el botón +
          </Text>
          <TouchableOpacity
            style={[styles.emptyBtn, { backgroundColor: config.color }]}
            onPress={() =>
              router.push({ pathname: '/routes/add-route', params: { transport: transportKey } } as any)
            }
          >
            <Ionicons name="add" size={18} color="#fff" />
            <Text style={styles.emptyBtnText}>Añadir primera ruta</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={routes}
          keyExtractor={(item) => item.id.toString()}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          renderItem={({ item }) => (
            <View style={styles.routeCard}>
              {/* Route info */}
              <View style={styles.routeMain}>
                <View style={styles.routePath}>
                  <Text style={styles.cityText}>{item.origin}</Text>
                  <View style={styles.routeLine}>
                    <View style={[styles.dot, { backgroundColor: config.color }]} />
                    <View style={[styles.line, { backgroundColor: config.color + '44' }]} />
                    <Ionicons name="chevron-forward" size={14} color={config.color} />
                  </View>
                  <Text style={styles.cityText}>{item.destination}</Text>
                </View>
                <View style={styles.pricesCol}>
                  <View style={[styles.priceTag, { backgroundColor: config.color + '1A' }]}>
                    <Text style={styles.priceLabel}>Cliente</Text>
                    <Text style={[styles.priceText, { color: config.color }]}>
                      {formatCurrency(item.price)} CUP
                    </Text>
                  </View>
                  <View style={[styles.priceTag, { backgroundColor: COLORS.accent.secondary + '1A', marginTop: 4 }]}>
                    <Text style={styles.priceLabel}>App</Text>
                    <Text style={[styles.priceText, { color: COLORS.accent.secondary }]}>
                      {formatCurrency(item.app_price ?? 0)} CUP
                    </Text>
                  </View>
                </View>
              </View>

              {/* Actions */}
              <View style={styles.routeActions}>
                <Text style={styles.dateText}>
                  {new Date(item.created_at).toLocaleDateString('es-ES', {
                    day: '2-digit', month: 'short', year: 'numeric'
                  })}
                </Text>
                <View style={styles.actionBtns}>
                  <TouchableOpacity
                    style={styles.actionBtn}
                    onPress={() =>
                      router.push({
                        pathname: '/routes/add-route',
                        params: { transport: transportKey, editId: item.id.toString() },
                      } as any)
                    }
                  >
                    <Ionicons name="pencil" size={15} color={COLORS.text.secondary} />
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.actionBtn, styles.deleteBtn]}
                    onPress={() => handleDelete(item)}
                  >
                    <Ionicons name="trash" size={15} color={COLORS.accent.danger} />
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          )}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg.primary },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.xl,
    paddingBottom: SPACING.lg,
    gap: SPACING.sm,
  },
  backBtn: {
    width: 40, height: 40, borderRadius: RADIUS.full,
    backgroundColor: COLORS.bg.card, borderWidth: 1,
    borderColor: COLORS.border.default, justifyContent: 'center', alignItems: 'center',
  },
  transportIcon: {
    width: 44, height: 44, borderRadius: RADIUS.lg,
    justifyContent: 'center', alignItems: 'center',
  },
  headerInfo: { flex: 1 },
  title: { fontSize: FONT.sizes.lg, color: COLORS.text.primary, fontWeight: FONT.weights.bold },
  subtitle: { fontSize: FONT.sizes.xs, color: COLORS.text.muted, marginTop: 2 },
  addBtn: {
    width: 44, height: 44, borderRadius: RADIUS.full,
    justifyContent: 'center', alignItems: 'center',
  },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: SPACING.md, padding: SPACING.xl },
  emptyIcon: { width: 96, height: 96, borderRadius: RADIUS.xl, justifyContent: 'center', alignItems: 'center' },
  emptyTitle: { fontSize: FONT.sizes.xl, color: COLORS.text.primary, fontWeight: FONT.weights.bold },
  emptyText: { fontSize: FONT.sizes.md, color: COLORS.text.secondary, textAlign: 'center', lineHeight: 22 },
  emptyBtn: {
    flexDirection: 'row', alignItems: 'center', gap: SPACING.xs,
    paddingHorizontal: SPACING.lg, paddingVertical: SPACING.sm + 2,
    borderRadius: RADIUS.full, marginTop: SPACING.sm,
  },
  emptyBtnText: { color: '#fff', fontWeight: FONT.weights.semibold, fontSize: FONT.sizes.md },
  list: { padding: SPACING.lg, gap: SPACING.md },
  routeCard: {
    backgroundColor: COLORS.bg.card, borderRadius: RADIUS.xl,
    padding: SPACING.lg, borderWidth: 1, borderColor: COLORS.border.default,
  },
  routeMain: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: SPACING.md },
  routePath: { flex: 1, gap: 6 },
  cityText: { fontSize: FONT.sizes.md, color: COLORS.text.primary, fontWeight: FONT.weights.semibold },
  routeLine: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  dot: { width: 6, height: 6, borderRadius: 3 },
  line: { flex: 1, height: 1 },
  priceTag: {
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
    borderRadius: RADIUS.md,
    alignItems: 'flex-end',
  },
  priceText: {
    fontSize: FONT.sizes.sm,
    fontWeight: FONT.weights.bold,
  },
  routeActions: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  dateText: { fontSize: FONT.sizes.xs, color: COLORS.text.muted },
  actionBtns: { flexDirection: 'row', gap: SPACING.xs },
  actionBtn: {
    width: 34, height: 34, borderRadius: RADIUS.full,
    backgroundColor: COLORS.bg.elevated, justifyContent: 'center', alignItems: 'center',
  },
  deleteBtn: { backgroundColor: COLORS.accent.danger + '1A' },
  pricesCol: {
    alignItems: 'flex-end',
    gap: 4,
  },
  priceLabel: {
    fontSize: FONT.sizes.xs,
    color: COLORS.text.muted,
    fontWeight: FONT.weights.medium,
    marginBottom: 1,
  },
});