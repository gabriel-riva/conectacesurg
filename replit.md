# Portal Conecta CESURG

## Overview

Portal Conecta CESURG is a web-based institutional platform designed for CESURG members, providing a comprehensive suite of features including user management, community interaction, calendar management, news publishing, and AI-powered functionalities. The platform is built with a modern tech stack using React, Express, and PostgreSQL.

## User Preferences

Preferred communication style: Simple, everyday language.
- Portuguese language for communication and interface
- Focus on practical functionality over complex features
- Prefers clear, direct explanations without technical jargon

## Development Patterns & Best Practices

### Admin Page Layout Pattern (CRITICAL)
**ALWAYS follow this pattern when creating new admin pages:**

```tsx
// Import required components
import { Header } from "@/components/Header";
import { AdminSidebar } from "@/components/AdminSidebar";

// Page structure MUST be:
export default function NewAdminPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <div className="flex">
        <AdminSidebar />
        <div className="flex-1 p-6">
          {/* Page content goes here */}
        </div>
      </div>
    </div>
  );
}
```

**Key Points:**
- ALL admin pages must include `<Header />` and `<AdminSidebar />`
- Use the exact structure above for consistent layout
- Content goes inside the `flex-1 p-6` container
- This pattern ensures proper navigation and consistent UI

### Adding Admin Navigation Links
When creating new admin functionality, remember to:
1. Add the route to `client/src/App.tsx` with `adminOnly={true}`
2. Add the navigation link to `client/src/components/AdminSidebar.tsx` in the `menuItems` array

### Feature Management System (CRITICAL)
**ALL features must be integrated with the feature management system:**

1. **Add to Feature Settings Component** (`client/src/components/AdminFeatureSettings.tsx`):
   - Add feature name to `featureLabels` object
   - Add description to `featureDescriptions` object

2. **Add to FeatureDisabledPage** (`client/src/components/FeatureDisabledPage.tsx`):
   - Add feature name to `featureLabels` object

3. **Create Database Entry**:
   ```sql
   INSERT INTO feature_settings (feature_name, is_enabled, show_in_header, disabled_message, last_updated_by, updated_at) 
   VALUES ('feature_name', true, true, 'Feature description message', 1, NOW());
   ```

4. **Wrap Page Component with FeatureGuard**:
   ```tsx
   import { FeatureGuard } from "@/components/FeatureGuard";
   
   export default function FeaturePage() {
     return (
       <FeatureGuard featureName="feature_name">
         <FeaturePageContent />
       </FeatureGuard>
     );
   }
   ```

**Key Features:**
- Administrators can enable/disable features from `/admin/feature-settings`
- Features can be hidden from header independently of being enabled/disabled
- When disabled, features show construction page but maintain header visibility
- System supports custom disabled messages per feature

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
- **Development Environment**: Enhanced user selection with role-based sorting (superadmin → admin → users alphabetically)
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
- **Feedback System Enhancements**: Implemented comprehensive feedback management system with discrete sliding panel interface, real user name display in admin tables, and admin delete functionality with confirmation dialog. System supports both anonymous and identified submissions with proper admin controls.
- **Admin Sidebar Collapsible**: Implemented collapsible sidebar in admin pages with smooth transitions, toggle button, and tooltip support. When collapsed, sidebar shows only icons with tooltips for better space utilization while maintaining full navigation functionality.
- **Trail Comments System**: Implemented complete commenting system for trail content pages with hierarchical comments, replies, like/unlike functionality, and proper user permissions. Features include real-time comment updates, admin/author deletion permissions, and cascading deletion of likes and replies.
- **Gamification System Enhancement**: Implemented comprehensive challenge evaluation system with four types: quiz (automatic approval based on score), text/file submissions (provisional points with admin approval), QR code scanning (automatic verification), and enhanced points history display with status indicators (provisional, approved, rejected).
- **QR Code System Implementation**: Successfully implemented fully automatic QR code detection system using jsQR library. Camera captures video stream and continuously scans for QR codes at 100ms intervals with real-time detection. Features include visual feedback states (scanning, found, processing), automatic code recognition without manual input, and comprehensive error handling. System includes admin QR code generation/saving functionality and provides test QR codes for validation.
- **Admin User Profile Management**: Implemented comprehensive user profile viewing system for administrators. Features include UserProfileModal component with tabbed interface showing user information (phone, address, emergency contacts) and uploaded documents. Consolidated document viewing functionality into profile modal and removed redundant document button from users table. System includes API endpoints for fetching complete user profile data and documents with proper admin access controls.
- **Feedback Widget Toggle Control**: Implemented discrete toggle control in the feedback admin page to enable/disable the feedback widget platform-wide. The toggle is positioned in the page header as a minimal switch with status indicators. Uses existing feature-settings system for persistent configuration and real-time updates across the platform.
- **Survey/Polls System Implementation**: Implemented comprehensive survey functionality with complete backend API, SurveyWidget component for home screen display, admin management interface, and database integration. Features include multiple question types (multiple choice, Likert scale, free text), user category targeting, widget configuration controls, and proper admin navigation integration. Fixed common admin layout pattern issues by documenting required Header and AdminSidebar structure.
- **Mobile-Responsive Survey Widget**: Redesigned survey widget from large card to small circular icon similar to user's reference image with colorful segments and smiley face design. Widget appears as floating icon in bottom-right corner with tooltip "Nova pesquisa disponível" and expands to full-screen modal on mobile devices, card view on desktop for optimal user experience.
- **Survey Admin Interface Enhancement**: Implemented SurveyDetailsDialog component to display questions and responses in admin interface. Fixed endpoint routing issues and added proper JSON API endpoints for fetching survey questions (/api/surveys/:id/questions) and responses (/api/surveys/:id/responses) with user name resolution for non-anonymous responses.
- **Feedback System with Screenshot & Image Attachments**: Enhanced feedback system with screenshot capture and image upload functionality. Users can now take screenshots directly from the interface or upload images from their device. Added comprehensive admin interface for viewing attached images with preview functionality, file size indicators, and screenshot badges. Implements secure file storage with 5MB limits and proper database schema for attachment metadata. Fixed JSON parsing issues in backend that prevented proper loading of feedback attachments, ensuring stable operation and full image viewer functionality in admin interface. Added admin capability to delete individual images from feedbacks with confirmation dialogs and proper UI feedback. Implemented intelligent screenshot capture that automatically excludes the feedback panel from screen captures, ensuring clean screenshots without interface elements blocking the view.
- **Feedback Admin Management Enhancements**: Fixed critical issue where feedback status updates weren't saving due to API method mismatch (frontend sent PUT, backend only had PATCH). Added both PUT and PATCH routes for compatibility. Implemented comprehensive status filtering system in admin interface with dropdown filter and clickable status cards for quick filtering. Enhanced UI with visual feedback showing filtered vs total counts, active filter highlighting, and contextual empty state messages. Dialog automatically closes after successful status updates for improved workflow efficiency.
- **Ferramentas System Integration**: Successfully implemented comprehensive ferramentas (tools) system with real database integration replacing mock data. Fixed routing issues by correcting API endpoint paths to /api/tools/* structure. Implemented user category-based permission system where admin/superadmin users see all active tools while regular users only see tools assigned to their categories. Added /api/tools/user/accessible endpoint with proper authentication and permission checking. Created /api/tools/categories endpoint returning real tool categories from database. Fixed 404 errors on tool links by implementing getToolUrl() function that maps specific tools to their correct routes (e.g., "Aulas com Extensão" tool ID 1 maps to /ferramentas/atividades-externas). Public ferramentas page now displays real categories with proper filtering functionality and permission-based tool visibility. System shows tool status badges (Active/Inactive) and prevents access to inactive tools with "Em Breve" buttons.

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