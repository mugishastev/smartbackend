import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  async onModuleInit(): Promise<void> {
    const retries = 5;
    const delay = 3000; // 3 seconds

    for (let i = 0; i < retries; i++) {
      try {
        await this.$connect();
        console.log('Successfully connected to database');
        return;
      } catch (error) {
        console.error(`Failed to connect to database (attempt ${i + 1}/${retries}):`, error);
        if (i === retries - 1) throw error;
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }

  async onModuleDestroy(): Promise<void> {
    await this.$disconnect();
  }
}
