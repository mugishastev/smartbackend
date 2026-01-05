import { config } from '../config';
import prisma from '../config/database';
import { UserRole } from '../lib/enums';

// Define a generic request interface compatible with Fastify
export interface AuthRequest {
  user?: {
    id: string;
    email: string;
    role: UserRole | string;
    cooperativeId?: string;
  };
  headers: Record<string, string | string[] | undefined>;
  params: Record<string, string>;
  body: any;
  query: any;
  file?: unknown;
  files?: unknown;
}
