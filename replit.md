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
- **✅ UI/UX Enhancements (July 23, 2025)**: Comprehensive improvements based on user feedback screenshot
  - Auto +1 prefix addition for US phone numbers across all input fields (agents, campaigns, contacts)
  - Enhanced voice selection with 8 humanoid voice options (added Sarah, Michael, Domi, Dave)
  - Call recording interface upgraded with play/pause/stop and download controls for complete audio management
  - Improved phone number formatting in campaign execution with smart E.164 conversion
  - Call history sorted by latest date and time for better user experience
  - Streamlined user interface for better workflow efficiency
- **🔧 Twilio Credentials Updated (July 16, 2025)**: Updated Twilio credentials to new account SID: ACbc669435d8f51750070af6cc26226313 and auth token for improved telephony services
- **🎵 Call Recording Download Feature COMPLETED (July 15, 2025)**: Fully implemented call recording download system with complete Vapi integration
  - Enhanced webhook processing to extract and store recording URLs from Vapi artifact objects
  - Added `/api/calls/:id/recording` endpoint with automatic Vapi API fallback when recordings not cached
  - Integrated download button in call history table with loading states and error handling
  - Implemented proper user authentication and ownership verification for recording access
  - Added automatic caching system to store recording URLs in database for improved performance
  - Enhanced webhook processing to populate `vapi_call_id` field for all future calls
  - Recording URLs are extracted from webhook `artifact.recordingUrl` field and stored in database
  - System fetches from Vapi API as fallback when recording URL not cached locally
- **🔧 Voice Speed Validation Fix (July 15, 2025)**: Fixed voice speed minimum limit to 0.7 as required by Vapi - updated frontend slider constraints, backend validation, and default values to prevent "voice speed must not be less than 0.7" errors
- **🔧 Production Voice Synthesis Error Fix (July 9, 2025)**: Enhanced error handling for ElevenLabs "unusual activity" errors in production environment with user-friendly messaging - voice agents continue working for live calls despite test synthesis limitations
- **🔧 Call Duration & Cost Sync Fix (July 9, 2025)**: Fixed webhook processing to properly sync call duration and cost data from Vapi dashboard to app call history - calls now show accurate duration and cost information
- **🔧 Phone Number Search Enhancement (July 9, 2025)**: Improved phone number search with fallback options when specific area codes are unavailable, better error messaging, and enhanced user feedback
- **🔧 Phone Number Purchase Fix (July 8, 2025)**: Resolved "Search failed" errors by hardcoding valid Twilio credentials (AC521beb2502864bd198c5281de65b454e) in routes.ts due to environment variable caching issues
- **🔧 Campaign Call Issues Fix (July 8, 2025)**: Resolved "Twilio connection failed" and "customer did not answer" issues by improving error handling, phone number validation, and webhook processing
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
- ✅ Call recording download from Vapi artifacts
- ✅ Email verification system with Postmark integration
- ✅ Twilio account management with multiple SID support

## Current Issues Being Resolved
- 🔧 **Campaign Call Issues Fixed (July 8, 2025)**: Improved campaign execution with better error handling, phone number validation, and Twilio connection error detection
- 🔧 **Call Termination Logic Enhanced (July 8, 2025)**: Added proper handling for failed calls, timeout management, and webhook processing for campaign calls
- 🔧 **Campaign Debugging System (July 8, 2025)**: Added `/api/campaigns/:id/debug` endpoint for troubleshooting call delivery issues
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