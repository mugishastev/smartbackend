import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import Joi from 'joi';

import { PrismaModule } from './prisma/prisma.module';
import { HealthModule } from './health/health.module';
import { AuthModule } from './auth/auth.module';
import { RealtimeModule } from './realtime/realtime.module';
import { QueuesModule } from './queues/queues.module';
import { ProductsModule } from './products/products.module';
import { CooperativesModule } from './cooperatives/cooperatives.module';
import { UsersModule } from './users/users.module';
import { MembersModule } from './members/members.module';

import { OrdersModule } from './orders/orders.module';
import { TransactionsModule } from './transactions/transactions.module';
import { ApprovalsModule } from './approvals/approvals.module';
import { ReviewsModule } from './reviews/reviews.module';
import { RecommendationsModule } from './recommendations/recommendations.module';
import { ContactsModule } from './contacts/contacts.module';

import { AnnouncementsModule } from './announcements/announcements.module';
import { ReportsModule } from './reports/reports.module';
import { CampaignsModule } from './campaigns/campaigns.module';
import { LoyaltyModule } from './loyalty/loyalty.module';
import { RequestsModule } from './requests/requests.module';
import { NotificationsModule } from './notifications/notifications.module';
import { ChatModule } from './chat/chat.module';
import { CommonModule } from './common/common.module';
import { WishlistModule } from './wishlist/wishlist.module';
import { AdminModule } from './admin/admin.module';
import { JobApplicationsModule } from './job-applications/job-applications.module';
import { ReturnsModule } from './returns/returns.module';
import { BuyerModule } from './buyer/buyer.module';
import { FastifyMulterModule } from '@nest-lab/fastify-multer';

@Module({
  imports: [
    FastifyMulterModule,
    ConfigModule.forRoot({
      isGlobal: true,
      validationSchema: Joi.object({
        NODE_ENV: Joi.string().valid('development', 'test', 'production').default('production'),
        PORT: Joi.number().default(5001),

        DATABASE_URL: Joi.string().required(),

        JWT_SECRET: Joi.string().min(16).required(),
        JWT_EXPIRE: Joi.string().default('7d'),

        REDIS_URL: Joi.string().optional(),
        REDIS_HOST: Joi.string().optional(),
        REDIS_PORT: Joi.number().optional(),
        REDIS_PASSWORD: Joi.string().allow('').optional(),
      }).unknown(true),
    }),
    PrismaModule,
    AuthModule,
    RealtimeModule,
    QueuesModule,
    HealthModule,
    ProductsModule,
    CooperativesModule,
    UsersModule,
    MembersModule,
    OrdersModule,
    TransactionsModule,
    ApprovalsModule,
    ReviewsModule,
    RecommendationsModule,
    ContactsModule,
    AnnouncementsModule,
    ReportsModule,
    CampaignsModule,
    LoyaltyModule,
    RequestsModule,
    NotificationsModule,
    ChatModule,
    WishlistModule,
    CommonModule,
    AdminModule,
    JobApplicationsModule,
    ReturnsModule,
    BuyerModule,
  ],
})
export class AppModule { }
