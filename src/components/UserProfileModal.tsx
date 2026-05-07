import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, Modal,
  TextInput, ScrollView, Alert, KeyboardAvoidingView, Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SPACING, FONT, RADIUS } from '@/constants/theme';
import {
  userProfileService, UserProfile, BankCard, BankType, BANK_CONFIG,
} from '@/services/userProfileService';
import { useGlobalToast } from '@/components/ui/Toast';

// ── Selector de banco ──────────────────────────────────────────────────────
function BankSelector({ selected, onSelect }: {
  selected: BankType | null;
  onSelect: (b: BankType) => void;
}) {
  return (
    <View style={bs.grid}>
      {(Object.keys(BANK_CONFIG) as BankType[]).map((key) => {
        const cfg = BANK_CONFIG[key];
        const isSel = selected === key;
        return (
          <TouchableOpacity
            key={key}
            style={[bs.btn, { borderColor: isSel ? cfg.color : COLORS.border.default, backgroundColor: isSel ? cfg.color + '1A' : COLORS.bg.input }]}
            onPress={() => onSelect(key)}
            activeOpacity={0.7}
          >
            <View style={[bs.dot, { backgroundColor: cfg.color }]} />
            <Text style={[bs.label, { color: isSel ? cfg.color : COLORS.text.secondary }]}>
              {cfg.label}
            </Text>
            {isSel && <Ionicons name="checkmark-circle" size={14} color={cfg.color} />}
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const bs = StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.sm },
  btn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: SPACING.sm + 2, paddingVertical: SPACING.sm, borderRadius: RADIUS.full, borderWidth: 1.5, flexShrink: 1 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  label: { fontSize: FONT.sizes.sm, fontWeight: FONT.weights.semibold },
});

// ── Tarjeta bancaria (ítem de lista) ────────────────────────────────────────
function CardItem({ card, onRemove }: { card: BankCard; onRemove: () => void }) {
  const cfg = BANK_CONFIG[card.bank];
  const last4 = card.cardNumber.slice(-4);
  return (
    <View style={[ci.card, { borderColor: cfg.color + '44' }]}>
      <View style={[ci.iconWrap, { backgroundColor: cfg.color + '1A' }]}>
        <Ionicons name={cfg.icon as any} size={18} color={cfg.color} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={[ci.bank, { color: cfg.color }]}>{cfg.label}</Text>
        <Text style={ci.number}>•••• •••• •••• {last4}</Text>
      </View>
      <TouchableOpacity style={ci.removeBtn} onPress={onRemove}>
        <Ionicons name="close" size={16} color={COLORS.accent.danger} />
      </TouchableOpacity>
    </View>
  );
}

const ci = StyleSheet.create({
  card: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm, backgroundColor: COLORS.bg.elevated, borderRadius: RADIUS.lg, padding: SPACING.md, borderWidth: 1 },
  iconWrap: { width: 36, height: 36, borderRadius: RADIUS.md, justifyContent: 'center', alignItems: 'center' },
  bank: { fontSize: FONT.sizes.sm, fontWeight: FONT.weights.bold },
  number: { fontSize: FONT.sizes.xs, color: COLORS.text.muted, marginTop: 1 },
  removeBtn: { width: 28, height: 28, borderRadius: RADIUS.full, backgroundColor: COLORS.accent.danger + '1A', justifyContent: 'center', alignItems: 'center' },
});

// ── Formulario añadir tarjeta ───────────────────────────────────────────────
function AddCardForm({ onAdd, onCancel }: {
  onAdd: (card: Omit<BankCard, 'id'>) => void;
  onCancel: () => void;
}) {
  const [bank, setBank] = useState<BankType | null>(null);
  const [number, setNumber] = useState('');
  const [error, setError] = useState('');

  const handleAdd = () => {
    if (!bank) { setError('Selecciona un banco'); return; }
    if (number.replace(/\D/g, '').length < 4) { setError('Ingresa al menos 4 dígitos'); return; }
    onAdd({ bank, cardNumber: number.replace(/\s/g, ''), label: BANK_CONFIG[bank].label });
    setBank(null);
    setNumber('');
    setError('');
  };

  const formatCardNumber = (v: string) => {
    const digits = v.replace(/\D/g, '').slice(0, 16);
    return digits.replace(/(.{4})/g, '$1 ').trim();
  };

  return (
    <View style={[af.form, { borderColor: bank ? BANK_CONFIG[bank].color + '44' : COLORS.border.default }]}>
      <Text style={af.title}>Nueva tarjeta</Text>
      <BankSelector selected={bank} onSelect={(b) => { setBank(b); setError(''); }} />
      <View style={[af.inputRow, error && !bank ? af.inputErr : null]}>
        <View style={[af.iconWrap, { backgroundColor: bank ? BANK_CONFIG[bank].color + '1A' : COLORS.bg.elevated }]}>
          <Ionicons name="card-outline" size={16} color={bank ? BANK_CONFIG[bank].color : COLORS.text.muted} />
        </View>
        <TextInput
          style={af.input}
          placeholder="Número de tarjeta"
          placeholderTextColor={COLORS.text.muted}
          value={number}
          onChangeText={(v) => { setNumber(formatCardNumber(v)); setError(''); }}
          keyboardType="numeric"
          maxLength={19}
        />
      </View>
      {error ? <Text style={af.error}>{error}</Text> : null}
      <View style={af.btnRow}>
        <TouchableOpacity style={af.cancelBtn} onPress={onCancel}>
          <Text style={af.cancelText}>Cancelar</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[af.addBtn, { backgroundColor: bank ? BANK_CONFIG[bank].color : COLORS.accent.primary }]}
          onPress={handleAdd}
        >
          <Ionicons name="add" size={16} color="#fff" />
          <Text style={af.addText}>Añadir</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const af = StyleSheet.create({
  form: { backgroundColor: COLORS.bg.elevated, borderRadius: RADIUS.xl, padding: SPACING.md, borderWidth: 1, gap: SPACING.sm },
  title: { fontSize: FONT.sizes.sm, color: COLORS.text.secondary, fontWeight: FONT.weights.semibold, textTransform: 'uppercase', letterSpacing: 0.5 },
  inputRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm, backgroundColor: COLORS.bg.input, borderRadius: RADIUS.lg, borderWidth: 1, borderColor: COLORS.border.default, paddingHorizontal: SPACING.md, paddingVertical: SPACING.sm },
  inputErr: { borderColor: COLORS.accent.danger },
  iconWrap: { width: 30, height: 30, borderRadius: RADIUS.md, justifyContent: 'center', alignItems: 'center' },
  input: { flex: 1, fontSize: FONT.sizes.md, color: COLORS.text.primary, letterSpacing: 1 },
  error: { fontSize: FONT.sizes.xs, color: COLORS.accent.danger },
  btnRow: { flexDirection: 'row', gap: SPACING.sm, marginTop: SPACING.xs },
  cancelBtn: { flex: 1, paddingVertical: SPACING.sm, borderRadius: RADIUS.full, backgroundColor: COLORS.bg.card, alignItems: 'center', borderWidth: 1, borderColor: COLORS.border.default },
  cancelText: { fontSize: FONT.sizes.sm, color: COLORS.text.secondary, fontWeight: FONT.weights.medium },
  addBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4, paddingVertical: SPACING.sm, borderRadius: RADIUS.full },
  addText: { fontSize: FONT.sizes.sm, color: '#fff', fontWeight: FONT.weights.bold },
});

// ── Modal principal ─────────────────────────────────────────────────────────
interface Props {
  visible: boolean;
  onClose: () => void;
}

export default function UserProfileModal({ visible, onClose }: Props) {
  const [profile, setProfile] = useState<UserProfile>({ name: '', phone: '', cards: [] });
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [showAddCard, setShowAddCard] = useState(false);
  const [saving, setSaving] = useState(false);
  const toast = useGlobalToast();

  useEffect(() => {
    if (visible) {
      userProfileService.get().then((p) => {
        setProfile(p);
        setName(p.name);
        setPhone(p.phone);
      });
    }
  }, [visible]);

  const handleSaveProfile = async () => {
    setSaving(true);
    const updated = await userProfileService.updateProfile(name.trim(), phone.trim());
    setProfile(updated);
    setSaving(false);
    toast.show({
      message: 'Perfil actualizado correctamente',
      type: 'success',
    });
  };

  const handleAddCard = async (card: Omit<BankCard, 'id'>) => {
    const updated = await userProfileService.addCard(card);
    setProfile(updated);
    setShowAddCard(false);
  };

  const handleRemoveCard = (cardId: string) => {
    Alert.alert('Eliminar tarjeta', '¿Eliminar esta tarjeta?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Eliminar', style: 'destructive',
        onPress: async () => {
          const updated = await userProfileService.removeCard(cardId);
          setProfile(updated);
        },
      },
    ]);
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={m.overlay}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={{ width: '100%' }}
        >
          <View style={m.sheet}>
            {/* Handle */}
            <View style={m.handle} />

            {/* Header */}
            <View style={m.header}>
              <View style={[m.avatar, { backgroundColor: COLORS.accent.primary + '1A' }]}>
                <Ionicons name="person" size={22} color={COLORS.accent.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={m.title}>Mi perfil</Text>
                <Text style={m.subtitle}>Configuración del gestor</Text>
              </View>
              <TouchableOpacity style={m.closeBtn} onPress={onClose}>
                <Ionicons name="close" size={20} color={COLORS.text.secondary} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={m.content}>

              {/* ── Datos personales ── */}
              <Text style={m.sectionTitle}>Datos personales</Text>

              <View style={m.fieldGroup}>
                <Text style={m.label}>Nombre del gestor</Text>
                <View style={m.inputRow}>
                  <View style={[m.inputIcon, { backgroundColor: COLORS.accent.primary + '1A' }]}>
                    <Ionicons name="person-outline" size={16} color={COLORS.accent.primary} />
                  </View>
                  <TextInput
                    style={m.input}
                    placeholder="Tu nombre completo"
                    placeholderTextColor={COLORS.text.muted}
                    value={name}
                    onChangeText={setName}
                    autoCapitalize="words"
                  />
                </View>
              </View>

              <View style={m.fieldGroup}>
                <Text style={m.label}>Teléfono (número a confirmar)</Text>
                <View style={m.inputRow}>
                  <View style={[m.inputIcon, { backgroundColor: COLORS.accent.primary + '1A' }]}>
                    <Ionicons name="call-outline" size={16} color={COLORS.accent.primary} />
                  </View>
                  <TextInput
                    style={m.input}
                    placeholder="Ej: 55123456"
                    placeholderTextColor={COLORS.text.muted}
                    value={phone}
                    onChangeText={setPhone}
                    keyboardType="phone-pad"
                  />
                </View>
                <Text style={m.hint}>Este número aparecerá al elegir Metropolitano, BANDEC o BPA en los pedidos</Text>
              </View>

              <TouchableOpacity
                style={[m.saveBtn, saving && { opacity: 0.6 }]}
                onPress={handleSaveProfile}
                disabled={saving}
              >
                <Ionicons name="checkmark" size={16} color="#fff" />
                <Text style={m.saveBtnText}>Guardar perfil</Text>
              </TouchableOpacity>

              {/* ── Tarjetas bancarias ── */}
              <View style={m.sectionHeader}>
                <Text style={m.sectionTitle}>Tarjetas bancarias</Text>
                <TouchableOpacity
                  style={[m.addCardBtn, showAddCard && { backgroundColor: COLORS.bg.elevated }]}
                  onPress={() => setShowAddCard(!showAddCard)}
                >
                  <Ionicons name={showAddCard ? 'remove' : 'add'} size={16} color={COLORS.accent.primary} />
                  <Text style={m.addCardText}>{showAddCard ? 'Cancelar' : 'Añadir'}</Text>
                </TouchableOpacity>
              </View>

              {showAddCard && (
                <AddCardForm
                  onAdd={handleAddCard}
                  onCancel={() => setShowAddCard(false)}
                />
              )}

              {profile.cards.length === 0 && !showAddCard ? (
                <View style={m.emptyCards}>
                  <Ionicons name="card-outline" size={28} color={COLORS.text.muted} />
                  <Text style={m.emptyCardsText}>No tienes tarjetas registradas</Text>
                </View>
              ) : (
                profile.cards.map((card) => (
                  <CardItem
                    key={card.id}
                    card={card}
                    onRemove={() => handleRemoveCard(card.id)}
                  />
                ))
              )}

            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}

const m = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.65)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: COLORS.bg.secondary, borderTopLeftRadius: 28, borderTopRightRadius: 28, maxHeight: '90%' },
  handle: { width: 40, height: 4, backgroundColor: COLORS.border.default, borderRadius: 2, alignSelf: 'center', marginTop: 12, marginBottom: 4 },
  header: { flexDirection: 'row', alignItems: 'center', gap: SPACING.md, paddingHorizontal: SPACING.lg, paddingVertical: SPACING.md, borderBottomWidth: 1, borderBottomColor: COLORS.border.default },
  avatar: { width: 44, height: 44, borderRadius: RADIUS.full, justifyContent: 'center', alignItems: 'center' },
  title: { fontSize: FONT.sizes.lg, color: COLORS.text.primary, fontWeight: FONT.weights.bold },
  subtitle: { fontSize: FONT.sizes.xs, color: COLORS.text.muted, marginTop: 1 },
  closeBtn: { width: 36, height: 36, borderRadius: RADIUS.full, backgroundColor: COLORS.bg.elevated, justifyContent: 'center', alignItems: 'center' },
  content: { padding: SPACING.lg, gap: SPACING.md, paddingBottom: 40 },
  sectionTitle: { fontSize: FONT.sizes.sm, color: COLORS.text.muted, fontWeight: FONT.weights.semibold, textTransform: 'uppercase', letterSpacing: 0.8 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  fieldGroup: { gap: SPACING.xs },
  label: { fontSize: FONT.sizes.sm, color: COLORS.text.secondary, fontWeight: FONT.weights.semibold },
  inputRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm, backgroundColor: COLORS.bg.input, borderRadius: RADIUS.lg, borderWidth: 1, borderColor: COLORS.border.default, paddingHorizontal: SPACING.md, paddingVertical: SPACING.sm },
  inputIcon: { width: 32, height: 32, borderRadius: RADIUS.md, justifyContent: 'center', alignItems: 'center' },
  input: { flex: 1, fontSize: FONT.sizes.md, color: COLORS.text.primary, paddingVertical: SPACING.xs },
  hint: { fontSize: FONT.sizes.xs, color: COLORS.text.muted, lineHeight: 16 },
  saveBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: SPACING.xs, paddingVertical: SPACING.sm + 2, borderRadius: RADIUS.full, backgroundColor: COLORS.accent.primary },
  saveBtnText: { color: '#fff', fontSize: FONT.sizes.md, fontWeight: FONT.weights.bold },
  addCardBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: SPACING.sm, paddingVertical: 4, borderRadius: RADIUS.full, borderWidth: 1, borderColor: COLORS.accent.primary + '66' },
  addCardText: { fontSize: FONT.sizes.sm, color: COLORS.accent.primary, fontWeight: FONT.weights.semibold },
  emptyCards: { alignItems: 'center', gap: SPACING.sm, paddingVertical: SPACING.lg, opacity: 0.5 },
  emptyCardsText: { fontSize: FONT.sizes.sm, color: COLORS.text.muted },
});