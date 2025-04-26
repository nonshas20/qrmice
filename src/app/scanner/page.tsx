'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { Html5Qrcode } from 'html5-qrcode';
import Header from '@/components/Header';
import {
  getStudentByQRCode,
  getEvents,
  recordTimeIn,
  recordTimeOut,
  getStudentById,
  getEventById,
  markEmailSent,
  Event
} from '@/lib/supabase';

type ScanMode = 'in' | 'out';
type ScanResult = {
  studentName: string;
  studentEmail: string;
  timestamp: string;
  success: boolean;
  message: string;
  type: ScanMode;
};

export default function QRScanner() {
  const [scanMode, setScanMode] = useState<ScanMode>('in');
  const [selectedEvent, setSelectedEvent] = useState<string>('');
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [scanning, setScanning] = useState(false);
  const [scanResults, setScanResults] = useState<ScanResult[]>([]);
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const scannerContainerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    async function loadEvents() {
      try {
        const eventsData = await getEvents();
        setEvents(eventsData);

        // Auto-select the most recent event if available
        if (eventsData.length > 0) {
          setSelectedEvent(eventsData[0].id);
        }

        setLoading(false);
      } catch (err) {
        console.error('Error loading events:', err);
        setError('Failed to load events. Please refresh the page or check your connection.');
        setLoading(false);
      }
    }

    loadEvents();
  }, []);

  useEffect(() => {
    // Initialize scanner when component mounts and scannerContainerRef is available
    if (typeof window !== 'undefined' && scannerContainerRef.current && !scannerRef.current) {
      // Small delay to ensure DOM is fully rendered
      const timer = setTimeout(() => {
        try {
          scannerRef.current = new Html5Qrcode('qr-reader');
          console.log('Scanner initialized successfully');
        } catch (err) {
          console.error('Error initializing scanner:', err);
        }
      }, 1000);

      return () => clearTimeout(timer);
    }
  }, [scannerContainerRef.current]); // Re-run when scannerContainerRef changes

  // Cleanup scanner when component unmounts
  useEffect(() => {
    return () => {
      if (scannerRef.current && scannerRef.current.isScanning) {
        scannerRef.current.stop().catch(err => console.error('Error stopping scanner:', err));
      }
    };
  }, []);

  const handleScan = async (data: string | null) => {
    if (!data || !selectedEvent || !scanning) return;

    // Prevent duplicate scans by checking if the last scan was the same QR code
    const lastScan = scanResults[0];
    if (lastScan && lastScan.message === 'Processing QR code...') {
      return; // Already processing a scan
    }

    try {
      // Show a temporary scanning message
      setScanResults([
        {
          studentName: 'Processing',
          studentEmail: 'Please wait...',
          timestamp: new Date().toLocaleTimeString(),
          success: true,
          message: 'Processing QR code...',
          type: scanMode
        },
        ...scanResults.slice(0, 9)
      ]);

      // Call the attendance API endpoint
      const response = await fetch('/api/attendance', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          qrCode: data,
          eventId: selectedEvent,
          scanMode,
        }),
      });

      // Parse the response even if it's an error
      const responseData = await response.json();

      if (!response.ok) {
        throw new Error(responseData.error || responseData.details || 'Failed to record attendance');
      }

      // Add to scan results
      setScanResults([
        {
          studentName: responseData.student.name,
          studentEmail: responseData.student.email,
          timestamp: new Date().toLocaleTimeString(),
          success: true,
          message: scanMode === 'in'
            ? 'Check-in recorded successfully!'
            : 'Check-out recorded successfully!',
          type: scanMode
        },
        ...scanResults.slice(0, 9).filter((_, index) => index !== 0) // Remove processing message
      ]);
    } catch (err: any) {
      console.error('Error processing scan:', err);

      // Use the first scan result if it's the processing message
      const filteredResults = scanResults[0]?.message === 'Processing QR code...'
        ? scanResults.slice(1)
        : scanResults;

      setScanResults([
        {
          studentName: 'Error',
          studentEmail: 'Failed to process',
          timestamp: new Date().toLocaleTimeString(),
          success: false,
          message: err.message || 'Failed to process QR code. Try again or check if the QR code is valid.',
          type: scanMode
        },
        ...filteredResults.slice(0, 9)
      ]);
    }
  };

  const toggleScanMode = () => {
    setScanMode(scanMode === 'in' ? 'out' : 'in');
  };

  const toggleScanning = () => {
    if (scanning) {
      // Stop scanning
      if (scannerRef.current && scannerRef.current.isScanning) {
        scannerRef.current.stop()
          .then(() => {
            console.log('Scanner stopped');
            setScanning(false);
          })
          .catch(err => {
            console.error('Error stopping scanner:', err);
          });
      } else {
        setScanning(false);
      }
    } else {
      // Initialize scanner if not already initialized
      if (!scannerRef.current && typeof window !== 'undefined') {
        try {
          scannerRef.current = new Html5Qrcode('qr-reader');
          console.log('Scanner initialized on demand');
        } catch (err) {
          console.error('Error initializing scanner on demand:', err);
          return; // Exit if initialization fails
        }
      }

      // Start scanning
      if (scannerRef.current && !scannerRef.current.isScanning) {
        const config = { fps: 10, qrbox: 250 };
        scannerRef.current.start(
          { facingMode: 'environment' },
          config,
          (decodedText) => {
            handleScan(decodedText);
          },
          (errorMessage) => {
            console.error('QR Code scanning error:', errorMessage);
          }
        )
        .then(() => {
          console.log('Scanner started');
          setScanning(true);
        })
        .catch(err => {
          console.error('Error starting scanner:', err);
        });
      } else if (!scannerRef.current) {
        console.error('Scanner not initialized');
        alert('Could not initialize the QR scanner. Please refresh the page and try again.');
      }
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header />
        <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
          <div className="px-4 py-6 sm:px-0 flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-500"></div>
          </div>
        </main>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header />
        <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
          <div className="px-4 py-6 sm:px-0">
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md">
              {error}
            </div>
          </div>
        </main>
      </div>
    );
  }

  if (events.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header />
        <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
          <div className="px-4 py-6 sm:px-0">
            <div className="bg-white rounded-lg shadow-md p-6 text-center">
              <h2 className="text-xl font-semibold text-gray-900 mb-2">No Events Available</h2>
              <p className="text-gray-500 mb-4">
                You need to create an event before you can start scanning attendance.
              </p>
              <Link href="/admin/events/new" className="btn-primary">
                Create an Event
              </Link>
            </div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />

      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <h1 className="text-2xl font-semibold text-gray-900 mb-6">QR Code Scanner</h1>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Scanner Controls */}
            <div className="card md:col-span-1 flex flex-col">
              <div className="card-header">
                <h2 className="text-lg font-semibold text-gray-900">Scanner Controls</h2>
              </div>
              <div className="card-body flex-grow">
                <div className="flex flex-col h-full justify-between">
                  <div>
                    <div className="mb-6">
                      <label htmlFor="event-select" className="form-label">
                        Select Event
                      </label>
                      <select
                        id="event-select"
                        value={selectedEvent}
                        onChange={(e) => setSelectedEvent(e.target.value)}
                        className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm rounded-md"
                      >
                        {events.map(event => (
                          <option key={event.id} value={event.id}>
                            {event.name} ({new Date(event.date).toLocaleDateString()})
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="mb-6">
                      <label className="form-label">Scan Mode</label>
                      <div className="mt-2">
                        <button
                          onClick={toggleScanMode}
                          className="relative inline-flex flex-shrink-0 h-10 w-36 border-2 border-transparent rounded-full cursor-pointer transition-colors ease-in-out duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
                          style={{
                            backgroundColor: scanMode === 'in' ? '#0ea5e9' : '#ef4444',
                          }}
                        >
                          <span
                            className={`${
                              scanMode === 'in' ? 'translate-x-0' : 'translate-x-16'
                            } inline-block h-9 w-16 transform rounded-full bg-white shadow-lg ring-0 transition ease-in-out duration-200 flex items-center justify-center text-sm font-medium`}
                            style={{ marginTop: '2px', marginLeft: '2px' }}
                          >
                            {scanMode === 'in' ? 'IN' : 'OUT'}
                          </span>
                          <span
                            className={`absolute inset-0 flex items-center justify-center w-full text-white text-sm font-medium ${
                              scanMode === 'in' ? 'justify-end pr-8' : 'justify-start pl-8'
                            }`}
                          >
                            {scanMode === 'in' ? 'Check-In' : 'Check-Out'}
                          </span>
                        </button>
                      </div>
                    </div>
                  </div>

                  <div className="mt-4">
                    <button
                      onClick={toggleScanning}
                      className={`w-full font-bold py-3 rounded ${
                        scanning
                          ? 'bg-red-500 hover:bg-red-600 text-white'
                          : 'bg-green-500 hover:bg-green-600 text-white'
                      }`}
                    >
                      {scanning ? 'Stop Scanning' : 'Start Scanning'}
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Scanner */}
            <div className="card md:col-span-2">
              <div className="card-header">
                <div className="flex justify-between items-center">
                  <h2 className="text-lg font-semibold text-gray-900">
                    {scanning ? 'Scanning...' : 'Scanner Ready'}
                  </h2>
                  <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
                    scanning
                      ? scanMode === 'in'
                        ? 'bg-blue-100 text-blue-800'
                        : 'bg-red-100 text-red-800'
                      : 'bg-gray-100 text-gray-800'
                  }`}>
                    {scanning ? (scanMode === 'in' ? 'Check-In Mode' : 'Check-Out Mode') : 'Scanner Paused'}
                  </span>
                </div>
              </div>
              <div className="card-body">
                {scanning ? (
                  <div className="overflow-hidden rounded-lg relative" style={{ minHeight: '350px' }}>
                    <div
                      id="qr-reader"
                      ref={scannerContainerRef}
                      className="qr-reader-container"
                      style={{
                        width: '100%',
                        minHeight: '300px',
                        position: 'relative',
                        border: '1px solid #ddd',
                        borderRadius: '8px',
                        overflow: 'hidden'
                      }}
                    ></div>
                    <div
                      style={{
                        position: 'absolute',
                        top: '50%',
                        left: '50%',
                        width: '250px',
                        height: '250px',
                        transform: 'translate(-50%, -50%)',
                        border: '2px solid #0ea5e9',
                        borderRadius: '8px',
                        zIndex: 9,
                        pointerEvents: 'none'
                      }}
                    />
                  </div>
                ) : (
                  <div className="h-64 flex flex-col items-center justify-center text-gray-500">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-16 w-16 mb-4"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={1.5}
                        d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z"
                      />
                    </svg>
                    <p className="text-center">Scanner is paused. Click "Start Scanning" to begin.</p>
                  </div>
                )}

                {/* Recent Scans */}
                <div className="mt-6">
                  <h3 className="text-md font-medium text-gray-900 mb-3">Recent Scans</h3>
                  {scanResults.length === 0 ? (
                    <p className="text-sm text-gray-500 italic">No scans yet. Scan a QR code to see results here.</p>
                  ) : (
                    <div className="bg-gray-50 rounded-lg p-4 max-h-64 overflow-auto">
                      {scanResults.map((result, index) => (
                        <div
                          key={index}
                          className={`p-3 rounded-lg mb-2 ${
                            result.success
                              ? result.type === 'in'
                                ? 'bg-blue-50 border-l-4 border-blue-500'
                                : 'bg-purple-50 border-l-4 border-purple-500'
                              : 'bg-red-50 border-l-4 border-red-500'
                          }`}
                        >
                          <div className="flex justify-between items-start">
                            <div>
                              <p className="font-medium text-gray-900">{result.studentName}</p>
                              <p className="text-sm text-gray-500">{result.studentEmail}</p>
                            </div>
                            <span className="text-xs text-gray-500">{result.timestamp}</span>
                          </div>
                          <p className={`text-sm mt-1 ${
                            result.success
                              ? result.type === 'in'
                                ? 'text-blue-700'
                                : 'text-purple-700'
                              : 'text-red-700'
                          }`}>
                            {result.message}
                          </p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}