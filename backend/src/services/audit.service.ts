import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export interface AuditLogData {
  userId?: string | undefined;
  eventType: string;
  eventAction: string;
  eventData?: Record<string, any> | undefined;
  ipAddress?: string | undefined;
  userAgent?: string | undefined;
}

export class AuditService {
  /**
   * Log an audit event
   */
  static async log(data: AuditLogData): Promise<void> {
    try {
      await prisma.auditLog.create({
        data: {
          userId: data.userId ?? null,
          eventType: data.eventType,
          eventAction: data.eventAction,
          eventData: data.eventData ? JSON.stringify(data.eventData) : null,
          ipAddress: data.ipAddress ?? null,
          userAgent: data.userAgent ?? null
        }
      });
    } catch (error) {
      // Log audit failures but don't throw to avoid breaking main functionality
      console.error('Failed to create audit log:', error);
    }
  }

  /**
   * Log user registration event
   */
  static async logRegistration(userId: string, email: string, riskTolerance: string, ipAddress?: string, userAgent?: string): Promise<void> {
    await this.log({
      userId,
      eventType: 'authentication',
      eventAction: 'user_registered',
      eventData: {
        email,
        riskTolerance,
        timestamp: new Date().toISOString()
      },
      ipAddress,
      userAgent
    });
  }

  /**
   * Log user login event
   */
  static async logLogin(userId: string, email: string, ipAddress?: string, userAgent?: string): Promise<void> {
    await this.log({
      userId,
      eventType: 'authentication',
      eventAction: 'user_login',
      eventData: {
        email,
        timestamp: new Date().toISOString()
      },
      ipAddress,
      userAgent
    });
  }

  /**
   * Log failed login attempt
   */
  static async logFailedLogin(email: string, reason: string, ipAddress?: string, userAgent?: string): Promise<void> {
    await this.log({
      eventType: 'authentication',
      eventAction: 'login_failed',
      eventData: {
        email,
        reason,
        timestamp: new Date().toISOString()
      },
      ipAddress,
      userAgent
    });
  }

  /**
   * Log rate limit exceeded
   */
  static async logRateLimitExceeded(endpoint: string, ipAddress?: string, userAgent?: string): Promise<void> {
    await this.log({
      eventType: 'security',
      eventAction: 'rate_limit_exceeded',
      eventData: {
        endpoint,
        timestamp: new Date().toISOString()
      },
      ipAddress,
      userAgent
    });
  }
}
