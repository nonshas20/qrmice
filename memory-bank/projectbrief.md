# QR MICE Event Attendance System - Project Brief

## Project Overview

The QR MICE Event Attendance System is a specialized application designed to track student attendance at MICE (Meetings, Incentives, Conferences, and Exhibitions) events through QR code scanning. The system allows event secretaries to efficiently record time-in and time-out of students and automatically send email notifications confirming attendance.

## Core Requirements

1. **QR Code Generation**
   - Generate unique QR codes for 30 students with their name and email
   - Provide printable format for attaching to student IDs

2. **User Roles**
   - Secretary/Admin: A single user who can scan QR codes and manage student/event data

3. **Attendance Tracking**
   - Time-in and time-out recording functionality
   - QR code scanning interface
   - Email notifications confirming attendance

4. **Technical Stack**
   - Frontend: Next.js, React, Tailwind CSS
   - Backend: Supabase (PostgreSQL database)
   - Authentication: Supabase Auth
   - Notifications: Gmail SMTP via Nodemailer
   - Deployment: Vercel

## System Components

1. **Admin Portal**
   - Student management (add, edit, remove)
   - Event management (create, view)
   - QR code generation and printing
   - Reports and analytics

2. **Scanner Interface**
   - QR code scanning
   - Time-in/time-out toggle
   - Event selection
   - Real-time attendance recording

3. **Email Notification System**
   - Automated emails for time-in confirmation
   - Automated emails for time-out confirmation

## Data Structure

1. **Students**
   - ID, name, email, QR code data

2. **Events**
   - ID, name, description, date, start time, end time, location

3. **Attendance Records**
   - Student ID, Event ID, time-in, time-out, email confirmation status

## Success Criteria

1. Secretary can efficiently scan student QR codes for time-in and time-out
2. Students receive immediate email confirmations of their attendance
3. System maintains accurate attendance records
4. QR codes are easily printable and attachable to student IDs
5. Interface is intuitive and user-friendly
6. Data is securely stored and managed in Supabase

## Project Constraints

1. System designed for 30 students (small-scale events)
2. Single secretary/admin user
3. Limited to basic attendance tracking (no advanced features like session tracking)
4. Email notifications through Gmail SMTP only

## Timeline

The system should be developed, tested, and deployed within a reasonable timeframe, with prioritization of core features (QR code generation, scanning, email notifications) followed by enhancement features (reporting, analytics). 