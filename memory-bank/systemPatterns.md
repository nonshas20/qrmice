# QR MICE Event Attendance System - System Patterns

## System Architecture

The QR MICE Event Attendance System follows a client-server architecture with a serverless backend provided by Supabase. The application is built using the following architectural patterns:

### 1. Component-Based Architecture

The frontend is structured using React components organized by feature:

```
src/
  ├── components/  # Reusable UI components
  │   ├── Header.tsx
  │   └── ... 
  ├── app/         # Page components and routing
  │   ├── page.tsx                 # Homepage
  │   ├── admin/                   # Admin portal
  │   │   ├── page.tsx             # Admin dashboard
  │   │   ├── students/            # Student management
  │   │   │   ├── page.tsx         # Student list
  │   │   │   ├── new/             # Add student form
  │   │   │   ├── edit/[id]/       # Edit student form
  │   │   │   └── qrcodes/         # QR code generation  
  │   │   └── events/              # Event management
  │   │       ├── page.tsx         # Event list
  │   │       ├── new/             # Add event form
  │   │       └── [id]/            # Event details
  │   └── scanner/                 # QR scanner interface
  │       └── page.tsx
  └── lib/         # Utilities and services
      ├── supabase.ts              # Supabase client
      └── email.ts                 # Email service
```

### 2. Backend as a Service (BaaS)

The application uses Supabase as a Backend as a Service, providing:

- **Database**: PostgreSQL for data storage
- **Authentication**: User management and authentication
- **APIs**: RESTful and real-time APIs for data access
- **Row-Level Security (RLS)**: Policies for data access control

### 3. API-First Design

The application interacts with the backend through well-defined API functions:

```typescript
// Student management
export async function getStudents() { ... }
export async function getStudentById(id: string) { ... }
export async function createStudent(name: string, email: string) { ... }
export async function updateStudent(id: string, updates: Partial<Student>) { ... }
export async function deleteStudent(id: string) { ... }

// Event management
export async function getEvents() { ... }
export async function getEventById(id: string) { ... }
export async function createEvent(event: Omit<Event, 'id' | 'created_at' | 'updated_at'>) { ... }

// Attendance tracking
export async function recordTimeIn(studentId: string, eventId: string) { ... }
export async function recordTimeOut(studentId: string, eventId: string) { ... }
export async function getAttendanceByEvent(eventId: string) { ... }
```

### 4. Server-Side Functions and API Routes

For operations that require server-side processing (like sending emails), the system uses Next.js API routes:

```
src/app/api/
  ├── attendance/
  │   └── route.ts    # Handles attendance recording and email notifications
  └── email/
      └── route.ts    # Email verification and testing
```

## Key Technical Decisions

### 1. Database Schema Design

The database follows a relational model with three main tables:

- **students**: Stores student information and QR code data
- **events**: Manages event details and scheduling
- **attendance_records**: Tracks attendance with time-in/out records

Database functions handle complex operations:

- `record_time_in()`: Records student check-in and handles upserts
- `record_time_out()`: Updates existing attendance records with check-out time

### 2. QR Code Implementation

- QR codes contain unique identifiers (UUIDs) rather than personal information
- Generated using `qrcode.react` library for flexibility and styling
- Designed for optimal scanning with error correction (Level H)
- Print layouts optimized for standard ID card attachment

### 3. Scanning Interface

- Uses `react-qr-reader` for camera access and QR code detection
- Toggle between time-in and time-out modes
- Real-time feedback for scan success/failure
- Event selection for context-specific attendance recording

### 4. Email Notification System

- Server-side implementation using Nodemailer
- Gmail SMTP for email delivery
- HTML email templates for professional appearance
- Confirmation tracking to prevent duplicate emails

## Component Relationships

```
User Interface
    ├── Admin Dashboard
    │   ├── Student Management
    │   │   └── QR Code Generation
    │   └── Event Management
    └── Scanner Interface
        └── Attendance Recording
            └── Email Notifications

Data Flow
    ├── UI Components ⟷ Supabase Client Functions
    ├── Scanner Interface ⟷ API Routes
    └── API Routes ⟷ Email Service
```

## Design Patterns

1. **Repository Pattern**: Encapsulated database operations in the `supabase.ts` file
2. **Service Pattern**: Separated email functionality into dedicated service
3. **Container/Presentation Pattern**: Separated data fetching from UI rendering
4. **React Hooks Pattern**: Used hooks for state management and side effects
5. **API Route Pattern**: Server-side operations handled through API routes 