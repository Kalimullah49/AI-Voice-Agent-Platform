# Mind AI - Call Center Management & Analytics

## Overview

Mind AI is a comprehensive AI-powered call center management and analytics solution designed as a multi-tenant SaaS platform. The system provides advanced voice automation capabilities, intelligent campaign management, real-time analytics, and CRM integration. Built with modern web technologies, it offers scalable voice services through Twilio and Vapi.ai integrations.

## System Architecture

### Frontend Architecture
- **React 18** with TypeScript for type-safe development
- **Vite** for fast development and optimized builds
- **Tailwind CSS** with shadcn/ui components for consistent UI
- **Wouter** for lightweight client-side routing
- **TanStack Query** for efficient server state management
- **React Hook Form** with Zod validation for form handling

### Backend Architecture
- **Node.js** with Express.js framework
- **TypeScript** for full-stack type safety
- **PostgreSQL** with Neon serverless connection pooling
- **Drizzle ORM** for type-safe database operations
- **Express Session** with PostgreSQL session store
- **Passport.js** for authentication middleware

### Database Strategy
- **Primary Database**: PostgreSQL via Neon serverless
- **ORM**: Drizzle with migration support
- **Session Storage**: PostgreSQL-based session store
- **Schema Management**: Type-safe schema definitions with Zod validation

## Key Components

### Authentication System
- Custom authentication using Express Session
- Password hashing with Node.js crypto (scrypt)
- Email verification system with Postmark integration
- Password reset functionality
- Multi-tenant user isolation

### Voice AI Integration
- **Vapi.ai**: Primary voice AI service for intelligent call handling
- **Twilio**: Telephony services and phone number management
- **ElevenLabs**: Voice synthesis and cloning capabilities
- **OpenAI GPT-4**: Natural language processing for conversations

### Campaign Management
- Automated outbound calling campaigns
- Contact group management and segmentation
- Concurrent call handling with queue management
- Real-time campaign monitoring and control

### Analytics & Reporting
- Real-time call metrics and performance tracking
- Call duration, cost, and outcome analytics
- Dashboard with interactive charts and visualizations
- CSV export functionality for detailed reporting

## Data Flow

### User Authentication Flow
1. User registration with email verification
2. Session creation with PostgreSQL storage
3. JWT-like session management with httpOnly cookies
4. Multi-tenant data isolation by user ID

### Call Management Flow
1. Agent creation with Vapi.ai assistant registration
2. Phone number acquisition through Twilio integration
3. Campaign setup with contact targeting
4. Real-time call execution with webhook handling
5. Call data collection and analytics processing

### External API Integration
1. Vapi.ai webhooks for call status updates
2. Twilio API for phone number management
3. Postmark for transactional email delivery
4. ElevenLabs for voice synthesis

## External Dependencies

### Core Services
- **Vapi.ai**: Voice AI and call automation
- **Twilio**: Telephony infrastructure
- **Postmark**: Email delivery service
- **ElevenLabs**: Voice synthesis
- **OpenAI**: Natural language processing
- **Neon**: PostgreSQL serverless hosting

### Development Tools
- **Drizzle Kit**: Database migrations
- **ESBuild**: Production builds
- **TypeScript**: Type checking
- **Tailwind CSS**: Styling framework

## Deployment Strategy

### Replit Configuration
- **Runtime**: Node.js 20 with PostgreSQL 16
- **Development**: `npm run dev` with hot reload
- **Production Build**: Vite build + ESBuild server bundling
- **Deployment**: Autoscale with port 5000 → 80 mapping

### Environment Variables
- `DATABASE_URL`: Neon PostgreSQL connection string
- `POSTMARK_SERVER_TOKEN`: Email service authentication
- `SESSION_SECRET`: Session encryption key
- `VAPI_PRIVATE_KEY`: Voice AI service key
- `TWILIO_*`: Telephony service credentials

### Build Process
1. Frontend: Vite builds React app to `dist/public`
2. Backend: ESBuild bundles server to `dist/index.js`
3. Database: Drizzle migrations applied automatically
4. Deployment: Replit autoscale handles scaling

## Changelog

- June 26, 2025. Initial setup

## User Preferences

Preferred communication style: Simple, everyday language.