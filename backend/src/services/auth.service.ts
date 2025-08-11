import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { PrismaClient, User, RiskTolerance } from '@prisma/client';
import { Decimal } from 'decimal.js';
import { RegistrationData } from '@/schemas/auth.schema';

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

      // Convert risk tolerance to enum
      const riskTolerance = userData.riskTolerance.toUpperCase() as RiskTolerance;

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
            kycStatus: 'PENDING'
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
}
