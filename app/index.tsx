import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SPACING, FONT, RADIUS } from '@/constants/theme';

const { width } = Dimensions.get('window');

interface MenuCard {
  id: string;
  title: string;
  subtitle: string;
  icon: keyof typeof Ionicons.glyphMap;
  route: string;
  color: string;
  available: boolean;
}

const MENU_CARDS: MenuCard[] = [
  {
    id: 'routes',
    title: 'Rutas y Precios',
    subtitle: 'Gestiona tus rutas de transporte',
    icon: 'map',
    route: '/routes',
    color: '#3B82F6',
    available: true,
  },
  {
    id: 'reservations',
    title: 'Pedidos',
    subtitle: 'Control de pedidos de clientes',
    icon: 'cart',
    route: '/reservations',
    color: '#10B981',
    available: true,
  },
  {
    id: 'clients',
    title: 'Reservas',
    subtitle: 'Clientes con reserva confirmada',
    icon: 'checkmark-circle',
    route: '/clients',
    color: '#F59E0B',
    available: true,
  },
  {
    id: 'reports',
    title: 'Reportes',
    subtitle: 'Estadísticas y análisis',
    icon: 'bar-chart',
    route: '/reports',
    color: '#8B5CF6',
    available: false,
  },
];

export default function HomeScreen() {
  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>Panel de Control</Text>
          <Text style={styles.appName}>Viajando</Text>
        </View>
        <View style={styles.avatarContainer}>
          <Ionicons name="person" size={20} color={COLORS.accent.primary} />
        </View>
      </View>

      {/* Subtitle */}
      <Text style={styles.subtitle}>
        Gestiona tu negocio de transporte con total control
      </Text>

      {/* Menu Grid */}
      <View style={styles.grid}>
        {MENU_CARDS.map((card) => (
          <TouchableOpacity
            key={card.id}
            style={[
              styles.card,
              !card.available && styles.cardDisabled,
            ]}
            onPress={() => card.available && router.push(card.route as any)}
            activeOpacity={card.available ? 0.7 : 1}
          >
            {/* Icon container */}
            <View style={[styles.iconBox, { backgroundColor: card.color + '22' }]}>
              <Ionicons name={card.icon} size={26} color={card.color} />
            </View>

            <Text style={[styles.cardTitle, !card.available && styles.textDisabled]}>
              {card.title}
            </Text>
            <Text style={styles.cardSubtitle}>{card.subtitle}</Text>

            {card.available ? (
              <View style={[styles.badge, { backgroundColor: card.color }]}>
                <Text style={styles.badgeText}>Activo</Text>
              </View>
            ) : (
              <View style={styles.badgeSoon}>
                <Text style={styles.badgeSoonText}>Próximamente</Text>
              </View>
            )}
          </TouchableOpacity>
        ))}
      </View>

      {/* Footer */}
      <View style={styles.footer}>
        <Ionicons name="shield-checkmark" size={14} color={COLORS.text.muted} />
        <Text style={styles.footerText}>Datos almacenados localmente • Modo offline</Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.bg.primary,
    paddingHorizontal: SPACING.lg,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: SPACING.xl,
    marginBottom: SPACING.sm,
  },
  greeting: {
    fontSize: FONT.sizes.sm,
    color: COLORS.text.muted,
    fontWeight: FONT.weights.medium,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  appName: {
    fontSize: FONT.sizes.xxxl,
    color: COLORS.text.primary,
    fontWeight: FONT.weights.extrabold,
    letterSpacing: -1,
  },
  avatarContainer: {
    width: 44,
    height: 44,
    borderRadius: RADIUS.full,
    backgroundColor: COLORS.bg.elevated,
    borderWidth: 1,
    borderColor: COLORS.border.default,
    justifyContent: 'center',
    alignItems: 'center',
  },
  subtitle: {
    fontSize: FONT.sizes.md,
    color: COLORS.text.secondary,
    marginBottom: SPACING.xl,
    lineHeight: 22,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.md,
    flex: 1,
  },
  card: {
    width: (width - SPACING.lg * 2 - SPACING.md) / 2,
    backgroundColor: COLORS.bg.card,
    borderRadius: RADIUS.xl,
    padding: SPACING.lg,
    borderWidth: 1,
    borderColor: COLORS.border.default,
    gap: SPACING.xs,
  },
  cardDisabled: {
    opacity: 0.5,
  },
  iconBox: {
    width: 50,
    height: 50,
    borderRadius: RADIUS.lg,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: SPACING.sm,
  },
  cardTitle: {
    fontSize: FONT.sizes.md,
    color: COLORS.text.primary,
    fontWeight: FONT.weights.bold,
  },
  textDisabled: {
    color: COLORS.text.muted,
  },
  cardSubtitle: {
    fontSize: FONT.sizes.xs,
    color: COLORS.text.muted,
    lineHeight: 16,
    marginBottom: SPACING.sm,
  },
  badge: {
    alignSelf: 'flex-start',
    paddingHorizontal: SPACING.sm,
    paddingVertical: 3,
    borderRadius: RADIUS.full,
  },
  badgeText: {
    fontSize: FONT.sizes.xs,
    color: '#fff',
    fontWeight: FONT.weights.semibold,
  },
  badgeSoon: {
    alignSelf: 'flex-start',
    paddingHorizontal: SPACING.sm,
    paddingVertical: 3,
    borderRadius: RADIUS.full,
    backgroundColor: COLORS.bg.elevated,
  },
  badgeSoonText: {
    fontSize: FONT.sizes.xs,
    color: COLORS.text.muted,
    fontWeight: FONT.weights.medium,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.xs,
    paddingBottom: SPACING.xl,
    marginTop: SPACING.lg,
  },
  footerText: {
    fontSize: FONT.sizes.xs,
    color: COLORS.text.muted,
  },
});