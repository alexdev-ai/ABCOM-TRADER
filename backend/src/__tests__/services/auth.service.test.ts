import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { AuthService } from '../../services/auth.service';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';

// Mock Prisma client
const mockPrisma = {
  user: {
    findUnique: jest.fn() as jest.MockedFunction<any>,
    create: jest.fn() as jest.MockedFunction<any>,
    update: jest.fn() as jest.MockedFunction<any>,
  },
  riskManagement: {
    create: jest.fn() as jest.MockedFunction<any>,
  },
  refreshToken: {
    findFirst: jest.fn() as jest.MockedFunction<any>,
    create: jest.fn() as jest.MockedFunction<any>,
    update: jest.fn() as jest.MockedFunction<any>,
    updateMany: jest.fn() as jest.MockedFunction<any>,
    delete: jest.fn() as jest.MockedFunction<any>,
    deleteMany: jest.fn() as jest.MockedFunction<any>,
  },
  failedLoginAttempt: {
    create: jest.fn() as jest.MockedFunction<any>,
    count: jest.fn() as jest.MockedFunction<any>,
    findFirst: jest.fn() as jest.MockedFunction<any>,
    deleteMany: jest.fn() as jest.MockedFunction<any>,
  },
  $transaction: jest.fn() as jest.MockedFunction<any>,
};

jest.mock('@prisma/client', () => ({
  PrismaClient: jest.fn().mockImplementation(() => mockPrisma),
}));

// Mock bcrypt
jest.mock('bcrypt');
const mockedBcrypt = bcrypt as jest.Mocked<typeof bcrypt>;

// Mock jsonwebtoken
jest.mock('jsonwebtoken');
const mockedJwt = jwt as jest.Mocked<typeof jwt>;

// Mock crypto
const mockCrypto = {
  randomBytes: jest.fn(),
  createHash: jest.fn(),
};

jest.mock('crypto', () => mockCrypto);

// Mock environment variables
process.env.JWT_SECRET = 'test-secret';
process.env.JWT_REFRESH_SECRET = 'test-refresh-secret';

describe('AuthService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('hashPassword', () => {
    it('should hash password using bcrypt', async () => {
      const password = 'testPassword123!';
      const hashedPassword = 'hashedPassword';
      
      mockedBcrypt.hash.mockResolvedValue(hashedPassword as never);
      
      const result = await AuthService.hashPassword(password);
      
      expect(result).toBe(hashedPassword);
      expect(mockedBcrypt.hash).toHaveBeenCalledWith(password, 12);
    });

    it('should throw error when hashing fails', async () => {
      const password = 'testPassword123!';
      
      mockedBcrypt.hash.mockRejectedValue(new Error('Hash failed') as never);
      
      await expect(AuthService.hashPassword(password)).rejects.toThrow('Failed to hash password');
    });
  });

  describe('verifyPassword', () => {
    it('should verify password against hash', async () => {
      const password = 'testPassword123!';
      const hash = 'hashedPassword';
      
      mockedBcrypt.compare.mockResolvedValue(true as never);
      
      const result = await AuthService.verifyPassword(password, hash);
      
      expect(result).toBe(true);
      expect(mockedBcrypt.compare).toHaveBeenCalledWith(password, hash);
    });

    it('should return false for invalid password', async () => {
      const password = 'wrongPassword';
      const hash = 'hashedPassword';
      
      mockedBcrypt.compare.mockResolvedValue(false as never);
      
      const result = await AuthService.verifyPassword(password, hash);
      
      expect(result).toBe(false);
    });
  });

  describe('generateToken', () => {
    it('should generate JWT token with correct payload', () => {
      const userId = 'user-123';
      const expectedToken = 'jwt-token';
      
      mockedJwt.sign.mockReturnValue(expectedToken as never);
      
      const result = AuthService.generateToken(userId);
      
      expect(result).toEqual({
        accessToken: expectedToken,
        expiresIn: 86400,
      });
      
      expect(mockedJwt.sign).toHaveBeenCalledWith(
        { userId, type: 'access' },
        process.env.JWT_SECRET,
        {
          expiresIn: '24h',
          issuer: 'smarttrade-ai',
          audience: 'smarttrade-ai-users'
        }
      );
    });
  });

  describe('verifyToken', () => {
    it('should verify valid token', () => {
      const token = 'valid-token';
      const decoded = { userId: 'user-123' };
      
      mockedJwt.verify.mockReturnValue(decoded as never);
      
      const result = AuthService.verifyToken(token);
      
      expect(result).toEqual(decoded);
      expect(mockedJwt.verify).toHaveBeenCalledWith(token, process.env.JWT_SECRET, {
        issuer: 'smarttrade-ai',
        audience: 'smarttrade-ai-users'
      });
    });

    it('should throw error for invalid token', () => {
      const token = 'invalid-token';
      
      mockedJwt.verify.mockImplementation(() => {
        throw new Error('Invalid token');
      });
      
      expect(() => AuthService.verifyToken(token)).toThrow('Invalid or expired token');
    });
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

    it('should successfully register a new user', async () => {
      const mockUser = {
        id: 'user-123',
        email: 'test@example.com',
        firstName: 'John',
        lastName: 'Doe',
        dateOfBirth: new Date('1990-01-01'),
        phoneNumber: '+1234567890',
        riskTolerance: 'moderate',
        accountBalance: { toString: () => '0' },
        kycStatus: 'pending',
        isActive: true,
        createdAt: new Date(),
      };

      // Mock existing user check
      mockPrisma.user.findUnique.mockResolvedValue(null);

      // Mock password hashing
      mockedBcrypt.hash.mockResolvedValue('hashed-password' as never);

      // Mock transaction
      mockPrisma.$transaction.mockImplementation((callback: any) => callback(mockPrisma));
      mockPrisma.user.create.mockResolvedValue(mockUser);
      mockPrisma.riskManagement.create.mockResolvedValue({});

      // Mock JWT generation
      mockedJwt.sign.mockReturnValue('test-access-token' as never);

      const result = await AuthService.registerUser(userData);

      expect(result.user.id).toBe(mockUser.id);
      expect(result.user.email).toBe(mockUser.email);
      expect(result.tokens.accessToken).toBe('test-access-token');
      expect(mockPrisma.user.findUnique).toHaveBeenCalledWith({
        where: { email: userData.email.toLowerCase() }
      });
    });

    it('should throw error when email already exists', async () => {
      const existingUser = { id: 'existing-user', email: 'test@example.com' };
      mockPrisma.user.findUnique.mockResolvedValue(existingUser);

      await expect(AuthService.registerUser(userData)).rejects.toThrow('EMAIL_EXISTS');
    });
  });

  describe('loginUser', () => {
    const email = 'test@example.com';
    const password = 'Test123!';

    it('should successfully login user with valid credentials', async () => {
      const mockUser = {
        id: 'user-123',
        email: 'test@example.com',
        firstName: 'John',
        lastName: 'Doe',
        dateOfBirth: new Date('1990-01-01'),
        phoneNumber: '+1234567890',
        passwordHash: 'hashed-password',
        accountBalance: { toString: () => '100.50' },
        riskTolerance: 'moderate',
        kycStatus: 'approved',
        isActive: true,
        createdAt: new Date(),
      };

      mockPrisma.user.findUnique.mockResolvedValue(mockUser);
      mockedBcrypt.compare.mockResolvedValue(true as never);
      mockedJwt.sign.mockReturnValue('test-access-token' as never);

      const result = await AuthService.loginUser(email, password);

      expect(result.user.id).toBe(mockUser.id);
      expect(result.user.email).toBe(mockUser.email);
      expect(result.tokens.accessToken).toBe('test-access-token');
    });

    it('should throw error for invalid credentials', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);

      await expect(AuthService.loginUser(email, password)).rejects.toThrow('INVALID_CREDENTIALS');
    });
  });

  describe('getUserById', () => {
    it('should return user data for valid user ID', async () => {
      const mockUser = {
        id: 'user-123',
        email: 'test@example.com',
        firstName: 'John',
        lastName: 'Doe',
        dateOfBirth: new Date('1990-01-01'),
        phoneNumber: '+1234567890',
        accountBalance: { toString: () => '100.50' },
        riskTolerance: 'moderate',
        kycStatus: 'approved',
        isActive: true,
        createdAt: new Date(),
      };

      mockPrisma.user.findUnique.mockResolvedValue(mockUser);

      const result = await AuthService.getUserById('user-123');

      expect(result).not.toBeNull();
      expect(result?.id).toBe(mockUser.id);
      expect(result?.email).toBe(mockUser.email);
    });

    it('should return null for non-existent user', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);

      const result = await AuthService.getUserById('non-existent');

      expect(result).toBeNull();
    });
  });

  describe('generateRefreshToken', () => {
    it('should generate and store refresh token', async () => {
      const userId = 'user-123';
      const mockToken = 'refresh-token-123';

      mockCrypto.randomBytes.mockReturnValue({ toString: () => mockToken });
      mockCrypto.createHash.mockReturnValue({
        update: jest.fn().mockReturnThis(),
        digest: jest.fn().mockReturnValue('token-hash')
      });

      mockPrisma.refreshToken.create.mockResolvedValue({
        id: 'token-id',
        userId,
        tokenHash: 'token-hash'
      });

      const result = await AuthService.generateRefreshToken(userId);

      expect(result).toBe(mockToken);
      expect(mockPrisma.refreshToken.create).toHaveBeenCalled();
    });
  });
});
