# Mind AI Platform - Project Documentation

## Overview
Mind AI is a comprehensive AI-powered call center management and analytics solution built as a multi-tenant SaaS platform. The system provides advanced voice automation capabilities, intelligent call analysis, campaign management, and real-time analytics for businesses across all industries.

## Current Status
- **Core Platform**: Fully functional with voice AI integration
- **Authentication**: Custom session-based auth with email verification
- **Voice Integration**: Vapi.ai with ElevenLabs voice synthesis
- **Telephony**: Complete Twilio integration for phone services
- **Database**: PostgreSQL with Drizzle ORM for type-safe operations
- **Frontend**: React with TypeScript, Tailwind CSS, and shadcn/ui

## Recent Changes
- **API Keys**: All Vapi.ai and ElevenLabs keys hardcoded for production stability
- **Contact Dialog**: Fixed scrollable form for contact creation
- **Campaign UI**: Removed duplicate "Create new campaign" button
- **Technical Documentation**: Comprehensive client-ready documentation created

## Key Features Working
- ✅ Agent management with voice configuration
- ✅ Campaign creation and bulk calling
- ✅ Contact and group management with CSV import
- ✅ Phone number purchase and assignment
- ✅ Real-time call monitoring and analytics
- ✅ Email verification system with Postmark integration
- ✅ Twilio account management with multiple SID support

## Current Issues Being Resolved
- 🔧 Authentication type mismatches causing 401 errors
- 🔧 User schema synchronization between frontend/backend
- 🔧 Session handling for proper auth flow

## API Integration Status
- **Vapi.ai**: Private key `2291104d-93d4-4292-9d18-6f3af2e420e0` (hardcoded)
- **Vapi.ai**: Public key `49c87404-6985-4e57-9fe3-4bbe4cd5d7f5` (hardcoded)
- **ElevenLabs**: Voice API fully integrated with custom voice support
- **Postmark**: Email delivery with sender `contact@callsinmotion.com`
- **Twilio**: Complete telephony integration for voice services

## User Preferences
- Production approach: Hardcode all API keys for reliability
- Email sender: Use only `contact@callsinmotion.com` for all emails
- Voice defaults: Bella voice (EXAVITQu4vr4xnSDxMaL) when no voice selected
- UI/UX: Clean, minimal design with single action buttons
- Technical documentation: Client-ready comprehensive documentation required

## Project Architecture
- **Frontend**: React 18 + TypeScript + Vite + Tailwind CSS
- **Backend**: Node.js + Express + TypeScript + PostgreSQL
- **Database**: Neon PostgreSQL with Drizzle ORM
- **Authentication**: Custom session-based with bcrypt password hashing
- **External APIs**: Vapi.ai, ElevenLabs, Twilio, Postmark, OpenAI GPT-4o
- **Deployment**: Replit with automated scaling and SSL

## Database Schema Highlights
- Users with email verification and password reset
- Agents with voice configuration and Vapi.ai integration
- Campaigns with concurrent call management
- Contacts with group organization and CSV import
- Phone numbers with Twilio SID management
- Call logs with transcription and cost tracking

## Next Development Phase
- Enhanced analytics dashboard with advanced metrics
- Multi-language support for international users
- Advanced call routing and queue management
- Mobile applications for iOS and Android
- Integration marketplace for third-party tools