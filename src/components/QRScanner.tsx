'use client';

import { useState, useEffect, useRef } from 'react';
import { Html5Qrcode } from 'html5-qrcode';

interface QRScannerProps {
  onScan: (data: string) => void;
  isScanning: boolean;
}

const QRScanner: React.FC<QRScannerProps> = ({ onScan, isScanning }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [scanner, setScanner] = useState<Html5Qrcode | null>(null);
  const [scannerInitialized, setScannerInitialized] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Initialize scanner when component mounts
  useEffect(() => {
    let html5QrCode: Html5Qrcode | null = null;
    
    // Only initialize if the component is mounted and we're in the browser
    if (typeof window !== 'undefined' && containerRef.current) {
      const containerId = `qr-reader-${Math.random().toString(36).substring(2, 9)}`;
      containerRef.current.id = containerId;
      
      try {
        html5QrCode = new Html5Qrcode(containerId);
        setScanner(html5QrCode);
        setScannerInitialized(true);
        console.log('QR Scanner initialized successfully with ID:', containerId);
      } catch (err) {
        console.error('Error initializing QR scanner:', err);
        setError('Failed to initialize QR scanner. Please try again or use a different device.');
      }
    }
    
    // Cleanup function
    return () => {
      if (html5QrCode && html5QrCode.isScanning) {
        html5QrCode.stop()
          .catch(err => console.error('Error stopping scanner during cleanup:', err));
      }
    };
  }, [containerRef.current]); // Only run once when component mounts and ref is available

  // Start or stop scanning based on isScanning prop
  useEffect(() => {
    if (!scanner || !scannerInitialized) return;
    
    if (isScanning && !scanner.isScanning) {
      const config = { fps: 10, qrbox: 250 };
      scanner.start(
        { facingMode: 'environment' },
        config,
        (decodedText) => {
          onScan(decodedText);
        },
        (errorMessage) => {
          console.warn('QR Code scanning warning:', errorMessage);
        }
      )
      .catch(err => {
        console.error('Error starting scanner:', err);
        setError('Failed to start QR scanner. Please try again or use a different device.');
      });
    } else if (!isScanning && scanner.isScanning) {
      scanner.stop()
        .catch(err => console.error('Error stopping scanner:', err));
    }
  }, [isScanning, scanner, scannerInitialized, onScan]);

  return (
    <div className="qr-scanner-wrapper">
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}
      <div 
        ref={containerRef}
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
  );
};

export default QRScanner;
