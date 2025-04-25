# MICE Event Attendance Tracking System

A QR code-based attendance tracking system for MICE (Meetings, Incentives, Conferences, and Exhibitions) events.

## Features

- Generate QR codes for 30 students with their name and email
- Printable QR codes to attach to student IDs
- Secretary scanning functionality for time-in and time-out tracking
- Automatic email notifications confirming attendance
- Dashboard for monitoring attendance
- Event management
- Reports and attendance history

## Tech Stack

- **Frontend**: Next.js, React, Tailwind CSS
- **Backend**: Supabase (PostgreSQL, Auth, Storage)
- **Authentication**: Supabase Auth
- **QR Generation**: qrcode.react
- **QR Scanning**: react-qr-reader
- **Email**: Nodemailer with Gmail SMTP

## Getting Started

### Prerequisites

- Node.js 16+ and npm
- Supabase account and project
- Gmail account for sending emails

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/yourusername/qrmice.git
   cd qrmice
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Create a `.env.local` file with your environment variables:
   ```
   NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
   
   # Gmail SMTP settings
   EMAIL_HOST=smtp.gmail.com
   EMAIL_PORT=587
   EMAIL_USER=your_gmail_address
   EMAIL_PASS=your_app_password
   ```

4. Run the development server:
   ```bash
   npm run dev
   ```

5. Open [http://localhost:3000](http://localhost:3000) with your browser to see the application.

### Supabase Setup

1. Create a new Supabase project
2. Set up the database schema with the provided SQL scripts in the `docs/mice_event_supabase_schema.md` file
3. Enable RLS policies as defined in the schema file

## Deployment

This application can be easily deployed to Vercel:

1. Push your code to a GitHub repository
2. Connect your repository to Vercel
3. Configure environment variables in Vercel dashboard
4. Deploy!

## Usage

1. Add students through the admin interface
2. Create events for attendance tracking
3. Generate and print QR codes for students
4. Use the scanner interface to track attendance
5. View reports and attendance data

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Acknowledgments

- [Supabase](https://supabase.io/)
- [Next.js](https://nextjs.org/)
- [Tailwind CSS](https://tailwindcss.com/)
- [React QR Reader](https://www.npmjs.com/package/react-qr-reader) 