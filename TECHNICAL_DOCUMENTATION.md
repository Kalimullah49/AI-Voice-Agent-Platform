# Mind AI - Technical Documentation

## Project Overview

**Mind AI** is a comprehensive AI-powered call center management and analytics solution designed as a multi-tenant SaaS platform. The system provides advanced voice automation capabilities, intelligent call analysis, campaign management, and real-time analytics for businesses across all industries.

### Key Features
- **AI-Powered Voice Automation** - Intelligent call handling with natural language processing
- **Multi-Tenant Architecture** - Secure, scalable platform supporting multiple organizations
- **Campaign Management** - Automated outbound calling campaigns with advanced targeting
- **Real-Time Analytics** - Live call monitoring, performance metrics, and detailed reporting
- **CRM Integration** - Contact management with comprehensive customer data handling
- **Telephony Integration** - Full Twilio integration for voice services and phone number management
- **Voice Synthesis** - ElevenLabs integration for custom voice generation and cloning

## Technical Architecture

### Technology Stack

#### Frontend
- **React 18** with TypeScript for type-safe development
- **Vite** for fast development and optimized builds
- **Tailwind CSS** for responsive, utility-first styling
- **shadcn/ui** component library for consistent UI elements
- **Wouter** for lightweight client-side routing
- **TanStack Query** for efficient server state management
- **React Hook Form** with Zod validation for robust form handling

#### Backend
- **Node.js** with Express.js framework
- **TypeScript** for type safety across the entire stack
- **PostgreSQL** with connection pooling via Neon serverless
- **Drizzle ORM** for type-safe database operations and migrations
- **Express Session** with PostgreSQL session store for authentication
- **Passport.js** for authentication middleware

#### External Services & APIs
- **Vapi.ai** - Voice AI integration for intelligent call handling
- **Twilio** - Telephony services and phone number management
- **ElevenLabs** - Voice synthesis and cloning capabilities
- **OpenAI GPT-4o** - Natural language processing and intelligent responses
- **Postmark** - Transactional email delivery service
- **Deepgram** - Speech-to-text transcription services

### Database Schema

#### Core Entities

**Users Table**
```sql
users (
  id VARCHAR PRIMARY KEY,
  email VARCHAR UNIQUE,
  password_hash VARCHAR,
  email_verified BOOLEAN,
  first_name VARCHAR,
  last_name VARCHAR,
  created_at TIMESTAMP,
  updated_at TIMESTAMP
)
```

**Agents Table**
```sql
agents (
  id SERIAL PRIMARY KEY,
  user_id VARCHAR REFERENCES users(id),
  name VARCHAR NOT NULL,
  type VARCHAR, -- 'inbound', 'outbound', 'both'
  personality TEXT,
  voice_id VARCHAR, -- ElevenLabs voice ID
  prompt TEXT,
  created_at TIMESTAMP,
  updated_at TIMESTAMP
)
```

**Campaigns Table**
```sql
campaigns (
  id SERIAL PRIMARY KEY,
  user_id VARCHAR REFERENCES users(id),
  name VARCHAR NOT NULL,
  agent_id INTEGER REFERENCES agents(id),
  contact_group_id INTEGER REFERENCES contact_groups(id),
  status VARCHAR, -- 'draft', 'active', 'paused', 'completed'
  concurrent_calls INTEGER DEFAULT 1,
  created_at TIMESTAMP,
  updated_at TIMESTAMP
)
```

**Calls Table**
```sql
calls (
  id SERIAL PRIMARY KEY,
  agent_id INTEGER REFERENCES agents(id),
  campaign_id INTEGER,
  from_number VARCHAR,
  to_number VARCHAR,
  status VARCHAR,
  duration INTEGER,
  cost DECIMAL(10,4),
  transcript TEXT,
  recording_url VARCHAR,
  vapi_call_id VARCHAR,
  started_at TIMESTAMP,
  ended_at TIMESTAMP
)
```

**Contact Management**
```sql
contact_groups (
  id SERIAL PRIMARY KEY,
  user_id VARCHAR REFERENCES users(id),
  name VARCHAR NOT NULL,
  created_at TIMESTAMP
)

contacts (
  id SERIAL PRIMARY KEY,
  group_id INTEGER REFERENCES contact_groups(id),
  phone_number VARCHAR NOT NULL,
  first_name VARCHAR,
  last_name VARCHAR,
  address VARCHAR,
  city VARCHAR,
  state VARCHAR,
  country VARCHAR,
  zip_code VARCHAR,
  created_at TIMESTAMP
)
```

**Twilio Integration**
```sql
twilio_accounts (
  id SERIAL PRIMARY KEY,
  user_id VARCHAR REFERENCES users(id),
  account_sid VARCHAR NOT NULL,
  auth_token VARCHAR NOT NULL,
  friendly_name VARCHAR,
  is_default BOOLEAN DEFAULT false,
  created_at TIMESTAMP
)

phone_numbers (
  id SERIAL PRIMARY KEY,
  user_id VARCHAR REFERENCES users(id),
  twilio_account_id INTEGER REFERENCES twilio_accounts(id),
  number VARCHAR NOT NULL,
  agent_id INTEGER REFERENCES agents(id),
  friendly_name VARCHAR,
  capabilities TEXT[], -- voice, sms, mms
  created_at TIMESTAMP
)
```

### API Architecture

#### Authentication & Authorization
- Session-based authentication with secure HTTP-only cookies
- Password hashing using bcrypt with salt rounds
- Email verification system with time-limited tokens
- Password reset functionality with secure token generation
- Multi-factor authentication support ready

#### RESTful API Design

**Authentication Endpoints**
```
POST /api/auth/register     # User registration with email verification
POST /api/auth/login        # User authentication
POST /api/auth/logout       # Session termination
GET  /api/auth/user         # Current user profile
POST /api/auth/verify       # Email verification
POST /api/auth/forgot-password  # Password reset request
POST /api/auth/reset-password   # Password reset confirmation
```

**Agent Management**
```
GET    /api/agents          # List user's agents
POST   /api/agents          # Create new agent
GET    /api/agents/:id      # Get agent details
PATCH  /api/agents/:id      # Update agent
DELETE /api/agents/:id      # Delete agent
POST   /api/agents/:id/test-call  # Initiate test call
```

**Campaign Management**
```
GET    /api/campaigns       # List campaigns
POST   /api/campaigns       # Create campaign
GET    /api/campaigns/:id   # Get campaign details
PATCH  /api/campaigns/:id   # Update campaign
DELETE /api/campaigns/:id   # Delete campaign
POST   /api/campaigns/:id/start   # Start campaign
POST   /api/campaigns/:id/pause   # Pause campaign
```

**Call Management**
```
GET    /api/calls           # List calls with filtering
GET    /api/calls/:id       # Get call details
POST   /api/calls           # Create call record
PATCH  /api/calls/:id       # Update call status
```

**Contact Management**
```
GET    /api/contact-groups  # List contact groups
POST   /api/contact-groups  # Create group
DELETE /api/contact-groups/:id  # Delete group

GET    /api/contacts        # List contacts
POST   /api/contacts        # Add contact
GET    /api/contacts/group/:groupId  # Get group contacts
DELETE /api/contacts/:id    # Delete contact
```

**Twilio Integration**
```
GET    /api/twilio-accounts          # List Twilio accounts
POST   /api/twilio-accounts          # Add Twilio account
PATCH  /api/twilio-accounts/:id      # Update account
DELETE /api/twilio-accounts/:id      # Remove account
POST   /api/twilio-accounts/:id/set-default  # Set default account

GET    /api/phone-numbers            # List phone numbers
GET    /api/available-twilio-phone-numbers  # Available numbers
POST   /api/purchase-twilio-phone-number    # Purchase number
DELETE /api/phone-numbers/:id        # Release number
PATCH  /api/phone-numbers/:id/assign # Assign to agent
```

**Analytics & Metrics**
```
GET    /api/metrics/dashboard        # Dashboard summary
GET    /api/metrics/calls           # Call analytics
GET    /api/metrics/campaigns       # Campaign performance
```

**Vapi.ai Integration**
```
POST   /api/vapi/assistants         # Create Vapi assistant
GET    /api/vapi/token              # Get public token
POST   /api/webhook/vapi            # Vapi webhook handler
```

### Security Implementation

#### Data Protection
- **Encryption at Rest**: Database encryption for sensitive data
- **Encryption in Transit**: HTTPS/TLS for all communications
- **API Key Management**: Secure storage and rotation of third-party API keys
- **Input Validation**: Zod schema validation for all API inputs
- **SQL Injection Prevention**: Parameterized queries via Drizzle ORM

#### Authentication Security
- **Password Security**: bcrypt hashing with configurable rounds
- **Session Security**: Secure, HTTP-only cookies with CSRF protection
- **Token Security**: Time-limited verification and reset tokens
- **Rate Limiting**: API rate limiting to prevent abuse
- **CORS Configuration**: Strict origin policies for browser requests

#### Privacy & Compliance
- **Data Minimization**: Collect only necessary user information
- **User Consent**: Clear consent mechanisms for data processing
- **Right to Deletion**: User data deletion capabilities
- **Audit Logging**: Comprehensive logging for compliance tracking
- **Access Controls**: Role-based access control ready for implementation

### Voice AI Integration

#### Vapi.ai Configuration
```javascript
// Assistant Configuration
{
  model: {
    provider: "openai",
    model: "gpt-4o",
    systemMessage: "Custom agent personality and instructions"
  },
  voice: {
    provider: "11labs",
    voiceId: "custom-voice-id",
    stability: 0.5,
    similarityBoost: 0.75
  },
  transcriber: {
    provider: "deepgram",
    model: "nova-2",
    language: "en-US"
  }
}
```

#### ElevenLabs Voice Management
- Custom voice cloning and synthesis
- Voice library management per user
- Real-time voice generation for dynamic content
- Voice quality optimization settings

#### Call Flow Management
1. **Inbound Calls**: Automatic routing to appropriate agents
2. **Outbound Campaigns**: Batch calling with concurrent limits
3. **Call Recording**: Automatic recording and transcription
4. **Real-time Monitoring**: Live call status and metrics
5. **Post-call Analysis**: AI-powered call summaries and insights

### Performance & Scalability

#### Database Optimization
- **Connection Pooling**: Efficient database connection management
- **Query Optimization**: Indexed queries for fast data retrieval
- **Data Partitioning**: Ready for horizontal scaling
- **Caching Strategy**: Query result caching for frequently accessed data

#### Application Performance
- **Lazy Loading**: Component-level code splitting
- **Bundle Optimization**: Tree shaking and minification
- **API Caching**: Intelligent caching of API responses
- **Real-time Updates**: WebSocket connections for live data

#### Monitoring & Observability
- **Error Tracking**: Comprehensive error logging and alerting
- **Performance Metrics**: Response time and throughput monitoring
- **User Analytics**: Usage patterns and feature adoption tracking
- **Infrastructure Monitoring**: Server health and resource utilization

### Deployment Architecture

#### Production Environment
- **Platform**: Replit Deployments with automatic scaling
- **Database**: Neon PostgreSQL with automated backups
- **CDN**: Global content delivery for static assets
- **SSL/TLS**: Automatic certificate management
- **Domain Management**: Custom domain support

#### Development Workflow
- **Version Control**: Git-based development workflow
- **Code Quality**: TypeScript strict mode and ESLint
- **Testing Strategy**: Unit and integration testing setup
- **CI/CD Pipeline**: Automated testing and deployment

#### Backup & Recovery
- **Database Backups**: Automated daily backups with point-in-time recovery
- **Code Versioning**: Git-based version control with branch protection
- **Configuration Management**: Environment-based configuration
- **Disaster Recovery**: Multi-region deployment capability

### Integration Capabilities

#### Third-Party Services
- **CRM Systems**: API-ready for Salesforce, HubSpot integration
- **Analytics Platforms**: Google Analytics, Mixpanel integration
- **Communication Tools**: Slack, Microsoft Teams notifications
- **Payment Processing**: Stripe integration for subscription billing

#### Webhook Support
- **Real-time Events**: Webhook delivery for call events
- **Custom Integrations**: Flexible webhook configuration
- **Retry Logic**: Automatic retry mechanism for failed webhooks
- **Security**: HMAC signature verification for webhook authenticity

### Future Roadmap

#### Phase 1 (Current)
- ✅ Core platform functionality
- ✅ Voice AI integration
- ✅ Campaign management
- ✅ Basic analytics

#### Phase 2 (Planned)
- 🔄 Advanced analytics dashboard
- 🔄 Multi-language support
- 🔄 Advanced call routing
- 🔄 Integration marketplace

#### Phase 3 (Future)
- 📋 Mobile applications
- 📋 Advanced AI features
- 📋 Enterprise SSO
- 📋 White-label solutions

## Support & Maintenance

### Technical Support
- **Documentation**: Comprehensive API documentation
- **Developer Portal**: Integration guides and examples
- **Support Channels**: Email and chat support
- **SLA Commitment**: 99.9% uptime guarantee

### Maintenance Schedule
- **Regular Updates**: Monthly feature releases
- **Security Patches**: Immediate security updates
- **Performance Optimization**: Quarterly performance reviews
- **Database Maintenance**: Weekly maintenance windows

---

*This document represents the current technical state of the Mind AI platform as of December 2024. For the most up-to-date information, please refer to the project repository and API documentation.*