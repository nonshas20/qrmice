import { NextRequest, NextResponse } from 'next/server';
import { 
  getStudentByQRCode, 
  getEventById, 
  recordTimeIn, 
  recordTimeOut, 
  markEmailSent 
} from '@/lib/supabase';
import { sendAttendanceConfirmation } from '@/lib/email';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { qrCode, eventId, scanMode } = body;
    
    if (!qrCode || !eventId || !scanMode) {
      return NextResponse.json(
        { error: 'Missing required fields: qrCode, eventId, or scanMode' },
        { status: 400 }
      );
    }
    
    // Get student data and handle potential errors
    let student;
    try {
      student = await getStudentByQRCode(qrCode);
    } catch (error: any) {
      console.error('Failed to find student with QR code:', error);
      return NextResponse.json(
        { error: 'Invalid QR code. Student not found.' },
        { status: 404 }
      );
    }
    
    // Get event data and handle potential errors
    let event;
    try {
      event = await getEventById(eventId);
    } catch (error: any) {
      console.error('Failed to find event:', error);
      return NextResponse.json(
        { error: 'Event not found.' },
        { status: 404 }
      );
    }
    
    // Record attendance based on scan mode
    let record;
    try {
      if (scanMode === 'in') {
        console.log(`API: Recording time in for student ${student.id} (${student.name}) at event ${eventId}`);
        record = await recordTimeIn(student.id, eventId);
      } else if (scanMode === 'out') {
        console.log(`API: Recording time out for student ${student.id} (${student.name}) at event ${eventId}`);
        record = await recordTimeOut(student.id, eventId);
      } else {
        return NextResponse.json(
          { error: 'Invalid scan mode. Must be "in" or "out".' },
          { status: 400 }
        );
      }
    } catch (error: any) {
      console.error('API: Failed to record attendance:', error);
      console.error('Error details:', error.cause || error.stack || 'No additional details');
      
      return NextResponse.json(
        { 
          error: `Failed to record ${scanMode === 'in' ? 'time in' : 'time out'}`,
          details: error.message || 'Database error'
        },
        { status: 500 }
      );
    }
    
    // Send email notification (but don't fail if email sending fails)
    try {
      await sendAttendanceConfirmation(student, event, scanMode as 'in' | 'out');
      await markEmailSent(record.id, scanMode as 'in' | 'out');
    } catch (error: any) {
      // Log email error but continue with success response
      console.error('Failed to send email confirmation:', error);
    }
    
    return NextResponse.json({
      success: true,
      student: {
        name: student.name,
        email: student.email
      },
      scanMode,
      timestamp: new Date().toISOString()
    });
    
  } catch (error: any) {
    console.error('Attendance API error:', error);
    
    return NextResponse.json(
      { 
        error: 'Failed to process attendance', 
        details: error.message || 'Unknown error'
      },
      { status: 500 }
    );
  }
}