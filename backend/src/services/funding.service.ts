import { PrismaClient, User } from '@prisma/client';
import { AuditService } from './audit.service';

const prisma = new PrismaClient();

export interface FundingRequest {
  amount: number;
  method: 'bank_transfer' | 'demo_balance';
  reference?: string;
}

export interface FundingHistory {
  transactions: any[];
  totalFunded: number;
  availableBalance: number;
}

export class FundingService {
  /**
   * Process funding request with validation
   */
  async processFunding(
    userId: string, 
    fundingData: FundingRequest,
    ipAddress?: string,
    userAgent?: string
  ): Promise<{ success: boolean; transaction?: any; error?: string }> {
    try {
      // Validate funding amount ($90 - $10,000)
      if (fundingData.amount < 90 || fundingData.amount > 10000) {
        await AuditService.log({
          userId,
          eventType: 'funding',
          eventAction: 'funding_rejected',
          eventData: { amount: fundingData.amount, reason: 'amount_out_of_range' },
          ipAddress,
          userAgent
        });
        return { success: false, error: 'Funding amount must be between $90 and $10,000' };
      }

      // Get user to check current status
      const user = await prisma.user.findUnique({
        where: { id: userId }
      });

      if (!user || !user.isActive) {
        return { success: false, error: 'User not found or inactive' };
      }

      // For demo, we'll simulate instant funding
      // In production, this would integrate with payment processors
      const transaction = await prisma.$transaction(async (tx) => {
        // Create transaction record
        const newTransaction = await tx.transaction.create({
          data: {
            userId,
            type: 'funding',
            amount: fundingData.amount,
            status: 'completed',
            referenceId: fundingData.reference || `DEMO-${Date.now()}`,
            description: `${fundingData.method === 'demo_balance' ? 'Demo' : 'Bank Transfer'} funding`,
            metadata: JSON.stringify({
              method: fundingData.method,
              processingTime: new Date().toISOString()
            })
          }
        });

        // Update user balance
        await tx.user.update({
          where: { id: userId },
          data: {
            accountBalance: {
              increment: fundingData.amount
            }
          }
        });

        return newTransaction;
      });

      // Log successful funding
      await AuditService.log({
        userId,
        eventType: 'funding',
        eventAction: 'funding_completed',
        eventData: { 
          amount: fundingData.amount, 
          method: fundingData.method,
          transactionId: transaction.id,
          newBalance: (parseFloat(user.accountBalance.toString()) + fundingData.amount).toString()
        },
        ipAddress,
        userAgent
      });

      return { success: true, transaction };

    } catch (error) {
      console.error('Funding processing error:', error);
      
      await AuditService.log({
        userId,
        eventType: 'funding',
        eventAction: 'funding_error',
        eventData: { error: error instanceof Error ? error.message : 'Unknown error' },
        ipAddress,
        userAgent
      });

      return { success: false, error: 'Internal server error during funding processing' };
    }
  }

  /**
   * Get funding history for user
   */
  async getFundingHistory(userId: string): Promise<FundingHistory> {
    try {
      // Get user's current balance
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { accountBalance: true }
      });

      if (!user) {
        throw new Error('User not found');
      }

      // Get funding transactions
      const transactions = await prisma.transaction.findMany({
        where: {
          userId,
          type: 'funding'
        },
        orderBy: { createdAt: 'desc' },
        take: 50 // Limit to last 50 funding transactions
      });

      // Calculate total funded amount
      const totalFunded = transactions
        .filter((t: any) => t.status === 'completed')
        .reduce((sum: number, t: any) => sum + parseFloat(t.amount.toString()), 0);

      return {
        transactions,
        totalFunded,
        availableBalance: parseFloat(user.accountBalance.toString())
      };

    } catch (error) {
      console.error('Error getting funding history:', error);
      throw new Error('Failed to retrieve funding history');
    }
  }

  /**
   * Get available funding methods
   */
  getFundingMethods(): Array<{ id: string; name: string; description: string; limits: { min: number; max: number } }> {
    return [
      {
        id: 'demo_balance',
        name: 'Demo Balance',
        description: 'Instant demo funding for testing and learning',
        limits: { min: 90, max: 10000 }
      },
      {
        id: 'bank_transfer',
        name: 'Bank Transfer',
        description: 'Simulated bank transfer (instant for demo)',
        limits: { min: 90, max: 10000 }
      }
    ];
  }

  /**
   * Validate funding request data
   */
  validateFundingRequest(data: any): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!data.amount || typeof data.amount !== 'number') {
      errors.push('Amount is required and must be a number');
    } else if (data.amount < 90) {
      errors.push('Minimum funding amount is $90');
    } else if (data.amount > 10000) {
      errors.push('Maximum funding amount is $10,000');
    }

    if (!data.method || !['bank_transfer', 'demo_balance'].includes(data.method)) {
      errors.push('Valid funding method is required');
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * Get user's current account balance
   */
  async getAccountBalance(userId: string): Promise<number> {
    try {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { accountBalance: true }
      });

      if (!user) {
        throw new Error('User not found');
      }

      return parseFloat(user.accountBalance.toString());
    } catch (error) {
      console.error('Error getting account balance:', error);
      throw new Error('Failed to retrieve account balance');
    }
  }
}

export default new FundingService();
