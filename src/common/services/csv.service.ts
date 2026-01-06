import csv from 'csv-parser';
import { Readable } from 'stream';
import bcrypt from 'bcryptjs';
import prisma from '../config/database';
import { EmailService } from './email.service';
import { config } from '../config';
import crypto from 'crypto';

interface CSVMember {
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  role: 'MEMBER' | 'SECRETARY' | 'ACCOUNTANT';
}

export interface ImportResult {
  success: number;
  failed: number;
  errors: Array<{ row: number; email: string; error: string }>;
}

export class CSVService {
  static async parseCSV(buffer: Buffer): Promise<CSVMember[]> {
    return new Promise((resolve, reject) => {
      const results: CSVMember[] = [];
      const stream = Readable.from(buffer);

      stream
        .pipe(csv({
          mapHeaders: ({ header }) => header.trim().toLowerCase().replace(/\s+/g, '_'),
        }))
        .on('data', (data) => {
          // Map CSV columns to our structure
          const member: CSVMember = {
            firstName: data.first_name || data.firstname || '',
            lastName: data.last_name || data.lastname || '',
            email: data.email || '',
            phone: data.phone || data.phone_number || '',
            role: (data.role?.toUpperCase() || 'MEMBER') as CSVMember['role'],
          };

          // Validate required fields
          if (member.firstName && member.lastName && member.email) {
            results.push(member);
          }
        })
        .on('end', () => resolve(results))
        .on('error', (error) => reject(error));
    });
  }

  static async importMembers(
    cooperativeId: string,
    invitedBy: string,
    csvBuffer: Buffer
  ): Promise<ImportResult> {
    const members = await this.parseCSV(csvBuffer);
    const result: ImportResult = {
      success: 0,
      failed: 0,
      errors: [],
    };

    // Get cooperative details
    const cooperative = await prisma.cooperative.findUnique({
      where: { id: cooperativeId },
      select: { name: true },
    });

    if (!cooperative) {
      throw new Error('Cooperative not found');
    }

    for (let i = 0; i < members.length; i++) {
      const member = members[i];

      try {
        // Check if user already exists
        const existingUser = await prisma.user.findUnique({
          where: { email: member.email },
        });

        if (existingUser) {
          // Check if already in this cooperative
          if (existingUser.cooperativeId === cooperativeId) {
            result.errors.push({
              row: i + 2, // +2 for header and 0-index
              email: member.email,
              error: 'User already exists in this cooperative',
            });
            result.failed++;
            continue;
          }

          // If user exists in another cooperative, skip
          if (existingUser.cooperativeId) {
            result.errors.push({
              row: i + 2,
              email: member.email,
              error: 'User already exists in another cooperative',
            });
            result.failed++;
            continue;
          }
        }

        // Generate invitation token
        const token = crypto.randomBytes(32).toString('hex');
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + 7); // 7 days expiry

        // Create invitation
        await prisma.invitation.create({
          data: {
            email: member.email,
            cooperativeId,
            role: member.role,
            token,
            expiresAt,
            invitedBy,
          },
        });

        // Send invitation email
        const inviteLink = `${config.frontend.url}/accept-invitation?token=${token}`;
        await EmailService.sendInvitationEmail(
          member.email,
          cooperative.name,
          member.role,
          inviteLink
        );

        result.success++;
      } catch (error: any) {
        result.errors.push({
          row: i + 2,
          email: member.email,
          error: error.message || 'Failed to create invitation',
        });
        result.failed++;
      }
    }

    return result;
  }

  static async acceptInvitation(
    token: string,
    password: string,
    additionalData?: { phone?: string; avatar?: string }
  ): Promise<any> {
    // Find invitation
    const invitation = await prisma.invitation.findUnique({
      where: { token },
    });

    if (!invitation) {
      throw new Error('Invalid invitation token');
    }

    if (invitation.usedAt) {
      throw new Error('Invitation already used');
    }

    if (new Date() > invitation.expiresAt) {
      throw new Error('Invitation has expired');
    }

    // Check if user already exists
    let user = await prisma.user.findUnique({
      where: { email: invitation.email },
    });

    const hashedPassword = await bcrypt.hash(password, 10);

    if (user) {
      // Update existing user
      user = await prisma.user.update({
        where: { id: user.id },
        data: {
          password: hashedPassword,
          cooperativeId: invitation.cooperativeId,
          role: invitation.role,
          isActive: true,
          phone: additionalData?.phone || user.phone,
          avatar: additionalData?.avatar || user.avatar,
        },
      });
    } else {
      // Create new user (extract name from email if not provided)
      const [firstName, lastName] = invitation.email.split('@')[0].split('.');

      user = await prisma.user.create({
        data: {
          email: invitation.email,
          password: hashedPassword,
          firstName: firstName || 'User',
          lastName: lastName || 'Name',
          role: invitation.role,
          cooperativeId: invitation.cooperativeId,
          isActive: true,
          emailVerified: true,
          phone: additionalData?.phone,
          avatar: additionalData?.avatar,
        },
      });
    }

    // Mark invitation as used
    await prisma.invitation.update({
      where: { id: invitation.id },
      data: { usedAt: new Date() },
    });

    // Update cooperative member count
    await prisma.cooperative.update({
      where: { id: invitation.cooperativeId },
      data: {
        totalMembers: {
          increment: 1,
        },
      },
    });

    // Send welcome email
    await EmailService.sendWelcomeEmail(user.email, user.firstName);

    // Log activity
    await prisma.activityLog.create({
      data: {
        userId: user.id,
        cooperativeId: invitation.cooperativeId,
        action: 'MEMBER_JOINED',
        entity: 'USER',
        entityId: user.id,
        details: {
          role: invitation.role,
          via: 'invitation',
        },
      },
    });

    return user;
  }
}