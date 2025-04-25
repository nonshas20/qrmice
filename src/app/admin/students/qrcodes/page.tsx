'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { QRCodeSVG } from 'qrcode.react';
import { getStudents } from '@/lib/supabase';
import type { Student } from '@/lib/supabase';

export default function QRCodesPage() {
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedStudents, setSelectedStudents] = useState<string[]>([]);
  const [selectAll, setSelectAll] = useState(false);
  const printRef = useRef<HTMLDivElement>(null);
  
  useEffect(() => {
    async function loadStudents() {
      try {
        setLoading(true);
        const data = await getStudents();
        setStudents(data);
      } catch (err) {
        console.error('Error loading students:', err);
        setError('Failed to load students. Please try again.');
      } finally {
        setLoading(false);
      }
    }
    
    loadStudents();
  }, []);
  
  useEffect(() => {
    if (selectAll) {
      setSelectedStudents(students.map(student => student.id));
    } else {
      setSelectedStudents([]);
    }
  }, [selectAll, students]);
  
  const toggleStudent = (studentId: string) => {
    if (selectedStudents.includes(studentId)) {
      setSelectedStudents(selectedStudents.filter(id => id !== studentId));
    } else {
      setSelectedStudents([...selectedStudents, studentId]);
    }
  };
  
  const handlePrint = () => {
    const originalContents = document.body.innerHTML;
    
    if (printRef.current) {
      const printContents = printRef.current.innerHTML;
      document.body.innerHTML = printContents;
      window.print();
      document.body.innerHTML = originalContents;
      window.location.reload();
    }
  };
  
  return (
    <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
      <div className="px-4 py-6 sm:px-0">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-semibold text-gray-900">Generate QR Codes</h1>
          <div className="flex space-x-2">
            <Link href="/admin/students" className="text-primary-600 hover:text-primary-800">
              &larr; Back to Students
            </Link>
            <button 
              onClick={handlePrint}
              disabled={selectedStudents.length === 0 || loading}
              className={`btn-primary ${
                selectedStudents.length === 0 || loading ? 'opacity-50 cursor-not-allowed' : ''
              }`}
            >
              Print Selected QR Codes
            </button>
          </div>
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
          <>
            <div className="bg-white shadow-md rounded-lg overflow-hidden mb-6">
              <div className="p-4 bg-gray-50 border-b border-gray-200">
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="select-all"
                    checked={selectAll}
                    onChange={() => setSelectAll(!selectAll)}
                    className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                  />
                  <label htmlFor="select-all" className="ml-2 text-sm text-gray-700">
                    Select All
                  </label>
                  <span className="ml-auto text-sm text-gray-500">
                    {selectedStudents.length} of {students.length} selected
                  </span>
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 p-6">
                {students.map(student => (
                  <div 
                    key={student.id}
                    className={`border rounded-lg p-4 ${
                      selectedStudents.includes(student.id) 
                        ? 'border-primary-500 bg-primary-50' 
                        : 'border-gray-200'
                    }`}
                  >
                    <div className="flex items-start">
                      <input
                        type="checkbox"
                        id={`student-${student.id}`}
                        checked={selectedStudents.includes(student.id)}
                        onChange={() => toggleStudent(student.id)}
                        className="h-4 w-4 mt-1 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                      />
                      <div className="ml-3">
                        <h3 className="text-md font-medium text-gray-900">{student.name}</h3>
                        <p className="text-sm text-gray-500">{student.email}</p>
                        <div className="mt-2">
                          <QRCodeSVG 
                            value={student.qr_code_data} 
                            size={100}
                            level="H"
                            includeMargin={true}
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            
            {/* Hidden printable section */}
            <div className="hidden">
              <div ref={printRef}>
                <style type="text/css" dangerouslySetInnerHTML={{ __html: `
                  @page { size: A4; margin: 10mm; }
                  .print-container { 
                    display: grid; 
                    grid-template-columns: repeat(2, 1fr); 
                    gap: 10mm; 
                  }
                  .qr-card {
                    border: 1px solid #ccc;
                    padding: 10mm;
                    text-align: center;
                    break-inside: avoid;
                    page-break-inside: avoid;
                    margin-bottom: 10mm;
                  }
                  .qr-name {
                    font-size: 14pt;
                    font-weight: bold;
                    margin-bottom: 3mm;
                  }
                  .qr-email {
                    font-size: 10pt;
                    margin-bottom: 5mm;
                  }
                  .qr-code {
                    width: 100%;
                    max-width: 150px;
                    height: auto;
                    margin: 0 auto;
                  }
                `}} />
                <h1 style={{ textAlign: 'center', marginBottom: '10mm' }}>
                  MICE Event QR Codes
                </h1>
                <div className="print-container">
                  {students
                    .filter(student => selectedStudents.includes(student.id))
                    .map(student => (
                      <div key={student.id} className="qr-card">
                        <div className="qr-name">{student.name}</div>
                        <div className="qr-email">{student.email}</div>
                        <QRCodeSVG 
                          value={student.qr_code_data} 
                          size={150}
                          level="H"
                          includeMargin={true}
                          className="qr-code"
                        />
                      </div>
                    ))}
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </main>
  );
} 