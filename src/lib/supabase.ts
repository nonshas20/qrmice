import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL as string;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string;

// Create Supabase client
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Database types
export interface Student {
  id: string;
  name: string;
  email: string;
  qr_code_data: string;
  created_at: string;
  updated_at: string;
}

export interface Event {
  id: string;
  name: string;
  description?: string;
  date: string;
  start_time: string;
  end_time: string;
  location?: string;
  created_at: string;
  updated_at: string;
}

export interface AttendanceRecord {
  id: string;
  student_id: string;
  event_id: string;
  time_in?: string;
  time_out?: string;
  email_sent_in: boolean;
  email_sent_out: boolean;
  created_at: string;
  updated_at: string;
}

export interface Profile {
  id: string;
  name?: string;
  role: 'secretary' | 'admin';
  created_at: string;
  updated_at: string;
}

// Helper functions for working with Supabase

// Students
export async function getStudents() {
  const { data, error } = await supabase
    .from('students')
    .select('*')
    .order('name');
  
  if (error) {
    console.error('Error fetching students:', error);
    throw error;
  }
  
  return data as Student[];
}

export async function getStudentById(id: string) {
  const { data, error } = await supabase
    .from('students')
    .select('*')
    .eq('id', id)
    .single();
  
  if (error) {
    console.error(`Error fetching student with ID ${id}:`, error);
    throw error;
  }
  
  return data as Student;
}

export async function createStudent(name: string, email: string) {
  // Generate a unique QR code data (using UUID v4)
  const qrCodeData = crypto.randomUUID();
  
  const { data, error } = await supabase
    .from('students')
    .insert([{ name, email, qr_code_data: qrCodeData }])
    .select()
    .single();
  
  if (error) {
    console.error('Error creating student:', error);
    throw error;
  }
  
  return data as Student;
}

export async function updateStudent(id: string, updates: Partial<Student>) {
  const { data, error } = await supabase
    .from('students')
    .update(updates)
    .eq('id', id)
    .select()
    .single();
  
  if (error) {
    console.error(`Error updating student with ID ${id}:`, error);
    throw error;
  }
  
  return data as Student;
}

export async function deleteStudent(id: string) {
  const { error } = await supabase
    .from('students')
    .delete()
    .eq('id', id);
  
  if (error) {
    console.error(`Error deleting student with ID ${id}:`, error);
    throw error;
  }
  
  return true;
}

// Events
export async function getEvents() {
  const { data, error } = await supabase
    .from('events')
    .select('*')
    .order('date', { ascending: false });
  
  if (error) {
    console.error('Error fetching events:', error);
    throw error;
  }
  
  return data as Event[];
}

export async function getEventById(id: string) {
  const { data, error } = await supabase
    .from('events')
    .select('*')
    .eq('id', id)
    .single();
  
  if (error) {
    console.error(`Error fetching event with ID ${id}:`, error);
    throw error;
  }
  
  return data as Event;
}

export async function createEvent(event: Omit<Event, 'id' | 'created_at' | 'updated_at'>) {
  const { data, error } = await supabase
    .from('events')
    .insert([event])
    .select()
    .single();
  
  if (error) {
    console.error('Error creating event:', error);
    throw error;
  }
  
  return data as Event;
}

// Attendance
export async function recordTimeIn(studentId: string, eventId: string) {
  console.log(`Recording time in for student ${studentId} at event ${eventId}`);
  
  try {
    const { data, error } = await supabase
      .rpc('record_time_in', {
        p_student_id: studentId,
        p_event_id: eventId
      });
    
    if (error) {
      console.error('Error from Supabase RPC record_time_in:', error);
      throw new Error(`Failed to record time in: ${error.message}`);
    }
    
    if (!data) {
      console.error('No data returned from record_time_in RPC call');
      throw new Error('No attendance record created');
    }
    
    console.log('Time in recorded successfully:', data);
    return data as AttendanceRecord;
  } catch (err: any) {
    console.error('Exception in recordTimeIn:', err);
    
    // Fallback: Try direct insert if RPC fails
    try {
      console.log('Attempting fallback: direct attendance record insert');
      
      // Check if record already exists
      const { data: existingRecord } = await supabase
        .from('attendance_records')
        .select('*')
        .eq('student_id', studentId)
        .eq('event_id', eventId)
        .maybeSingle();
      
      if (existingRecord) {
        console.log('Existing record found, updating time_in');
        const { data, error } = await supabase
          .from('attendance_records')
          .update({ time_in: new Date().toISOString() })
          .eq('student_id', studentId)
          .eq('event_id', eventId)
          .select()
          .single();
        
        if (error) throw error;
        return data as AttendanceRecord;
      } else {
        console.log('No existing record, creating new one');
        const { data, error } = await supabase
          .from('attendance_records')
          .insert({
            student_id: studentId,
            event_id: eventId,
            time_in: new Date().toISOString(),
            email_sent_in: false,
            email_sent_out: false
          })
          .select()
          .single();
        
        if (error) throw error;
        return data as AttendanceRecord;
      }
    } catch (fallbackErr: any) {
      console.error('Fallback approach also failed:', fallbackErr);
      throw new Error(`Failed to record attendance: ${fallbackErr.message || err.message}`);
    }
  }
}

export async function recordTimeOut(studentId: string, eventId: string) {
  console.log(`Recording time out for student ${studentId} at event ${eventId}`);
  
  try {
    const { data, error } = await supabase
      .rpc('record_time_out', {
        p_student_id: studentId,
        p_event_id: eventId
      });
    
    if (error) {
      console.error('Error from Supabase RPC record_time_out:', error);
      throw new Error(`Failed to record time out: ${error.message}`);
    }
    
    if (!data) {
      console.error('No data returned from record_time_out RPC call');
      throw new Error('No attendance record updated');
    }
    
    console.log('Time out recorded successfully:', data);
    return data as AttendanceRecord;
  } catch (err: any) {
    console.error('Exception in recordTimeOut:', err);
    
    // Fallback: Try direct update if RPC fails
    try {
      console.log('Attempting fallback: direct attendance record update');
      
      // Check if record already exists
      const { data: existingRecord } = await supabase
        .from('attendance_records')
        .select('*')
        .eq('student_id', studentId)
        .eq('event_id', eventId)
        .maybeSingle();
      
      if (existingRecord) {
        console.log('Existing record found, updating time_out');
        const { data, error } = await supabase
          .from('attendance_records')
          .update({ time_out: new Date().toISOString() })
          .eq('student_id', studentId)
          .eq('event_id', eventId)
          .select()
          .single();
        
        if (error) throw error;
        return data as AttendanceRecord;
      } else {
        console.log('No existing record, creating new one with time_out');
        const { data, error } = await supabase
          .from('attendance_records')
          .insert({
            student_id: studentId,
            event_id: eventId,
            time_out: new Date().toISOString(),
            email_sent_in: false,
            email_sent_out: false
          })
          .select()
          .single();
        
        if (error) throw error;
        return data as AttendanceRecord;
      }
    } catch (fallbackErr: any) {
      console.error('Fallback approach also failed:', fallbackErr);
      throw new Error(`Failed to record attendance: ${fallbackErr.message || err.message}`);
    }
  }
}

export async function getAttendanceByEvent(eventId: string) {
  const { data, error } = await supabase
    .from('attendance_report')
    .select('*')
    .eq('event_id', eventId);
  
  if (error) {
    console.error(`Error fetching attendance for event ${eventId}:`, error);
    throw error;
  }
  
  return data;
}

export async function markEmailSent(recordId: string, type: 'in' | 'out') {
  const updates = type === 'in' 
    ? { email_sent_in: true } 
    : { email_sent_out: true };
  
  const { error } = await supabase
    .from('attendance_records')
    .update(updates)
    .eq('id', recordId);
  
  if (error) {
    console.error(`Error marking email as sent for record ${recordId}:`, error);
    throw error;
  }
  
  return true;
}

// Get student by QR code data
export async function getStudentByQRCode(qrCodeData: string) {
  const { data, error } = await supabase
    .from('students')
    .select('*')
    .eq('qr_code_data', qrCodeData)
    .single();
  
  if (error) {
    console.error(`Error fetching student with QR code ${qrCodeData}:`, error);
    throw error;
  }
  
  return data as Student;
} 