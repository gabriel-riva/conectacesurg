# Portal Conecta CESURG

## Overview
Portal Conecta CESURG is an institutional web platform for CESURG members, offering user management, community interaction, calendar, news publishing, and AI functionalities. It aims to be a comprehensive hub for the CESURG community.

## User Preferences
Preferred communication style: Simple, everyday language.
- Portuguese language for communication and interface
- Focus on practical functionality over complex features
- Prefers clear, direct explanations without technical jargon

## System Architecture

### Frontend
- **Framework**: React 18 with TypeScript
- **Build Tool**: Vite
- **Styling**: Tailwind CSS
- **UI Components**: Radix UI with shadcn/ui
- **State Management**: TanStack Query
- **Routing**: Wouter
- **Forms**: React Hook Form with Zod
- **Rich Text Editing**: React-Quill

### Backend
- **Runtime**: Node.js with Express.js
- **Language**: TypeScript
- **Database ORM**: Drizzle ORM for PostgreSQL
- **Authentication**: Passport.js with Google OAuth 2.0
- **Session Management**: Express sessions with PostgreSQL store
- **File Uploads**: Multer
- **API Design**: RESTful

### Core Features & Design Patterns
- **Authentication System**: Google OAuth 2.0 (restricted to @cesurg.com), multi-domain support, secure session management, three-tier role-based access (user, admin, superadmin).
- **Admin Page Layout**: Strict pattern for all admin pages requiring `<Header />` and `<AdminSidebar />` for consistent navigation and UI.
- **Feature Management System**: Centralized system allowing administrators to enable/disable features via a dedicated admin interface (`/admin/feature-settings`). Features are guarded by `FeatureGuard` component and can display custom disabled messages.
- **Database Schema**: Comprehensive schema covering users, groups, posts, comments, calendar events, news, AI components (agents, prompts, conversations), utility links, ideas, and announcements.
- **File Management**: Centralized upload handling, static asset serving, and basic media processing.
- **AI Integration**: Configurable AI agents, conversation management, and reusable prompt system with admin controls.
- **News System**: Automated import from CESURG website, external link integration, and simplified news management.
- **Announcements System**: Streamlined system for notices with essential fields, "read more" functionality, and "see all" dialog.
- **Gamification System**: Ranking, challenge evaluation (quiz, text/file submissions, QR code), category-based challenge visibility, granular file challenge review system with individual requirement scoring, admin-controlled challenge display ordering with drag-and-drop interface.
- **Feedback System**: Comprehensive feedback management with sliding panel interface, real user names, admin deletion, screenshot capture, and image attachments.
- **Admin Table UX**: Fixed-header scrollable tables for improved navigation in admin lists.
- **Ferramentas (Tools) System**: Database-integrated tools system with category-based permission and dynamic link mapping.
- **Survey/Polls System**: Comprehensive survey functionality with multiple question types, user category targeting, and an adaptive widget display (floating icon on desktop, full-screen modal on mobile).
- **Trail System**: Content pages with commenting, replies, likes, and category-based visibility.
- **Homepage Gamification Carousel**: Horizontal scrollable display of active, uncompleted challenges on the homepage with navigation arrows, fixed height (280px) to match other dashboard cards, optimized card sizing (260px width, 16px image height) for better content visibility, and direct links to individual challenge details via URL parameters.
- **Granular File Review System**: Advanced review system for file challenges with individual requirement evaluation, automatic scoring calculation, and comprehensive administrative interface for granular approval/rejection.
- **Unified Gamification Information Card**: Consolidated sidebar component that combines cycle information, challenge statistics, and points history into a single "Informações" card with three subsections: "Ciclo Atual" (current cycle with progress), "Meus desafios" (challenge completion stats for both cycle and annual), and "Meus pontos" (points total and history).

## Database Environment Separation
- **Development/Production Separation**: Fully implemented with schema-based separation
- **Schema Structure**: 
  - Development: `development` schema (NODE_ENV=development)
  - Production: `production` schema (NODE_ENV=production)
  - Public: `public` schema (legacy, not actively used)
- **Automatic Environment Detection**: Based on NODE_ENV variable
- **Database Configuration**: Uses search_path to isolate environments completely
- **Migration Process**: 
  - Development changes: Apply via `npm run db:push` in development
  - Production deployment: Apply via `NODE_ENV=production npm run db:push` or manual SQL for complex migrations
  - Manual sync: Use `psql $DATABASE_URL -c "SET search_path TO production; [SQL COMMAND]"` when needed

## Recent Changes

### August 2025 - Gamification UI Improvements
- **Unified Information Card**: Replaced separate "Ciclo Atual" and "Meus pontos" cards with a single comprehensive "Informações" card that includes:
  - Current cycle information with period dates and progress bar
  - Challenge statistics showing completed vs open challenges for both cycle and annual categories
  - Points total and recent transaction history
- **Component Architecture**: Created `GamificationInfoCard.tsx` component that fetches user submission data to calculate real-time challenge completion statistics
- **Data Integration**: Added `/api/gamification/my-submissions` endpoint integration to track user challenge progress
- **Type Safety**: Proper TypeScript interfaces for challenge submissions and gamification data

### August 15, 2025 - File System Security & Download Fixes
- **File Upload Security**: Comprehensive protection system is active including automated daily backups, real-time integrity monitoring, orphaned file detection, and rollback mechanisms to prevent data loss
- **Download Functionality**: Fixed file size display and added download buttons directly in the granular submission review modal for easier file access by administrators
- **File Size Display**: Corrected "NaN" display issues across all admin components (AdminAllSubmissions, AdminSubmissionReview, GranularSubmissionReview) with proper fileSize validation
- **Admin UX Improvements**: Enhanced file management interface with visible file sizes and direct download capabilities in review workflows

### August 15, 2025 - Enhanced Challenge Status Display
- **Three-Category Challenge Statistics**: Updated challenge statistics to show three distinct states:
  - "Concluídos" (green) - completed/approved submissions
  - "Em revisão" (yellow) - pending submissions awaiting review
  - "Abertos" (blue) - challenges without submissions
- **Improved Grid Layout**: Changed from 2x2 to 3x2 grid layout in GamificationInfoCard to accommodate three categories
- **Visual Status Indicators**: Enhanced challenge cards with color-coded status badges and consistent terminology
- **Transparent Points Display**: All submissions now show earned points regardless of value (including 0 points)
- **Terminology Standardization**: Changed "Pendente" to "Em revisão" across the interface for better user understanding
- **Challenge Display Ordering System**: Comprehensive admin-controlled ordering system allowing administrators to define custom display order for challenges via drag-and-drop interface in Admin > Gamificação > Desafios. Features include:
  - Drag-and-drop reordering with visual feedback using @dnd-kit
  - Automatic duplicate order prevention and sequential numbering
  - Database field `displayOrder` with backend API `/api/gamification/challenges/reorder`
  - Public pages automatically display challenges sorted by admin-defined order
  - AdminChallengeReorder component with save/cancel functionality
- **File Challenge Points Fix**: Fixed critical gamification bug where file upload challenges were awarding full points instead of proportional points based on submitted requirements. Now correctly calculates points based on individual file requirement submissions, supporting both specific requirement points and proportional distribution.

### August 15, 2025 - Gamification Points Calculation Fix
- **Proportional Points System**: Fixed file upload challenges to calculate points based on completed requirements rather than awarding full challenge points
- **Requirement-Based Scoring**: File challenges now properly evaluate individual file requirements and award points accordingly
- **Backward Compatibility**: System supports both new requirement-specific points and legacy proportional calculations
- **Accurate User Experience**: Users now receive appropriate partial credit for incomplete submissions in file upload challenges

### August 15, 2025 - Complete File System Migration to Object Storage
- **Critical Production Issue Resolved**: Fixed materials files disappearing/breaking in production by migrating from local file storage to Replit Object Storage
- **Gamification Files Protected**: Discovered and migrated challenge submission files which were also vulnerable to the same local storage issues
- **Complete Coverage**: Both materials system and gamification challenge uploads now use reliable cloud storage
- **Cloud-Based Storage**: All new files are stored in Google Cloud Storage via Replit Object Storage, ensuring persistence and reliability
- **ACL Security System**: Implemented comprehensive Access Control List (ACL) system for secure file access management
- **Backward Compatibility**: Legacy files in local storage continue to work with automatic fallback detection
- **Zero Downtime Migration**: Transparent migration with no changes required to frontend interfaces
- **Key Components Added**:
  - `server/objectStorage.ts`: Core Object Storage service with upload/download capabilities
  - `server/objectAcl.ts`: ACL policy management for secure file access
  - `server/upload.ts`: Migrated gamification upload system to Object Storage with fallback
  - `server/routes.ts`: Added `/objects/challenges/` route for secure file serving
- **Upload Process**: Files now uploaded to memory → Object Storage with UUID naming → ACL policy application → database record creation
- **File Organization**: Materials in `/objects/materials/`, challenges in `/objects/challenges/`
- **Download/View Process**: Automatic detection of storage type (Object Storage vs legacy) with appropriate streaming and access control
- **Production Reliability**: All user-uploaded files will never disappear again, matching the reliability of the calendar 2025 file that remained stable

### Critical Debugging Lessons (August 2025)
- **Multiple Schema Issue**: PostgreSQL database contains 3 schemas (public, development, production)
- **Schema Verification**: Always verify which schema the application is using with `SELECT current_schema()`
- **Authentication Cache Bug**: React Query can cache old data when API returns 403 Forbidden, creating "phantom" submissions that don't exist in current database
- **Quiz Status Bug**: Quiz submissions were incorrectly staying as "pending" instead of auto-completing to "completed" status
- **Data Synchronization**: Successfully implemented production-to-development data copying with proper handling of NULL display_order fields using COALESCE
- **Admin Page Fix**: Resolved issue where only 1 challenge appeared in admin page while 2 showed on public page - was due to inactive challenge status
- **Debugging Process**: When submissions show in UI but not in database queries, check:
  1. User authentication status (`/api/auth/status`)
  2. Which database schema is active
  3. React Query cache vs real API responses
  4. Server logs to confirm API calls are reaching endpoints

## External Dependencies

### Authentication
- **Google OAuth 2.0**: User authentication.
  - Required Variables: `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`

### Database
- **PostgreSQL**: Primary data storage.
- **Neon Database**: Serverless PostgreSQL hosting.
  - Required Variables: `DATABASE_URL`

### Frontend Libraries (Key)
- **React Ecosystem**
- **Radix UI**
- **TanStack Query**
- **Tailwind CSS**

### Backend Libraries (Key)
- **Express.js**
- **Drizzle ORM**
- **Passport.js**
- **Multer**