# QR MICE Event Attendance System - Technical Context

## Technologies Used

### Frontend

1. **Next.js 14**
   - React framework for server and client components
   - App Router for file-based routing
   - Server components for improved performance
   - API routes for server-side operations

2. **React 18**
   - Functional components with hooks
   - Context API for state management
   - Client-side rendering for interactive features

3. **TypeScript**
   - Static typing for improved code quality
   - Interface definitions for data structures
   - Type checking for component props and state

4. **Tailwind CSS**
   - Utility-first CSS framework
   - Responsive design components
   - Custom theme configuration

5. **QR Code Libraries**
   - `qrcode.react`: For generating QR codes
   - `react-qr-reader`: For scanning QR codes

### Backend

1. **Supabase**
   - PostgreSQL database for data storage
   - Row-Level Security for data protection
   - REST API for data access
   - Authentication system

2. **Email Service**
   - Nodemailer for sending emails
   - Gmail SMTP for delivery
   - HTML email templates

### Deployment

1. **Vercel**
   - Hosting platform for Next.js applications
   - Environment variables for configuration
   - Serverless functions for API routes

## Development Setup

### Local Development

1. **Prerequisites**
   - Node.js 16+ and npm
   - Git for version control
   - Supabase account and project

2. **Environment Variables**
   ```
   # Supabase configuration
   NEXT_PUBLIC_SUPABASE_URL=https://espcgyteztrqzfarqafq.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
   
   # Email configuration
   EMAIL_HOST=smtp.gmail.com
   EMAIL_PORT=587
   EMAIL_USER=miceattendance@gmail.com
   EMAIL_PASS=zxno kmcw uymf wjur
   ```

3. **Database Setup**
   - Execute the SQL scripts from `docs/mice_event_supabase_schema.md`
   - Set up Row-Level Security policies

4. **Installation Steps**
   ```bash
   # Install dependencies
   npm install --legacy-peer-deps
   
   # Run development server
   npm run dev
   ```

## Technical Constraints

1. **Browser Compatibility**
   - Modern browsers with camera access (for QR scanning)
   - JavaScript enabled
   - Responsive design for mobile and desktop

2. **Database Limitations**
   - Initial design for 30 students (can be scaled)
   - Supabase free tier limitations

3. **Email Service**
   - Gmail SMTP rate limits
   - App password authentication requirement
   - Email deliverability considerations

4. **QR Code Scanner**
   - Requires camera permission
   - Performance dependent on device camera quality
   - May have limitations in low-light conditions

## Dependencies

### Core Dependencies

```json
{
  "dependencies": {
    "@supabase/auth-helpers-nextjs": "^0.8.7",
    "@supabase/auth-helpers-react": "^0.4.2",
    "@supabase/supabase-js": "^2.39.0",
    "next": "14.0.4",
    "nodemailer": "^6.9.7",
    "qrcode.react": "^3.1.0",
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "react-qr-reader": "^3.0.0-beta-1",
    "react-hook-form": "^7.48.2"
  }
}
```

### Development Dependencies

```json
{
  "devDependencies": {
    "@types/node": "^20.10.3",
    "@types/nodemailer": "^6.4.14",
    "@types/react": "^18.2.42",
    "@types/react-dom": "^18.2.17",
    "autoprefixer": "^10.4.16",
    "eslint": "^8.55.0",
    "eslint-config-next": "14.0.4",
    "postcss": "^8.4.32",
    "tailwindcss": "^3.3.6",
    "typescript": "^5.3.2"
  }
}
```

## Security Considerations

1. **Authentication**
   - Admin authentication through Supabase Auth
   - Protected routes for admin and scanner interfaces

2. **Data Protection**
   - Row-Level Security policies in Supabase
   - Environment variables for sensitive information
   - Limited public access to student data

3. **API Security**
   - Server-side validation for all inputs
   - Rate limiting for API routes
   - CSRF protection

4. **QR Code Security**
   - QR codes contain only UUIDs, not personal information
   - Server-side validation of QR code data before processing 