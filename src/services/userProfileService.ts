import AsyncStorage from '@react-native-async-storage/async-storage';

export type BankType = 'metropolitano' | 'bandec' | 'bpa' | 'mitransfer';

export interface BankCard {
  id: string;
  bank: BankType;
  label: string;           // nombre personalizado opcional
  cardNumber: string;      // número de tarjeta (solo para mostrar últimos 4)
}

export interface UserProfile {
  name: string;
  phone: string;           // teléfono del gestor → se usa como "número a confirmar"
  cards: BankCard[];
}

export const BANK_CONFIG: Record<BankType, { label: string; color: string; icon: string }> = {
  metropolitano: { label: 'Metropolitano', color: '#16A34A', icon: 'card' },
  bandec:        { label: 'BANDEC',        color: '#DC2626', icon: 'card' },
  bpa:           { label: 'BPA',           color: '#4ADE80', icon: 'card' },
  mitransfer:    { label: 'MiTransfer',    color: '#2563EB', icon: 'phone-portrait' },
};

const PROFILE_KEY = '@viajando_user_profile';

const DEFAULT_PROFILE: UserProfile = {
  name: '',
  phone: '',
  cards: [],
};

export const userProfileService = {
  async get(): Promise<UserProfile> {
    try {
      const raw = await AsyncStorage.getItem(PROFILE_KEY);
      if (!raw) return { ...DEFAULT_PROFILE };
      return JSON.parse(raw) as UserProfile;
    } catch {
      return { ...DEFAULT_PROFILE };
    }
  },

  async save(profile: UserProfile): Promise<void> {
    await AsyncStorage.setItem(PROFILE_KEY, JSON.stringify(profile));
  },

  async addCard(card: Omit<BankCard, 'id'>): Promise<UserProfile> {
    const profile = await this.get();
    const newCard: BankCard = { ...card, id: Date.now().toString() };
    profile.cards = [...profile.cards, newCard];
    await this.save(profile);
    return profile;
  },

  async removeCard(cardId: string): Promise<UserProfile> {
    const profile = await this.get();
    profile.cards = profile.cards.filter((c) => c.id !== cardId);
    await this.save(profile);
    return profile;
  },

  async editCard(cardId: string, updatedData: Omit<BankCard, 'id'>): Promise<UserProfile> {
    const profile = await this.get();
    profile.cards = profile.cards.map(c => c.id === cardId ? { ...c, ...updatedData } : c);
    await this.save(profile);
    return profile;
  },

  async updateProfile(name: string, phone: string): Promise<UserProfile> {
    const profile = await this.get();
    profile.name = name;
    profile.phone = phone;
    await this.save(profile);
    return profile;
  },
};