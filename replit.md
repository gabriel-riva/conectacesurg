# Portal Conecta CESURG

## Overview

Portal Conecta CESURG is a web platform designed for CESURG institution members with Google OAuth authentication. It's a comprehensive portal that provides community features, news management, calendar functionality, AI integration, and administrative tools for the CESURG organization.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

The application follows a full-stack architecture built with:
- **Frontend**: React with TypeScript, Vite as build tool, and Tailwind CSS for styling
- **Backend**: Express.js with TypeScript running on Node.js
- **Database**: PostgreSQL with Drizzle ORM for type-safe database operations
- **Authentication**: Google OAuth 2.0 with Passport.js for session management
- **File Storage**: Local file system for uploads (images, documents)

## Key Components

### Frontend Architecture
- **React with TypeScript**: Component-based UI using modern React patterns
- **Vite**: Fast build tool and dev server
- **Tailwind CSS**: Utility-first CSS framework with custom theme
- **Shadcn/ui**: Pre-built accessible components
- **TanStack Query**: Server state management and caching
- **React Hook Form**: Form handling with Zod validation
- **Wouter**: Lightweight routing library

### Backend Architecture
- **Express.js**: Web framework with TypeScript
- **Passport.js**: Authentication middleware with Google OAuth strategy
- **Drizzle ORM**: Type-safe database operations with PostgreSQL
- **Session Management**: PostgreSQL-backed sessions in production, memory store in development
- **File Upload**: Multer for handling file uploads
- **Route Organization**: Modular route handlers for different features

### Database Schema
The application uses PostgreSQL with the following main entities:
- **Users**: Core user information with roles (user, admin, superadmin)
- **Groups**: Community groups with membership management
- **Posts/Comments**: Community discussion system
- **News**: Content management with categories
- **Calendar Events**: Event scheduling and management
- **Ideas**: Suggestion system with workflow management
- **AI Agents/Conversations**: AI integration features
- **Utility Links**: Administrative link management

### Authentication & Authorization
- **Google OAuth 2.0**: Restricted to @cesurg.com email domain
- **Role-based Access**: Three levels - user, admin, superadmin
- **Session Management**: Secure session handling with PostgreSQL storage
- **Route Protection**: Middleware-based authentication checks

## Data Flow

1. **User Authentication**: Google OAuth → Session creation → Role assignment
2. **Content Management**: Admin creates content → Database storage → User consumption
3. **Community Features**: User interactions → Real-time updates → Database persistence
4. **File Handling**: Upload → Local storage → Database URL reference
5. **AI Integration**: User queries → AI processing → Conversation storage

## External Dependencies

### Authentication
- **Google OAuth 2.0**: For user authentication
- **Required Environment Variables**: `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`

### Database
- **PostgreSQL**: Primary data storage
- **Neon Serverless**: PostgreSQL provider with WebSocket support
- **Required Environment Variable**: `DATABASE_URL`

### File Storage
- **Local File System**: For uploaded images and documents
- **Upload directories**: `/uploads/`, `/public/uploads/news/`

### Third-party Libraries
- **TinyMCE**: Rich text editor for content creation
- **Multer**: File upload handling
- **Various UI Libraries**: Radix UI components, Lucide icons

## Deployment Strategy

### Environment Configuration
- **Development**: Uses memory store for sessions, local file storage
- **Production**: PostgreSQL session store, requires proper DATABASE_URL configuration

### Required Environment Variables
1. `DATABASE_URL` - PostgreSQL connection string (critical for production)
2. `GOOGLE_CLIENT_ID` - Google OAuth client ID
3. `GOOGLE_CLIENT_SECRET` - Google OAuth client secret
4. `SESSION_SECRET` - Session encryption key (optional, has default)

### Build Process
1. Frontend build with Vite
2. Backend compilation with esbuild
3. Static file serving from `/public/` directory
4. Database migrations with Drizzle

### Key Features
- **Community System**: Groups, posts, comments, likes
- **News Management**: Categories, rich text content, image uploads
- **Calendar Integration**: Event management with Google Calendar links
- **AI Integration**: Conversation system with multiple AI agents
- **Ideas Management**: Workflow-based suggestion system
- **Administrative Panel**: User management, content moderation
- **Profile Management**: User profiles with document uploads

The application is designed to be deployed on Replit with proper environment variable configuration and supports both development and production environments with appropriate fallbacks.