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
- **Rich Text Editing**: TinyMCE integration for content creation

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
- **OAuth Integration**: Google OAuth 2.0 restricted to @cesurg.com domain
- **Session Management**: Secure session handling with PostgreSQL persistence
- **Role-Based Access**: Three-tier access control (user, admin, superadmin)
- **Protected Routes**: Authentication middleware for API endpoints

### Database Schema
- **Users**: Core user information with Google integration
- **Groups**: Community groups with privacy settings
- **Posts & Comments**: Community interaction system
- **Calendar Events**: Event management with date/time handling
- **News & Categories**: News publishing system
- **AI Components**: AI agents, prompts, conversations, and messages
- **Utility Links**: Administrative link management
- **Ideas**: Idea submission and management system
- **Announcements**: Notice/announcement system with priority levels and scheduling

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