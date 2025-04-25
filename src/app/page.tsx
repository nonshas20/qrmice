'use client';

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';

export default function Home() {
  const [isHovered, setIsHovered] = useState(false);
  
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-gray-50">
      <header className="mb-8 text-center">
        <h1 className="text-4xl font-bold text-primary-600 mb-2">MICE Event Attendance System</h1>
        <p className="text-lg text-gray-600">QR code-based attendance tracking made simple</p>
      </header>
      
      <main className="w-full max-w-4xl">
        <div className="grid md:grid-cols-2 gap-8">
          {/* Left column: Description */}
          <div className="flex flex-col justify-center">
            <h2 className="text-2xl font-semibold mb-4 text-gray-800">Welcome to the MICE Event Attendance System</h2>
            <p className="mb-4 text-gray-600">
              Our system offers a seamless attendance tracking experience for your events using QR code technology:
            </p>
            <ul className="list-disc list-inside space-y-2 mb-6 text-gray-600">
              <li>Generate QR codes for attendees</li>
              <li>Scan at check-in and check-out</li>
              <li>Automatic email confirmations</li>
              <li>Real-time attendance tracking</li>
              <li>Export attendance reports</li>
            </ul>
            
            <div className="flex flex-col sm:flex-row gap-4 mt-2">
              <Link
                href="/admin"
                className="btn-primary text-center"
                onMouseEnter={() => setIsHovered(true)}
                onMouseLeave={() => setIsHovered(false)}
              >
                Admin Portal
              </Link>
              <Link
                href="/scanner"
                className="btn-outline text-center"
              >
                Scanner
              </Link>
            </div>
          </div>
          
          {/* Right column: Image/Illustration */}
          <div className="flex items-center justify-center">
            <div className="relative w-full max-w-md aspect-square">
              <div className="absolute inset-0 bg-primary-100 rounded-xl transform rotate-3 transition-transform duration-300 ease-in-out"></div>
              <div className={`absolute inset-0 bg-white rounded-xl shadow-lg flex items-center justify-center p-8 transition-transform duration-300 ease-in-out ${isHovered ? 'scale-105' : ''}`}>
                <div className="relative w-full h-full">
                  {/* Placeholder for QR Code Image */}
                  <div className="border-2 border-dashed border-gray-300 rounded-lg h-full flex items-center justify-center">
                    <div className="text-center">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-24 w-24 mx-auto text-primary-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
                      </svg>
                      <p className="mt-4 text-primary-600 font-medium">Scan QR Codes for Instant Attendance Tracking</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
      
      <footer className="mt-16 text-center text-gray-500 text-sm">
        <p>© {new Date().getFullYear()} MICE Event Attendance System. All rights reserved.</p>
      </footer>
    </div>
  );
} 