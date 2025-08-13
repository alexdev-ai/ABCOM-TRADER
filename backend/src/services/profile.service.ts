import { PrismaClient } from '@prisma/client';
import { UpdateProfileRequest, ProfileResponse, ProfileStatsResponse } from '../schemas/profile.schema.js';
import { AuditService } from './audit.service.js';

const prisma = new PrismaClient();

export class ProfileService {
  async getProfile(userId: string): Promise<ProfileResponse> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        dateOfBirth: true,
        phoneNumber: true,
        riskTolerance: true,
        kycStatus: true,
        accountBalance: true,
        isActive: true,
        createdAt: true,
        updatedAt: true
      }
    });

    if (!user) {
      throw new Error('User not found');
    }

    return {
      ...user,
      accountBalance: Number(user.accountBalance)
    };
  }

  async updateProfile(userId: string, profileData: UpdateProfileRequest, ipAddress?: string): Promise<ProfileResponse> {
    const existingUser = await prisma.user.findUnique({
      where: { id: userId }
    });

    if (!existingUser) {
      throw new Error('User not found');
    }

    // Update user profile
    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: {
        firstName: profileData.firstName,
        lastName: profileData.lastName,
        phoneNumber: profileData.phoneNumber,
        riskTolerance: profileData.riskTolerance
      },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        dateOfBirth: true,
        phoneNumber: true,
        riskTolerance: true,
        kycStatus: true,
        accountBalance: true,
        isActive: true,
        createdAt: true,
        updatedAt: true
      }
    });

    // Log the profile update
    await AuditService.log({
      userId,
      eventType: 'PROFILE',
      eventAction: 'UPDATE',
      eventData: {
        updatedFields: Object.keys(profileData),
        previousValues: {
          firstName: existingUser.firstName,
          lastName: existingUser.lastName,
          phoneNumber: existingUser.phoneNumber,
          riskTolerance: existingUser.riskTolerance
        }
      },
      ipAddress
    });

    return {
      ...updatedUser,
      accountBalance: Number(updatedUser.accountBalance)
    };
  }

  async getProfileStats(userId: string): Promise<ProfileStatsResponse> {
    // Get user's account balance
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { accountBalance: true }
    });

    if (!user) {
      throw new Error('User not found');
    }

    // Get trading statistics
    const [
      totalOrders,
      successfulOrders
    ] = await Promise.all([
      // Total completed orders
      prisma.order.count({
        where: {
          userId,
          status: 'completed'
        }
      }),

      // Count successful trades (buy orders that resulted in profit when sold)
      prisma.order.count({
        where: {
          userId,
          status: 'completed',
          type: 'sell'
        }
      })
    ]);

    // Calculate win rate
    const winRate = totalOrders > 0 ? (successfulOrders / totalOrders) * 100 : 0;

    // Get last login from audit logs
    const lastLogin = await prisma.auditLog.findFirst({
      where: {
        userId,
        eventType: 'authentication',
        eventAction: 'user_login'
      },
      orderBy: {
        createdAt: 'desc'
      },
      select: {
        createdAt: true
      }
    });

    return {
      accountBalance: Number(user.accountBalance),
      totalTrades: totalOrders,
      totalPnl: 0, // Will be calculated once trading sessions are implemented
      successfulTrades: successfulOrders,
      winRate: Math.round(winRate * 100) / 100, // Round to 2 decimal places
      totalSessions: 0, // Will be calculated once trading sessions are implemented
      activeSessions: 0, // Will be calculated once trading sessions are implemented
      lastLoginAt: lastLogin?.createdAt
    };
  }

  async updateKycStatus(userId: string, kycStatus: string, adminUserId?: string): Promise<void> {
    await prisma.user.update({
      where: { id: userId },
      data: { kycStatus }
    });

    // Log KYC status update
    await AuditService.log({
      userId,
      eventType: 'PROFILE',
      eventAction: 'KYC_STATUS_UPDATE',
      eventData: {
        newStatus: kycStatus,
        updatedBy: adminUserId || 'system'
      }
    });
  }
}

export const profileService = new ProfileService();
