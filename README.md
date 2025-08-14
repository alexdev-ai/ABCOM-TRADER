# ABCOM TRADER - SmartTrade AI Platform

A modern full-stack trading platform that enables users to start trading with just $90. Built with React, TypeScript, Express.js, and PostgreSQL.

## 🚀 Features

- **User Registration & Authentication** - Secure user onboarding with KYC data collection
- **Risk Management** - Automated risk profiling and loss limits
- **Real-time Validation** - Comprehensive form validation with instant feedback
- **Security First** - bcrypt password hashing, JWT tokens, rate limiting
- **Audit Logging** - Complete audit trail for all user actions
- **Mobile Responsive** - Banking-grade UI that works on all devices

## 🏗️ Architecture

### Frontend
- **React 18** with TypeScript for type safety
- **Vite** for fast development and building
- **Tailwind CSS** for utility-first styling
- **React Hook Form + Zod** for form management and validation
- **Mobile-first responsive design**

### Backend
- **Express.js** with TypeScript
- **Prisma ORM** with PostgreSQL database
- **JWT authentication** with proper security
- **bcrypt password hashing** (12 salt rounds)
- **Rate limiting** and security middleware
- **Comprehensive audit logging**

### Database
- **PostgreSQL** with Prisma ORM
- **User management** with KYC data
- **Risk management profiles**
- **Audit logging** for security events

## 📋 Prerequisites

- Node.js 18+ 
- PostgreSQL 14+
- npm or yarn package manager

## 🛠️ Installation

### 1. Clone the repository
```bash
git clone https://github.com/alexdev-ai/ABCOM-TRADER.git
cd ABCOM-TRADER
```

### 2. Install Frontend Dependencies
```bash
cd frontend
npm install
```

### 3. Install Backend Dependencies
```bash
cd ../backend
npm install
```

### 4. Environment Setup

Copy the environment template and configure your settings:

```bash
# Backend environment
cp backend/.env.example backend/.env
```

Edit `backend/.env` with your configuration:
```env
# Database Configuration
DATABASE_URL="postgresql://username:password@localhost:5432/smarttrade_ai?schema=public"

# JWT Configuration (use a strong secret in production)
JWT_SECRET="your-super-secret-jwt-key-here-make-it-long-and-random"

# Server Configuration
PORT=3002
NODE_ENV=development

# Frontend URL for CORS
FRONTEND_URL="http://localhost:3001"
```

### 5. Database Setup

```bash
cd backend

# Generate Prisma client
npx prisma generate

# Run database migrations (when you have a database set up)
npx prisma db push
```

## 🚀 Development

### Start the Backend Server
```bash
cd backend
npm run dev
```
Backend will run on http://localhost:3002

### Start the Frontend Development Server
```bash
cd frontend
npm run dev
```
Frontend will run on http://localhost:3001

### Health Check
Visit http://localhost:3002/health to verify the backend is running.

## 📁 Project Structure

```
ABCOM-TRADER/
├── frontend/                 # React frontend application
│   ├── src/
│   │   ├── components/      # React components
│   │   │   └── auth/        # Authentication components
│   │   ├── App.tsx          # Main app component
│   │   ├── main.tsx         # App entry point
│   │   └── index.css        # Global styles
│   ├── package.json
│   ├── vite.config.ts       # Vite configuration
│   ├── tailwind.config.js   # Tailwind CSS config
│   └── tsconfig.json        # TypeScript config
├── backend/                  # Express.js backend API
│   ├── src/
│   │   ├── routes/          # API route handlers
│   │   ├── services/        # Business logic services
│   │   ├── middleware/      # Express middleware
│   │   ├── schemas/         # Zod validation schemas
│   │   └── server.ts        # Express server setup
│   ├── prisma/
│   │   └── schema.prisma    # Database schema
│   ├── package.json
│   └── tsconfig.json        # TypeScript config
├── docs/                     # Project documentation
│   ├── project-brief.md     # Project overview
│   ├── prd.md              # Product requirements
│   ├── architecture.md     # Technical architecture
│   └── stories/            # User stories
├── memory-bank/             # Development context
└── README.md               # This file
```

## 🔐 API Endpoints

### Authentication
- `POST /api/v1/auth/register` - User registration
- `POST /api/v1/auth/login` - User login
- `GET /api/v1/auth/me` - Get current user profile

### Health Check
- `GET /health` - Server health status

## 🧪 Testing

### Frontend Tests
```bash
cd frontend
npm test
```

### Backend Tests
```bash
cd backend
npm test
```

## 🔒 Security Features

- **Password Security**: bcrypt hashing with 12 salt rounds
- **JWT Tokens**: Secure authentication with proper validation
- **Rate Limiting**: Protection against brute force attacks
- **Input Validation**: Comprehensive Zod schema validation
- **CORS Protection**: Configured for frontend origin
- **Security Headers**: Helmet.js middleware
- **Audit Logging**: All authentication events tracked
- **Input Sanitization**: Protection against injection attacks

## 📊 Database Schema

### Users Table
- User authentication and profile data
- KYC information (name, DOB, phone)
- Account balance and status
- Risk tolerance preferences

### Risk Management Table
- User-specific risk profiles
- Daily, weekly, monthly loss limits
- Risk tolerance settings

### Audit Logs Table
- Complete audit trail
- Authentication events
- Security incidents
- User actions

## 🚀 Deployment

### Frontend (Vercel)
```bash
cd frontend
npm run build
# Deploy to Vercel
```

### Backend (Railway/Heroku)
```bash
cd backend
npm run build
# Deploy to your preferred platform
```

### Environment Variables for Production
Ensure these are set in your production environment:
- `DATABASE_URL` - PostgreSQL connection string
- `JWT_SECRET` - Strong JWT secret key
- `NODE_ENV=production`
- `FRONTEND_URL` - Your frontend domain

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

For support, email support@abcomtrader.com or create an issue in this repository.

## 🔄 Development Status

- ✅ **User Registration** - Complete with validation and security
- ✅ **Authentication API** - JWT-based auth with audit logging
- ✅ **Frontend UI** - Banking-grade responsive design
- 🚧 **Database Integration** - In progress
- 📋 **Trading Features** - Planned
- 📋 **Payment Integration** - Planned

---

**Built with ❤️ by the ABCOM TRADER team**
# Updated Thu Aug 14 14:02:45 MST 2025
# Environment variables configured Thu Aug 14 14:15:08 MST 2025
