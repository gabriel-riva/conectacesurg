# Portal Conecta CESURG

## Overview
Portal Conecta CESURG is an institutional web platform for CESURG members, offering user management, community interaction, calendar, news publishing, and AI functionalities. It aims to be a comprehensive hub for the CESURG community, serving as a central hub for information and collaboration.

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
- **File Management**: Centralized upload handling, static asset serving, and secure object storage integration for all file types (materials, gamification challenges, user profiles).
- **AI Integration**: Configurable AI agents, conversation management, and reusable prompt system with admin controls.
- **News System**: Automated import from CESURG website, external link integration, and simplified news management.
- **Announcements System**: Streamlined system for notices with essential fields, "read more" functionality, and "see all" dialog.
- **Gamification System**: Ranking, challenge evaluation (quiz, text/file submissions, QR code), category-based challenge visibility, granular file challenge review system with individual requirement scoring, admin-controlled challenge display ordering with drag-and-drop interface, and a unified gamification information card for user stats.
- **Feedback System**: Comprehensive feedback management with sliding panel interface, real user names, admin deletion, screenshot capture, and image attachments.
- **Admin Table UX**: Fixed-header scrollable tables for improved navigation in admin lists.
- **Ferramentas (Tools) System**: Database-integrated tools system with category-based permission and dynamic link mapping.
- **Survey/Polls System**: Comprehensive survey functionality with multiple question types, user category targeting, and an adaptive widget display.
- **Trail System**: Content pages with commenting, replies, likes, and category-based visibility.

### Database Architecture
- **Schema**: Uses standard PostgreSQL `public` schema (Replit default)
- **Migration Process**: Uses `npm run db:push` for schema synchronization via Drizzle ORM
- **Legacy Schemas**: Old `development`, `production`, and `production_legacy` schemas still exist in the database as backups but are NOT used by the application
- **Last Migration**: February 28, 2026 - Migrated from custom schema-based separation to standard `public` schema for Replit compatibility. Data copied from `development` schema to `public`.
- **Important**: `server/config/database.ts` no longer modifies DATABASE_URL with search_path — uses Replit's DATABASE_URL directly

### File Upload Protection System (August 2025)
- **Environment-Based Object Storage**: All file uploads use environment-specific paths to prevent conflicts between development and production.
- **Protected Systems**: Profile photos, profile documents, gamification challenges, and materials page uploads.
- **Path Structure**: 
  - Production: Uses `/objects/materials/` for legacy files, `/objects/prod/` for new uploads
  - Development: Uses `/objects/dev/` for all files
- **Smart Redirection**: Development environment automatically tries multiple paths when files are not found (dev → legacy → prod)
- **Object Storage Sync**: Files from production (`/objects/materials/`) are copied to development (`/objects/dev/materials/`) for testing
- **Isolation Guarantee**: Development testing cannot overwrite production files
- **Bucket Configuration**: Uses Replit Object Storage bucket (`replit-objstore-5b76e1bd-68bc-4930-858a-2cd2f8ef34d4`)

## External Dependencies

### Authentication
- **Google OAuth 2.0**: User authentication.

### Database
- **PostgreSQL**: Primary data storage.
- **Neon Database**: Serverless PostgreSQL hosting.

### File Storage
- **Replit Object Storage**: Primary object storage for all uploaded files (materials, challenge submissions, profile photos/documents)
- **Google Cloud Storage API**: Used via Replit's sidecar endpoint for Object Storage operations

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