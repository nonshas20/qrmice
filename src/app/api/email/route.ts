import { NextRequest, NextResponse } from 'next/server';
import { verifyEmailConfig } from '@/lib/email';

export async function GET() {
  try {
    // Verify email configuration
    const result = await verifyEmailConfig();
    
    if (result.success) {
      return NextResponse.json({ status: 'ok', message: result.message });
    } else {
      return NextResponse.json(
        { status: 'error', message: result.message, error: result.error },
        { status: 500 }
      );
    }
  } catch (error: any) {
    console.error('Email verification error:', error);
    
    return NextResponse.json(
      { 
        status: 'error',
        message: 'Failed to verify email configuration',
        error: error.message || 'Unknown error'
      },
      { status: 500 }
    );
  }
} 