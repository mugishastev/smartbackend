import type { Prisma } from '@prisma/client';

// Re-export Prisma types for easier imports
export type User = Prisma.UserGetPayload<{}>;
export type Transaction = Prisma.TransactionGetPayload<{}>;
export type Report = Prisma.ReportGetPayload<{}>;
export type MemberFinancial = Prisma.MemberFinancialGetPayload<{}>;
export type Order = Prisma.OrderGetPayload<{ include: { items: { include: { product: true } } } }>;
export type OrderItem = Prisma.OrderItemGetPayload<{ include: { product: true } }>;
export type Approval = Prisma.ApprovalGetPayload<{}>;
export type Request = Prisma.RequestGetPayload<{}>;
export type Review = Prisma.ReviewGetPayload<{}>;
export type Message = Prisma.MessageGetPayload<{}>;
export type ActivityLog = Prisma.ActivityLogGetPayload<{}>;

// Re-export enums from local enums file
export { UserRole, CooperativeStatus, TransactionStatus, RequestStatus, OrderStatus, TransactionType } from '../lib/enums';

export interface ApiResponse<T = any> {
  success?: boolean;
  message?: string;
  data?: T;
  error?: string;
}
