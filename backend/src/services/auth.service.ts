import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { PrismaClient, User } from '@prisma/client';
import { Decimal } from 'decimal.js';
import { RegistrationData } from '../schemas/auth.schema';

const prisma = new PrismaClient();

export interface AuthTokens {
  accessToken: string;
  refreshToken?: string;
  expiresIn: number;
}

export interface UserResponse {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  phoneNumber: string;
  accountBalance: string;
  riskTolerance: string;
  kycStatus: string;
  isActive: boolean;
  createdAt: string;
}

export class AuthService {
  private static readonly SALT_ROUNDS = 12; // Following Context7 bcrypt best practices
  private static readonly JWT_SECRET = process.env.JWT_SECRET!;
  private static readonly JWT_EXPIRES_IN = '24h';

  static {
    if (!process.env.JWT_SECRET) {
      throw new Error('JWT_SECRET environment variable is required');
    }
  }

  /**
   * Hash password using bcrypt with recommended salt rounds
   * Following Context7 best practices for password security
   */
  static async hashPassword(password: string): Promise<string> {
    try {
      // Using bcrypt.hash with salt rounds as recommended by Context7 research
      const hashedPassword = await bcrypt.hash(password, this.SALT_ROUNDS);
      return hashedPassword;
    } catch (error) {
      throw new Error('Failed to hash password');
    }
  }

  /**
   * Verify password against hash
   */
  static async verifyPassword(password: string, hash: string): Promise<boolean> {
    try {
      return await bcrypt.compare(password, hash);
    } catch (error) {
      throw new Error('Failed to verify password');
    }
  }

  /**
   * Generate JWT token
   */
  static generateToken(userId: string): AuthTokens {
    const payload = { userId, type: 'access' };
    const accessToken = jwt.sign(payload, this.JWT_SECRET, {
      expiresIn: this.JWT_EXPIRES_IN,
      issuer: 'smarttrade-ai',
      audience: 'smarttrade-ai-users'
    });

    return {
      accessToken,
      expiresIn: 86400 // 24 hours in seconds
    };
  }

  /**
   * Verify JWT token
   */
  static verifyToken(token: string): { userId: string } {
    try {
      const decoded = jwt.verify(token, this.JWT_SECRET, {
        issuer: 'smarttrade-ai',
        audience: 'smarttrade-ai-users'
      }) as { userId: string };
      
      return decoded;
    } catch (error) {
      throw new Error('Invalid or expired token');
    }
  }

  /**
   * Register new user with KYC data
   */
  static async registerUser(userData: RegistrationData): Promise<{
    user: UserResponse;
    tokens: AuthTokens;
  }> {
    try {
      // Check if user already exists
      const existingUser = await prisma.user.findUnique({
        where: { email: userData.email.toLowerCase() }
      });

      if (existingUser) {
        throw new Error('EMAIL_EXISTS');
      }

      // Hash password
      const passwordHash = await this.hashPassword(userData.password);

      // Use risk tolerance as string
      const riskTolerance = userData.riskTolerance.toLowerCase();

      // Create user and risk management profile in transaction
      const result = await prisma.$transaction(async (tx) => {
        // Create user
        const newUser = await tx.user.create({
          data: {
            email: userData.email.toLowerCase(),
            passwordHash,
            firstName: userData.firstName,
            lastName: userData.lastName,
            dateOfBirth: new Date(userData.dateOfBirth),
            phoneNumber: userData.phoneNumber,
            accountBalance: new Decimal(0),
            riskTolerance,
            kycStatus: 'pending'
          }
        });

        // Create risk management profile
        await tx.riskManagement.create({
          data: {
            userId: newUser.id,
            riskProfile: riskTolerance,
            dailyLossLimit: new Decimal(9.00),
            weeklyLossLimit: new Decimal(18.00),
            monthlyLossLimit: new Decimal(27.00)
          }
        });

        return newUser;
      });

      // Generate tokens
      const tokens = this.generateToken(result.id);

      // Return sanitized user data
      const userResponse: UserResponse = {
        id: result.id,
        email: result.email,
        firstName: result.firstName,
        lastName: result.lastName,
        dateOfBirth: result.dateOfBirth.toISOString().split('T')[0]!,
        phoneNumber: result.phoneNumber,
        accountBalance: result.accountBalance.toString(),
        riskTolerance: result.riskTolerance.toLowerCase(),
        kycStatus: result.kycStatus.toLowerCase(),
        isActive: result.isActive,
        createdAt: result.createdAt.toISOString()
      };

      return { user: userResponse, tokens };
    } catch (error) {
      if (error instanceof Error) {
        throw error;
      }
      throw new Error('Registration failed');
    }
  }

  /**
   * Authenticate user login
   */
  static async loginUser(email: string, password: string): Promise<{
    user: UserResponse;
    tokens: AuthTokens;
  }> {
    try {
      // Find user by email
      const user = await prisma.user.findUnique({
        where: { email: email.toLowerCase() }
      });

      if (!user || !user.isActive) {
        throw new Error('INVALID_CREDENTIALS');
      }

      // Verify password
      const isValidPassword = await this.verifyPassword(password, user.passwordHash);
      if (!isValidPassword) {
        throw new Error('INVALID_CREDENTIALS');
      }

      // Generate tokens
      const tokens = this.generateToken(user.id);

      // Return sanitized user data
      const userResponse: UserResponse = {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        dateOfBirth: user.dateOfBirth.toISOString().split('T')[0]!,
        phoneNumber: user.phoneNumber,
        accountBalance: user.accountBalance.toString(),
        riskTolerance: user.riskTolerance.toLowerCase(),
        kycStatus: user.kycStatus.toLowerCase(),
        isActive: user.isActive,
        createdAt: user.createdAt.toISOString()
      };

      return { user: userResponse, tokens };
    } catch (error) {
      if (error instanceof Error) {
        throw error;
      }
      throw new Error('Login failed');
    }
  }

  /**
   * Get user by ID
   */
  static async getUserById(userId: string): Promise<UserResponse | null> {
    try {
      const user = await prisma.user.findUnique({
        where: { id: userId }
      });

      if (!user || !user.isActive) {
        return null;
      }

      return {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        dateOfBirth: user.dateOfBirth.toISOString().split('T')[0]!,
        phoneNumber: user.phoneNumber,
        accountBalance: user.accountBalance.toString(),
        riskTolerance: user.riskTolerance.toLowerCase(),
        kycStatus: user.kycStatus.toLowerCase(),
        isActive: user.isActive,
        createdAt: user.createdAt.toISOString()
      };
    } catch (error) {
      throw new Error('Failed to get user');
    }
  }

  /**
   * Generate refresh token and store in database
   */
  static async generateRefreshToken(userId: string, rememberMe: boolean = false): Promise<string> {
    try {
      const refreshToken = crypto.randomBytes(64).toString('hex');
      const tokenHash = crypto.createHash('sha256').update(refreshToken).digest('hex');
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + (rememberMe ? 30 : 7));

      await prisma.refreshToken.create({
        data: {
          userId,
          tokenHash,
          expiresAt,
          rememberMe
        }
      });

      return refreshToken;
    } catch (error) {
      throw new Error('Failed to generate refresh token');
    }
  }

  /**
   * Validate refresh token
   */
  static async validateRefreshToken(token: string): Promise<{ userId: string; rememberMe: boolean } | null> {
    try {
      const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
      
      const refreshToken = await prisma.refreshToken.findFirst({
        where: {
          tokenHash,
          isRevoked: false,
          expiresAt: {
            gt: new Date()
          }
        }
      });

      if (!refreshToken) {
        return null;
      }

      // Update last used timestamp
      await prisma.refreshToken.update({
        where: { id: refreshToken.id },
        data: { lastUsed: new Date() }
      });

      return {
        userId: refreshToken.userId,
        rememberMe: refreshToken.rememberMe
      };
    } catch (error) {
      return null;
    }
  }

  /**
   * Revoke refresh token
   */
  static async revokeRefreshToken(token: string): Promise<void> {
    try {
      const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
      
      await prisma.refreshToken.updateMany({
        where: { tokenHash },
        data: { isRevoked: true }
      });
    } catch (error) {
      // Silently fail
    }
  }

  /**
   * Record failed login attempt
   */
  static async recordFailedAttempt(userId: string, ipAddress: string, userAgent?: string): Promise<void> {
    try {
      await prisma.failedLoginAttempt.create({
        data: {
          userId,
          ipAddress,
          userAgent: userAgent || null
        }
      });
    } catch (error) {
      // Silently fail to not break login flow
    }
  }

  /**
   * Check if account is locked due to failed attempts
   */
  static async checkAccountLockout(userId: string): Promise<{ isLocked: boolean; remainingTime?: number }> {
    try {
      const oneHourAgo = new Date();
      oneHourAgo.setHours(oneHourAgo.getHours() - 1);

      const failedAttempts = await prisma.failedLoginAttempt.count({
        where: {
          userId,
          attemptTime: {
            gte: oneHourAgo
          }
        }
      });

      if (failedAttempts >= 10) {
        // Get the most recent attempt to calculate remaining lockout time
        const latestAttempt = await prisma.failedLoginAttempt.findFirst({
          where: { userId },
          orderBy: { attemptTime: 'desc' }
        });

        if (latestAttempt) {
          const lockoutEndTime = new Date(latestAttempt.attemptTime);
          lockoutEndTime.setHours(lockoutEndTime.getHours() + 1);
          const remainingTime = Math.ceil((lockoutEndTime.getTime() - Date.now()) / (1000 * 60));
          
          if (remainingTime > 0) {
            return { isLocked: true, remainingTime };
          }
        }
      }

      return { isLocked: false };
    } catch (error) {
      return { isLocked: false };
    }
  }

  /**
   * Clear failed login attempts after successful login
   */
  static async clearFailedAttempts(userId: string): Promise<void> {
    try {
      await prisma.failedLoginAttempt.deleteMany({
        where: { userId }
      });
    } catch (error) {
      // Silently fail
    }
  }

  /**
   * Enhanced login with security features
   */
  static async enhancedLogin(email: string, password: string, ipAddress: string, userAgent?: string, rememberMe: boolean = false): Promise<{
    user: UserResponse;
    tokens: AuthTokens;
  }> {
    try {
      // Find user by email
      const user = await prisma.user.findUnique({
        where: { email: email.toLowerCase() }
      });

      if (!user || !user.isActive) {
        throw new Error('INVALID_CREDENTIALS');
      }

      // Check account lockout
      const lockoutStatus = await this.checkAccountLockout(user.id);
      if (lockoutStatus.isLocked) {
        throw new Error(`ACCOUNT_LOCKED:${lockoutStatus.remainingTime}`);
      }

      // Verify password
      const isValidPassword = await this.verifyPassword(password, user.passwordHash);
      if (!isValidPassword) {
        // Record failed attempt
        await this.recordFailedAttempt(user.id, ipAddress, userAgent);
        throw new Error('INVALID_CREDENTIALS');
      }

      // Clear any previous failed attempts
      await this.clearFailedAttempts(user.id);

      // Generate tokens
      const accessToken = jwt.sign(
        { userId: user.id, email: user.email },
        this.JWT_SECRET,
        {
          expiresIn: this.JWT_EXPIRES_IN,
          issuer: 'smarttrade-ai',
          audience: 'smarttrade-ai-users'
        }
      );

      const refreshToken = await this.generateRefreshToken(user.id, rememberMe);

      // Return sanitized user data
      const userResponse: UserResponse = {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        dateOfBirth: user.dateOfBirth.toISOString().split('T')[0]!,
        phoneNumber: user.phoneNumber,
        accountBalance: user.accountBalance.toString(),
        riskTolerance: user.riskTolerance.toLowerCase(),
        kycStatus: user.kycStatus.toLowerCase(),
        isActive: user.isActive,
        createdAt: user.createdAt.toISOString()
      };

      return {
        user: userResponse,
        tokens: {
          accessToken,
          refreshToken,
          expiresIn: 86400
        }
      };
    } catch (error) {
      if (error instanceof Error) {
        throw error;
      }
      throw new Error('Login failed');
    }
  }
}
