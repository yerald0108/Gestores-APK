import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
  ActivityIndicator, Dimensions, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SPACING, FONT, RADIUS } from '@/constants/theme';
import { reservationsRepository } from '@/database/reservationsRepository';

const { width: SCREEN_W } = Dimensions.get('window');
const CHART_W = SCREEN_W - SPACING.lg * 2 - SPACING.md * 2; // padding del contenedor
const CHART_H = 160;

type Period = 'day' | 'week' | 'month';

interface PeriodData {
  label: string;
  ganancia: number;
  pasajeros: number;
  reservas: number;
}

interface GlobalStats {
  totalGanancia: number;
  totalPasajeros: number;
  totalReservas: number;
  totalPedidos: number;
  gananciaGestor: number;
  gananciaApp: number;
}

// ── Gráfico de barras ──────────────────────────────────────────────────────
function BarChart({
  data,
  valueKey,
  color,
  prefix = '',
  suffix = '',
}: {
  data: PeriodData[];
  valueKey: keyof PeriodData;
  color: string;
  prefix?: string;
  suffix?: string;
}) {
  if (!data.length) return <EmptyChart />;

  const values = data.map((d) => d[valueKey] as number);
  const maxVal = Math.max(...values, 1);
  const barW = Math.max(10, Math.floor((CHART_W - (data.length - 1) * 4) / data.length));
  const [selected, setSelected] = useState<number | null>(null);

  return (
    <View style={ch.wrapper}>
      {/* Tooltip */}
      {selected !== null && (
        <View style={[ch.tooltip, { borderColor: color + '66', backgroundColor: COLORS.bg.secondary }]}>
          <Text style={[ch.tooltipLabel, { color: COLORS.text.muted }]}>{data[selected].label}</Text>
          <Text style={[ch.tooltipVal, { color }]}>
            {prefix}{(data[selected][valueKey] as number).toFixed(valueKey === 'ganancia' ? 2 : 0)}{suffix}
          </Text>
        </View>
      )}

      {/* Barras */}
      <View style={ch.barsRow}>
        {data.map((d, i) => {
          const val = d[valueKey] as number;
          const heightPct = maxVal > 0 ? val / maxVal : 0;
          const barH = Math.max(4, heightPct * CHART_H);
          const isNeg = val < 0;
          const barColor = isNeg ? COLORS.accent.danger : color;
          const isSel = selected === i;
          return (
            <TouchableOpacity
              key={i}
              style={ch.barCol}
              onPress={() => setSelected(isSel ? null : i)}
              activeOpacity={0.7}
            >
              <View style={[
                ch.bar,
                {
                  height: barH,
                  width: barW,
                  backgroundColor: isSel ? barColor : barColor + 'BB',
                  borderRadius: 4,
                  borderWidth: isSel ? 1.5 : 0,
                  borderColor: barColor,
                }
              ]} />
              <Text style={[ch.barLabel, isSel && { color: color }]} numberOfLines={1}>
                {d.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Línea base */}
      <View style={[ch.baseline, { backgroundColor: COLORS.border.default }]} />
    </View>
  );
}

// ── Gráfico de líneas ──────────────────────────────────────────────────────
function LineChart({
  data,
  valueKey,
  color,
}: {
  data: PeriodData[];
  valueKey: keyof PeriodData;
  color: string;
}) {
  if (data.length < 2) return <BarChart data={data} valueKey={valueKey} color={color} />;

  const values = data.map((d) => d[valueKey] as number);
  const maxVal = Math.max(...values, 1);
  const minVal = Math.min(...values, 0);
  const range = maxVal - minVal || 1;
  const stepX = CHART_W / (data.length - 1);
  const [selected, setSelected] = useState<number | null>(null);

  const getY = (v: number) => CHART_H - ((v - minVal) / range) * (CHART_H - 16) - 8;

  // Construir path SVG-like pero con View absolutos para RN
  const points = values.map((v, i) => ({ x: i * stepX, y: getY(v) }));

  return (
    <View style={ch.wrapper}>
      {selected !== null && (
        <View style={[ch.tooltip, { borderColor: color + '66', backgroundColor: COLORS.bg.secondary }]}>
          <Text style={[ch.tooltipLabel, { color: COLORS.text.muted }]}>{data[selected].label}</Text>
          <Text style={[ch.tooltipVal, { color }]}>
            {(data[selected][valueKey] as number).toFixed(valueKey === 'ganancia' ? 2 : 0)}
          </Text>
        </View>
      )}

      <View style={[ch.lineContainer, { height: CHART_H + 24 }]}>
        {/* Segmentos de línea */}
        {points.slice(0, -1).map((pt, i) => {
          const next = points[i + 1];
          const dx = next.x - pt.x;
          const dy = next.y - pt.y;
          const len = Math.sqrt(dx * dx + dy * dy);
          const angle = Math.atan2(dy, dx) * (180 / Math.PI);
          return (
            <View
              key={i}
              style={{
                position: 'absolute',
                left: pt.x,
                top: pt.y,
                width: len,
                height: 2,
                backgroundColor: color + 'AA',
                transform: [{ rotate: `${angle}deg` }],
                transformOrigin: '0 0',
              }}
            />
          );
        })}

        {/* Puntos */}
        {points.map((pt, i) => {
          const isSel = selected === i;
          return (
            <TouchableOpacity
              key={i}
              onPress={() => setSelected(isSel ? null : i)}
              style={{
                position: 'absolute',
                left: pt.x - (isSel ? 7 : 5),
                top: pt.y - (isSel ? 7 : 5),
                width: isSel ? 14 : 10,
                height: isSel ? 14 : 10,
                borderRadius: isSel ? 7 : 5,
                backgroundColor: isSel ? color : color + 'DD',
                borderWidth: isSel ? 2 : 0,
                borderColor: '#fff',
              }}
            />
          );
        })}

        {/* Labels eje X */}
        {data.map((d, i) => (
          <Text
            key={i}
            style={[ch.barLabel, {
              position: 'absolute',
              left: points[i].x - 14,
              top: CHART_H + 4,
              width: 28,
              textAlign: 'center',
              color: selected === i ? color : COLORS.text.muted,
            }]}
            numberOfLines={1}
          >
            {d.label}
          </Text>
        ))}
      </View>

      <View style={[ch.baseline, { backgroundColor: COLORS.border.default }]} />
    </View>
  );
}

// ── Gráfico de dona (distribución gestor vs app) ──────────────────────────
function DonutChart({ gestor, app }: { gestor: number; app: number }) {
  const total = gestor + app || 1;
  const pctGestor = Math.round((gestor / total) * 100);
  const pctApp = 100 - pctGestor;
  const SIZE = 120;
  const STROKE = 16;
  const R = (SIZE - STROKE) / 2;
  const CIRC = 2 * Math.PI * R;
  const dashGestor = (pctGestor / 100) * CIRC;
  const dashApp = (pctApp / 100) * CIRC;

  return (
    <View style={donut.wrapper}>
      {/* Simulamos la dona con dos arcos usando Views superpuestos */}
      <View style={[donut.ring, { width: SIZE, height: SIZE, borderRadius: SIZE / 2, borderWidth: STROKE, borderColor: COLORS.accent.primary + '33' }]}>
        {/* Segmento gestor — overlay visual simple */}
        <View style={donut.center}>
          <Text style={donut.centerPct}>{pctGestor}%</Text>
          <Text style={donut.centerLabel}>Gestor</Text>
        </View>
      </View>
      {/* Leyenda */}
      <View style={donut.legend}>
        <View style={donut.legendItem}>
          <View style={[donut.legendDot, { backgroundColor: COLORS.accent.warning }]} />
          <View>
            <Text style={donut.legendLabel}>Vía gestor</Text>
            <Text style={[donut.legendVal, { color: COLORS.accent.warning }]}>
              {gestor.toFixed(2)} CUP
            </Text>
            <Text style={donut.legendPct}>{pctGestor}%</Text>
          </View>
        </View>
        <View style={donut.legendItem}>
          <View style={[donut.legendDot, { backgroundColor: COLORS.accent.primary }]} />
          <View>
            <Text style={donut.legendLabel}>Vía app</Text>
            <Text style={[donut.legendVal, { color: COLORS.accent.primary }]}>
              {app.toFixed(2)} CUP
            </Text>
            <Text style={donut.legendPct}>{pctApp}%</Text>
          </View>
        </View>
      </View>
    </View>
  );
}

const donut = StyleSheet.create({
  wrapper: { flexDirection: 'row', alignItems: 'center', gap: SPACING.lg, paddingVertical: SPACING.sm },
  ring: { justifyContent: 'center', alignItems: 'center' },
  center: { alignItems: 'center' },
  centerPct: { fontSize: FONT.sizes.lg, color: COLORS.text.primary, fontWeight: FONT.weights.extrabold },
  centerLabel: { fontSize: FONT.sizes.xs, color: COLORS.text.muted },
  legend: { flex: 1, gap: SPACING.md },
  legendItem: { flexDirection: 'row', alignItems: 'flex-start', gap: SPACING.sm },
  legendDot: { width: 10, height: 10, borderRadius: 5, marginTop: 2 },
  legendLabel: { fontSize: FONT.sizes.xs, color: COLORS.text.muted },
  legendVal: { fontSize: FONT.sizes.md, fontWeight: FONT.weights.bold },
  legendPct: { fontSize: FONT.sizes.xs, color: COLORS.text.muted },
});

function EmptyChart() {
  return (
    <View style={ch.empty}>
      <Ionicons name="bar-chart-outline" size={32} color={COLORS.text.muted} />
      <Text style={ch.emptyText}>Sin datos para este período</Text>
    </View>
  );
}

const ch = StyleSheet.create({
  wrapper: { position: 'relative', paddingTop: SPACING.sm },
  barsRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 4, height: CHART_H + 24, paddingBottom: 20 },
  barCol: { alignItems: 'center', justifyContent: 'flex-end', flex: 1 },
  bar: { minHeight: 4 },
  barLabel: { fontSize: 9, color: COLORS.text.muted, marginTop: 4, textAlign: 'center' },
  baseline: { height: 1, marginTop: -20, marginBottom: SPACING.xs },
  tooltip: { position: 'absolute', top: -8, alignSelf: 'center', zIndex: 10, paddingHorizontal: SPACING.sm, paddingVertical: 4, borderRadius: RADIUS.md, borderWidth: 1, minWidth: 80, alignItems: 'center' },
  tooltipLabel: { fontSize: FONT.sizes.xs },
  tooltipVal: { fontSize: FONT.sizes.md, fontWeight: FONT.weights.bold },
  lineContainer: { position: 'relative', width: CHART_W },
  empty: { height: CHART_H, justifyContent: 'center', alignItems: 'center', gap: SPACING.sm },
  emptyText: { fontSize: FONT.sizes.sm, color: COLORS.text.muted },
});

// ── Tarjeta KPI ───────────────────────────────────────────────────────────
function KpiCard({ icon, label, value, sub, color }: {
  icon: string; label: string; value: string; sub?: string; color: string;
}) {
  return (
    <View style={[kpi.card, { borderColor: color + '33' }]}>
      <View style={[kpi.iconWrap, { backgroundColor: color + '1A' }]}>
        <Ionicons name={icon as any} size={20} color={color} />
      </View>
      <Text style={kpi.label} numberOfLines={1}>{label}</Text>
      <Text style={[kpi.value, { color }]} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.6}>
        {value}
      </Text>
      {sub && <Text style={kpi.sub} numberOfLines={1}>{sub}</Text>}
    </View>
  );
}
const kpi = StyleSheet.create({
  card: { flex: 1, backgroundColor: COLORS.bg.card, borderRadius: RADIUS.xl, padding: SPACING.md, borderWidth: 1, alignItems: 'center', gap: 4 },
  iconWrap: { width: 40, height: 40, borderRadius: RADIUS.full, justifyContent: 'center', alignItems: 'center' },
  label: { fontSize: 10, color: COLORS.text.muted, textAlign: 'center', marginTop: 2 },
  value: { fontSize: FONT.sizes.lg, fontWeight: FONT.weights.extrabold, textAlign: 'center' },
  sub: { fontSize: 9, color: COLORS.text.muted, textAlign: 'center' },
});

// ── Sección de gráfico con título ─────────────────────────────────────────
function ChartSection({ title, subtitle, children }: {
  title: string; subtitle?: string; children: React.ReactNode;
}) {
  return (
    <View style={cs.card}>
      <View style={cs.header}>
        <Text style={cs.title}>{title}</Text>
        {subtitle && <Text style={cs.sub}>{subtitle}</Text>}
      </View>
      {children}
    </View>
  );
}
const cs = StyleSheet.create({
  card: { backgroundColor: COLORS.bg.card, borderRadius: RADIUS.xl, padding: SPACING.lg, borderWidth: 1, borderColor: COLORS.border.default, gap: SPACING.md },
  header: { gap: 2 },
  title: { fontSize: FONT.sizes.md, color: COLORS.text.primary, fontWeight: FONT.weights.bold },
  sub: { fontSize: FONT.sizes.xs, color: COLORS.text.muted },
});

// ── Selector de período ───────────────────────────────────────────────────
function PeriodSelector({ value, onChange }: { value: Period; onChange: (p: Period) => void }) {
  const opts: { key: Period; label: string }[] = [
    { key: 'day', label: 'Diario' },
    { key: 'week', label: 'Semanal' },
    { key: 'month', label: 'Mensual' },
  ];
  return (
    <View style={ps.row}>
      {opts.map((o) => (
        <TouchableOpacity
          key={o.key}
          style={[ps.btn, value === o.key && ps.btnActive]}
          onPress={() => onChange(o.key)}
        >
          <Text style={[ps.label, value === o.key && ps.labelActive]}>{o.label}</Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}
const ps = StyleSheet.create({
  row: { flexDirection: 'row', backgroundColor: COLORS.bg.card, borderRadius: RADIUS.full, padding: 3, borderWidth: 1, borderColor: COLORS.border.default },
  btn: { flex: 1, paddingVertical: SPACING.xs + 1, borderRadius: RADIUS.full, alignItems: 'center' },
  btnActive: { backgroundColor: COLORS.accent.primary },
  label: { fontSize: FONT.sizes.sm, color: COLORS.text.muted, fontWeight: FONT.weights.medium },
  labelActive: { color: '#fff', fontWeight: FONT.weights.bold },
});

// ── Pantalla principal ────────────────────────────────────────────────────
export default function ReportsScreen() {
  const [period, setPeriod] = useState<Period>('day');
  const [global, setGlobal] = useState<GlobalStats | null>(null);
  const [periodData, setPeriodData] = useState<PeriodData[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async (p: Period) => {
    try {
      setLoading(true);
      const [g, pd] = await Promise.all([
        reservationsRepository.getStatsAll(),
        reservationsRepository.getStatsByPeriod(p),
      ]);
      setGlobal(g);
      setPeriodData(pd);
    } catch (err) {
      console.error('[ReportsScreen] Error al cargar estadísticas:', err);
      Alert.alert('Error', 'No se pudieron cargar los reportes. Intenta de nuevo.');
    } finally {
      setLoading(false);
    }
  }, []);

  // useFocusEffect recarga al volver a la pantalla Y cuando cambia el período.
  // No se necesita un useEffect adicional para 'period' — haría una doble carga.
  useFocusEffect(useCallback(() => { load(period); }, [period]));

  const periodLabel = period === 'day' ? 'últimos 14 días' : period === 'week' ? 'últimas 8 semanas' : 'últimos 6 meses';

  return (
    <SafeAreaView style={s.container}>
      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity style={s.backBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={20} color={COLORS.text.primary} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={s.title}>Reportes</Text>
          <Text style={s.subtitle}>Estadísticas y análisis de negocio</Text>
        </View>
      </View>

      {loading ? (
        <View style={s.centered}>
          <ActivityIndicator color={COLORS.accent.primary} size="large" />
        </View>
      ) : (
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.content}>

          {/* ── KPIs globales ── */}
          <View style={s.kpiGrid}>
            <KpiCard
              icon="trending-up"
              label="Ganancia total"
              value={`${global!.totalGanancia >= 0 ? '+' : ''}${global!.totalGanancia.toFixed(0)}`}
              sub="CUP acumulado"
              color={COLORS.accent.success}
            />
            <KpiCard
              icon="people"
              label="Pasajeros"
              value={`${global!.totalPasajeros}`}
              sub="en reservas"
              color={COLORS.accent.primary}
            />
          </View>
          <View style={s.kpiGrid}>
            <KpiCard
              icon="checkmark-circle"
              label="Reservas"
              value={`${global!.totalReservas}`}
              sub="confirmadas"
              color={COLORS.accent.success}
            />
            <KpiCard
              icon="cart"
              label="Pedidos"
              value={`${global!.totalPedidos}`}
              sub="pendientes"
              color={COLORS.accent.warning}
            />
          </View>

          {/* ── Selector de período ── */}
          <PeriodSelector value={period} onChange={setPeriod} />

          {/* ── Gráfico de barras: Ganancias ── */}
          <ChartSection
            title="Ganancias por período"
            subtitle={`CUP — ${periodLabel}`}
          >
            <BarChart
              data={periodData}
              valueKey="ganancia"
              color={COLORS.accent.success}
              prefix="+"
              suffix=" CUP"
            />
          </ChartSection>

          {/* ── Gráfico de líneas: Pasajeros ── */}
          <ChartSection
            title="Pasajeros por período"
            subtitle={periodLabel}
          >
            <LineChart
              data={periodData}
              valueKey="pasajeros"
              color={COLORS.accent.primary}
            />
          </ChartSection>

          {/* ── Gráfico de barras: Reservas ── */}
          <ChartSection
            title="Reservas por período"
            subtitle={periodLabel}
          >
            <BarChart
              data={periodData}
              valueKey="reservas"
              color={COLORS.accent.secondary}
              suffix=" res."
            />
          </ChartSection>

          {/* ── Distribución gestor vs app ── */}
          <ChartSection
            title="Distribución de ganancias"
            subtitle="Gestor vs App"
          >
            <DonutChart
              gestor={global!.gananciaGestor}
              app={global!.gananciaApp}
            />
          </ChartSection>

          {/* ── Resumen período actual ── */}
          {periodData.length > 0 && (
            <ChartSection
              title={`Resumen — ${periodLabel}`}
              subtitle="Toca una barra para ver el detalle"
            >
              <View style={s.periodTable}>
                <View style={s.periodHeader}>
                  <Text style={[s.periodCell, { flex: 1.2 }]}>Período</Text>
                  <Text style={[s.periodCell, { flex: 1.5, textAlign: 'right' }]}>Ganancia</Text>
                  <Text style={[s.periodCell, { flex: 0.8, textAlign: 'center' }]}>Pax</Text>
                  <Text style={[s.periodCell, { flex: 0.8, textAlign: 'center' }]}>Res.</Text>
                </View>
                {[...periodData].reverse().map((d, i) => (
                  <View key={i} style={[s.periodRow, i % 2 === 0 && { backgroundColor: COLORS.bg.elevated }]}>
                    <Text style={[s.periodVal, { flex: 1.2 }]}>{d.label}</Text>
                    <Text style={[s.periodVal, { flex: 1.5, textAlign: 'right', color: d.ganancia >= 0 ? COLORS.accent.success : COLORS.accent.danger }]}>
                      {d.ganancia >= 0 ? '+' : ''}{d.ganancia.toFixed(2)}
                    </Text>
                    <Text style={[s.periodVal, { flex: 0.8, textAlign: 'center', color: COLORS.accent.primary }]}>{d.pasajeros}</Text>
                    <Text style={[s.periodVal, { flex: 0.8, textAlign: 'center', color: COLORS.accent.secondary }]}>{d.reservas}</Text>
                  </View>
                ))}
              </View>
            </ChartSection>
          )}

        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg.primary },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: SPACING.lg, paddingTop: SPACING.md, paddingBottom: SPACING.lg, gap: SPACING.sm },
  backBtn: { width: 40, height: 40, borderRadius: RADIUS.full, backgroundColor: COLORS.bg.card, borderWidth: 1, borderColor: COLORS.border.default, justifyContent: 'center', alignItems: 'center' },
  title: { fontSize: FONT.sizes.xl, color: COLORS.text.primary, fontWeight: FONT.weights.bold },
  subtitle: { fontSize: FONT.sizes.xs, color: COLORS.text.muted, marginTop: 2 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  content: { paddingHorizontal: SPACING.lg, paddingBottom: SPACING.xxl, gap: SPACING.md },
  kpiGrid: { flexDirection: 'row', gap: SPACING.md },
  periodTable: { gap: 2 },
  periodHeader: { flexDirection: 'row', paddingVertical: SPACING.xs, paddingHorizontal: SPACING.sm, borderBottomWidth: 1, borderBottomColor: COLORS.border.default },
  periodCell: { fontSize: FONT.sizes.xs, color: COLORS.text.muted, fontWeight: FONT.weights.semibold, textTransform: 'uppercase', letterSpacing: 0.5 },
  periodRow: { flexDirection: 'row', paddingVertical: SPACING.sm, paddingHorizontal: SPACING.sm, borderRadius: RADIUS.sm },
  periodVal: { fontSize: FONT.sizes.sm, color: COLORS.text.primary, fontWeight: FONT.weights.medium },
});