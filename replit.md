# Portal Conecta CESURG

## Overview

Portal Conecta CESURG is a web-based institutional platform designed for CESURG members, providing a comprehensive suite of features including user management, community interaction, calendar management, news publishing, and AI-powered functionalities. The platform is built with a modern tech stack using React, Express, and PostgreSQL.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript
- **Build Tool**: Vite for development and production builds
- **Styling**: Tailwind CSS with custom theme configuration
- **UI Components**: Radix UI primitives with shadcn/ui components
- **State Management**: TanStack Query for server state management
- **Routing**: Wouter for client-side routing
- **Forms**: React Hook Form with Zod validation
- **Rich Text Editing**: React-Quill integration with advanced features for content creation

### Backend Architecture
- **Runtime**: Node.js with Express.js server
- **Language**: TypeScript with ES modules
- **Database**: PostgreSQL with Drizzle ORM
- **Authentication**: Passport.js with Google OAuth 2.0 strategy
- **Session Management**: Express sessions with PostgreSQL store in production
- **File Uploads**: Multer for handling file uploads
- **API Design**: RESTful API with modular route handlers

## Key Components

### Authentication System
- **OAuth Integration**: Google OAuth 2.0 restricted to @cesurg.com domain with multi-domain support
- **Session Management**: Secure session handling with PostgreSQL persistence
- **Role-Based Access**: Three-tier access control (user, admin, superadmin)
- **Protected Routes**: Authentication middleware for API endpoints
- **Multi-Domain Support**: Configured for both conectacesurg.replit.app and conecta.cesurgmarau.com.br domains

### Database Schema
- **Users**: Core user information with Google integration
- **Groups**: Community groups with privacy settings
- **Posts & Comments**: Community interaction system
- **Calendar Events**: Event management with date/time handling
- **News & Categories**: News publishing system
- **AI Components**: AI agents, prompts, conversations, and messages
- **Utility Links**: Administrative link management
- **Ideas**: Idea submission and management system
- **Announcements**: Simplified notice/announcement system with essential fields (title, content, start/end dates, active status)

### File Management
- **Upload System**: Centralized file upload handling
- **Static Assets**: Public file serving for images and documents
- **Media Processing**: Image handling for news, profiles, and posts

### AI Integration
- **AI Agents**: Configurable AI assistants
- **Conversation Management**: Chat history and context preservation
- **Prompt Management**: Reusable AI prompts system
- **Admin Controls**: AI configuration and management

## Data Flow

### Authentication Flow
1. User initiates Google OAuth login
2. Google validates credentials and returns profile
3. System verifies @cesurg.com domain restriction
4. User session is created and stored in PostgreSQL
5. Frontend receives authentication state

### Content Management Flow
1. Authenticated users create/edit content
2. Admin users can manage all content
3. File uploads are processed and stored
4. Database updates are made with proper validation
5. Frontend updates reflect changes immediately

### API Communication
- REST endpoints for all major operations
- JSON request/response format
- Error handling with consistent error messages
- File upload endpoints for media handling

## Recent Changes

### January 2025
- **News Import System**: Implemented automated news import from CESURG website with direct external links
- **Date Management**: Removed date extraction from news imports due to SPA complexity - all imported news now appear without publication dates to avoid incorrect information
- **Visual Indicators**: Added CESURG origin badges and external link icons to distinguish imported content
- **Admin Interface**: Simplified news management with focus on title, description, and external links
- **Announcements System Simplified**: Removed unnecessary fields (type, priority, image upload) to focus on essential functionality
- **Enhanced User Experience**: Implemented "read more" functionality for long announcements and "see all" dialog for viewing all active announcements
- **Improved Dialog Behavior**: Fixed dialog sizing and scroll issues to ensure proper display on all screen sizes
- **Bug Fixes**: Resolved JSON parsing errors and duplicate UI elements in announcement dialogs
- **Trails Rich Text Editor**: Fixed and maintained Quill-based rich text editor for trail content management in admin interface
- **Trail Content Display**: Resolved issues with trail content listing in both admin and public areas - contents now display correctly in both contexts
- **API Query Optimization**: Fixed query keys and endpoints for proper data fetching and cache invalidation
- **Rich Text Editor Enhancement**: Enhanced Quill editor with image resizing, drag-and-drop functionality, improved YouTube video embedding, and better link insertion capabilities
- **Video Resize Functionality**: Added custom resize handles for YouTube videos in rich text editor allowing users to resize embedded videos directly
- **Link URL Handling**: Fixed link creation to automatically add https:// protocol prefix and open links in new tabs to prevent relative URL issues
- **Multi-Domain OAuth Support**: Implemented session-based domain tracking to maintain user's original domain during Google OAuth flow - users logging in from custom domain stay on custom domain
- **Gamification Ranking Enhancement**: Modified ranking system to show all users from enabled categories including those without points, with users sorted by points (descending) then alphabetically by name. Fixed duplicate user issue for users assigned to multiple categories by using the general category as the primary eligibility filter.

## External Dependencies

### Authentication
- **Google OAuth 2.0**: User authentication service
- **Required Variables**: GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET

### Database
- **PostgreSQL**: Primary data storage
- **Neon Database**: Serverless PostgreSQL hosting
- **Required Variables**: DATABASE_URL

### Frontend Libraries
- **React Ecosystem**: Core framework and related libraries
- **Radix UI**: Accessible component primitives
- **TanStack Query**: Server state management
- **Tailwind CSS**: Utility-first CSS framework

### Backend Libraries
- **Express.js**: Web application framework
- **Drizzle ORM**: Database ORM with TypeScript support
- **Passport.js**: Authentication middleware
- **Multer**: File upload handling

## Deployment Strategy

### Environment Configuration
- **Development**: Local development with memory session store
- **Production**: Replit deployment with PostgreSQL session store
- **Environment Variables**: 
  - DATABASE_URL (required for production)
  - GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET
  - SESSION_SECRET (optional, has default)

### Build Process
1. Frontend built with Vite to `dist/public`
2. Backend compiled with esbuild to `dist/`
3. Static assets served from `public/` directory
4. Production server runs compiled JavaScript

### Database Management
- **Schema Management**: Drizzle migrations and schema push
- **Connection**: Neon PostgreSQL with WebSocket support
- **Session Storage**: PostgreSQL table for session persistence
- **Backup**: Handled by hosting provider

### Security Considerations
- **Domain Restriction**: OAuth limited to @cesurg.com emails
- **Role-Based Access**: Hierarchical permission system
- **Session Security**: Secure cookies and session management
- **File Upload Security**: Type validation and size limits
- **CORS**: Proper cross-origin resource sharing configuration

### Monitoring and Logging
- **Request Logging**: Express middleware for API request tracking
- **Error Handling**: Comprehensive error handling throughout application
- **Development Tools**: Hot reload and development server integration