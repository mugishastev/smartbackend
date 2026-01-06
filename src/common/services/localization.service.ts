import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class LocalizationService {
  constructor(private prisma: PrismaService) { }

  async getLanguages() {
    const languages = await this.prisma.language.findMany();
    if (languages.length === 0) {
      return [
        { code: 'en', name: 'English' },
        { code: 'fr', name: 'French' },
        { code: 'rw', name: 'Kinyarwanda' },
      ];
    }
    return languages;
  }

  async getCurrencies() {
    const currencies = await this.prisma.currency.findMany();
    if (currencies.length === 0) {
      return [
        { code: 'RWF', symbol: 'RWF', name: 'Rwandan Franc' },
        { code: 'USD', symbol: '$', name: 'US Dollar' },
      ];
    }
    return currencies;
  }

  async getLocalization() {
    const [languages, currencies] = await Promise.all([
      this.getLanguages(),
      this.getCurrencies(),
    ]);

    return {
      languages,
      currencies,
    };
  }
}
