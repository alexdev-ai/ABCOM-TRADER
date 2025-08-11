# ABC-7: User Registration with KYC Data Collection - REFINED FOR DEVELOPMENT

**Epic**: ABC-1 - User Authentication & Onboarding  
**Story Points**: 8  
**Sprint**: 1  
**Priority**: Critical  
**Status**: Ready for Development  

---

## User Story

**As a** new user  
**I want to** register for SmartTrade AI with minimal required information  
**So that** I can start trading with just $90 and complete the process in under 3 minutes  

---

## Acceptance Criteria

### Registration Form Requirements
- [ ] Registration form collects: email, password, first name, last name, date of birth, phone number
- [ ] Password requirements: minimum 8 characters, 1 uppercase, 1 lowercase, 1 number
- [ ] Email validation with confirmation email sent
- [ ] Phone number validation with SMS verification
- [ ] Age verification (must be 18+ for trading)
- [ ] Risk tolerance selection: conservative, moderate, aggressive
- [ ] Form completion time tracked (target: <3 minutes)
- [ ] Mobile-responsive design matching banking app aesthetics

### Data Validation & Security
- [ ] All inputs validated using Zod schema validation
- [ ] Password hashed using bcrypt before storage
- [ ] Email uniqueness enforced at database level
- [ ] Phone number format validation (US format)
- [ ] Date of birth validation (18+ years old)
- [ ] Real-time validation feedback on form fields

### Database Integration
- [ ] User record created in PostgreSQL users table
- [ ] Account balance initialized to $0.00
- [ ] KYC status set to 'pending'
- [ ] Risk management profile created with default limits
- [ ] Audit log entry created for registration event

### API Integration
- [ ] POST /api/v1/auth/register endpoint implemented
- [ ] JWT token generated and returned on successful registration
- [ ] Error handling for duplicate email, validation failures
- [ ] Rate limiting applied (5 registration attempts per IP per hour)

---

## Technical Specifications

### Frontend Implementation (React + TypeScript)
```typescript
// Registration form component structure
interface RegistrationFormData {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  phoneNumber: string;
  riskTolerance: 'conservative' | 'moderate' | 'aggressive';
}

// Form validation schema
const registrationSchema = z.object({
  email: z.string().email('Valid email required'),
  password: z.string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, 'Password must contain uppercase, lowercase, and number'),
  firstName: z.string().min(1, 'First name required').max(50),
  lastName: z.string().min(1, 'Last name required').max(50),
  dateOfBirth: z.string().refine(date => {
    const age = new Date().getFullYear() - new Date(date).getFullYear();
    return age >= 18;
  }, 'Must be 18 or older'),
  phoneNumber: z.string().regex(/^\+?1?[2-9]\d{2}[2-9]\d{2}\d{4}$/, 'Valid US phone number required'),
  riskTolerance: z.enum(['conservative', 'moderate', 'aggressive'])
});
```

### Backend Implementation (Express.js + TypeScript)
```typescript
// Registration endpoint implementation
router.post('/register', [
  rateLimiter(5, 60 * 60 * 1000), // 5 attempts per hour
  validateSchema(registrationSchema),
  async (req: Request, res: Response) => {
    const userData = req.body as RegistrationFormData;
    
    // Check if user already exists
    const existingUser = await userRepository.findByEmail(userData.email);
    if (existingUser) {
      return res.status(400).json({
        success: false,
        error: { code: 'EMAIL_EXISTS', message: 'Email already registered' }
      });
    }
    
    // Hash password
    const passwordHash = await bcrypt.hash(userData.password, 12);
    
    // Create user and risk management profile in transaction
    const user = await db.transaction(async (tx) => {
      const newUser = await tx.user.create({
        data: {
          ...userData,
          passwordHash,
          accountBalance: new Decimal(0),
          kycStatus: 'pending'
        }
      });
      
      await tx.riskManagement.create({
        data: {
          userId: newUser.id,
          riskProfile: userData.riskTolerance,
          dailyLossLimit: new Decimal(9.00),
          weeklyLossLimit: new Decimal(18.00),
          monthlyLossLimit: new Decimal(27.00)
        }
      });
      
      return newUser;
    });
    
    // Generate JWT token
    const token = jwt.sign({ userId: user.id }, process.env.JWT_SECRET!, { expiresIn: '24h' });
    
    // Log registration event
    await auditService.log({
      userId: user.id,
      eventType: 'authentication',
      eventAction: 'user_registered',
      eventData: { email: userData.email, riskTolerance: userData.riskTolerance }
    });
    
    res.status(201).json({
      success: true,
      data: { user: sanitizeUser(user), token, expiresIn: 86400 }
    });
  }
]);
```

### Database Schema Requirements
```sql
-- Ensure users table exists with proper constraints
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    date_of_birth DATE NOT NULL,
    phone_number VARCHAR(20) NOT NULL,
    account_balance DECIMAL(19,4) NOT NULL DEFAULT 0.0000,
    risk_tolerance VARCHAR(20) NOT NULL CHECK (risk_tolerance IN ('conservative', 'moderate', 'aggressive')),
    kyc_status VARCHAR(20) NOT NULL DEFAULT 'pending',
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Risk management table for new users
CREATE TABLE IF NOT EXISTS risk_management (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    risk_profile VARCHAR(20) NOT NULL,
    daily_loss_limit DECIMAL(19,4) NOT NULL,
    weekly_loss_limit DECIMAL(19,4) NOT NULL,
    monthly_loss_limit DECIMAL(19,4) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);
```

---

## Context7 Integration Requirements

### Required Context7 Research
- [ ] **React Form Management**: Query "React form validation patterns for financial applications"
- [ ] **Password Security**: Query "bcrypt password hashing best practices Node.js"
- [ ] **Input Validation**: Query "Zod schema validation patterns TypeScript"
- [ ] **Database Transactions**: Query "PostgreSQL transaction patterns Node.js"
- [ ] **JWT Security**: Query "JWT token security implementation financial apps"
- [ ] **Rate Limiting**: Query "Express.js rate limiting patterns authentication"

### Context7 Implementation Validation
- [ ] Form validation patterns follow current React best practices
- [ ] Password hashing uses current bcrypt recommendations
- [ ] Database transaction handling follows PostgreSQL best practices
- [ ] JWT implementation follows current security standards
- [ ] Error handling patterns match current Express.js conventions

---

## Implementation Tasks

### Task 1: Frontend Registration Form
**Subtasks:**
- [x] Create RegistrationPage component with form layout
- [x] Implement form validation using react-hook-form + Zod
- [x] Add real-time validation feedback for all fields
- [x] Implement password strength indicator
- [x] Add mobile-responsive styling with Tailwind CSS
- [x] Create loading states and error handling

### Task 2: Backend Registration API
**Subtasks:**
- [x] Create POST /api/v1/auth/register endpoint
- [x] Implement Zod schema validation middleware
- [x] Add bcrypt password hashing
- [x] Create database transaction for user + risk profile creation
- [x] Implement JWT token generation
- [x] Add comprehensive error handling

### Task 3: Database Integration
**Subtasks:**
- [ ] Create users table with proper constraints
- [ ] Create risk_management table with foreign key
- [ ] Add database indexes for email uniqueness
- [ ] Implement audit logging for registration events
- [ ] Add database migration scripts

### Task 4: Security & Validation
**Subtasks:**
- [ ] Implement rate limiting for registration endpoint
- [ ] Add input sanitization and validation
- [ ] Implement CSRF protection
- [ ] Add security headers (Helmet.js)
- [ ] Create comprehensive error responses

---

## Definition of Done

### Code Quality
- [ ] All TypeScript interfaces properly defined
- [ ] Unit tests written for registration logic (>90% coverage)
- [ ] Integration tests for complete registration flow
- [ ] Frontend component tests using React Testing Library
- [ ] API endpoint tests using Jest + Supertest

### Security Validation
- [ ] Password hashing verified with bcrypt
- [ ] JWT token generation and validation tested
- [ ] Rate limiting functionality verified
- [ ] Input validation prevents injection attacks
- [ ] Error messages don't leak sensitive information

### Performance Requirements
- [ ] Registration form loads in <2 seconds
- [ ] Form validation provides real-time feedback
- [ ] API response time <500ms for registration
- [ ] Database transaction completes in <100ms
- [ ] Mobile responsiveness verified on 3+ devices

### Context7 Compliance
- [ ] Context7 research completed for all technical areas
- [ ] Implementation patterns validated against Context7 findings
- [ ] Context7 insights documented in story comments
- [ ] Code review includes Context7 validation checklist

### Deployment Readiness
- [ ] Environment variables configured for Railway deployment
- [ ] Database migrations tested in staging environment
- [ ] API endpoints tested with Postman/Insomnia
- [ ] Frontend build optimized for Vercel deployment
- [ ] Error monitoring configured with Sentry

---

## Dev Agent Record

### Agent Model Used
Claude 3.5 Sonnet (James - BMad Developer)

### Debug Log References
- Frontend development server running on http://localhost:3001/
- Context7 research completed for React Hook Form patterns
- TypeScript configuration resolved with esModuleInterop
- Tailwind CSS integration successful

### Completion Notes
**Task 1: Frontend Registration Form - COMPLETED**
- ✅ Created comprehensive RegistrationForm component with banking-app aesthetics
- ✅ Implemented React Hook Form with Zod validation following Context7 best practices
- ✅ Added real-time validation feedback with visual error indicators
- ✅ Implemented password strength indicator with color-coded progress bar
- ✅ Added mobile-responsive styling with Tailwind CSS and custom components
- ✅ Created loading states and comprehensive error handling
- ✅ Form includes all required fields: email, password, names, DOB, phone, risk tolerance
- ✅ Validation includes 18+ age verification and US phone number format
- ✅ Password requirements: 8+ chars, uppercase, lowercase, number
- ✅ Ultra-simple interface design matching banking app requirements

**Task 2: Backend Registration API - COMPLETED**
- ✅ Created POST /api/v1/auth/register endpoint with comprehensive validation
- ✅ Implemented Zod schema validation middleware with detailed error handling
- ✅ Added bcrypt password hashing with 12 salt rounds (Context7 best practices)
- ✅ Created database transaction for user + risk management profile creation
- ✅ Implemented JWT token generation with proper issuer/audience validation
- ✅ Added comprehensive error handling with audit logging
- ✅ Implemented rate limiting (5 registration attempts per hour per IP)
- ✅ Added input sanitization and security middleware
- ✅ Created audit service for logging registration events
- ✅ Backend server running successfully on http://localhost:3002/

### File List
**Frontend Files Created:**
- `frontend/package.json` - Project dependencies and scripts
- `frontend/vite.config.ts` - Vite build configuration
- `frontend/tsconfig.json` - TypeScript configuration with JSX support
- `frontend/tsconfig.node.json` - Node-specific TypeScript config
- `frontend/tailwind.config.js` - Tailwind CSS configuration
- `frontend/index.html` - Main HTML entry point
- `frontend/src/main.tsx` - React application entry point
- `frontend/src/App.tsx` - Main application component
- `frontend/src/index.css` - Global styles with Tailwind directives
- `frontend/src/components/auth/RegistrationForm.tsx` - Main registration form component

**Backend Files Created:**
- `backend/package.json` - Backend dependencies and scripts
- `backend/tsconfig.json` - TypeScript configuration for Node.js
- `backend/prisma/schema.prisma` - Database schema with User, RiskManagement, AuditLog models
- `backend/src/server.ts` - Express server with security middleware and routes
- `backend/src/schemas/auth.schema.ts` - Zod validation schemas for authentication
- `backend/src/middleware/validation.middleware.ts` - Request validation and sanitization
- `backend/src/middleware/rateLimiter.middleware.ts` - Rate limiting for API endpoints
- `backend/src/services/auth.service.ts` - Authentication service with bcrypt and JWT
- `backend/src/services/audit.service.ts` - Audit logging service for security events
- `backend/src/routes/auth.routes.ts` - Authentication API routes (/register, /login, /me)
- `backend/.env.example` - Environment variables template
- `backend/.env` - Development environment configuration

### Change Log
**2025-01-10 - Task 1 Implementation:**
- Conducted Context7 research on React Hook Form validation patterns
- Set up complete Vite + React + TypeScript + Tailwind CSS project structure
- Implemented RegistrationForm component with comprehensive validation
- Added password strength indicator and real-time validation feedback
- Created mobile-responsive design with banking-app aesthetics
- Integrated Zod schema validation with React Hook Form
- Added loading states and error handling throughout form
- Successfully tested frontend development server (running on port 3001)

---

**Story Status**: Ready for Development  
**Refined by**: Bob (BMad Scrum Master)  
**Date**: January 10, 2025  
**Next Action**: Assign to James (Developer) for implementation
