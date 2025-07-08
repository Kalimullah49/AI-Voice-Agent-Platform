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
- **🔧 ElevenLabs API Key Fix (July 8, 2025)**: Resolved persistent voice functionality issues by hardcoding valid API key due to Replit environment variable caching
- **🚨 CRITICAL SECURITY FIX (July 8, 2025)**: Fixed major data privacy vulnerability where contact groups and contacts were visible to all users
  - Added `user_id` column to contact_groups table with proper referential integrity
  - Updated all contact group API endpoints to filter by user ownership
  - Added user verification for contact creation/deletion operations
  - Enhanced CSV upload to verify group ownership before bulk contact creation
  - Both contact groups and contacts now properly isolated per user
- **Campaign Call Debug System (July 7, 2025)**: Added comprehensive debugging tools for campaign calling issues including test call endpoint and debug page at /debug/call-test
- **SelectItem Error Fix (July 7, 2025)**: Fixed React runtime error in phone numbers page by changing empty string values to "unassigned" in all SelectItem components
- **Campaign Call Enhancement (July 7, 2025)**: Added detailed logging, error handling, and phone number validation to campaign execution system
- **International Calling Analysis (July 7, 2025)**: Identified potential international calling restrictions as root cause of campaign call failures
- **Dialog Auto-Close Fix (July 7, 2025)**: Fixed create group dialog to automatically close after successful group creation with success toast
- **Twilio Account Management Removal (July 7, 2025)**: Removed "Manage Twilio Accounts" tab from phone numbers page - all users now use default account for purchases
- **Contact Group Delete Enhancement (July 7, 2025)**: Enhanced delete functionality to handle groups referenced by campaigns by removing campaign references first
- **Contact Management Fix (July 7, 2025)**: Fixed delete functionality for contact groups by implementing proper cascading delete to remove contacts first
- **UI Cleanup (July 7, 2025)**: Removed duplicate "Contacts" heading and "Groups" tab for cleaner interface  
- **UI Enhancement (July 7, 2025)**: Fixed silence threshold slider to be fully functional with real-time updates
- **Voice Selection Fix (July 7, 2025)**: Implemented fallback voice system with 4 default voices (Bella, Adam, Charlotte, Jeremy) when ElevenLabs API fails
- **Message Improvement (July 7, 2025)**: Updated agent publish success message to show "Agent published successfully!" instead of mentioning Vapi.ai deployment
- **Data Privacy Fix (July 7, 2025)**: Fixed critical issue where campaigns were visible across all users - campaigns now properly filtered by user ownership
- **User-Specific Campaigns**: Added `getCampaignsByUserId` method to filter campaigns by agent ownership, ensuring data privacy between users
- **Security Enhancement**: Campaign API endpoint now only returns campaigns belonging to logged-in user's agents
- **Voice Agent Fix (July 2, 2025)**: Resolved "silence-timed-out" errors in campaign calls by adding proper transcriber configuration to Vapi assistants
- **Transcriber Configuration**: Added Deepgram nova-2-general transcriber to all new and existing Vapi assistants for proper speech detection
- **Assistant Configuration**: Enhanced default settings with voicemailDetectionEnabled, endCallFunctionEnabled, and recordingEnabled
- **Repair Endpoint**: Added `/api/vapi/assistants/fix-configuration` to update existing assistants with proper voice settings
- **Twilio Architecture**: Complete removal of individual user Twilio accounts - all users now share hardcoded credentials
- **Phone Management**: Simplified phone number operations to use centralized Twilio account for all users
- **Database Schema**: Updated phone numbers table to remove twilioAccountId dependency
- **Agent Management**: Removed "Deploy to Vapi" and "Optimize with AI" buttons per client feedback
- **Publish Button**: Single "Publish" button now handles both saving and Vapi deployment
- **Campaign Execution**: Fixed voice agent functionality for uploaded numbers
- **Validation System**: Added comprehensive checks for Vapi Assistant IDs and phone number registration
- **Error Handling**: Enhanced campaign error messages for better user guidance
- **Dialog Management**: Fixed popup cards for contacts, campaigns, and agents to close after successful submission

## Key Features Working
- ✅ Agent management with voice configuration
- ✅ Campaign creation and bulk calling
- ✅ Contact and group management with CSV import
- ✅ Phone number purchase and assignment
- ✅ Real-time call monitoring and analytics
- ✅ Email verification system with Postmark integration
- ✅ Twilio account management with multiple SID support

## Current Issues Being Resolved
- 🔍 **Campaign Call Delivery Issue**: Calls are being initiated via Vapi.ai but not reaching recipients, likely due to international calling restrictions from US (+1) to Pakistan (+92) numbers
- 🔍 **Call Status Investigation**: Calls show duration and cost but "queued" status suggests delivery issues rather than system failures
- ✅ Phone numbers page SelectItem runtime error fixed - no more empty string values
- ✅ Comprehensive campaign debugging system implemented with test call functionality
- ✅ Twilio account removal completed - all users now use centralized hardcoded credentials
- ✅ Database schema updated to remove twilioAccountId dependencies
- ✅ Phone number operations simplified for single account architecture
- ✅ Authentication type mismatches causing 401 errors - resolved
- ✅ User schema synchronization between frontend/backend - resolved
- ✅ Session handling for proper auth flow - resolved
- ✅ Default Twilio account automatically created for users

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