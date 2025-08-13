import request from 'supertest';
import express from 'express';
import authRoutes from '../../routes/auth.routes';
import { PrismaClient } from '@prisma/client';

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
  auditLog: {
    create: jest.fn(),
  },
  refreshToken: {
    findUnique: jest.fn(),
    create: jest.fn(),
    delete: jest.fn(),
    deleteMany: jest.fn(),
  },
  $transaction: jest.fn(),
};

jest.mock('@prisma/client', () => ({
  PrismaClient: jest.fn(() => mockPrisma),
}));

// Mock services
jest.mock('../../services/auth.service');
jest.mock('../../services/audit.service');

import { AuthService } from '../../services/auth.service';
import { AuditService } from '../../services/audit.service';

const MockedAuthService = AuthService as jest.Mocked<typeof AuthService>;
const MockedAuditService = AuditService as jest.Mocked<typeof AuditService>;

describe('Auth Routes', () => {
  let app: express.Application;

  beforeEach(() => {
    app = express();
    app.use(express.json());
    app.use('/api/v1/auth', authRoutes);
    jest.clearAllMocks();
  });

  describe('POST /api/v1/auth/register', () => {
    const validUserData = {
      email: 'test@example.com',
      password: 'Test123!',
      firstName: 'John',
      lastName: 'Doe',
      dateOfBirth: '1990-01-01',
      phoneNumber: '+1234567890',
      riskTolerance: 'moderate' as const,
    };

    const mockUserResponse = {
      user: {
        id: 'user-123',
        email: 'test@example.com',
        firstName: 'John',
        lastName: 'Doe',
        dateOfBirth: '1990-01-01',
        phoneNumber: '+1234567890',
        riskTolerance: 'moderate',
        accountBalance: '0',
        kycStatus: 'pending',
        isActive: true,
        createdAt: '2025-01-13T00:00:00.000Z',
      },
      tokens: {
        accessToken: 'access-token-123',
        expiresIn: 86400,
      },
    };

    it('should successfully register a new user', async () => {
      MockedAuthService.registerUser.mockResolvedValue(mockUserResponse);
      MockedAuditService.logRegistration.mockResolvedValue(undefined);

      const response = await request(app)
        .post('/api/v1/auth/register')
        .send(validUserData)
        .expect(201);

      expect(response.body).toEqual({
        success: true,
        data: {
          user: mockUserResponse.user,
          token: mockUserResponse.tokens.accessToken,
          expiresIn: mockUserResponse.tokens.expiresIn,
        },
      });

      expect(MockedAuthService.registerUser).toHaveBeenCalledWith(validUserData);
      expect(MockedAuditService.logRegistration).toHaveBeenCalled();
    });

    it('should return 400 when email already exists', async () => {
      const error = new Error('EMAIL_EXISTS');
      MockedAuthService.registerUser.mockRejectedValue(error);
      MockedAuditService.log.mockResolvedValue(undefined);

      const response = await request(app)
        .post('/api/v1/auth/register')
        .send(validUserData)
        .expect(400);

      expect(response.body).toEqual({
        success: false,
        error: {
          code: 'EMAIL_EXISTS',
          message: 'An account with this email already exists',
        },
      });
    });

    it('should validate required fields', async () => {
      const invalidData = { email: 'invalid-email' };

      const response = await request(app)
        .post('/api/v1/auth/register')
        .send(invalidData)
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    it('should validate password requirements', async () => {
      const weakPasswordData = { ...validUserData, password: 'weak' };

      const response = await request(app)
        .post('/api/v1/auth/register')
        .send(weakPasswordData)
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    it('should validate age requirement (18+)', async () => {
      const underage = { ...validUserData, dateOfBirth: '2010-01-01' };

      const response = await request(app)
        .post('/api/v1/auth/register')
        .send(underage)
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    it('should validate phone number format', async () => {
      const invalidPhone = { ...validUserData, phoneNumber: 'invalid' };

      const response = await request(app)
        .post('/api/v1/auth/register')
        .send(invalidPhone)
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    it('should handle internal server errors', async () => {
      MockedAuthService.registerUser.mockRejectedValue(new Error('Database error'));
      MockedAuditService.log.mockResolvedValue(undefined);

      const response = await request(app)
        .post('/api/v1/auth/register')
        .send(validUserData)
        .expect(500);

      expect(response.body).toEqual({
        success: false,
        error: {
          code: 'REGISTRATION_FAILED',
          message: 'Registration failed. Please try again.',
        },
      });
    });
  });

  describe('POST /api/v1/auth/login', () => {
    const loginData = {
      email: 'test@example.com',
      password: 'Test123!',
      rememberMe: false,
    };

    const mockLoginResponse = {
      user: {
        id: 'user-123',
        email: 'test@example.com',
        firstName: 'John',
        lastName: 'Doe',
        dateOfBirth: '1990-01-01',
        phoneNumber: '+1234567890',
        riskTolerance: 'moderate',
        accountBalance: '100.50',
        kycStatus: 'pending',
        isActive: true,
        createdAt: '2025-01-13T00:00:00.000Z',
      },
      tokens: {
        accessToken: 'access-token-123',
        refreshToken: 'refresh-token-123',
        expiresIn: 86400,
      },
    };

    it('should successfully login user', async () => {
      MockedAuthService.enhancedLogin.mockResolvedValue(mockLoginResponse);
      MockedAuditService.logLogin.mockResolvedValue(undefined);

      const response = await request(app)
        .post('/api/v1/auth/login')
        .send(loginData)
        .expect(200);

      expect(response.body).toEqual({
        success: true,
        data: {
          user: mockLoginResponse.user,
          token: mockLoginResponse.tokens.accessToken,
          expiresIn: mockLoginResponse.tokens.expiresIn,
        },
      });

      expect(MockedAuthService.enhancedLogin).toHaveBeenCalledWith(
        loginData.email,
        loginData.password,
        expect.any(String), // clientIP
        expect.any(String), // userAgent
        loginData.rememberMe
      );
    });

    it('should return 401 for invalid credentials', async () => {
      MockedAuthService.enhancedLogin.mockRejectedValue(new Error('INVALID_CREDENTIALS'));
      MockedAuditService.logFailedLogin.mockResolvedValue(undefined);

      const response = await request(app)
        .post('/api/v1/auth/login')
        .send(loginData)
        .expect(401);

      expect(response.body).toEqual({
        success: false,
        error: {
          code: 'INVALID_CREDENTIALS',
          message: 'Invalid email or password',
        },
      });
    });

    it('should handle account lockout', async () => {
      MockedAuthService.enhancedLogin.mockRejectedValue(new Error('ACCOUNT_LOCKED:15'));
      MockedAuditService.logFailedLogin.mockResolvedValue(undefined);

      const response = await request(app)
        .post('/api/v1/auth/login')
        .send(loginData)
        .expect(423);

      expect(response.body).toEqual({
        success: false,
        error: {
          code: 'ACCOUNT_LOCKED',
          message: 'Account temporarily locked. Try again in 15 minutes.',
        },
      });
    });

    it('should validate login data', async () => {
      const invalidData = { email: 'invalid' };

      const response = await request(app)
        .post('/api/v1/auth/login')
        .send(invalidData)
        .expect(400);

      expect(response.body.success).toBe(false);
    });
  });

  describe('GET /api/v1/auth/me', () => {
    const mockUser = {
      id: 'user-123',
      email: 'test@example.com',
      firstName: 'John',
      lastName: 'Doe',
    };

    it('should return user data with valid token', async () => {
      MockedAuthService.verifyToken.mockReturnValue({ userId: 'user-123' });
      MockedAuthService.getUserById.mockResolvedValue(mockUser);

      const response = await request(app)
        .get('/api/v1/auth/me')
        .set('Authorization', 'Bearer valid-token')
        .expect(200);

      expect(response.body).toEqual({
        success: true,
        data: { user: mockUser },
      });
    });

    it('should return 401 without authorization header', async () => {
      const response = await request(app)
        .get('/api/v1/auth/me')
        .expect(401);

      expect(response.body).toEqual({
        success: false,
        error: {
          code: 'MISSING_TOKEN',
          message: 'Authorization token is required',
        },
      });
    });

    it('should return 401 with invalid token', async () => {
      MockedAuthService.verifyToken.mockImplementation(() => {
        throw new Error('Invalid or expired token');
      });

      const response = await request(app)
        .get('/api/v1/auth/me')
        .set('Authorization', 'Bearer invalid-token')
        .expect(401);

      expect(response.body).toEqual({
        success: false,
        error: {
          code: 'INVALID_TOKEN',
          message: 'Invalid or expired token',
        },
      });
    });

    it('should return 404 when user not found', async () => {
      MockedAuthService.verifyToken.mockReturnValue({ userId: 'user-123' });
      MockedAuthService.getUserById.mockResolvedValue(null);

      const response = await request(app)
        .get('/api/v1/auth/me')
        .set('Authorization', 'Bearer valid-token')
        .expect(404);

      expect(response.body).toEqual({
        success: false,
        error: {
          code: 'USER_NOT_FOUND',
          message: 'User not found',
        },
      });
    });
  });

  describe('POST /api/v1/auth/refresh', () => {
    const mockTokenData = {
      userId: 'user-123',
      rememberMe: false,
    };

    const mockUser = {
      id: 'user-123',
      email: 'test@example.com',
    };

    it('should refresh access token successfully', async () => {
      MockedAuthService.validateRefreshToken.mockResolvedValue(mockTokenData);
      MockedAuthService.getUserById.mockResolvedValue(mockUser);
      MockedAuthService.generateToken.mockReturnValue({
        accessToken: 'new-access-token',
        expiresIn: 86400,
      });
      MockedAuthService.generateRefreshToken.mockResolvedValue('new-refresh-token');
      MockedAuthService.revokeRefreshToken.mockResolvedValue(undefined);

      const response = await request(app)
        .post('/api/v1/auth/refresh')
        .set('Cookie', 'refresh_token=valid-refresh-token')
        .expect(200);

      expect(response.body).toEqual({
        success: true,
        data: {
          token: 'new-access-token',
          expiresIn: 86400,
        },
      });
    });

    it('should return 401 without refresh token', async () => {
      const response = await request(app)
        .post('/api/v1/auth/refresh')
        .expect(401);

      expect(response.body).toEqual({
        success: false,
        error: {
          code: 'REFRESH_TOKEN_REQUIRED',
          message: 'Refresh token is required',
        },
      });
    });

    it('should return 401 with invalid refresh token', async () => {
      MockedAuthService.validateRefreshToken.mockResolvedValue(null);

      const response = await request(app)
        .post('/api/v1/auth/refresh')
        .set('Cookie', 'refresh_token=invalid-token')
        .expect(401);

      expect(response.body).toEqual({
        success: false,
        error: {
          code: 'INVALID_REFRESH_TOKEN',
          message: 'Invalid or expired refresh token',
        },
      });
    });
  });

  describe('POST /api/v1/auth/logout', () => {
    it('should logout successfully', async () => {
      MockedAuthService.revokeRefreshToken.mockResolvedValue(undefined);
      MockedAuditService.log.mockResolvedValue(undefined);

      const response = await request(app)
        .post('/api/v1/auth/logout')
        .set('Cookie', 'refresh_token=valid-token')
        .expect(200);

      expect(response.body).toEqual({
        success: true,
        message: 'Logged out successfully',
      });

      expect(MockedAuthService.revokeRefreshToken).toHaveBeenCalledWith('valid-token');
    });

    it('should handle logout without refresh token', async () => {
      MockedAuditService.log.mockResolvedValue(undefined);

      const response = await request(app)
        .post('/api/v1/auth/logout')
        .expect(200);

      expect(response.body).toEqual({
        success: true,
        message: 'Logged out successfully',
      });
    });
  });
});
