'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { getStudents, deleteStudent } from '@/lib/supabase';
import type { Student } from '@/lib/supabase';

export default function StudentsPage() {
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  
  async function loadStudents() {
    try {
      setLoading(true);
      const data = await getStudents();
      setStudents(data);
      setError('');
    } catch (err) {
      console.error('Error loading students:', err);
      setError('Failed to load students. Please try again.');
    } finally {
      setLoading(false);
    }
  }
  
  useEffect(() => {
    loadStudents();
  }, []);
  
  const handleDeleteClick = (studentId: string) => {
    setDeleteConfirm(studentId);
  };
  
  const confirmDelete = async (studentId: string) => {
    try {
      await deleteStudent(studentId);
      setStudents(students.filter(student => student.id !== studentId));
      setDeleteConfirm(null);
    } catch (err) {
      console.error('Error deleting student:', err);
      setError('Failed to delete student. Please try again.');
    }
  };
  
  const cancelDelete = () => {
    setDeleteConfirm(null);
  };
  
  return (
    <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
      <div className="px-4 py-6 sm:px-0">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-semibold text-gray-900">Manage Students</h1>
          <Link href="/admin/students/new" className="btn-primary">
            Add New Student
          </Link>
        </div>
        
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md mb-6">
            {error}
          </div>
        )}
        
        {loading ? (
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-500"></div>
          </div>
        ) : students.length === 0 ? (
          <div className="bg-white rounded-lg shadow-md p-6 text-center">
            <p className="text-gray-500 mb-4">No students have been registered yet.</p>
            <Link href="/admin/students/new" className="btn-primary">
              Register Your First Student
            </Link>
          </div>
        ) : (
          <div className="bg-white shadow-md rounded-lg overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Name
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Email
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    QR Code
                  </th>
                  <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {students.map(student => (
                  <tr key={student.id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {student.name}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {student.email}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      <Link 
                        href={`/admin/students/qrcode/${student.id}`}
                        className="text-primary-600 hover:text-primary-800"
                      >
                        View QR Code
                      </Link>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      {deleteConfirm === student.id ? (
                        <div className="flex items-center justify-end space-x-2">
                          <span className="text-gray-500 mr-2">Confirm?</span>
                          <button
                            onClick={() => confirmDelete(student.id)}
                            className="text-red-600 hover:text-red-800"
                          >
                            Yes
                          </button>
                          <button
                            onClick={cancelDelete}
                            className="text-gray-500 hover:text-gray-700"
                          >
                            No
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center justify-end space-x-4">
                          <Link
                            href={`/admin/students/edit/${student.id}`}
                            className="text-primary-600 hover:text-primary-800"
                          >
                            Edit
                          </Link>
                          <button
                            onClick={() => handleDeleteClick(student.id)}
                            className="text-red-600 hover:text-red-800"
                          >
                            Delete
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        
        <div className="mt-8 flex justify-between">
          <Link href="/admin" className="text-primary-600 hover:text-primary-800">
            &larr; Back to Dashboard
          </Link>
          <Link href="/admin/students/qrcodes" className="btn-outline">
            Print All QR Codes
          </Link>
        </div>
      </div>
    </main>
  );
} 