import nodemailer from 'nodemailer';
import { Student, Event } from './supabase';

// Create transporter
const createTransporter = () => {
  return nodemailer.createTransport({
    host: process.env.EMAIL_HOST,
    port: parseInt(process.env.EMAIL_PORT || '587'),
    secure: false, // true for 465, false for other ports
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });
};

// Email templates
function getTimeInTemplate(student: Student, event: Event) {
  const dateString = new Date(event.date).toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
  
  const timeString = new Date().toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
  });
  
  return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 5px;">
      <h2 style="color: #0284c7; text-align: center;">Attendance Confirmation</h2>
      <p>Hello ${student.name},</p>
      <p>Your attendance has been recorded for the following event:</p>
      <div style="background-color: #f0f9ff; padding: 15px; border-radius: 5px; margin: 15px 0;">
        <p><strong>Event:</strong> ${event.name}</p>
        <p><strong>Date:</strong> ${dateString}</p>
        <p><strong>Time In:</strong> ${timeString}</p>
        <p><strong>Location:</strong> ${event.location || 'N/A'}</p>
      </div>
      <p>Thank you for your participation.</p>
      <p style="margin-top: 30px; font-size: 12px; color: #666; text-align: center;">
        This is an automated message. Please do not reply to this email.
      </p>
    </div>
  `;
}

function getTimeOutTemplate(student: Student, event: Event) {
  const dateString = new Date(event.date).toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
  
  const timeString = new Date().toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
  });
  
  return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 5px;">
      <h2 style="color: #0284c7; text-align: center;">Check-Out Confirmation</h2>
      <p>Hello ${student.name},</p>
      <p>You have successfully checked out from the following event:</p>
      <div style="background-color: #f0f9ff; padding: 15px; border-radius: 5px; margin: 15px 0;">
        <p><strong>Event:</strong> ${event.name}</p>
        <p><strong>Date:</strong> ${dateString}</p>
        <p><strong>Time Out:</strong> ${timeString}</p>
        <p><strong>Location:</strong> ${event.location || 'N/A'}</p>
      </div>
      <p>Thank you for your participation.</p>
      <p style="margin-top: 30px; font-size: 12px; color: #666; text-align: center;">
        This is an automated message. Please do not reply to this email.
      </p>
    </div>
  `;
}

// Send attendance confirmation email (server-side only)
export async function sendAttendanceConfirmation(
  student: Student,
  event: Event,
  type: 'in' | 'out'
) {
  // Ensure this only runs on the server
  if (typeof window !== 'undefined') {
    console.error('Email functions should only be called from the server-side');
    return false;
  }
  
  const template = type === 'in' 
    ? getTimeInTemplate(student, event)
    : getTimeOutTemplate(student, event);
  
  const subject = type === 'in'
    ? `Attendance Confirmation: ${event.name}`
    : `Check-Out Confirmation: ${event.name}`;
  
  try {
    const transporter = createTransporter();
    
    const info = await transporter.sendMail({
      from: `"MICE Event System" <${process.env.EMAIL_USER}>`,
      to: student.email,
      subject,
      html: template,
    });
    
    console.log(`Email sent to ${student.email}: ${info.messageId}`);
    return true;
  } catch (error) {
    console.error('Error sending email:', error);
    throw error;
  }
}

// Verify email configuration (server-side only)
export async function verifyEmailConfig() {
  // Ensure this only runs on the server
  if (typeof window !== 'undefined') {
    return { 
      success: false, 
      message: 'Email configuration can only be verified on the server-side'
    };
  }
  
  try {
    const transporter = createTransporter();
    await transporter.verify();
    return { success: true, message: 'Email configuration is valid' };
  } catch (error) {
    console.error('Email configuration error:', error);
    return { 
      success: false, 
      message: 'Email configuration error', 
      error 
    };
  }
} 