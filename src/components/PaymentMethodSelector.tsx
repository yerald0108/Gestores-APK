import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, Modal,
  FlatList, TextInput, Animated, KeyboardAvoidingView, Platform, PanResponder,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SPACING, FONT, RADIUS } from '@/constants/theme';
import {
  userProfileService, BankCard, BankType, BANK_CONFIG,
} from '@/services/userProfileService';

export interface PaymentSelection {
  card: BankCard;
  confirmNumber: string; // teléfono del gestor o número MiTransfer manual
}

interface Props {
  visible: boolean;
  onSelect: (selection: PaymentSelection) => void;
  onClose: () => void;
}

export default function PaymentMethodSelector({ visible, onSelect, onClose }: Props) {
  const [cards, setCards] = useState<BankCard[]>([]);
  const [gestorPhone, setGestorPhone] = useState('');
  const [selectedCard, setSelectedCard] = useState<BankCard | null>(null);
  const [miTransferNumber, setMiTransferNumber] = useState('');
  const [error, setError] = useState('');

  const [show, setShow] = useState(visible);
  const fadeAnim = React.useRef(new Animated.Value(0)).current;
  const slideAnim = React.useRef(new Animated.Value(500)).current;

  // PanResponder para el gesto de deslizar hacia abajo
  const panResponder = React.useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, gestureState) => {
        return gestureState.dy > 5;
      },
      onPanResponderMove: (_, gestureState) => {
        if (gestureState.dy > 0) {
          slideAnim.setValue(gestureState.dy);
        }
      },
      onPanResponderRelease: (_, gestureState) => {
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
    if (visible) {
      userProfileService.get().then((p) => {
        setCards(p.cards);
        setGestorPhone(p.phone);
        setSelectedCard(null);
        setMiTransferNumber('');
        setError('');
      });
    }
  }, [visible]);

  const isMiTransfer = selectedCard?.bank === 'mitransfer';

  const handleConfirm = () => {
    if (!selectedCard) { setError('Selecciona un método de pago'); return; }
    if (isMiTransfer && !miTransferNumber.trim()) {
      setError('Ingresa el número de MiTransfer');
      return;
    }
    const confirmNumber = isMiTransfer ? miTransferNumber.trim() : gestorPhone;
    onSelect({ card: selectedCard, confirmNumber });
    onClose();
  };

  if (!show) return null;

  return (
    <Modal visible={show} transparent animationType="none" onRequestClose={onClose}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <Animated.View style={[s.overlay, { opacity: fadeAnim }]}>
          <TouchableOpacity style={{ flex: 1 }} activeOpacity={1} onPress={closeModal} />
          <Animated.View 
            style={[
              s.sheet, 
              { transform: [{ translateY: slideAnim }] }
            ]}
          >
            {/* Area de arrastre */}
            <View {...panResponder.panHandlers} style={s.dragArea}>
              <View style={s.handle} />

              {/* Header */}
              <View style={s.header}>
                <View style={[s.headerIcon, { backgroundColor: COLORS.accent.primary + '1A' }]}>
                  <Ionicons name="wallet-outline" size={18} color={COLORS.accent.primary} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={s.title}>Método de pago</Text>
                  <Text style={s.subtitle}>Elige una tarjeta configurada</Text>
                </View>
                <TouchableOpacity style={s.closeBtn} onPress={closeModal}>
                  <Ionicons name="close" size={20} color={COLORS.text.secondary} />
                </TouchableOpacity>
              </View>
            </View>

            {/* Lista de tarjetas */}
            {cards.length === 0 ? (
              <View style={s.empty}>
                <Ionicons name="card-outline" size={36} color={COLORS.text.muted} />
                <Text style={s.emptyTitle}>Sin tarjetas configuradas</Text>
                <Text style={s.emptyText}>Ve a tu perfil (icono usuario en el inicio) y añade tarjetas bancarias.</Text>
              </View>
            ) : (
              <FlatList
                data={cards}
                keyExtractor={(c) => c.id}
                contentContainerStyle={s.list}
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
                renderItem={({ item }) => {
                  const cfg = BANK_CONFIG[item.bank];
                  const isSel = selectedCard?.id === item.id;
                  const last4 = item.cardNumber.slice(-4);
                  return (
                    <TouchableOpacity
                      style={[s.cardItem, {
                        borderColor: isSel ? cfg.color : COLORS.border.default,
                        backgroundColor: isSel ? cfg.color + '10' : COLORS.bg.card,
                      }]}
                      onPress={() => { setSelectedCard(item); setError(''); setMiTransferNumber(''); }}
                      activeOpacity={0.7}
                    >
                      <View style={[s.cardIcon, { backgroundColor: cfg.color + '1A' }]}>
                        <Ionicons name={cfg.icon as any} size={20} color={cfg.color} />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={[s.cardBank, { color: isSel ? cfg.color : COLORS.text.primary }]}>
                          {cfg.label}
                        </Text>
                        <Text style={s.cardNumber}>•••• •••• •••• {last4}</Text>
                      </View>
                      {isSel
                        ? <Ionicons name="checkmark-circle" size={22} color={cfg.color} />
                        : <View style={[s.radioEmpty, { borderColor: COLORS.border.default }]} />
                      }
                    </TouchableOpacity>
                  );
                }}
              />
            )}

            {/* Campo número según tipo */}
            {selectedCard && (
              <View style={s.confirmSection}>
                {isMiTransfer ? (
                  <View style={s.fieldGroup}>
                    <Text style={s.fieldLabel}>Número MiTransfer</Text>
                    <View style={[s.inputRow, error ? s.inputErr : null]}>
                      <View style={[s.inputIcon, { backgroundColor: BANK_CONFIG.mitransfer.color + '1A' }]}>
                        <Ionicons name="phone-portrait-outline" size={16} color={BANK_CONFIG.mitransfer.color} />
                      </View>
                      <TextInput
                        style={s.input}
                        placeholder="Ej: 55123456"
                        placeholderTextColor={COLORS.text.muted}
                        value={miTransferNumber}
                        onChangeText={(v) => { setMiTransferNumber(v); setError(''); }}
                        keyboardType="phone-pad"
                        autoFocus
                      />
                    </View>
                  </View>
                ) : (
                  <View style={[s.confirmInfo, { borderColor: BANK_CONFIG[selectedCard.bank].color + '44', backgroundColor: BANK_CONFIG[selectedCard.bank].color + '0D' }]}>
                    <Ionicons name="call-outline" size={16} color={BANK_CONFIG[selectedCard.bank].color} />
                    <View style={{ flex: 1 }}>
                      <Text style={[s.confirmLabel, { color: COLORS.text.muted }]}>Número a confirmar</Text>
                      <Text style={[s.confirmNumber, { color: BANK_CONFIG[selectedCard.bank].color }]}>
                        {gestorPhone || 'No configurado — ve a tu perfil'}
                      </Text>
                    </View>
                  </View>
                )}
              </View>
            )}

            {error ? <Text style={s.error}>{error}</Text> : null}

            {/* Botón confirmar */}
            <View style={s.footer}>
              <TouchableOpacity
                style={[
                  s.confirmBtn,
                  { backgroundColor: selectedCard ? BANK_CONFIG[selectedCard.bank].color : COLORS.accent.primary },
                  !selectedCard && { opacity: 0.5 },
                ]}
                onPress={handleConfirm}
              >
                <Ionicons name="checkmark" size={18} color="#fff" />
                <Text style={s.confirmBtnText}>Confirmar método de pago</Text>
              </TouchableOpacity>
            </View>
          </Animated.View>
        </Animated.View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const s = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: COLORS.bg.secondary, borderTopLeftRadius: 28, borderTopRightRadius: 28, maxHeight: '85%', paddingBottom: 32 },
  dragArea: { width: '100%', paddingTop: 4 },
  handle: { width: 40, height: 4, backgroundColor: COLORS.border.default, borderRadius: 2, alignSelf: 'center', marginTop: 8, marginBottom: 4 },
  header: { flexDirection: 'row', alignItems: 'center', gap: SPACING.md, paddingHorizontal: SPACING.lg, paddingVertical: SPACING.md, borderBottomWidth: 1, borderBottomColor: COLORS.border.default },
  headerIcon: { width: 40, height: 40, borderRadius: RADIUS.full, justifyContent: 'center', alignItems: 'center' },
  title: { fontSize: FONT.sizes.lg, color: COLORS.text.primary, fontWeight: FONT.weights.bold },
  subtitle: { fontSize: FONT.sizes.xs, color: COLORS.text.muted, marginTop: 1 },
  closeBtn: { width: 36, height: 36, borderRadius: RADIUS.full, backgroundColor: COLORS.bg.elevated, justifyContent: 'center', alignItems: 'center' },
  list: { paddingHorizontal: SPACING.lg, paddingVertical: SPACING.md, gap: SPACING.sm },
  cardItem: { flexDirection: 'row', alignItems: 'center', gap: SPACING.md, padding: SPACING.md, borderRadius: RADIUS.xl, borderWidth: 1.5 },
  cardIcon: { width: 44, height: 44, borderRadius: RADIUS.lg, justifyContent: 'center', alignItems: 'center' },
  cardBank: { fontSize: FONT.sizes.md, fontWeight: FONT.weights.bold },
  cardNumber: { fontSize: FONT.sizes.xs, color: COLORS.text.muted, marginTop: 2, letterSpacing: 1 },
  radioEmpty: { width: 22, height: 22, borderRadius: 11, borderWidth: 1.5 },
  confirmSection: { paddingHorizontal: SPACING.lg, paddingBottom: SPACING.sm },
  fieldGroup: { gap: SPACING.xs },
  fieldLabel: { fontSize: FONT.sizes.sm, color: COLORS.text.secondary, fontWeight: FONT.weights.semibold },
  inputRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm, backgroundColor: COLORS.bg.input, borderRadius: RADIUS.lg, borderWidth: 1, borderColor: COLORS.border.default, paddingHorizontal: SPACING.md, paddingVertical: SPACING.sm },
  inputErr: { borderColor: COLORS.accent.danger },
  inputIcon: { width: 32, height: 32, borderRadius: RADIUS.md, justifyContent: 'center', alignItems: 'center' },
  input: { flex: 1, fontSize: FONT.sizes.md, color: COLORS.text.primary, paddingVertical: SPACING.xs },
  confirmInfo: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm, padding: SPACING.md, borderRadius: RADIUS.lg, borderWidth: 1 },
  confirmLabel: { fontSize: FONT.sizes.xs },
  confirmNumber: { fontSize: FONT.sizes.lg, fontWeight: FONT.weights.extrabold, marginTop: 2 },
  error: { fontSize: FONT.sizes.xs, color: COLORS.accent.danger, paddingHorizontal: SPACING.lg, marginBottom: SPACING.sm },
  footer: { paddingHorizontal: SPACING.lg, paddingTop: SPACING.sm },
  confirmBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: SPACING.sm, paddingVertical: SPACING.md, borderRadius: RADIUS.full },
  confirmBtnText: { color: '#fff', fontSize: FONT.sizes.md, fontWeight: FONT.weights.bold },
  empty: { alignItems: 'center', gap: SPACING.sm, padding: SPACING.xl },
  emptyTitle: { fontSize: FONT.sizes.lg, color: COLORS.text.primary, fontWeight: FONT.weights.bold },
  emptyText: { fontSize: FONT.sizes.sm, color: COLORS.text.muted, textAlign: 'center', lineHeight: 20 },
});