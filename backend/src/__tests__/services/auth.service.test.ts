import { AuthService } from '../../services/auth.service';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';

// Mock Prisma
const mockPrisma = {
  user: {
    findUnique: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
  },
  riskManagement: {
    create: jest.fn(),
  },
  refreshToken: {
    findUnique: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    deleteMany: jest.fn(),
  },
  $transaction: jest.fn(),
};

jest.mock('@prisma/client', () => ({
  PrismaClient: jest.fn(() => mockPrisma),
}));

// Mock bcrypt
jest.mock('bcrypt');
const mockedBcrypt = bcrypt as jest.Mocked<typeof bcrypt>;

// Mock jsonwebtoken
jest.mock('jsonwebtoken');
const mockedJwt = jwt as jest.Mocked<typeof jwt>;

// Mock environment variables
process.env.JWT_SECRET = 'test-secret';
process.env.JWT_REFRESH_SECRET = 'test-refresh-secret';

describe('AuthService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('registerUser', () => {
    const userData = {
      email: 'test@example.com',
      password: 'Test123!',
      firstName: 'John',
      lastName: 'Doe',
      dateOfBirth: '1990-01-01',
      phoneNumber: '+1234567890',
      riskTolerance: 'moderate' as const,
    };

    const mockUser = {
      id: 'user-123',
      email: 'test@example.com',
      firstName: 'John',
      lastName: 'Doe',
      dateOfBirth: new Date('1990-01-01'),
      phoneNumber: '+1234567890',
      riskTolerance: 'moderate',
      accountBalance: 0,
      kycStatus: 'pending',
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    it('should successfully register a new user', async () => {
      // Mock existing user check
      mockPrisma.user.findUnique.mockResolvedValue(null);
      
      // Mock password hashing
      mockedBcrypt.hash.mockResolvedValue('hashed-password' as never);
      
      // Mock database transaction
      mockPrisma.$transaction.mockImplementation((callback) => callback(mockPrisma));
      mockPrisma.user.create.mockResolvedValue(mockUser);
      mockPrisma.riskManagement.create.mockResolvedValue({});
      
      // Mock JWT generation
      mockedJwt.sign.mockReturnValue('test-access-token' as never);

      const result = await AuthService.registerUser(userData);

      expect(result).toEqual({
        user: {
          id: mockUser.id,
          email: mockUser.email,
          firstName: mockUser.firstName,
          lastName: mockUser.lastName,
          dateOfBirth: mockUser.dateOfBirth,
          phoneNumber: mockUser.phoneNumber,
          riskTolerance: mockUser.riskTolerance,
          accountBalance: mockUser.accountBalance,
          kycStatus: mockUser.kycStatus,
        },
        tokens: {
          accessToken: 'test-access-token',
          expiresIn: 86400,
        },
      });

      expect(mockPrisma.user.findUnique).toHaveBeenCalledWith({
        where: { email: userData.email },
      });
      
      expect(mockedBcrypt.hash).toHaveBeenCalledWith(userData.password, 12);
      
      expect(mockPrisma.user.create).toHaveBeenCalledWith({
        data: {
          email: userData.email,
          passwordHash: 'hashed-password',
          firstName: userData.firstName,
          lastName: userData.lastName,
          dateOfBirth: new Date(userData.dateOfBirth),
          phoneNumber: userData.phoneNumber,
          riskTolerance: userData.riskTolerance,
          accountBalance: 0,
          kycStatus: 'pending',
        },
      });
      
      expect(mockPrisma.riskManagement.create).toHaveBeenCalledWith({
        data: {
          userId: mockUser.id,
          riskProfile: userData.riskTolerance,
          dailyLossLimit: 9.00,
          weeklyLossLimit: 18.00,
          monthlyLossLimit: 27.00,
        },
      });
    });

    it('should throw error when email already exists', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(mockUser);

      await expect(AuthService.registerUser(userData)).rejects.toThrow('EMAIL_EXISTS');
      
      expect(mockPrisma.user.findUnique).toHaveBeenCalledWith({
        where: { email: userData.email },
      });
    });

    it('should handle database transaction errors', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);
      mockedBcrypt.hash.mockResolvedValue('hashed-password' as never);
      mockPrisma.$transaction.mockRejectedValue(new Error('Database error'));

      await expect(AuthService.registerUser(userData)).rejects.toThrow('Database error');
    });
  });

  describe('enhancedLogin', () => {
    const email = 'test@example.com';
    const password = 'Test123!';
    const clientIP = '127.0.0.1';
    const userAgent = 'test-agent';
    const rememberMe = false;

    const mockUser = {
      id: 'user-123',
      email: 'test@example.com',
      passwordHash: 'hashed-password',
      firstName: 'John',
      lastName: 'Doe',
      isActive: true,
      failedLoginAttempts: 0,
      lockedUntil: null,
    };

    it('should successfully login user with valid credentials', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(mockUser);
      mockedBcrypt.compare.mockResolvedValue(true as never);
      mockedJwt.sign.mockReturnValue('test-access-token' as never);
      
      // Mock refresh token creation
      mockPrisma.refreshToken.create.mockResolvedValue({
        token: 'refresh-token-123',
      });

      const result = await AuthService.enhancedLogin(email, password, clientIP, userAgent, rememberMe);

      expect(result.user).toEqual({
        id: mockUser.id,
        email: mockUser.email,
        firstName: mockUser.firstName,
        lastName: mockUser.lastName,
      });
      
      expect(result.tokens.accessToken).toBe('test-access-token');
      expect(result.tokens.refreshToken).toBe('refresh-token-123');
      expect(result.tokens.expiresIn).toBe(86400);

      expect(mockedBcrypt.compare).toHaveBeenCalledWith(password, mockUser.passwordHash);
    });

    it('should throw error for invalid credentials', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(mockUser);
      mockedBcrypt.compare.mockResolvedValue(false as never);

      await expect(
        AuthService.enhancedLogin(email, password, clientIP, userAgent, rememberMe)
      ).rejects.toThrow('INVALID_CREDENTIALS');
    });

    it('should throw error for non-existent user', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);

      await expect(
        AuthService.enhancedLogin(email, password, clientIP, userAgent, rememberMe)
      ).rejects.toThrow('INVALID_CREDENTIALS');
    });

    it('should throw error for inactive user', async () => {
      const inactiveUser = { ...mockUser, isActive: false };
      mockPrisma.user.findUnique.mockResolvedValue(inactiveUser);

      await expect(
        AuthService.enhancedLogin(email, password, clientIP, userAgent, rememberMe)
      ).rejects.toThrow('INVALID_CREDENTIALS');
    });

    it('should handle account lockout', async () => {
      const lockedUser = {
        ...mockUser,
        failedLoginAttempts: 5,
        lockedUntil: new Date(Date.now() + 15 * 60 * 1000), // 15 minutes from now
      };
      mockPrisma.user.findUnique.mockResolvedValue(lockedUser);

      await expect(
        AuthService.enhancedLogin(email, password, clientIP, userAgent, rememberMe)
      ).rejects.toThrow(/ACCOUNT_LOCKED:/);
    });
  });

  describe('verifyToken', () => {
    it('should successfully verify valid token', () => {
      const mockDecoded = { userId: 'user-123', exp: Math.floor(Date.now() / 1000) + 3600 };
      mockedJwt.verify.mockReturnValue(mockDecoded as never);

      const result = AuthService.verifyToken('valid-token');

      expect(result).toEqual(mockDecoded);
      expect(mockedJwt.verify).toHaveBeenCalledWith('valid-token', process.env.JWT_SECRET);
    });

    it('should throw error for invalid token', () => {
      mockedJwt.verify.mockImplementation(() => {
        throw new Error('invalid token');
      });

      expect(() => AuthService.verifyToken('invalid-token')).toThrow('Invalid or expired token');
    });
  });

  describe('generateToken', () => {
    it('should generate JWT token with correct payload', () => {
      mockedJwt.sign.mockReturnValue('generated-token' as never);

      const result = AuthService.generateToken('user-123');

      expect(result).toEqual({
        accessToken: 'generated-token',
        expiresIn: 86400,
      });

      expect(mockedJwt.sign).toHaveBeenCalledWith(
        { userId: 'user-123' },
        process.env.JWT_SECRET,
        { expiresIn: '24h' }
      );
    });
  });

  describe('getUserById', () => {
    const mockUser = {
      id: 'user-123',
      email: 'test@example.com',
      firstName: 'John',
      lastName: 'Doe',
      dateOfBirth: new Date('1990-01-01'),
      phoneNumber: '+1234567890',
      riskTolerance: 'moderate',
      accountBalance: 100.50,
      kycStatus: 'pending',
    };

    it('should return sanitized user data', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        ...mockUser,
        passwordHash: 'hashed-password', // Should be excluded from result
      });

      const result = await AuthService.getUserById('user-123');

      expect(result).toEqual(mockUser);
      expect(mockPrisma.user.findUnique).toHaveBeenCalledWith({
        where: { id: 'user-123' },
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          dateOfBirth: true,
          phoneNumber: true,
          riskTolerance: true,
          accountBalance: true,
          kycStatus: true,
          isActive: true,
          createdAt: true,
          updatedAt: true,
        },
      });
    });

    it('should return null for non-existent user', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);

      const result = await AuthService.getUserById('non-existent');

      expect(result).toBeNull();
    });
  });

  describe('generateRefreshToken', () => {
    it('should generate refresh token and store in database', async () => {
      const mockRefreshToken = {
        token: 'refresh-token-123',
        userId: 'user-123',
        expiresAt: new Date(),
      };
      
      mockPrisma.refreshToken.create.mockResolvedValue(mockRefreshToken);

      const result = await AuthService.generateRefreshToken('user-123', false);

      expect(result).toBe('refresh-token-123');
      expect(mockPrisma.refreshToken.create).toHaveBeenCalled();
    });
  });

  describe('validateRefreshToken', () => {
    it('should validate and return token data for valid token', async () => {
      const mockTokenData = {
        token: 'refresh-token-123',
        userId: 'user-123',
        rememberMe: false,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
        isRevoked: false,
      };
      
      mockPrisma.refreshToken.findUnique.mockResolvedValue(mockTokenData);

      const result = await AuthService.validateRefreshToken('refresh-token-123');

      expect(result).toEqual({
        userId: mockTokenData.userId,
        rememberMe: mockTokenData.rememberMe,
      });
    });

    it('should return null for non-existent token', async () => {
      mockPrisma.refreshToken.findUnique.mockResolvedValue(null);

      const result = await AuthService.validateRefreshToken('invalid-token');

      expect(result).toBeNull();
    });

    it('should return null for expired token', async () => {
      const expiredTokenData = {
        token: 'expired-token',
        userId: 'user-123',
        rememberMe: false,
        expiresAt: new Date(Date.now() - 1000), // Expired
        isRevoked: false,
      };
      
      mockPrisma.refreshToken.findUnique.mockResolvedValue(expiredTokenData);

      const result = await AuthService.validateRefreshToken('expired-token');

      expect(result).toBeNull();
    });

    it('should return null for revoked token', async () => {
      const revokedTokenData = {
        token: 'revoked-token',
        userId: 'user-123',
        rememberMe: false,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        isRevoked: true,
      };
      
      mockPrisma.refreshToken.findUnique.mockResolvedValue(revokedTokenData);

      const result = await AuthService.validateRefreshToken('revoked-token');

      expect(result).toBeNull();
    });
  });

  describe('revokeRefreshToken', () => {
    it('should mark refresh token as revoked', async () => {
      mockPrisma.refreshToken.update = jest.fn().mockResolvedValue({});

      await AuthService.revokeRefreshToken('token-to-revoke');

      expect(mockPrisma.refreshToken.update).toHaveBeenCalledWith({
        where: { token: 'token-to-revoke' },
        data: { isRevoked: true },
      });
    });

    it('should handle non-existent token gracefully', async () => {
      mockPrisma.refreshToken.update = jest.fn().mockRejectedValue(new Error('Token not found'));

      // Should not throw error
      await expect(AuthService.revokeRefreshToken('non-existent-token')).resolves.toBeUndefined();
    });
  });
});
