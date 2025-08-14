# Portal Conecta CESURG

## Overview
Portal Conecta CESURG is an institutional web platform for CESURG members, offering user management, community interaction, calendar, news publishing, and AI functionalities. It aims to be a comprehensive hub for the CESURG community.

## User Preferences
Preferred communication style: Simple, everyday language.
- Portuguese language for communication and interface
- Focus on practical functionality over complex features
- Prefers clear, direct explanations without technical jargon

## Recent Changes (August 2025)
- **Multi-file Upload System**: Implemented support for multiple file uploads per challenge submission
- **Challenge Ordering**: Database field `display_order` exists but temporarily disabled in schema due to Drizzle ORM sync issues
- **Gamification API**: Restored and stabilized challenge listing functionality
- **Upload Endpoints**: Both `/api/upload` (single) and `/api/upload/multiple` endpoints fully functional

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
- **Gamification System**: Ranking, challenge evaluation (quiz, text/file submissions, QR code), category-based challenge visibility.
- **Feedback System**: Comprehensive feedback management with sliding panel interface, real user names, admin deletion, screenshot capture, and image attachments.
- **Admin Table UX**: Fixed-header scrollable tables for improved navigation in admin lists.
- **Ferramentas (Tools) System**: Database-integrated tools system with category-based permission and dynamic link mapping.
- **Survey/Polls System**: Comprehensive survey functionality with multiple question types, user category targeting, and an adaptive widget display (floating icon on desktop, full-screen modal on mobile).
- **Trail System**: Content pages with commenting, replies, likes, and category-based visibility.
- **Homepage Gamification Carousel**: Horizontal scrollable display of active, uncompleted challenges on the homepage with navigation arrows, fixed height (280px) to match other dashboard cards, optimized card sizing (260px width, 16px image height) for better content visibility, and direct links to individual challenge details via URL parameters.

## Database Environment Separation
- **Development/Production Separation**: Fully implemented with backward compatibility
- **Configuration Priority**: 
  - Development: DATABASE_URL_DEV → DATABASE_URL (fallback)
  - Production: DATABASE_URL_PRODUCTION → DATABASE_URL (fallback)
- **Automatic Environment Detection**: Based on NODE_ENV variable
- **Zero Breaking Changes**: System maintains 100% compatibility with existing DATABASE_URL
- **Setup Script**: Available at `scripts/setup-environments.cjs` for configuration verification

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