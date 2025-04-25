'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Header from '@/components/Header';
import { getStudents, getEvents } from '@/lib/supabase';
import type { Student, Event } from '@/lib/supabase';

export default function AdminDashboard() {
  const [students, setStudents] = useState<Student[]>([]);
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  useEffect(() => {
    async function fetchData() {
      try {
        setLoading(true);
        
        // Fetch students and events concurrently
        const [studentsData, eventsData] = await Promise.all([
          getStudents(),
          getEvents(),
        ]);
        
        setStudents(studentsData);
        setEvents(eventsData);
      } catch (err) {
        console.error('Error fetching data:', err);
        setError('Failed to load data. Please try again later.');
      } finally {
        setLoading(false);
      }
    }
    
    fetchData();
  }, []);
  
  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      
      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <h1 className="text-2xl font-semibold text-gray-900 mb-6">Admin Dashboard</h1>
          
          {loading ? (
            <div className="flex justify-center items-center h-64">
              <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-500"></div>
            </div>
          ) : error ? (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md">
              {error}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Students Section */}
              <div className="card">
                <div className="card-header">
                  <div className="flex justify-between items-center">
                    <h2 className="text-lg font-semibold text-gray-900">Students</h2>
                    <div className="flex space-x-2">
                      <Link href="/admin/students" className="btn-primary text-sm py-1">
                        Manage Students
                      </Link>
                      <Link href="/admin/students/qrcodes" className="btn-outline text-sm py-1">
                        Generate QR Codes
                      </Link>
                    </div>
                  </div>
                </div>
                <div className="card-body">
                  <p className="text-gray-500 mb-4">
                    Total Students: <span className="font-semibold">{students.length}</span>
                  </p>
                  {students.length > 0 ? (
                    <div className="overflow-x-auto">
                      <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Name
                            </th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Email
                            </th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {students.slice(0, 5).map((student) => (
                            <tr key={student.id}>
                              <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-900">
                                {student.name}
                              </td>
                              <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-500">
                                {student.email}
                              </td>
                            </tr>
                          ))}
                          {students.length > 5 && (
                            <tr>
                              <td colSpan={2} className="px-4 py-2 text-sm text-center text-primary-600">
                                <Link href="/admin/students">View all {students.length} students</Link>
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <p className="text-gray-500 italic">No students registered yet.</p>
                  )}
                </div>
              </div>
              
              {/* Events Section */}
              <div className="card">
                <div className="card-header">
                  <div className="flex justify-between items-center">
                    <h2 className="text-lg font-semibold text-gray-900">Events</h2>
                    <Link href="/admin/events" className="btn-primary text-sm py-1">
                      Manage Events
                    </Link>
                  </div>
                </div>
                <div className="card-body">
                  <p className="text-gray-500 mb-4">
                    Total Events: <span className="font-semibold">{events.length}</span>
                  </p>
                  {events.length > 0 ? (
                    <div className="overflow-x-auto">
                      <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Name
                            </th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Date
                            </th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {events.slice(0, 5).map((event) => (
                            <tr key={event.id}>
                              <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-900">
                                {event.name}
                              </td>
                              <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-500">
                                {new Date(event.date).toLocaleDateString()}
                              </td>
                            </tr>
                          ))}
                          {events.length > 5 && (
                            <tr>
                              <td colSpan={2} className="px-4 py-2 text-sm text-center text-primary-600">
                                <Link href="/admin/events">View all {events.length} events</Link>
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <p className="text-gray-500 italic">No events created yet.</p>
                  )}
                </div>
              </div>
              
              {/* Quick Links */}
              <div className="card md:col-span-2">
                <div className="card-header">
                  <h2 className="text-lg font-semibold text-gray-900">Quick Actions</h2>
                </div>
                <div className="card-body">
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    <Link
                      href="/admin/students/new"
                      className="block p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                    >
                      <h3 className="text-lg font-medium text-primary-600 mb-1">Add Student</h3>
                      <p className="text-sm text-gray-500">Register a new student in the system</p>
                    </Link>
                    <Link
                      href="/admin/events/new"
                      className="block p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                    >
                      <h3 className="text-lg font-medium text-primary-600 mb-1">Create Event</h3>
                      <p className="text-sm text-gray-500">Set up a new event for attendance tracking</p>
                    </Link>
                    <Link
                      href="/admin/reports"
                      className="block p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                    >
                      <h3 className="text-lg font-medium text-primary-600 mb-1">View Reports</h3>
                      <p className="text-sm text-gray-500">Check attendance and generate reports</p>
                    </Link>
                    <Link
                      href="/scanner"
                      className="block p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                    >
                      <h3 className="text-lg font-medium text-primary-600 mb-1">Scanner</h3>
                      <p className="text-sm text-gray-500">Go to QR code scanner for check-in/out</p>
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
} 