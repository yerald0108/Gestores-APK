import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SPACING, FONT, RADIUS, TRANSPORT_CONFIG } from '@/constants/theme';

export default function RoutesMenuScreen() {
  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={20} color={COLORS.text.primary} />
        </TouchableOpacity>
        <View style={styles.headerTitle}>
          <Text style={styles.title}>Rutas y Precios</Text>
          <Text style={styles.subtitle}>Selecciona un medio de transporte</Text>
        </View>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        {Object.values(TRANSPORT_CONFIG).map((transport) => (
          <TouchableOpacity
            key={transport.key}
            style={styles.transportCard}
            onPress={() => router.push(`/routes/${transport.key}` as any)}
            activeOpacity={0.75}
          >
            <View style={[styles.iconWrapper, { backgroundColor: transport.color + '1A' }]}>
              <Ionicons name={transport.icon as any} size={32} color={transport.color} />
            </View>

            <View style={styles.cardInfo}>
              <Text style={styles.transportName}>{transport.label}</Text>
              <Text style={styles.transportDesc}>{transport.description}</Text>
            </View>

            <View style={[styles.arrow, { backgroundColor: transport.color + '1A' }]}>
              <Ionicons name="chevron-forward" size={18} color={transport.color} />
            </View>
          </TouchableOpacity>
        ))}

        <View style={styles.hint}>
          <Ionicons name="information-circle-outline" size={16} color={COLORS.text.muted} />
          <Text style={styles.hintText}>
            Toca un medio de transporte para ver y gestionar sus rutas
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.bg.primary,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.xl,
    paddingBottom: SPACING.lg,
    gap: SPACING.md,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: RADIUS.full,
    backgroundColor: COLORS.bg.card,
    borderWidth: 1,
    borderColor: COLORS.border.default,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    flex: 1,
  },
  title: {
    fontSize: FONT.sizes.xl,
    color: COLORS.text.primary,
    fontWeight: FONT.weights.bold,
  },
  subtitle: {
    fontSize: FONT.sizes.sm,
    color: COLORS.text.muted,
    marginTop: 2,
  },
  content: {
    paddingHorizontal: SPACING.lg,
    paddingBottom: SPACING.xxl,
    gap: SPACING.md,
  },
  transportCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.bg.card,
    borderRadius: RADIUS.xl,
    padding: SPACING.lg,
    borderWidth: 1,
    borderColor: COLORS.border.default,
    gap: SPACING.md,
  },
  iconWrapper: {
    width: 64,
    height: 64,
    borderRadius: RADIUS.lg,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardInfo: {
    flex: 1,
  },
  transportName: {
    fontSize: FONT.sizes.lg,
    color: COLORS.text.primary,
    fontWeight: FONT.weights.bold,
    marginBottom: 4,
  },
  transportDesc: {
    fontSize: FONT.sizes.sm,
    color: COLORS.text.secondary,
  },
  arrow: {
    width: 36,
    height: 36,
    borderRadius: RADIUS.full,
    justifyContent: 'center',
    alignItems: 'center',
  },
  hint: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: SPACING.xs,
    marginTop: SPACING.sm,
    paddingHorizontal: SPACING.sm,
  },
  hintText: {
    flex: 1,
    fontSize: FONT.sizes.xs,
    color: COLORS.text.muted,
    lineHeight: 18,
  },
});