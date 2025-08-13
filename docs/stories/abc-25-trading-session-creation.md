# ABC-25: Trading Session Creation with Time and Loss Limits

**Epic**: ABC-2 - Trading Session Management  
**Story Points**: 13  
**Sprint**: 3  
**Priority**: Critical  
**Status**: In Progress - Backend Complete, Frontend Pending  

---

## User Story

**As a** authenticated user  
**I want to** create a time-bounded trading session with specific loss limits  
**So that** I can trade safely within my risk tolerance and time availability while the SmartTrade AI algorithm makes decisions on my behalf

---

## Acceptance Criteria

### Session Creation Interface
- [ ] Session creation modal/page accessible from dashboard
- [ ] Duration selection options: 1 hour, 4 hours, 24 hours, 7 days
- [ ] Loss limit options based on account balance: $9, $18, $27 (or 10%, 20%, 30%)
- [ ] Session preview showing calculated end time and maximum loss
- [ ] Account balance validation before session creation
- [ ] Confirmation dialog with session parameters and risks
- [ ] Only one active session allowed per user at a time

### Session Management Backend
- [ ] POST /api/v1/trading/sessions endpoint for session creation
- [ ] Session validation: sufficient balance, no active sessions
- [ ] Database transaction for session creation with audit logging
- [ ] Session state management: pending → active → expired/stopped/completed
- [ ] Automatic session expiration handling with background jobs
- [ ] Integration with algorithm queue for trading decisions
- [ ] Real-time session monitoring and status updates

### Real-Time Session Monitoring
- [ ] WebSocket connection for real-time session updates
- [ ] Session countdown timer showing remaining time
- [ ] Current loss/gain tracking with visual progress indicators
- [ ] Progress bars for time elapsed and loss limit usage
- [ ] Visual alerts when approaching 80% of time or loss limits
- [ ] Session termination controls (emergency stop button)
- [ ] Real-time algorithm decision notifications

### Session Limits and Safety
- [ ] Maximum session duration: 7 days
- [ ] Minimum session duration: 1 hour
- [ ] Loss limits: $9 (10%), $18 (20%), $27 (30%) of account balance
- [ ] Automatic session termination when loss limit reached
- [ ] Circuit breaker activation during extreme market volatility
- [ ] Emergency session termination available at all times
- [ ] Session limits cannot be modified once active

---

## Technical Specifications

### Database Schema
```typescript
// TradingSession model
model TradingSession {
  id                String               @id @default(uuid())
  userId            String
  user              User                 @relation(fields: [userId], references: [id])
  
  // Session Configuration
  durationMinutes   Int                  // 60, 240, 1440, 10080 (1h, 4h, 24h, 7d)
  lossLimitAmount   Decimal              @db.Decimal(19,4)
  lossLimitPercent  Decimal              @db.Decimal(5,2)
  
  // Session Status
  status            SessionStatus        @default(PENDING)
  startTime         DateTime?
  endTime           DateTime?
  actualEndTime     DateTime?
  
  // Performance Tracking
  currentBalance    Decimal              @db.Decimal(19,4)
  startingBalance   Decimal              @db.Decimal(19,4)
  currentPnL        Decimal              @db.Decimal(19,4) @default(0)
  maxLoss           Decimal              @db.Decimal(19,4) @default(0)
  maxGain           Decimal              @db.Decimal(19,4) @default(0)
  tradeCount        Int                  @default(0)
  
  // Metadata
  createdAt         DateTime             @default(now())
  updatedAt         DateTime             @updatedAt
  
  // Relations
  algorithmDecisions AlgorithmDecision[]
  sessionEvents     SessionEvent[]
  
  @@unique([userId, status], name: "one_active_session_per_user")
  @@index([userId, status])
  @@index([endTime])
}

enum SessionStatus {
  PENDING
  ACTIVE
  EXPIRED
  STOPPED
  COMPLETED
  EMERGENCY_STOPPED
}

model SessionEvent {
  id          String          @id @default(uuid())
  sessionId   String
  session     TradingSession  @relation(fields: [sessionId], references: [id])
  
  eventType   SessionEventType
  eventData   Json
  timestamp   DateTime        @default(now())
  
  @@index([sessionId, timestamp])
}

enum SessionEventType {
  SESSION_CREATED
  SESSION_STARTED
  SESSION_ENDED
  LOSS_LIMIT_WARNING
  TIME_LIMIT_WARNING
  EMERGENCY_STOP
  ALGORITHM_DECISION
}
```

### Backend Implementation
```typescript
// Session creation endpoint
router.post('/sessions', authenticateToken, async (req: Request, res: Response) => {
  const userId = req.user?.userId;
  const { durationMinutes, lossLimitAmount } = req.body;
  
  try {
    // Validate user and check for active sessions
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { 
        tradingSessions: { 
          where: { 
            status: { in: ['PENDING', 'ACTIVE'] } 
          } 
        } 
      }
    });
    
    if (!user) {
      return res.status(404).json({
        success: false,
        error: { code: 'USER_NOT_FOUND', message: 'User not found' }
      });
    }
    
    // Check for existing active session
    if (user.tradingSessions.length > 0) {
      return res.status(400).json({
        success: false,
        error: { 
          code: 'ACTIVE_SESSION_EXISTS', 
          message: 'You already have an active trading session' 
        }
      });
    }
    
    // Validate session parameters
    const validDurations = [60, 240, 1440, 10080]; // 1h, 4h, 24h, 7d
    if (!validDurations.includes(durationMinutes)) {
      return res.status(400).json({
        success: false,
        error: { code: 'INVALID_DURATION', message: 'Invalid session duration' }
      });
    }
    
    // Validate loss limit
    const accountBalance = user.accountBalance.toNumber();
    const maxLossLimit = accountBalance * 0.30; // 30% max
    
    if (lossLimitAmount > maxLossLimit) {
      return res.status(400).json({
        success: false,
        error: { 
          code: 'LOSS_LIMIT_TOO_HIGH', 
          message: `Loss limit cannot exceed 30% of account balance ($${maxLossLimit.toFixed(2)})` 
        }
      });
    }
    
    // Create trading session
    const session = await prisma.$transaction(async (tx) => {
      const newSession = await tx.tradingSession.create({
        data: {
          userId,
          durationMinutes,
          lossLimitAmount: new Decimal(lossLimitAmount),
          lossLimitPercent: new Decimal((lossLimitAmount / accountBalance) * 100),
          currentBalance: user.accountBalance,
          startingBalance: user.accountBalance,
          status: 'PENDING',
          endTime: new Date(Date.now() + durationMinutes * 60 * 1000)
        }
      });
      
      // Log session creation event
      await tx.sessionEvent.create({
        data: {
          sessionId: newSession.id,
          eventType: 'SESSION_CREATED',
          eventData: {
            durationMinutes,
            lossLimitAmount,
            endTime: newSession.endTime
          }
        }
      });
      
      return newSession;
    });
    
    // Schedule session expiration job
    await sessionService.scheduleSessionExpiration(session.id, session.endTime!);
    
    // Log audit event
    await auditService.log({
      userId,
      eventType: 'trading_session',
      eventAction: 'session_created',
      eventData: {
        sessionId: session.id,
        durationMinutes,
        lossLimitAmount,
        endTime: session.endTime
      }
    });
    
    res.status(201).json({
      success: true,
      data: {
        session: {
          id: session.id,
          durationMinutes: session.durationMinutes,
          lossLimitAmount: session.lossLimitAmount.toNumber(),
          lossLimitPercent: session.lossLimitPercent.toNumber(),
          status: session.status,
          endTime: session.endTime,
          createdAt: session.createdAt
        }
      }
    });
    
  } catch (error) {
    console.error('Session creation error:', error);
    res.status(500).json({
      success: false,
      error: { code: 'SESSION_CREATION_FAILED', message: 'Failed to create trading session' }
    });
  }
});

// Start session endpoint
router.post('/sessions/:id/start', authenticateToken, async (req: Request, res: Response) => {
  const userId = req.user?.userId;
  const { id: sessionId } = req.params;
  
  try {
    const session = await prisma.tradingSession.findFirst({
      where: { 
        id: sessionId, 
        userId,
        status: 'PENDING'
      }
    });
    
    if (!session) {
      return res.status(404).json({
        success: false,
        error: { code: 'SESSION_NOT_FOUND', message: 'Session not found or already started' }
      });
    }
    
    // Start the session
    const updatedSession = await prisma.$transaction(async (tx) => {
      const updated = await tx.tradingSession.update({
        where: { id: sessionId },
        data: {
          status: 'ACTIVE',
          startTime: new Date()
        }
      });
      
      // Log session start event
      await tx.sessionEvent.create({
        data: {
          sessionId,
          eventType: 'SESSION_STARTED',
          eventData: {
            startTime: updated.startTime
          }
        }
      });
      
      return updated;
    });
    
    // Initialize algorithm processing for this session
    await algorithmService.initializeSessionProcessing(sessionId, userId);
    
    // Start real-time monitoring
    await sessionMonitorService.startSessionMonitoring(sessionId);
    
    res.json({
      success: true,
      data: {
        session: {
          ...updatedSession,
          lossLimitAmount: updatedSession.lossLimitAmount.toNumber(),
          currentBalance: updatedSession.currentBalance.toNumber(),
          startingBalance: updatedSession.startingBalance.toNumber(),
          currentPnL: updatedSession.currentPnL.toNumber()
        }
      }
    });
    
  } catch (error) {
    console.error('Session start error:', error);
    res.status(500).json({
      success: false,
      error: { code: 'SESSION_START_FAILED', message: 'Failed to start session' }
    });
  }
});
```

### Frontend Implementation
```typescript
// Session creation form component
interface SessionCreationFormData {
  durationMinutes: number;
  lossLimitAmount: number;
}

const SessionCreationForm: React.FC = () => {
  const [isCreating, setIsCreating] = useState(false);
  const [formData, setFormData] = useState<SessionCreationFormData>({
    durationMinutes: 60,
    lossLimitAmount: 9
  });
  
  const { user, accountBalance } = useAuthStore();
  
  const durationOptions = [
    { label: '1 Hour', value: 60, description: 'Quick trading session' },
    { label: '4 Hours', value: 240, description: 'Half-day trading' },
    { label: '24 Hours', value: 1440, description: 'Full day trading' },
    { label: '7 Days', value: 10080, description: 'Week-long session' }
  ];
  
  const lossLimitOptions = [
    { label: '$9 (10%)', value: 9, percent: 10 },
    { label: '$18 (20%)', value: 18, percent: 20 },
    { label: '$27 (30%)', value: 27, percent: 30 }
  ];
  
  const handleCreateSession = async () => {
    setIsCreating(true);
    
    try {
      const response = await sessionApi.createSession(formData);
      
      if (response.success) {
        // Show success message and redirect
        toast.success('Trading session created successfully!');
        navigate('/dashboard');
      } else {
        toast.error(response.error?.message || 'Failed to create session');
      }
    } catch (error) {
      toast.error('Failed to create trading session');
    } finally {
      setIsCreating(false);
    }
  };
  
  const getEndTime = () => {
    const endTime = new Date(Date.now() + formData.durationMinutes * 60 * 1000);
    return endTime.toLocaleString();
  };
  
  return (
    <div className="max-w-2xl mx-auto p-6 bg-white rounded-lg shadow-lg">
      <h2 className="text-2xl font-bold text-gray-900 mb-6">
        Create Trading Session
      </h2>
      
      {/* Duration Selection */}
      <div className="mb-8">
        <label className="block text-sm font-medium text-gray-700 mb-4">
          Session Duration
        </label>
        <div className="grid grid-cols-2 gap-4">
          {durationOptions.map((option) => (
            <button
              key={option.value}
              className={`p-4 border-2 rounded-lg text-left transition-colors ${
                formData.durationMinutes === option.value
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-300 hover:border-gray-400'
              }`}
              onClick={() => setFormData({ ...formData, durationMinutes: option.value })}
            >
              <div className="font-semibold">{option.label}</div>
              <div className="text-sm text-gray-600">{option.description}</div>
            </button>
          ))}
        </div>
      </div>
      
      {/* Loss Limit Selection */}
      <div className="mb-8">
        <label className="block text-sm font-medium text-gray-700 mb-4">
          Loss Limit
        </label>
        <div className="grid grid-cols-3 gap-4">
          {lossLimitOptions.map((option) => (
            <button
              key={option.value}
              className={`p-4 border-2 rounded-lg text-center transition-colors ${
                formData.lossLimitAmount === option.value
                  ? 'border-red-500 bg-red-50'
                  : 'border-gray-300 hover:border-gray-400'
              }`}
              onClick={() => setFormData({ ...formData, lossLimitAmount: option.value })}
            >
              <div className="font-semibold text-lg">{option.label}</div>
              <div className="text-sm text-gray-600">{option.percent}% of balance</div>
            </button>
          ))}
        </div>
      </div>
      
      {/* Session Preview */}
      <div className="mb-8 p-4 bg-gray-50 rounded-lg">
        <h3 className="font-semibold text-gray-900 mb-2">Session Preview</h3>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span>Duration:</span>
            <span className="font-semibold">
              {durationOptions.find(d => d.value === formData.durationMinutes)?.label}
            </span>
          </div>
          <div className="flex justify-between">
            <span>End Time:</span>
            <span className="font-semibold">{getEndTime()}</span>
          </div>
          <div className="flex justify-between">
            <span>Maximum Loss:</span>
            <span className="font-semibold text-red-600">
              ${formData.lossLimitAmount.toFixed(2)}
            </span>
          </div>
          <div className="flex justify-between">
            <span>Account Balance:</span>
            <span className="font-semibold">${accountBalance?.toFixed(2)}</span>
          </div>
        </div>
      </div>
      
      {/* Risk Warning */}
      <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
        <div className="flex items-start">
          <AlertTriangle className="h-5 w-5 text-yellow-600 mr-2 mt-0.5" />
          <div className="text-sm text-yellow-800">
            <p className="font-semibold mb-1">Risk Warning</p>
            <p>
              Trading involves substantial risk of loss. The SmartTrade AI algorithm will make
              trading decisions on your behalf during this session. You may lose up to your
              specified loss limit of ${formData.lossLimitAmount}.
            </p>
          </div>
        </div>
      </div>
      
      {/* Action Buttons */}
      <div className="flex space-x-4">
        <button
          onClick={() => navigate('/dashboard')}
          className="flex-1 px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
        >
          Cancel
        </button>
        <button
          onClick={handleCreateSession}
          disabled={isCreating || !accountBalance || accountBalance < formData.lossLimitAmount}
          className="flex-1 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {isCreating ? 'Creating Session...' : 'Create Session'}
        </button>
      </div>
    </div>
  );
};
```

---

## Implementation Tasks

### Task 1: Database Schema Setup
**Subtasks:**
- [x] Create TradingSession model with proper constraints
- [x] Create SessionEvent model for audit tracking
- [x] Add SessionStatus and SessionEventType enums
- [x] Create database migration with indexes
- [x] Add unique constraint for one active session per user

### Task 2: Backend Session Management
**Subtasks:**
- [x] Create POST /api/v1/sessions endpoint
- [x] Create POST /api/v1/sessions/:id/start endpoint
- [x] Implement session validation logic
- [x] Add session status management
- [x] Create session service with lifecycle management
- [ ] Create background job for session expiration
- [ ] Integrate with algorithm queue system

### Task 3: Frontend Session Creation
**Subtasks:**
- [x] Create SessionCreationForm component
- [x] Implement duration and loss limit selection
- [x] Add session preview with calculations
- [x] Create confirmation dialog with risk warnings
- [x] Add form validation and error handling
- [x] Integrate with session API endpoints

### Task 4: Real-Time Session Monitoring
**Subtasks:**
- [ ] Set up WebSocket connection for session updates
- [ ] Create session monitoring service
- [ ] Implement real-time countdown timer
- [ ] Add progress indicators for time and loss limits
- [ ] Create visual alerts for approaching limits
- [ ] Add emergency session termination controls

### Task 5: Integration with Algorithm System
**Subtasks:**
- [ ] Connect session creation with algorithm queue
- [ ] Implement session-based algorithm decision routing
- [ ] Add session context to algorithm decisions
- [ ] Create session performance tracking
- [ ] Integrate with existing portfolio management
- [ ] Add session-based trading restrictions

---

## Definition of Done

### Functional Requirements
- [ ] Users can create trading sessions with time and loss limits
- [ ] Only one active session allowed per user
- [ ] Sessions automatically expire at specified time
- [ ] Sessions terminate when loss limit is reached
- [ ] Real-time session monitoring and countdown
- [ ] Emergency session termination available
- [ ] Integration with SmartTrade AI algorithm system

### Technical Requirements
- [ ] Database schema supports session management
- [ ] API endpoints handle all session operations
- [ ] WebSocket provides real-time updates
- [ ] Background jobs handle session expiration
- [ ] Frontend provides intuitive session creation
- [ ] Error handling for all edge cases
- [ ] Comprehensive audit logging

### Security & Performance
- [ ] Session validation prevents abuse
- [ ] User authentication required for all operations
- [ ] Rate limiting on session creation
- [ ] Database transactions ensure consistency
- [ ] Performance optimized for concurrent sessions
- [ ] Security audit of session management logic

### Testing
- [ ] Unit tests for session business logic (>95% coverage)
- [ ] Integration tests for API endpoints
- [ ] Frontend component tests
- [ ] WebSocket connection tests
- [ ] Background job execution tests
- [ ] Performance tests with multiple concurrent sessions

---

## Integration Points

### Existing Systems
- **Authentication**: Requires valid JWT token for all session operations
- **Algorithm Queue**: Sessions trigger algorithm processing
- **Portfolio Management**: Session performance affects portfolio tracking
- **Audit System**: All session events logged for compliance
- **Risk Management**: Session limits integrated with user risk profiles

### External Dependencies
- **WebSocket Server**: Real-time session monitoring
- **Background Job System**: Session expiration handling
- **Database**: PostgreSQL with proper indexing
- **Redis**: Session state caching for performance

---

## Risk Considerations

### Technical Risks
- **Session State Consistency**: Ensure session state remains consistent across server restarts
- **Real-Time Performance**: WebSocket connections must handle multiple concurrent sessions
- **Background Job Reliability**: Session expiration must work reliably
- **Algorithm Integration**: Session context must properly flow to algorithm decisions

### Business Risks
- **Loss Limit Enforcement**: Critical that loss limits are enforced accurately
- **Session Conflicts**: Prevent users from creating multiple active sessions
- **Emergency Termination**: Must always be available regardless of system state
- **Audit Compliance**: All session activities must be properly logged

---

## Success Metrics

### User Experience
- Session creation completes in <3 seconds
- Real-time updates have <1 second latency
- 99.9% session reliability (no unexpected terminations)
- Emergency stop responds in <2 seconds

### Technical Performance
- Support 1000+ concurrent active sessions
- Database queries complete in <100ms
- WebSocket connections stable for session duration
- Background jobs execute within 30 seconds of schedule

### Business Outcomes
- Enable safe algorithm trading with user-defined limits
- Provide foundation for portfolio tracking and analytics
- Support regulatory compliance with audit trail
- Enable scalable trading session management

---

**Story Status**: Ready for Development  
**Epic**: ABC-2 - Trading Session Management  
**Dependencies**: ABC-7 (User Registration), ABC-8 (JWT Authentication), ABC-24 (Algorithm Integration)  
**Next Stories**: ABC-26 (Session Monitoring), ABC-27 (Session History)
