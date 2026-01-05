import prisma from '../config/database';

const FALLBACK_LANGUAGES = [
  { id: 'en', code: 'en', name: 'English', direction: 'ltr', isDefault: true },
  { id: 'fr', code: 'fr', name: 'Français', direction: 'ltr', isDefault: false },
  { id: 'rw', code: 'rw', name: 'Kinyarwanda', direction: 'ltr', isDefault: false },
];

const FALLBACK_CURRENCIES = [
  { id: 'rwf', code: 'RWF', symbol: 'Fr', name: 'Rwandan Franc', rate: 1 },
  { id: 'usd', code: 'USD', symbol: '$', name: 'US Dollar', rate: 1 },
];

export class LocalizationService {
  static async getLanguages() {
    const languages = await prisma.language.findMany({
      orderBy: { isDefault: 'desc' },
    });
    return languages.length ? languages : FALLBACK_LANGUAGES;
  }

  static async getCurrencies() {
    const currencies = await prisma.currency.findMany({
      orderBy: { code: 'asc' },
    });
    return currencies.length ? currencies : FALLBACK_CURRENCIES;
  }

  static async getLocalization() {
    const [languages, currencies] = await Promise.all([this.getLanguages(), this.getCurrencies()]);
    return { languages, currencies };
  }
}

