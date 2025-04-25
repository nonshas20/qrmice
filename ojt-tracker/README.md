# OJT Tracker

A web application for students and interns to track their On-the-Job Training (OJT) progress, add daily activity notes, and write weekly reflection journals.

## Features

- **User Authentication**: Secure signup, login, and password reset
- **Daily Log Management**: Track daily OJT hours with notes
- **Weekly Journal**: Write structured reflection journals
- **Progress Tracking**: Visual representation of hours completed (out of 500)
- **Responsive Design**: Works on desktop and mobile devices

## Tech Stack

- **Frontend**: React with Tailwind CSS
- **Backend**: Supabase (Authentication, Database, Storage)
- **State Management**: React Query and Context API
- **Routing**: React Router
- **Form Handling**: React Hook Form
- **Date Handling**: date-fns
- **Validation**: Zod

## Getting Started

### Prerequisites

- Node.js (v16 or later)
- npm or yarn
- Supabase account

### Installation

1. Clone the repository:
   ```
   git clone https://github.com/your-username/ojt-tracker.git
   cd ojt-tracker
   ```

2. Install dependencies:
   ```
   npm install
   # or
   yarn install
   ```

3. Create a `.env.local` file in the root directory with your Supabase credentials:
   ```
   VITE_SUPABASE_URL=your-supabase-url
   VITE_SUPABASE_ANON_KEY=your-supabase-anon-key
   ```

4. Start the development server:
   ```
   npm run dev
   # or
   yarn dev
   ```

### Supabase Setup

1. Create a new project in Supabase
2. Set up the following tables:
   - profiles
   - daily_logs
   - weekly_journals
3. Configure authentication settings
4. Set up Row-Level Security (RLS) policies

## Database Schema

### profiles
- id (UUID, references auth.users.id)
- full_name (text)
- program (text)
- target_hours (integer, default 500)
- avatar_url (text, optional)
- created_at (timestamp)
- updated_at (timestamp)

### daily_logs
- id (UUID)
- user_id (UUID, references auth.users.id)
- date (date)
- hours_worked (decimal)
- notes (text)
- created_at (timestamp)
- updated_at (timestamp)

### weekly_journals
- id (UUID)
- user_id (UUID, references auth.users.id)
- week_start_date (date)
- journal_text (text)
- created_at (timestamp)
- updated_at (timestamp)

## Key Concepts

- **ISO Week**: The application uses the ISO week definition (Monday-Sunday) for weekly journals
- **500-Hour Limit**: The application tracks progress toward a 500-hour OJT requirement
- **Date-Based Entries**: Daily logs and weekly journals are organized by date

## Project Structure

```
src/
├── assets/         # Static assets
├── components/     # Reusable UI components
├── contexts/       # React contexts
├── hooks/          # Custom React hooks
├── layouts/        # Layout components
├── lib/            # Helper libraries
├── pages/          # Application pages/routes
├── services/       # API service functions
└── utils/          # Utility functions
```

## License

This project is licensed under the MIT License - see the LICENSE file for details. 