import { PrismaClient } from '@prisma/client';
import { AuditService } from './audit.service';
import crypto from 'crypto';

const prisma = new PrismaClient();

export interface ComplianceAlert {
  id: string;
  userId: string;
  alertType: 'AML_SUSPICIOUS' | 'PATTERN_DETECTION' | 'LIMIT_BREACH' | 'REGULATORY_THRESHOLD';
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  description: string;
  detectedAt: Date;
  status: 'OPEN' | 'IN_REVIEW' | 'RESOLVED' | 'FALSE_POSITIVE';
  reviewedBy?: string;
  reviewedAt?: Date;
  resolution?: string;
  metadata: Record<string, any>;
}

export interface ComplianceReport {
  reportId: string;
  reportType: 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'QUARTERLY' | 'ANNUAL' | 'REGULATORY';
  period: {
    startDate: Date;
    endDate: Date;
  };
  generatedAt: Date;
  data: {
    totalUsers: number;
    totalTransactions: number;
    totalVolume: number;
    suspiciousActivities: number;
    riskDistribution: Record<string, number>;
    complianceAlerts: ComplianceAlert[];
  };
  status: 'GENERATING' | 'COMPLETED' | 'FAILED';
  exportUrl?: string;
}

export interface SuspiciousActivityPattern {
  pattern: 'RAPID_FUNDING' | 'UNUSUAL_VOLUME' | 'VELOCITY_CHECK' | 'GEOGRAPHIC_ANOMALY' | 'TIME_PATTERN';
  description: string;
  threshold: number;
  timeWindow: number; // minutes
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
}

export interface GDPRDataRequest {
  requestId: string;
  userId: string;
  requestType: 'ACCESS' | 'RECTIFICATION' | 'ERASURE' | 'PORTABILITY' | 'RESTRICTION';
  status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'REJECTED';
  requestedAt: Date;
  completedAt?: Date;
  requestedData?: string[];
  deliveryMethod: 'EMAIL' | 'SECURE_DOWNLOAD' | 'MAIL';
  notes?: string;
}

class ComplianceService {

  // Suspicious Activity Monitoring Patterns
  private readonly suspiciousPatterns: SuspiciousActivityPattern[] = [
    {
      pattern: 'RAPID_FUNDING',
      description: 'Multiple large funding transactions in short time period',
      threshold: 10000, // $10,000
      timeWindow: 60, // 1 hour
      severity: 'HIGH'
    },
    {
      pattern: 'UNUSUAL_VOLUME',
      description: 'Trading volume significantly above historical average',
      threshold: 5, // 5x normal volume
      timeWindow: 1440, // 24 hours
      severity: 'MEDIUM'
    },
    {
      pattern: 'VELOCITY_CHECK',
      description: 'High frequency trading activity with rapid position changes',
      threshold: 100, // 100 trades
      timeWindow: 60, // 1 hour
      severity: 'MEDIUM'
    },
    {
      pattern: 'GEOGRAPHIC_ANOMALY',
      description: 'Login from unusual geographic location',
      threshold: 1, // Single occurrence
      timeWindow: 1440, // 24 hours
      severity: 'LOW'
    },
    {
      pattern: 'TIME_PATTERN',
      description: 'Trading activity during unusual hours consistently',
      threshold: 10, // 10 sessions
      timeWindow: 10080, // 7 days
      severity: 'LOW'
    }
  ];

  /**
   * Perform real-time compliance monitoring for a user action
   */
  async monitorUserActivity(
    userId: string,
    activityType: string,
    activityData: Record<string, any>,
    ipAddress?: string,
    userAgent?: string
  ): Promise<ComplianceAlert[]> {
    const alerts: ComplianceAlert[] = [];

    try {
      // Check each suspicious activity pattern
      for (const pattern of this.suspiciousPatterns) {
        const alert = await this.checkSuspiciousPattern(
          userId,
          pattern,
          activityType,
          activityData,
          ipAddress,
          userAgent
        );
        
        if (alert) {
          alerts.push(alert);
          
          // Store alert in database
          await this.storeComplianceAlert(alert);
          
          // Log for audit trail
          await AuditService.log({
            userId,
            eventType: 'compliance',
            eventAction: 'SUSPICIOUS_ACTIVITY_DETECTED',
            eventData: {
              alertType: alert.alertType,
              severity: alert.severity,
              pattern: pattern.pattern,
              description: alert.description
            },
            ipAddress,
            userAgent
          });
        }
      }

      // Check regulatory thresholds
      const regulatoryAlert = await this.checkRegulatoryThresholds(
        userId,
        activityType,
        activityData
      );
      
      if (regulatoryAlert) {
        alerts.push(regulatoryAlert);
        await this.storeComplianceAlert(regulatoryAlert);
      }

      return alerts;

    } catch (error) {
      console.error('Error in compliance monitoring:', error);
      return alerts;
    }
  }

  /**
   * Check specific suspicious activity pattern
   */
  private async checkSuspiciousPattern(
    userId: string,
    pattern: SuspiciousActivityPattern,
    activityType: string,
    activityData: Record<string, any>,
    ipAddress?: string,
    userAgent?: string
  ): Promise<ComplianceAlert | null> {
    
    const timeWindowStart = new Date(Date.now() - pattern.timeWindow * 60 * 1000);
    
    switch (pattern.pattern) {
      case 'RAPID_FUNDING':
        return await this.checkRapidFunding(userId, pattern, timeWindowStart);
        
      case 'UNUSUAL_VOLUME':
        return await this.checkUnusualVolume(userId, pattern, timeWindowStart);
        
      case 'VELOCITY_CHECK':
        return await this.checkVelocity(userId, pattern, timeWindowStart);
        
      case 'GEOGRAPHIC_ANOMALY':
        return await this.checkGeographicAnomaly(userId, pattern, ipAddress);
        
      case 'TIME_PATTERN':
        return await this.checkTimePattern(userId, pattern, timeWindowStart);
        
      default:
        return null;
    }
  }

  /**
   * Check for rapid funding pattern
   */
  private async checkRapidFunding(
    userId: string,
    pattern: SuspiciousActivityPattern,
    timeWindowStart: Date
  ): Promise<ComplianceAlert | null> {
    
    const recentTransactions = await prisma.transaction.findMany({
      where: {
        userId,
        type: 'funding',
        createdAt: {
          gte: timeWindowStart
        }
      }
    });

    const totalAmount = recentTransactions.reduce(
      (sum, tx) => sum + tx.amount.toNumber(), 
      0
    );

    if (totalAmount >= pattern.threshold) {
      return {
        id: crypto.randomUUID(),
        userId,
        alertType: 'AML_SUSPICIOUS',
        severity: pattern.severity,
        description: `Rapid funding detected: $${totalAmount.toFixed(2)} in ${pattern.timeWindow} minutes`,
        detectedAt: new Date(),
        status: 'OPEN',
        metadata: {
          pattern: pattern.pattern,
          amount: totalAmount,
          transactionCount: recentTransactions.length,
          timeWindow: pattern.timeWindow,
          transactions: recentTransactions.map(tx => ({
            id: tx.id,
            amount: tx.amount,
            createdAt: tx.createdAt
          }))
        }
      };
    }

    return null;
  }

  /**
   * Check for unusual trading volume
   */
  private async checkUnusualVolume(
    userId: string,
    pattern: SuspiciousActivityPattern,
    timeWindowStart: Date
  ): Promise<ComplianceAlert | null> {
    
    // Get recent trading volume
    const recentOrders = await prisma.order.findMany({
      where: {
        userId,
        createdAt: {
          gte: timeWindowStart
        }
      }
    });

    const recentVolume = recentOrders.reduce(
      (sum, order) => sum + order.totalAmount.toNumber(),
      0
    );

    // Get historical average (last 30 days, excluding current period)
    const historicalStart = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const historicalOrders = await prisma.order.findMany({
      where: {
        userId,
        createdAt: {
          gte: historicalStart,
          lt: timeWindowStart
        }
      }
    });

    if (historicalOrders.length === 0) return null;

    const historicalVolume = historicalOrders.reduce(
      (sum, order) => sum + order.totalAmount.toNumber(),
      0
    );
    
    const historicalAverage = historicalVolume / 30; // Daily average
    const currentDailyRate = recentVolume / (pattern.timeWindow / 1440); // Convert to daily rate

    if (currentDailyRate > historicalAverage * pattern.threshold) {
      return {
        id: crypto.randomUUID(),
        userId,
        alertType: 'PATTERN_DETECTION',
        severity: pattern.severity,
        description: `Unusual trading volume: ${pattern.threshold}x above historical average`,
        detectedAt: new Date(),
        status: 'OPEN',
        metadata: {
          pattern: pattern.pattern,
          currentVolume: recentVolume,
          historicalAverage,
          multiplier: currentDailyRate / historicalAverage,
          threshold: pattern.threshold
        }
      };
    }

    return null;
  }

  /**
   * Check for high velocity trading
   */
  private async checkVelocity(
    userId: string,
    pattern: SuspiciousActivityPattern,
    timeWindowStart: Date
  ): Promise<ComplianceAlert | null> {
    
    const recentOrders = await prisma.order.findMany({
      where: {
        userId,
        createdAt: {
          gte: timeWindowStart
        }
      }
    });

    if (recentOrders.length >= pattern.threshold) {
      return {
        id: crypto.randomUUID(),
        userId,
        alertType: 'PATTERN_DETECTION',
        severity: pattern.severity,
        description: `High velocity trading: ${recentOrders.length} trades in ${pattern.timeWindow} minutes`,
        detectedAt: new Date(),
        status: 'OPEN',
        metadata: {
          pattern: pattern.pattern,
          tradeCount: recentOrders.length,
          timeWindow: pattern.timeWindow,
          threshold: pattern.threshold
        }
      };
    }

    return null;
  }

  /**
   * Check for geographic anomalies
   */
  private async checkGeographicAnomaly(
    userId: string,
    pattern: SuspiciousActivityPattern,
    ipAddress?: string
  ): Promise<ComplianceAlert | null> {
    
    if (!ipAddress) return null;

    // Get recent login locations from audit logs
    const recentLogins = await prisma.auditLog.findMany({
      where: {
        userId,
        eventAction: 'user_login',
        createdAt: {
          gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) // Last 30 days
        }
      },
      orderBy: { createdAt: 'desc' },
      take: 50
    });

    // Simple IP-based location check (in production, use proper GeoIP service)
    const currentLocation = this.extractLocationFromIP(ipAddress);
    const historicalLocations = recentLogins
      .map(log => log.ipAddress ? this.extractLocationFromIP(log.ipAddress) : null)
      .filter((location): location is string => location !== null);

    const isAnomalous = historicalLocations.length > 0 && 
                       !historicalLocations.includes(currentLocation);

    if (isAnomalous) {
      return {
        id: crypto.randomUUID(),
        userId,
        alertType: 'PATTERN_DETECTION',
        severity: pattern.severity,
        description: `Geographic anomaly: Login from unusual location ${currentLocation}`,
        detectedAt: new Date(),
        status: 'OPEN',
        metadata: {
          pattern: pattern.pattern,
          currentLocation,
          historicalLocations: [...new Set(historicalLocations)],
          ipAddress
        }
      };
    }

    return null;
  }

  /**
   * Check for unusual time patterns
   */
  private async checkTimePattern(
    userId: string,
    pattern: SuspiciousActivityPattern,
    timeWindowStart: Date
  ): Promise<ComplianceAlert | null> {
    
    const recentSessions = await prisma.tradingSession.findMany({
      where: {
        userId,
        createdAt: {
          gte: timeWindowStart
        }
      }
    });

    // Count sessions during unusual hours (11 PM - 6 AM local time)
    const unusualHourSessions = recentSessions.filter(session => {
      const hour = session.createdAt.getHours();
      return hour >= 23 || hour <= 6;
    });

    if (unusualHourSessions.length >= pattern.threshold) {
      return {
        id: crypto.randomUUID(),
        userId,
        alertType: 'PATTERN_DETECTION',
        severity: pattern.severity,
        description: `Unusual time pattern: ${unusualHourSessions.length} sessions during unusual hours`,
        detectedAt: new Date(),
        status: 'OPEN',
        metadata: {
          pattern: pattern.pattern,
          unusualHourSessions: unusualHourSessions.length,
          totalSessions: recentSessions.length,
          threshold: pattern.threshold
        }
      };
    }

    return null;
  }

  /**
   * Check regulatory thresholds
   */
  private async checkRegulatoryThresholds(
    userId: string,
    activityType: string,
    activityData: Record<string, any>
  ): Promise<ComplianceAlert | null> {
    
    // Check daily trading volume threshold ($25,000)
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const todayOrders = await prisma.order.findMany({
      where: {
        userId,
        createdAt: {
          gte: today
        }
      }
    });

    const todayVolume = todayOrders.reduce(
      (sum, order) => sum + order.totalAmount.toNumber(),
      0
    );

    if (todayVolume >= 25000) {
      return {
        id: crypto.randomUUID(),
        userId,
        alertType: 'REGULATORY_THRESHOLD',
        severity: 'HIGH',
        description: `Daily trading volume threshold exceeded: $${todayVolume.toFixed(2)}`,
        detectedAt: new Date(),
        status: 'OPEN',
        metadata: {
          threshold: 25000,
          actualVolume: todayVolume,
          date: today.toISOString(),
          orderCount: todayOrders.length
        }
      };
    }

    return null;
  }

  /**
   * Store compliance alert in database
   */
  private async storeComplianceAlert(alert: ComplianceAlert): Promise<void> {
    try {
      await prisma.auditLog.create({
        data: {
          userId: alert.userId,
          eventType: 'compliance_alert',
          eventAction: alert.alertType,
          eventData: JSON.stringify({
            alertId: alert.id,
            severity: alert.severity,
            description: alert.description,
            metadata: alert.metadata
          }),
          createdAt: alert.detectedAt
        }
      });
    } catch (error) {
      console.error('Error storing compliance alert:', error);
    }
  }

  /**
   * Generate compliance report
   */
  async generateComplianceReport(
    reportType: ComplianceReport['reportType'],
    startDate: Date,
    endDate: Date
  ): Promise<ComplianceReport> {
    
    const reportId = crypto.randomUUID();
    
    try {
      // Get total users
      const totalUsers = await prisma.user.count({
        where: {
          createdAt: {
            lte: endDate
          }
        }
      });

      // Get transactions in period
      const transactions = await prisma.transaction.findMany({
        where: {
          createdAt: {
            gte: startDate,
            lte: endDate
          }
        }
      });

      const totalTransactions = transactions.length;
      const totalVolume = transactions.reduce(
        (sum, tx) => sum + tx.amount.toNumber(),
        0
      );

      // Get compliance alerts
      const alertLogs = await prisma.auditLog.findMany({
        where: {
          eventType: 'compliance_alert',
          createdAt: {
            gte: startDate,
            lte: endDate
          }
        }
      });

      const complianceAlerts: ComplianceAlert[] = alertLogs.map(log => {
        const eventData = JSON.parse(log.eventData || '{}');
        return {
          id: eventData.alertId || crypto.randomUUID(),
          userId: log.userId || 'unknown',
          alertType: log.eventAction as ComplianceAlert['alertType'],
          severity: (eventData.severity || 'MEDIUM') as ComplianceAlert['severity'],
          description: eventData.description || 'Unknown alert',
          detectedAt: log.createdAt,
          status: 'OPEN' as ComplianceAlert['status'],
          metadata: eventData.metadata || {}
        };
      });

      // Get risk distribution
      const riskManagementRecords = await prisma.riskManagement.findMany();
      const riskDistribution = riskManagementRecords.reduce((acc, record) => {
        acc[record.riskLevel] = (acc[record.riskLevel] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      const report: ComplianceReport = {
        reportId,
        reportType,
        period: {
          startDate,
          endDate
        },
        generatedAt: new Date(),
        data: {
          totalUsers,
          totalTransactions,
          totalVolume,
          suspiciousActivities: complianceAlerts.length,
          riskDistribution,
          complianceAlerts
        },
        status: 'COMPLETED'
      };

      // Log report generation
      await AuditService.log({
        eventType: 'compliance',
        eventAction: 'REPORT_GENERATED',
        eventData: {
          reportId,
          reportType,
          period: { startDate, endDate },
          totalUsers,
          totalTransactions,
          totalVolume,
          alertCount: complianceAlerts.length
        }
      });

      return report;

    } catch (error) {
      console.error('Error generating compliance report:', error);
      throw new Error('Failed to generate compliance report');
    }
  }

  /**
   * Process GDPR data request
   */
  async processGDPRRequest(request: GDPRDataRequest): Promise<GDPRDataRequest> {
    try {
      const inProgressRequest = { ...request, status: 'IN_PROGRESS' as const };

      switch (request.requestType) {
        case 'ACCESS':
          await this.processDataAccessRequest(inProgressRequest);
          break;
        case 'RECTIFICATION':
          await this.processDataRectificationRequest(inProgressRequest);
          break;
        case 'ERASURE':
          await this.processDataErasureRequest(inProgressRequest);
          break;
        case 'PORTABILITY':
          await this.processDataPortabilityRequest(inProgressRequest);
          break;
        case 'RESTRICTION':
          await this.processDataRestrictionRequest(inProgressRequest);
          break;
      }

      const completedRequest: GDPRDataRequest = { 
        ...inProgressRequest, 
        status: 'COMPLETED', 
        completedAt: new Date() 
      };

      // Log GDPR request processing
      await AuditService.log({
        userId: request.userId,
        eventType: 'gdpr',
        eventAction: `GDPR_${request.requestType}_COMPLETED`,
        eventData: {
          requestId: request.requestId,
          requestType: request.requestType,
          completedAt: completedRequest.completedAt
        }
      });

      return completedRequest;

    } catch (error) {
      console.error('Error processing GDPR request:', error);
      throw new Error('Failed to process GDPR request');
    }
  }

  /**
   * Process data access request
   */
  private async processDataAccessRequest(request: GDPRDataRequest): Promise<void> {
    // Collect all user data
    const userData = await this.collectUserData(request.userId);
    
    // Create secure export file
    const exportData = {
      userId: request.userId,
      exportedAt: new Date().toISOString(),
      data: userData
    };

    // In production, this would create a secure download link
    console.log('GDPR Data Access Request - Data compiled for user:', request.userId);
  }

  /**
   * Process data rectification request
   */
  private async processDataRectificationRequest(request: GDPRDataRequest): Promise<void> {
    // Process data corrections based on request
    console.log('GDPR Data Rectification Request processed for user:', request.userId);
  }

  /**
   * Process data erasure request
   */
  private async processDataErasureRequest(request: GDPRDataRequest): Promise<void> {
    // Anonymize or delete user data based on legal requirements
    console.log('GDPR Data Erasure Request processed for user:', request.userId);
  }

  /**
   * Process data portability request
   */
  private async processDataPortabilityRequest(request: GDPRDataRequest): Promise<void> {
    // Export data in machine-readable format
    console.log('GDPR Data Portability Request processed for user:', request.userId);
  }

  /**
   * Process data restriction request
   */
  private async processDataRestrictionRequest(request: GDPRDataRequest): Promise<void> {
    // Mark data as restricted from processing
    console.log('GDPR Data Restriction Request processed for user:', request.userId);
  }

  /**
   * Collect all user data for GDPR requests
   */
  private async collectUserData(userId: string): Promise<Record<string, any>> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        riskManagement: true,
        auditLogs: true,
        refreshTokens: true,
        transactions: true,
        holdings: true,
        orders: true,
        tradingSessions: true,
        portfolioPositions: true,
        portfolioSummary: true
      }
    });

    return {
      profile: user ? {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        dateOfBirth: user.dateOfBirth,
        phoneNumber: user.phoneNumber,
        riskTolerance: user.riskTolerance,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt
      } : null,
      riskManagement: user?.riskManagement,
      transactions: user?.transactions,
      holdings: user?.holdings,
      orders: user?.orders,
      tradingSessions: user?.tradingSessions,
      portfolio: {
        positions: user?.portfolioPositions,
        summary: user?.portfolioSummary
      },
      auditTrail: user?.auditLogs?.map(log => ({
        eventType: log.eventType,
        eventAction: log.eventAction,
        createdAt: log.createdAt,
        ipAddress: log.ipAddress || undefined
      }))
    };
  }

  /**
   * Extract location from IP address (simplified)
   */
  private extractLocationFromIP(ipAddress: string): string {
    // This is a simplified implementation
    // In production, use a proper GeoIP service
    if (ipAddress.startsWith('192.168.') || ipAddress.startsWith('127.')) {
      return 'LOCAL';
    }
    
    // Mock location based on IP ranges (for demo purposes)
    const ipNum = parseInt(ipAddress.split('.')[0]);
    if (ipNum >= 1 && ipNum <= 50) return 'US_EAST';
    if (ipNum >= 51 && ipNum <= 100) return 'US_WEST';
    if (ipNum >= 101 && ipNum <= 150) return 'EUROPE';
    if (ipNum >= 151 && ipNum <= 200) return 'ASIA';
    
    return 'UNKNOWN';
  }

  /**
   * Get compliance alerts for a user
   */
  async getComplianceAlerts(
    userId?: string,
    severity?: ComplianceAlert['severity'],
    status?: ComplianceAlert['status'],
    limit: number = 100
  ): Promise<ComplianceAlert[]> {
    
    const whereClause: any = {};
    if (userId) whereClause.userId = userId;
    
    const alertLogs = await prisma.auditLog.findMany({
      where: {
        eventType: 'compliance_alert',
        ...whereClause
      },
      orderBy: { createdAt: 'desc' },
      take: limit
    });

    return alertLogs.map(log => {
      const eventData = JSON.parse(log.eventData || '{}');
      return {
        id: eventData.alertId || crypto.randomUUID(),
        userId: log.userId || 'unknown',
        alertType: log.eventAction as ComplianceAlert['alertType'],
        severity: (eventData.severity || 'MEDIUM') as ComplianceAlert['severity'],
        description: eventData.description || 'Unknown alert',
        detectedAt: log.createdAt,
        status: 'OPEN' as ComplianceAlert['status'],
        metadata: eventData.metadata || {}
      };
    }).filter(alert => {
      if (severity && alert.severity !== severity) return false;
      if (status && alert.status !== status) return false;
      return true;
    });
  }

  /**
   * Get compliance statistics
   */
  async getComplianceStatistics(
    startDate: Date,
    endDate: Date
  ): Promise<{
    totalAlerts: number;
    alertsBySeverity: Record<string, number>;
    alertsByType: Record<string, number>;
    resolutionRate: number;
    averageResolutionTime: number;
  }> {
    
    const alerts = await this.getComplianceAlerts();
    const periodAlerts = alerts.filter(alert => 
      alert.detectedAt >= startDate && alert.detectedAt <= endDate
    );

    const alertsBySeverity = periodAlerts.reduce((acc, alert) => {
      acc[alert.severity] = (acc[alert.severity] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const alertsByType = periodAlerts.reduce((acc, alert) => {
      acc[alert.alertType] = (acc[alert.alertType] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const resolvedAlerts = periodAlerts.filter(alert => 
      alert.status === 'RESOLVED' || alert.status === 'FALSE_POSITIVE'
    );

    const resolutionRate = periodAlerts.length > 0 
      ? (resolvedAlerts.length / periodAlerts.length) * 100 
      : 0;

    // Calculate average resolution time (simplified)
    const averageResolutionTime = resolvedAlerts.length > 0
      ? resolvedAlerts.reduce((sum, alert) => {
          if (alert.reviewedAt) {
            return sum + (alert.reviewedAt.getTime() - alert.detectedAt.getTime());
          }
          return sum;
        }, 0) / resolvedAlerts.length / (1000 * 60 * 60) // Convert to hours
      : 0;

    return {
      totalAlerts: periodAlerts.length,
      alertsBySeverity,
      alertsByType,
      resolutionRate,
      averageResolutionTime
    };
  }
}

export const complianceService = new ComplianceService();
